import api from './api';
import authStorage from '../utils/authStorage';

// Constants for API calls
const API_TIMEOUT = 15000; // 15 seconds
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second
const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes

// Cache storage
const cache = new Map();

// Request deduplication storage
const pendingRequests = new Map();

// Cache key generator
const generateCacheKey = (params) => {
  return JSON.stringify(params);
};

// Retry logic helper function
const retryOperation = async (operation, retryCount = 0) => {
  try {
    return await operation();
  } catch (error) {
    if (retryCount < MAX_RETRIES && 
        (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || 
         (error.response?.status >= 500 && error.response?.status < 600))) {
      console.log(`Retrying... Attempt ${retryCount + 1} of ${MAX_RETRIES}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retryCount)));
      return retryOperation(operation, retryCount + 1);
    }
    throw error;
  }
};

export const typePageService = {
  // Get properties by type with verification
  getPropertiesByType: async (type, params = {}) => {
    // Ensure type is included in params
    const queryParams = {
      ...params,
      propertyType: type,
      verified: true
    };

    const cacheKey = generateCacheKey(queryParams);
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return cachedData.data;
    }

    // Check for pending request with same parameters
    if (pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey);
    }

    // Create the request promise
    const requestPromise = retryOperation(async () => {
      try {
        // Build query string
        const queryString = Object.entries(queryParams)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&');

        // Make request with specific config to avoid authentication errors
        const { data } = await api.get(`/typepage/${encodeURIComponent(type)}?${queryString}`, {
          timeout: API_TIMEOUT,
          // Accept 200-299 status codes as success
          validateStatus: (status) => status >= 200 && status < 300
        });

        // Handle both success and error responses
        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch properties by type');
        }

        const responseData = {
          success: true,
          properties: data.properties || [],
          currentPage: data.currentPage || params.page || 1,
          totalPages: data.totalPages || 1,
          totalCount: data.totalCount || 0,
          pageSize: data.pageSize || params.pageSize || 12
        };

        // Cache the successful response
        cache.set(cacheKey, {
          data: responseData,
          timestamp: Date.now()
        });

        return responseData;
      } catch (error) {
        console.error(`Error fetching ${type} properties:`, error);
        // Even if we get an error, return a valid empty response instead of throwing
        return {
          success: true,
          properties: [],
          currentPage: params.page || 1,
          totalPages: 0,
          totalCount: 0,
          pageSize: params.pageSize || 12,
          error: error.message
        };
      } finally {
        // Clean up pending request
        pendingRequests.delete(cacheKey);
      }
    });

    // Store the pending request
    pendingRequests.set(cacheKey, requestPromise);

    return requestPromise;
  },
  
  // Clear cache for specific property type
  clearTypeCache: (type) => {
    for (let [key, value] of cache.entries()) {
      if (key.includes(`"propertyType":"${type}"`)) {
        cache.delete(key);
      }
    }
  },

  // Clear all type cache
  clearAllTypeCache: () => {
    cache.clear();
    pendingRequests.clear();
  }
};

export default typePageService;
