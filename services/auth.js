import { API_BASE_URL, AUTH_ENDPOINTS, STORAGE_KEYS } from '../config/constants';
import api from './api';
import authStorage from '../utils/authStorage';
import { handleAuthError } from '../utils/authErrorHandler';

class AuthService {
  constructor() {
    this.refreshTokenTimeout = null;
    this.isRefreshing = false;
    this.refreshSubscribers = [];
    
    // Attach lifecycle listeners only on web environments where these APIs exist
    if (
      typeof window !== 'undefined' &&
      typeof document !== 'undefined' &&
      typeof window.addEventListener === 'function'
    ) {
      window.addEventListener('beforeunload', this.handleUserLeaving);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      // When the window gains focus again (e.g., user returns), mark user active
      window.addEventListener('focus', this.handleWindowFocus);
    }
  }

  /**
   * Update the user's online status on the backend.
   * This helper is reused by the different lifecycle handlers.
   */
  updateStatus = async (status = 'active') => {
    try {
      const token = authStorage.getToken('access_token');
      if (!token) return;

      const payload = JSON.stringify({ token, status });

      // Use sendBeacon for inactive status (often called during unload)
      if (status === 'inactive' && navigator.sendBeacon) {
        const endpoint = `${API_BASE_URL}/auth/update-status`;
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(endpoint, blob);
        return;
      }

      // Fallback to fetch for active status or if sendBeacon is not available
      await fetch(`${API_BASE_URL}/auth/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: payload,
        keepalive: true
      });
    } catch (err) {
      // Silent failure – don't block UX because of status update issues
      console.error('Error updating user status:', err);
    }
  };

  // Handle tab/browser close
  handleUserLeaving = async () => {
    if (this.isAuthenticated()) {
      // Use sendBeacon-friendly approach inside updateStatus
      this.updateStatus('inactive');
    }
  };

  // Handle tab visibility change (user switching tabs)
  handleVisibilityChange = () => {
    if (!this.isAuthenticated()) return;

    if (document.visibilityState === 'hidden') {
      // User moved away from the tab
      this.updateStatus('inactive');
    } else if (document.visibilityState === 'visible') {
      // User switched back to the tab
      this.updateStatus('active');
    }
  };

  // Additional handler for window focus (covers some browsers)
  handleWindowFocus = () => {
    if (this.isAuthenticated()) {
      this.updateStatus('active');
    }
  };

  onRefreshed(token) {
    this.refreshSubscribers.forEach(callback => callback(token));
    this.refreshSubscribers = [];
  }

  subscribeTokenRefresh(callback) {
    this.refreshSubscribers.push(callback);
  }

  async initializeTokenRefresh() {
    if (!authStorage.hasValidToken()) {
      const refreshToken = authStorage.getToken('refresh_token');
      if (refreshToken) {
        try {
          await this.refreshToken();
        } catch (error) {
          return false;
        }
      } else {
        return false;
      }
    }

    const response = await this.verifyToken();
    if (response?.success) {
      if (response.user) {
        authStorage.setUserData(response.user);
      }
      return true;
    }
    return false;
  }

  isAuthenticated() {
    return authStorage.hasValidToken() && !!this.getCurrentUser();
  }

  startRefreshTokenTimer(expiresIn) {
    this.stopRefreshTokenTimer();
    const timeout = (expiresIn - 60) * 1000;
    this.refreshTokenTimeout = setTimeout(() => this.refreshToken(), timeout);
  }

  stopRefreshTokenTimer() {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }
  }

  async refreshToken() {
    const refreshToken = authStorage.getToken('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
    if (response.data?.success) {
      const { access_token, refresh_token } = response.data;
      authStorage.setToken('access_token', access_token);
      if (refresh_token) {
        authStorage.setToken('refresh_token', refresh_token);
      }
      return response.data;
    }
    throw new Error('Failed to refresh token');
  }

  async login(email, password, remember = true) {
    const response = await api.post('/auth/login', { email, password });
    if (response.data?.success) {
      const { user, session } = response.data;
      authStorage.setAuthProvider('backend');
      authStorage.setTokens(session.access_token, session.refresh_token, remember);
      authStorage.setUserData(user);
      return { success: true, user, token: session.access_token };
    }
    throw new Error(response.data?.message || 'Login failed');
  }

  async register(userData) {
    const response = await api.post('/auth/register', userData);
    if (response.data?.success) {
      const { user, session } = response.data;
      authStorage.setAuthProvider('backend');
      authStorage.setToken('access_token', session.access_token);
      if (session.refresh_token) {
        authStorage.setToken('refresh_token', session.refresh_token);
      }
      authStorage.setUserData(user);
      return { success: true, user, token: session.access_token };
    }
    throw new Error(response.data?.message || 'Registration failed');
  }

  async logout() {
    try {
      // 1. Call the backend first so the server can invalidate the current session/token
      try {
        await Promise.race([
          api.post('/auth/logout'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Logout request timeout')), 3000))
        ]);
      } catch (apiError) {
        // If the API call fails or times-out we still proceed with local cleanup
        console.warn('Backend logout request failed or timed out:', apiError);
      }

      // 2. Clear all persisted auth data locally so we are fully logged out on the client
      await authStorage.clearAll();
      await authStorage.clearTokens();

      // 3. Extra safeguard for web – wipe any residual items in localStorage / sessionStorage
      if (
        typeof window !== 'undefined' &&
        typeof window.localStorage !== 'undefined' &&
        typeof window.sessionStorage !== 'undefined'
      ) {
        try {
          window.localStorage.clear();
          window.sessionStorage.clear();
        } catch (_) {
          // Ignore – environment might not support web storage (e.g., React-Native)
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Attempt to clear anything that might be left behind if something went wrong
      try {
        await authStorage.clearTokens();
        await authStorage.clearAll();
      } catch (clearError) {
        console.error('Failed to clear tokens after logout error:', clearError);
      }
      return { success: false, error: error.message };
    }
  }

  async verifyEmail(token) {
    const response = await api.post('/auth/verify', { token });
    return response.data;
  }

  async forgotPassword(email) {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token, newPassword) {
    const response = await api.post('/auth/reset-password', { token, newPassword });
    return response.data;
  }

  async verifyToken() {
    const token = authStorage.getToken('access_token');
    if (!token) {
      throw new Error('No token available');
    }

    if (!authStorage.hasValidToken()) {
      const refreshToken = authStorage.getToken('refresh_token');
      if (refreshToken) {
        await this.refreshToken();
      } else {
        throw new Error('Token expired and no refresh token available');
      }
    }

    const response = await api.get('/auth/verify', {
      headers: {
        Authorization: `Bearer ${authStorage.getToken('access_token')}`
      }
    });

    if (response.data?.success) {
      if (response.data.user) {
        authStorage.setUserData(response.data.user);
      }
      return response.data;
    }

    throw new Error(response.data?.message || 'Token verification failed');
  }

  getCurrentUser() {
    return authStorage.getUserData();
  }
}

export default new AuthService(); 