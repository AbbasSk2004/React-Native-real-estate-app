import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { endpoints } from '../services/api';

const CACHE_DURATION = 60000; // 1 minute cache

// Global cache and request tracking
const globalCache = {
  data: null,
  timestamp: 0,
  pendingPromise: null
};

export const useUserFavorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated, currentUser } = useAuth();
  const mountedRef = useRef(true);

  const fetchFavorites = useCallback(async (force = false) => {
    // Don't fetch if not authenticated or no user
    if (!isAuthenticated || !currentUser) {
      return;
    }

    // Check cache validity
    const now = Date.now();
    if (!force && globalCache.data && (now - globalCache.timestamp) < CACHE_DURATION) {
      setFavorites(globalCache.data);
      return;
    }

    // If there's already a request in progress, wait for it
    if (globalCache.pendingPromise) {
      try {
        const data = await globalCache.pendingPromise;
        if (mountedRef.current) {
          setFavorites(data);
        }
        return;
      } catch (err) {
        // Handle error but continue to make a new request
        console.error('Error in pending request:', err);
      }
    }

    try {
      setLoading(true);
      setError(null);

      // Create the promise for this request
      globalCache.pendingPromise = endpoints.properties.getFavorites()
        .then(response => {
          const data = response?.data || [];
          globalCache.data = data;
          globalCache.timestamp = now;
          return data;
        })
        .finally(() => {
          globalCache.pendingPromise = null;
        });

      const data = await globalCache.pendingPromise;
      if (mountedRef.current) {
        setFavorites(data);
      }
    } catch (err) {
      console.error('Error fetching favorites:', err);
      if (mountedRef.current) {
        setError(err.message || 'Failed to fetch favorites');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [isAuthenticated, currentUser]);

  // Initial fetch and setup
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      fetchFavorites();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [isAuthenticated, currentUser, fetchFavorites]);

  const invalidateCache = useCallback(() => {
    globalCache.data = null;
    globalCache.timestamp = 0;
    globalCache.pendingPromise = null;
  }, []);

  const toggleFavorite = useCallback(async (propertyId) => {
    try {
      const response = await endpoints.properties.toggleFavorite(propertyId);
      
      // Invalidate cache and refetch to ensure data consistency
      invalidateCache();
      await fetchFavorites(true);
      
      return response?.data?.isFavorite;
    } catch (err) {
      console.error('Error toggling favorite:', err);
      throw err;
    }
  }, [fetchFavorites, invalidateCache]);

  return {
    favorites,
    loading,
    error,
    toggleFavorite,
    refetch: () => fetchFavorites(true),
    invalidateCache
  };
};

export default useUserFavorites; 