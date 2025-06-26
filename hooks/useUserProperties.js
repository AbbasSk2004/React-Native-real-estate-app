import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { propertyService } from '../services/propertyService';

const CACHE_DURATION = 60000; // 1 minute cache

// Global cache and request tracking
const globalCache = {
  data: null,
  timestamp: 0,
  pendingPromise: null
};

export const useUserProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated, user } = useAuth();
  const mountedRef = useRef(true);

  const fetchProperties = useCallback(async (force = false) => {
    // Don't fetch if not authenticated or no user
    if (!isAuthenticated || !user) {
      return;
    }

    // Check cache validity
    const now = Date.now();
    if (!force && globalCache.data && (now - globalCache.timestamp) < CACHE_DURATION) {
      setProperties(globalCache.data);
      return;
    }

    // If there's already a request in progress, wait for it
    if (globalCache.pendingPromise) {
      try {
        const data = await globalCache.pendingPromise;
        if (mountedRef.current) {
          setProperties(data);
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

      // Create a new promise for this request
      const promise = propertyService.getUserProperties();
      globalCache.pendingPromise = promise;

      const response = await promise;
      globalCache.pendingPromise = null;

      if (response?.data) {
        // Update cache
        globalCache.data = response.data;
        globalCache.timestamp = now;

        if (mountedRef.current) {
          setProperties(response.data);
        }
      }
    } catch (err) {
      globalCache.pendingPromise = null;
      console.error('Error fetching user properties:', err);
      if (mountedRef.current) {
        setError('Failed to fetch properties');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    // Initial fetch
    fetchProperties();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchProperties]);

  return {
    properties,
    loading,
    error,
    refetch: () => fetchProperties(true)
  };
};

export default useUserProperties; 