import { STORAGE_KEYS } from '../config/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AuthStorage {
  constructor() {
    this.prefix = 'auth_';
    if (typeof window !== 'undefined') {
      this.local = window.localStorage;
      this.session = window.sessionStorage;
    } else {
      this.local = null;
      this.session = null;
    }
    // Fallback in-memory store for environments (e.g. React-Native) that
    // don't have synchronous web-storage. Keys are stored with the same
    // prefix so existing helper logic can remain untouched.
    this.memory = {};
  }

  // Get access token
  getAccessToken = async () => {
    try {
      // First try to get from synchronous storage (for web)
      const syncToken = this.getToken('access_token');
      if (syncToken) return syncToken;
      
      // Then try AsyncStorage
      const asyncToken = await AsyncStorage.getItem(this.prefix + 'access_token');

      // Cache in memory for subsequent synchronous reads
      if (asyncToken) {
        this.memory[this.prefix + 'access_token'] = asyncToken;
      }

      return asyncToken;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  };

  // Get refresh token
  getRefreshToken = async () => {
    try {
      const token = await AsyncStorage.getItem(this.prefix + 'refresh_token');
      if (token) {
        this.memory[this.prefix + 'refresh_token'] = token;
      }
      return token;
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  };

  // Set both tokens with remember-me flag (default true => persistent)
  setTokens = async (accessToken, refreshToken, remember = true) => {
    try {
      if (remember) {
        await AsyncStorage.multiSet([
          [this.prefix + 'access_token', accessToken],
          [this.prefix + 'refresh_token', refreshToken],
        ]);
      } else {
        // If the user opted **not** to be remembered, ensure no persisted
        // tokens remain in AsyncStorage from a previous session.
        await AsyncStorage.multiRemove([
          this.prefix + 'access_token',
          this.prefix + 'refresh_token',
        ]);
      }

      // Keep a synchronous copy for immediate access on web (localStorage / sessionStorage)
      this.setToken('access_token', accessToken, remember);
      this.setToken('refresh_token', refreshToken, remember);
      return true;
    } catch (error) {
      console.error('Error setting tokens:', error);
      return false;
    }
  };

  // Clear both tokens
  clearTokens = async () => {
    try {
      await AsyncStorage.multiRemove([this.prefix + 'access_token', this.prefix + 'refresh_token']);

      // Ensure copies in local / session storage are also cleared
      this.removeToken('access_token');
      this.removeToken('refresh_token');
      return true;
    } catch (error) {
      console.error('Error clearing tokens:', error);
      return false;
    }
  };

  // Set a token. If remember=false, token is stored in sessionStorage only (cleared on browser close)
  // Default remember=true stores token in localStorage (persists across sessions)
  setToken(key, value, remember = true) {
    if (!value) return;
    const fullKey = this.prefix + key;

    // --- Web (local/session storage available) ---------------
    if (this.local || this.session) {
      if (remember) {
        this.local && this.local.setItem(fullKey, value);
        // Ensure session copy removed
        this.session && this.session.removeItem(fullKey);
      } else {
        this.session && this.session.setItem(fullKey, value);
        // Ensure local copy removed
        this.local && this.local.removeItem(fullKey);
      }
    }

    // --- React-Native / No synchronous storage ----------------
    // Always keep a copy in memory so that synchronous consumers
    // (hasValidToken, getToken) can still access the token without
    // awaiting AsyncStorage.
    this.memory[fullKey] = value;
  }

  // Get a token (check sessionStorage first, then localStorage)
  getToken(key) {
    const fullKey = this.prefix + key;

    // 1) sessionStorage (web, non-persistent)
    if (this.session && this.session.getItem(fullKey)) {
      return this.session.getItem(fullKey);
    }

    // 2) localStorage (web, persistent)
    if (this.local && this.local.getItem(fullKey)) {
      return this.local.getItem(fullKey);
    }

    // 3) in-memory fallback (React-Native or after first AsyncStorage read)
    if (this.memory[fullKey]) {
      return this.memory[fullKey];
    }

    return null;
  }

  // Remove a token
  removeToken(key) {
    const fullKey = this.prefix + key;
    this.local && this.local.removeItem(fullKey);
    this.session && this.session.removeItem(fullKey);
    if (this.memory[fullKey]) delete this.memory[fullKey];
  }

  // Check if token is valid (synchronous)
  // NOTE: We intentionally use the synchronous getToken helper here because
  // AsyncStorage methods return Promises, which would make this method async
  // and require callers to `await` it everywhere. Since most call-sites expect
  // a synchronous boolean we rely on the token copy kept in localStorage /
  // sessionStorage when available (Expo Web & browser). On native platforms
  // the fallback will still work because `@react-native-async-storage/async-storage`
  // uses `localStorage` under-the-hood when running on web and provides an in-memory
  // shim for native.
  hasValidToken() {
    try {
      // Grab the access token synchronously
      const token = this.getToken('access_token');
      if (!token) return false;

      // Decode JWT (basic split – assumes three parts)
      const [, payloadBase64] = token.split('.');
      if (!payloadBase64) return false;

      // Safer base64 decode that works both on web and React-Native
      const base64Decode = (b64) => {
        try {
          if (typeof atob === 'function') {
            return atob(b64);
          }
        } catch (_) {}
        // Fallback to Buffer (React-Native / Node like env)
        try {
          // eslint-disable-next-line global-require
          const buf = global.Buffer || require('buffer').Buffer;
          return buf.from(b64, 'base64').toString('binary');
        } catch (_) {
          return null;
        }
      };

      const decoded = base64Decode(payloadBase64);
      if (!decoded) return false;

      const payload = JSON.parse(decoded);
      if (!payload.exp) return false;

      // Consider token valid if it expires >5 s from now
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = payload.exp - now;
      return expiresIn > 5;
    } catch (err) {
      // Any error means the token is not valid / malformed
      return false;
    }
  }

  // Set user data (persists to both localStorage & AsyncStorage when available)
  async setUserData(data) {
    if (!data) return;

    const serialized = JSON.stringify(data);

    // Save to web storage when available
    if (this.local) {
      this.local.setItem(this.prefix + 'user', serialized);
    }

    // Always save to AsyncStorage for React Native support
    try {
      await AsyncStorage.setItem(this.prefix + 'user', serialized);
    } catch (e) {
      console.error('Error saving user data to AsyncStorage:', e);
    }
  }

  // Get user data (tries localStorage first, then AsyncStorage)
  async getUserDataAsync() {
    // Attempt synchronous localStorage read first (web)
    if (this.local) {
      try {
        const data = this.local.getItem(this.prefix + 'user');
        if (data) return JSON.parse(data);
      } catch (_) {}
    }

    // Fallback to AsyncStorage (React Native)
    try {
      const data = await AsyncStorage.getItem(this.prefix + 'user');
      return data ? JSON.parse(data) : null;
    } catch (_) {
      return null;
    }
  }

  // Synchronous getter (web only). For React Native use getUserDataAsync()
  getUserData() {
    if (!this.local) return null;
    try {
      const data = this.local.getItem(this.prefix + 'user');
      return data ? JSON.parse(data) : null;
    } catch (err) {
      return null;
    }
  }

  // Set profile data separately from user data
  setProfileData(data) {
    if (!this.local || !data) return;
    this.local.setItem(this.prefix + 'profile', JSON.stringify(data));
  }

  // Get profile data
  getProfileData() {
    if (!this.local) return null;
    try {
      const data = this.local.getItem(this.prefix + 'profile');
      return data ? JSON.parse(data) : null;
    } catch (err) {
      return null;
    }
  }

  // Set auth provider
  setAuthProvider(provider) {
    if (!this.local) return;
    this.local.setItem(this.prefix + 'provider', provider);
  }

  // Get auth provider
  getAuthProvider() {
    if (!this.local) return null;
    const provider = this.local.getItem(this.prefix + 'provider') || 'backend';
    return provider;
  }

  // Clear profile data
  clearProfileData() {
    if (!this.local) return;
    this.local.removeItem(this.prefix + 'profile');
  }

  // Clear all auth data
  async clearAll() {
    // Clear from AsyncStorage (needed for React Native)
    try {
      // Get all keys from AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      // Filter for auth keys
      const authKeys = allKeys.filter(key => key.startsWith(this.prefix));
      // Remove all auth keys
      if (authKeys.length > 0) {
        await AsyncStorage.multiRemove(authKeys);
      }
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
    }

    // Clear from localStorage
    if (this.local) {
      const localKeys = [];
      for (let i = 0; i < this.local.length; i++) {
        const key = this.local.key(i);
        if (key && key.startsWith(this.prefix)) {
          localKeys.push(key);
        }
      }
      
      localKeys.forEach(key => {
        this.local.removeItem(key);
      });
    }

    // Clear from sessionStorage
    if (this.session) {
      const sessionKeys = [];
      for (let i = 0; i < this.session.length; i++) {
        const key = this.session.key(i);
        if (key && key.startsWith(this.prefix)) {
          sessionKeys.push(key);
        }
      }
      
      sessionKeys.forEach(key => {
        this.session.removeItem(key);
      });
    }
  }

  // Initialize auth state
  initializeAuthState() {
    if (!this.local) return;
    // Clear any existing auth data
    this.clearAll();
  }
}

export default new AuthStorage();