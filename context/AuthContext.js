import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import authService from '../services/auth';
import authStorage from '../utils/authStorage';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ------------------------------------------------------------
// Helper component that synchronises the user profile in the
// background. Declaring it outside of AuthProvider ensures that its
// component identity remains stable across AuthProvider re-renders,
// preventing unnecessary unmount/mount cycles and therefore avoiding
// the creation of multiple polling intervals.
// ------------------------------------------------------------
const ProfileSync = () => {
  // eslint-disable-next-line global-require
  const { useProfilePolling } = require('../hooks/useProfilePolling');
  useProfilePolling();
  return null;
};

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [user, setUser] = useState(null);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        
        // Grab any stored user and tokens (use async helper to support React Native)
        const storedUser = await authStorage.getUserDataAsync();
        const accessToken = await authStorage.getAccessToken();
        const refreshToken = await authStorage.getRefreshToken();
        
        // If we have no tokens at all, treat as logged-out immediately
        if (!accessToken && !refreshToken) {
          await authStorage.clearTokens();
          setUser(null);
        } else {
          // Verify / refresh the token set **before** we expose user state
          try {
            const isStillValid = await authService.initializeTokenRefresh();
            
            if (isStillValid) {
              // Either keep the original stored user or grab an updated copy
              const freshUser = storedUser || await authStorage.getUserDataAsync();
              if (freshUser) {
                setUser(freshUser);
              }
            } else {
              // Tokens rejected – force logout locally
              await authStorage.clearTokens();
              await authStorage.clearAll();
              setUser(null);
            }
          } catch (err) {
            console.error('Token verification failed:', err);
            await authStorage.clearTokens();
            await authStorage.clearAll();
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initAuth();
  }, []);

  // Function to handle user state update
  const updateUserState = useCallback((userData) => {
    if (userData) {
      setUser(userData);
    } else {
      setUser(null);
    }
  }, []);

  // Regular login function
  const login = async (email, password, remember = true) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.login(email, password, remember);
      if (response.success) {
        updateUserState(response.user);
        return response;
      }
      throw new Error(response.message || 'Login failed');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
      // Let the calling component handle displaying error messages
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.register(userData);
      
      if (response.success) {
        // Check if verification is required before updating user state
        if (response.requiresVerification) {
          // Don't update user state yet, let the component handle the verification flow
          return response;
        }
        
        // Regular successful registration with session
        updateUserState(response.user);
        return response;
      }
      
      throw new Error(response.message || 'Registration failed');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message);
      throw err; // Let the component handle the error
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = useCallback(async () => {
    try {
      setLoading(true);

      // Notify backend first (this will also clear tokens/local storage inside the helper)
      await authService.logout();

      // Update local React state
      setUser(null);
      setError(null);

      return { success: true, message: 'Logged out successfully' };
    } catch (err) {
      console.error('Logout error:', err);

      // Ensure we always clear local state even if something went wrong
      setUser(null);
      setError(err.message);

      Alert.alert('Logout Error', err.message || 'Failed to logout properly');
      return { success: false, message: err.message || 'Failed to logout completely' };
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    initialized,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUserState
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* Mount the sync helper only when user is authenticated */}
      {value.isAuthenticated && <ProfileSync />}
    </AuthContext.Provider>
  );
};

export default AuthContext;
