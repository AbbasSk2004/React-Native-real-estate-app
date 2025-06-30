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
      if (
        status === 'inactive' &&
        typeof navigator !== 'undefined' &&
        typeof navigator.sendBeacon === 'function'
      ) {
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

      // Mark user as active (mobile / web) – ignore errors silently
      try {
        await this.updateStatus('active');
      } catch (statusErr) {
        console.warn('Failed to update user status to active:', statusErr);
      }

      return { success: true, user, token: session.access_token };
    }
    throw new Error(response.data?.message || 'Login failed');
  }

  async register(userData) {
    try {
      const response = await api.post('/auth/register', userData);
      if (response.data?.success) {
        const { user, session, message } = response.data;
        
        // When using OTP verification, we won't have a session immediately
        // We'll consider this a successful registration that needs verification
        if (!session || !session.access_token) {
          return { 
            success: true, 
            requiresVerification: true,
            user,
            message: message || 'Registration successful. Please check your email for the verification code.'
          };
        }
        
        // If we do have a session, store it and proceed with normal login
        authStorage.setAuthProvider('backend');
        authStorage.setToken('access_token', session.access_token);
        if (session.refresh_token) {
          authStorage.setToken('refresh_token', session.refresh_token);
        }
        authStorage.setUserData(user);
        return { success: true, user, token: session.access_token };
      }
      throw new Error(response.data?.message || 'Registration failed');
    } catch (error) {
      // Attempt to infer duplicate-email / already-used cases when the backend
      // responds with a generic error message or standard HTTP conflict code.
      const status = error.response?.status;
      const dataMessage = (error.response?.data?.message || '').toString().toLowerCase();
      const dataType = (error.response?.data?.type || '').toString().toLowerCase();

      // Common patterns:
      //  • Explicit conflict HTTP status (409)
      //  • 400 with a message about duplicates
      //  • Backend returns type: 'server_error' but the root cause is duplicate key
      const looksLikeDuplicateEmail =
        status === 409 ||
        dataMessage.includes('duplicate') && dataMessage.includes('email') ||
        dataMessage.includes('already exists') ||
        dataMessage.includes('already in use') ||
        dataMessage.includes('already registered') ||
        dataMessage.includes('failed to create user profile');

      if (looksLikeDuplicateEmail || dataType === 'duplicate' || dataType === 'conflict') {
        throw new Error('This email is already registered. Please use a different email or try signing in.');
      }

      // Check for specific error messages related to email already in use
      if (error.response?.data?.message) {
        const errorMessage = error.response.data.message.toLowerCase();
        if (errorMessage.includes('email already exists') || 
            errorMessage.includes('already in use') || 
            errorMessage.includes('already registered') ||
            errorMessage.includes('duplicate') && errorMessage.includes('email')) {
          throw new Error('This email is already registered. Please use a different email or try signing in.');
        }
      }
      
      // Fallback when error.response is absent (e.g., transformed by interceptor)
      if (!error.response && typeof error.message === 'string') {
        const lower = error.message.toLowerCase();
        if (lower.includes('already registered') || lower.includes('already exists') || lower.includes('already in use') || lower.includes('failed to create user profile') || lower.includes('duplicate')) {
          throw new Error('This email is already registered. Please use a different email or try signing in.');
        }
      }
      
      // If no specific error was detected, rethrow the original error
      throw error;
    }
  }

  async logout() {
    try {
      // 1. Call the backend first so the server can invalidate the current session/token
      try {
        // Attempt to mark user inactive first (optional)
        try {
          await this.updateStatus('inactive');
        } catch (statusErr) {
          console.warn('Failed to update user status to inactive:', statusErr);
        }

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
    try {
      console.log('verifyEmail called with token length:', token?.length || 0);
      
      // Clean up the token if it's a full URL or contains URL encoding
      let cleanToken = token;
      
      // If token contains URL encoding (like %3D for =), decode it
      if (token && token.includes('%')) {
        try {
          cleanToken = decodeURIComponent(token);
          console.log('Decoded token from URL encoding');
        } catch (e) {
          console.error('Failed to decode token:', e);
        }
      }
      
      // Extract token from URL if it's a full URL
      if (cleanToken && (cleanToken.includes('http') || cleanToken.includes('exp://') || cleanToken.includes('realestate://'))) {
        try {
          const urlParts = cleanToken.split('token=');
          if (urlParts.length > 1) {
            cleanToken = urlParts[1].split('&')[0];
            console.log('Extracted token from URL');
          }
        } catch (e) {
          console.error('Failed to extract token from URL:', e);
        }
      }
      
      console.log('Cleaned token:', cleanToken ? `${cleanToken.substring(0, 10)}...` : 'null');
      
      if (!cleanToken) {
        return {
          success: false,
          message: 'Invalid or missing verification token'
        };
      }
      
      // Function to retry API calls
      const retryApiCall = async (apiCall, maxRetries = 3, delay = 2000) => {
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`API call attempt ${attempt}/${maxRetries}`);
            return await apiCall();
          } catch (error) {
            lastError = error;
            console.error(`Attempt ${attempt} failed:`, error.message);
            
            // Only retry on network errors
            if (!error.message || !error.message.includes('Network Error')) {
              throw error;
            }
            
            if (attempt < maxRetries) {
              console.log(`Waiting ${delay}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              // Increase delay for next attempt
              delay = delay * 1.5;
            }
          }
        }
        
        throw lastError;
      };
      
      // Check if the token is a Supabase token or our backend token
      if (cleanToken && cleanToken.length > 50) {
        // This is likely a direct Supabase token from the email link
        console.log('Processing Supabase verification token via server');
        
        try {
          // Call our backend endpoint that will verify with Supabase with retry
          const apiCall = () => api.post('/auth/verify-supabase', { token: cleanToken });
          const response = await retryApiCall(apiCall);
          return response.data;
        } catch (error) {
          console.error('Server verification error:', error);
          
          // If we get a network error, provide a helpful message
          if (error.message && error.message.includes('Network Error')) {
            console.log('Network error occurred during verification');
            return {
              success: false,
              message: 'Network error occurred. Please check your internet connection and try again.'
            };
          }
          
          throw error;
        }
      } else if (cleanToken) {
        // Use our regular verification endpoint
        console.log('Processing standard verification token');
        try {
          const apiCall = () => api.post('/auth/verify', { token: cleanToken });
          const response = await retryApiCall(apiCall);
          return response.data;
        } catch (error) {
          console.error('Standard verification error:', error);
          
          if (error.message && error.message.includes('Network Error')) {
            return {
              success: false,
              message: 'Network error. Please check your internet connection and try again.'
            };
          }
          
          throw error;
        }
      } else {
        return {
          success: false,
          message: 'Invalid verification token format'
        };
      }
    } catch (error) {
      console.error('Email verification error:', error);
      return {
        success: false,
        message: error.message || 'Failed to verify email. Please try again.'
      };
    }
  }

  async forgotPassword(email) {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(email, otp, newPassword) {
    try {
      // Send all three parameters to handle verification and password reset in one step
      const response = await api.post('/auth/reset-password', { 
        email, 
        otp, 
        newPassword 
      });
      
      return response.data;
    } catch (error) {
      console.error('Password reset error:', error);
      
      // Handle specific error types for better user feedback
      if (error.response?.data?.message) {
        if (error.response.data.message.includes('expired')) {
          return {
            success: false,
            message: 'The verification code has expired. Please request a new code.'
          };
        } else if (error.response.data.message.includes('invalid')) {
          return {
            success: false,
            message: 'Invalid verification code. Please check and try again.'
          };
        }
      }
      
      return {
        success: false,
        message: error.message || 'Failed to reset password. Please try again.'
      };
    }
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

  async verifyOtp(email, token) {
    try {
      console.log('Verifying OTP for email:', email);
      
      // Call our backend endpoint to verify OTP
      const response = await api.post('/auth/verify-otp', { 
        email, 
        token 
      });
      
      if (response.data?.success) {
        const { user, session } = response.data;
        
        // If we have a session, store it
        if (session && session.access_token) {
          authStorage.setAuthProvider('backend');
          authStorage.setToken('access_token', session.access_token);
          if (session.refresh_token) {
            authStorage.setToken('refresh_token', session.refresh_token);
          }
          authStorage.setUserData(user);
        }
        
        return response.data;
      }
      
      throw new Error(response.data?.message || 'Failed to verify OTP');
    } catch (error) {
      console.error('OTP verification error:', error);
      return {
        success: false,
        message: error.message || 'Failed to verify email code. Please try again.'
      };
    }
  }

  getCurrentUser() {
    return authStorage.getUserData();
  }
}

export default new AuthService(); 