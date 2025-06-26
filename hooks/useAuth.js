import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import authStorage from '../utils/authStorage';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = authStorage.getToken('access_token');
      if (!token) {
        setUser(null);
        return false;
      }

      const response = await api.get('/auth/verify');
      if (response.data?.success) {
        setUser(response.data.user);
        return true;
      }

      setUser(null);
      return false;
    } catch (err) {
      console.error('Auth check error:', err);
      setError(err.message);
      setUser(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const refreshToken = authStorage.getToken('refresh_token');
      if (!refreshToken) throw new Error('No refresh token available');

      const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
      if (response.data?.access_token) {
        authStorage.setToken('access_token', response.data.access_token);
        if (response.data.refresh_token) {
          authStorage.setToken('refresh_token', response.data.refresh_token);
        }
        if (response.data.user) {
          setUser(response.data.user);
        }
        return response.data;
      }
      throw new Error('Failed to refresh token');
    } catch (err) {
      console.error('Token refresh error:', err);
      setUser(null);
      authStorage.clearAll();
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      authStorage.clearAll();
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    loading,
    error,
    checkAuth,
    isAuthenticated: !!user,
    refreshToken,
    logout
  };
};

export default useAuth;

// Re-export everything from AuthContext
export { AuthProvider } from '../context/AuthContext'; 