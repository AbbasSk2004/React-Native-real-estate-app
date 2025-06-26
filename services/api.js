import axios from 'axios';
import { API_BASE_URL } from '../config/constants';
import authStorage from '../utils/authStorage';
import { handleAuthError, handleTokenError, AUTH_ERROR_TYPES } from '../utils/authErrorHandler';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map();
const pendingRequests = new Map();

// Debounce configuration
const DEBOUNCE_DELAY = 300; // 300ms
const debounceTimers = new Map();

// Add view count cache
const viewCountCache = new Map();
const VIEW_COUNT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Add favorites cache configuration
const FAVORITES_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const favoritesCache = new Map();

// Profile cache (singleton, not Map as only current user profile is stored)
const PROFILE_CACHE_DURATION = 30 * 1000; // 30 seconds
let profileCache = { data: null, timestamp: 0 };

// Add these variables at the top of the file, after the imports
let isRefreshing = false;
let failedQueue = [];
let lastRefreshTime = 0;
const MIN_REFRESH_INTERVAL = 30000; // Minimum 30 seconds between refreshes

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Special configuration for map-related requests
const mapApi = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  timeout: 30000, // 30 seconds timeout for map operations
  headers: {
    'Content-Type': 'application/json'
  }
});

// List of public endpoints that don't require authentication
const publicEndpoints = [
  '/properties',
  '/properties/',
  '/properties/recommended',
  '/properties/featured',
  '/properties/*/views/count',
  '/properties/*/views',
  '/properties/*',  // Individual property endpoints (but not user-specific ones)
  '/health',
  '/health/check',
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/contact',
  '/property-views',
  '/property-views/',
  '/property-views/*',
  '/property-views/count',
  '/property-views/*/count',
  '/property-views/user',
  '/recommendations',
  '/recommendations/*',
  '/agents',
  '/agents/',
  '/agents/featured',
  '/agents/*',
  '/faqs',
  '/faqs/featured',
  '/faqs/category/*',
  '/blogs',
  '/blogs/featured',
  '/blogs/*',
  '/similar-properties/*',
  '/chat/users/search',
  '/api/health',
  '/api/health/check',
  '/auth/check-connection',
  '/testimonials',
  '/testimonials/',
  '/testimonials/featured',
  '/testimonials/*',
  '/testimonials/check',  // Add testimonial check endpoint
  '/maps/extract-coordinates',
  '/maps/geocode',
  '/maps/health',
  '/typepage/*',  // Add type page endpoints
  '/typepage'
];

// Endpoints that should be cached
const CACHEABLE_ENDPOINTS = [
  '/properties',
  '/properties/featured',
  '/properties/recommended',
  '/properties/*/views/count',
  '/similar-properties/*',
  '/agents',  // Add agents endpoint to cache
  '/typepage/*', // Add typepage to cacheable endpoints
  '/agents/featured'  // Add featured agents endpoint to cache
];

// Helper function to check if URL should be cached
const shouldCacheRequest = (url) => {
  return CACHEABLE_ENDPOINTS.some(pattern => {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '[^/]+') + '$');
    return regex.test(url);
  });
};

// Helper function to get cached response
const getCachedResponse = (cacheKey) => {
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

// Helper function to set cached response
const setCachedResponse = (cacheKey, data) => {
  cache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
};

// Add error handling utility
const handleError = (error, customMessage = 'An error occurred') => {
  console.error('API Error:', error);
  
  // Check if error is an axios error with response
  if (error.response) {
    const { status, data } = error.response;
    
    // Handle specific status codes
    switch (status) {
      case 400:
        return {
          error: 'bad_request',
          message: data.message || 'Invalid request',
          status
        };
      case 401:
        return {
          error: 'unauthorized',
          message: 'Please login to continue',
          status
        };
      case 403:
        return {
          error: 'forbidden',
          message: 'You do not have permission to perform this action',
          status
        };
      case 404:
        return {
          error: 'not_found',
          message: data.message || 'Resource not found',
          status
        };
      case 429:
        return {
          error: 'rate_limit',
          message: 'Too many requests, please try again later',
          status
        };
      case 500:
        return {
          error: 'server_error',
          message: 'Internal server error',
          status
        };
      default:
        return {
          error: 'unknown',
          message: customMessage,
          status: status || 500
        };
    }
  }

  // Handle network errors
  if (error.request) {
    return {
      error: 'network_error',
      message: 'Network error, please check your connection',
      status: 0
    };
  }

  // Handle other errors
  return {
    error: 'unknown',
    message: customMessage,
    status: 500
  };
};

// Add request interceptor for auth token
api.interceptors.request.use(
  async (config) => {
    const token = await authStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle token expiration
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await authStorage.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Try to refresh the token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken
        });

        // Backend returns snake_case keys
        const { access_token, refresh_token } = response.data;
        if (!access_token) {
          throw new Error('Failed to refresh token');
        }

        await authStorage.setTokens(access_token, refresh_token || refreshToken);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        const tokenError = handleTokenError(refreshError);
        if (tokenError.type === AUTH_ERROR_TYPES.TOKEN_EXPIRED) {
          await authStorage.clearTokens();
        }
        return Promise.reject(tokenError);
      }
    }

    // Handle other errors
    return Promise.reject(handleAuthError(error));
  }
);

// Health check function
const checkHealth = async () => {
  try {
    const response = await api.get('/health', {
      timeout: 5000,
      validateStatus: (status) => status === 200 || status === 401 // Accept 401 as valid for health check
    });
    
    // If we get any response, the server is up
    return true;
  } catch (error) {
    console.error('Health check error:', error);
    // Return false instead of throwing for health check
    return false;
  }
};

// Update the health object in the endpoints export
const health = {
  check: checkHealth
};

// Health check endpoint
const healthCheck = {
  check: () => api.get('/health', { timeout: 5000 })
};

// Auth endpoints
const auth = {
  verifyToken: () => api.get('/auth/verify'),
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  refreshToken: (refresh_token) => api.post('/auth/refresh', { refresh_token })
};

// Profile endpoints
const profile = {
  /**
   * Fetch the current user profile with in-memory caching (30s) and
   * request deduplication so that multiple components asking for the
   * profile at the same time share a single network request.
   */
  get: async () => {
    // Return cached profile if still fresh
    if (profileCache.data && (Date.now() - profileCache.timestamp) < PROFILE_CACHE_DURATION) {
      return {
        data: {
          success: true,
          data: profileCache.data
        }
      };
    }

    const pendingKey = 'profile_get';
    if (pendingRequests.has(pendingKey)) {
      return pendingRequests.get(pendingKey);
    }

    const fetchPromise = (async () => {
      const response = await api.get('/profile', {
        // Always accept 200 or 304 so axios does not throw for 304
        validateStatus: status => status === 200 || status === 304 || status === 401
      });

      // 1. Successful response with data
      if (response.status === 200 && response?.data?.success) {
        profileCache = {
          data: response.data.data,
          timestamp: Date.now()
        };
      }

      // 2. 304 Not Modified – refresh timestamp.
      // If the in-memory cache is empty (possible on first run after app
      // restart), attempt to hydrate it from secure/local storage so that
      // future requests can be served from memory without hitting the
      // network again.
      if (response.status === 304) {
        if (profileCache.data) {
          profileCache.timestamp = Date.now();
        } else {
          const storedProfile = authStorage.getProfileData?.();
          if (storedProfile) {
            profileCache = {
              data: storedProfile,
              timestamp: Date.now(),
            };
          }
        }
      }

      // 3. Unauthorized – clear cache so next authenticated session will refetch
      if (response.status === 401) {
        profileCache = { data: null, timestamp: 0 };
      }

      return response;
    })();

    pendingRequests.set(pendingKey, fetchPromise);

    try {
      return await fetchPromise;
    } finally {
      pendingRequests.delete(pendingKey);
    }
  },
  update: async (formData) => {
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    };
    const response = await api.put('/profile', formData, config);

    // Invalidate profile cache so next get() returns fresh data
    profile.clearCache();

    return response;
  },
  changePassword: async (data) => {
    const response = await api.post('/profile/change-password', data);
    // No need to invalidate profile cache for password change.
    return response;
  },
  clearCache: () => {
    profileCache = { data: null, timestamp: 0 };
  }
};

// Property endpoints
const properties = {
  getAll: (params) => api.get('/properties', { params }),
  getById: (id) => api.get(`/properties/${id}`),
  getPropertyById: (id) => api.get(`/properties/${id}`),
  getFeatured: () => api.get('/properties/featured'),
  getRecommended: () => api.get('/properties/recommended'),
  create: (data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (key === 'features' && typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value);
        }
      }
    });
    return api.post('/properties', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  update: (id, data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (key === 'features' && typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value);
        }
      }
    });
    return api.put(`/properties/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  delete: (id) => api.delete(`/properties/${id}`),
  getUserProperties: async () => {
    try {
      // Check if user is authenticated
      const accessToken = authStorage.getAccessToken();
      if (!accessToken) {
        return { success: true, data: [] };
      }

      const response = await api.get('/properties/user/properties', {
        validateStatus: (status) => status === 200 || status === 401
      });

      // If unauthorized, return empty array
      if (response.status === 401) {
        return { success: true, data: [] };
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching user properties:', error);
      if (error.response?.status === 401) {
        return { success: true, data: [] };
      }
      throw error;
    }
  },
  addToFavorites: async (propertyId) => {
    const response = await api.post(`/favorites/${propertyId}`, {}, {
      timeout: 10000
    });

    // Update cache
    if (response?.data?.success) {
      const cacheKey = `favorite_status_${propertyId}`;
      favoritesCache.set(cacheKey, {
        data: { success: true, isFavorited: true },
        timestamp: Date.now()
      });
    }

    return response.data;
  },
  removeFromFavorites: async (propertyId) => {
    const response = await api.delete(`/favorites/${propertyId}`, {
      timeout: 10000
    });

    // Update cache
    if (response?.data?.success) {
      const cacheKey = `favorite_status_${propertyId}`;
      favoritesCache.set(cacheKey, {
        data: { success: true, isFavorited: false },
        timestamp: Date.now()
      });
    }

    return response.data;
  },
  getFavorites: async () => {
    try {
      // Check if user is authenticated
      const accessToken = authStorage.getAccessToken();
      if (!accessToken) {
        return { success: true, data: [] };
      }

      const response = await api.get('/favorites/user', {
        validateStatus: (status) => status === 200 || status === 401
      });

      // If unauthorized, return empty array
      if (response.status === 401) {
        return { success: true, data: [] };
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching favorites:', error);
      if (error.response?.status === 401) {
        return { success: true, data: [] };
      }
      throw error;
    }
  },
  checkFavoriteStatus: async (propertyId) => {
    try {
      // Check cache first
      const cacheKey = `favorite_status_${propertyId}`;
      const cached = favoritesCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < FAVORITES_CACHE_DURATION) {
        return cached.data;
      }

      const response = await api.get(`/favorites/${propertyId}/status`, {
        timeout: 5000 // Reduce timeout to 5 seconds for status checks
      });

      // Cache the result
      if (response?.data?.success) {
        favoritesCache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        });
      }

      return response.data;
    } catch (error) {
      // Return cached data on error if available
      const cacheKey = `favorite_status_${propertyId}`;
      const cached = favoritesCache.get(cacheKey);
      if (cached) {
        return cached.data;
      }

      // Default response if no cache available
      return {
        success: true,
        isFavorited: false
      };
    }
  },
  getPropertyReviews: (propertyId, params) => api.get(`/properties/${propertyId}/reviews`, { params }),
  addPropertyReview: (propertyId, data) => api.post(`/properties/${propertyId}/reviews`, data),
  updatePropertyReview: (propertyId, reviewId, data) => api.put(`/properties/${propertyId}/reviews/${reviewId}`, data),
  deletePropertyReview: (propertyId, reviewId) => api.delete(`/properties/${propertyId}/reviews/${reviewId}`),
  getSimilarProperties: (propertyId, params) => api.get(`/similar-properties/${propertyId}`, { 
    params,
    transformResponse: [...axios.defaults.transformResponse, (data) => {
      // Ensure we return the correct structure
      return {
        success: true,
        data: data?.data || []
      };
    }],
    // Ensure no auth headers are sent
    headers: {
      'Content-Type': 'application/json'
    }
  })
};

// Property views endpoints
const propertyViews = {
  recordView: async (propertyId) => {
    try {
      const response = await api.post(`/property-views/${propertyId}`, {}, {
        // Don't require authentication for view recording
        validateStatus: (status) => status === 200 || status === 201 || status === 401
      });

      // Invalidate cached count for this property so the next fetch is fresh
      viewCountCache.delete(propertyId);

      // If unauthorized, still consider it a success but don't show error
      if (response.status === 401) {
        return { success: true, data: { count: 0 } };
      }

      return response.data;
    } catch (error) {
      console.error('Error recording view:', error);
      // Return a non-error response to prevent UI disruption
      return { success: true, data: { count: 0 } };
    }
  },

  getViewCount: async (propertyId) => {
    try {
      // Return cached value if available and still fresh
      const cached = viewCountCache.get(propertyId);
      if (cached && (Date.now() - cached.timestamp) < VIEW_COUNT_CACHE_DURATION) {
        return cached.count;
      }

      // If there is already a pending request for this property, reuse it
      const pendingKey = `viewCount_${propertyId}`;
      if (pendingRequests.has(pendingKey)) {
        return pendingRequests.get(pendingKey);
      }

      // Create a promise for the network request and store it so other callers can await it
      const fetchPromise = (async () => {
        const response = await api.get(`/property-views/${propertyId}/count`, {
          validateStatus: (status) => status === 200 || status === 404 || status === 401
        });

        // If property not found, unauthorized, or no views yet, return 0
        if (response.status === 404 || response.status === 401 || !response.data?.data?.count) {
          // Cache zero to prevent spamming the endpoint for nonexistent data
          viewCountCache.set(propertyId, { count: 0, timestamp: Date.now() });
          return 0;
        }

        const count = response.data.data.count;

        // Cache the fetched count
        viewCountCache.set(propertyId, { count, timestamp: Date.now() });

        return count;
      })();

      // Store in pending map
      pendingRequests.set(pendingKey, fetchPromise);

      try {
        const result = await fetchPromise;
        return result;
      } finally {
        // Clean up pending request
        pendingRequests.delete(pendingKey);
      }
    } catch (error) {
      console.error('Error getting view count:', error);
      return 0; // Return 0 on error instead of throwing
    }
  },

  getUserTotalViews: async () => {
    try {
      // Check if user is authenticated
      const accessToken = authStorage.getAccessToken();
      if (!accessToken) {
        return {
          success: true,
          data: { total: 0 }
        };
      }

      const response = await api.get('/property-views/user/total', {
        validateStatus: (status) => status === 200 || status === 401
      });
      
      // If unauthorized, return 0 views
      if (response.status === 401) {
        return {
          success: true,
          data: { total: 0 }
        };
      }
      
      // Ensure we return the correct structure
      if (response.data && typeof response.data === 'object') {
        return {
          success: true,
          data: {
            total: response.data.data?.total || response.data.total || 0
          }
        };
      }
      
      return {
        success: true,
        data: { total: 0 }
      };
    } catch (error) {
      console.error('Error getting total views:', error);
      // Return 0 views on error
      return {
        success: true,
        data: { total: 0 }
      };
    }
  },

  clearCache: (propertyId) => {
    if (propertyId) {
      viewCountCache.delete(propertyId);
    } else {
      viewCountCache.clear();
    }
  }
};

// Testimonials endpoints
const testimonials = {
  getAll: async () => {
    try {
      const response = await api.get('/testimonials', {
        validateStatus: (status) => status === 200 || status === 401
      });
      return response.status === 401 ? { success: true, data: [] } : response.data;
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      return { success: true, data: [] };
    }
  },
  create: async (data) => {
    try {
      const token = authStorage.getAccessToken();
      if (!token) {
        throw new Error('Please log in to submit your testimonial.');
      }

      const response = await api.post('/testimonials', data, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Please log in to submit your testimonial.');
      } else if (error.response?.status === 409) {
        throw new Error('You have already submitted a testimonial.');
      }
      throw error;
    }
  },
  getApproved: async () => {
    try {
      const response = await api.get('/testimonials/approved', {
        validateStatus: (status) => status === 200 || status === 401
      });
      return response.status === 401 ? { success: true, data: [] } : response.data;
    } catch (error) {
      console.error('Error fetching approved testimonials:', error);
      return { success: true, data: [] };
    }
  },
  getFeatured: async () => {
    try {
      const response = await api.get('/testimonials/featured', {
        validateStatus: (status) => status === 200 || status === 401
      });
      return response.status === 401 ? { success: true, data: [] } : response.data;
    } catch (error) {
      console.error('Error fetching featured testimonials:', error);
      return { success: true, data: [] };
    }
  },
  checkUserTestimonial: async () => {
    try {
      const token = authStorage.getAccessToken();
      if (!token) {
        return { success: true, exists: false };
      }

      const response = await api.get('/testimonials/check', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        validateStatus: (status) => status === 200 || status === 401
      });
      
      if (response.status === 401) {
        return { success: true, exists: false };
      }
      
      return response.data;
    } catch (error) {
      console.error('Error checking user testimonial:', error);
      return { success: true, exists: false };
    }
  }
};

// Chat endpoints
const chat = {
  getConversations: () => api.get('/chat/conversations'),
  getMessages: (conversationId) => api.get(`/chat/messages/${conversationId}`),
  sendMessage: (data) => api.post('/chat/messages', data),
  createConversation: (data) => api.post('/chat/conversations', data),
  markAsRead: (conversationId) => api.put(`/chat/messages/read/${conversationId}`)
};

// Notification endpoints
const notifications = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  getSettings: () => api.get('/notifications/settings'),
  updateSettings: (settings) => api.put('/notifications/settings', settings),
  markAsRead: (notificationId) => api.put(`/notifications/${notificationId}/read`),
  markAllAsRead: () => api.put('/notifications/read-all')
};

// Agent endpoints
const agents = {
  getAll: async () => {
    const cacheKey = '/agents';
    const cachedResponse = getCachedResponse(cacheKey);
    
    if (cachedResponse) {
      return cachedResponse;
    }

    const response = await api.get('/agents');
    
    if (response.data?.success) {
      setCachedResponse(cacheKey, response);
    }
    
    return response;
  },
  getFeatured: async () => {
    const cacheKey = '/agents/featured';
    const cachedResponse = getCachedResponse(cacheKey);
    
    if (cachedResponse) {
      return cachedResponse;
    }

    const response = await api.get('/agents/featured');
    
    if (response.data?.success) {
      setCachedResponse(cacheKey, response);
    }
    
    return response;
  },
  getById: (id) => axios.get(`${API_BASE_URL}/agents/${id}`),
  apply: async (formData) => {
    try {
      // Let Axios/XHR set the multipart boundary automatically. If we set the
      // header manually the boundary is omitted, causing the server to treat
      // the request as malformed and the client to see a network error.
      const response = await api.post('/agents/applications', formData, {
        // Override the default JSON header so Axios/RN can send a proper
        // multipart/form-data request with the correct boundary.
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000,
        validateStatus: (status) => status >= 200 && status < 300
      });

      return response;
    } catch (error) {
      console.error('Agent application error:', error);
      throw error;
    }
  },
  getApplicationDetails: async () => {
    try {
      const response = await api.get('/agents/applications/details', {
        headers: {
          'Authorization': `Bearer ${authStorage.getToken('access_token')}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Get application details error:', error);
      if (error.response?.status === 404) {
        return { success: true, data: null };
      }
      throw error;
    }
  }
};

// Contact endpoints
const contact = {
  submit: (formData) => api.post('/contact', formData)
};

// Maps API functions
const maps = {
  extractCoordinates: (url) => mapApi.get(`/maps/extract-coordinates?url=${encodeURIComponent(url)}`),
  geocode: (address) => mapApi.get(`/maps/geocode?address=${encodeURIComponent(address)}`),
  health: () => api.get('/maps/health')
};

// FAQ endpoints
const faqs = {
  getAll: () => api.get('/faqs'),
  getFeatured: () => api.get('/faqs/featured'),
  getByCategory: (category) => api.get(`/faqs/category/${category}`),
  create: (data) => api.post('/faqs', data),
  update: (id, data) => api.put(`/faqs/${id}`, data),
  delete: (id) => api.delete(`/faqs/${id}`)
};

// Blog endpoints
const blogs = {
  getAll: (params) => api.get('/blogs', { params }),
  getRecent: () => api.get('/blogs/recent'),
  getBySlug: (slug) => api.get(`/blogs/${slug}`),
  create: (data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (key === 'tags' && Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value);
        }
      }
    });
    return api.post('/blogs', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  update: (id, data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (key === 'tags' && Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value);
        }
      }
    });
    return api.put(`/blogs/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  delete: (id) => api.delete(`/blogs/${id}`)
};

// Favorites endpoints with caching
const favorites = {
  getUserFavorites: async () => {
    try {
      const cacheKey = 'user_favorites';
      const cached = favoritesCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < FAVORITES_CACHE_DURATION) {
        return cached.data;
      }

      const response = await api.get('/favorites/user', {
        timeout: 10000
      });

      // Cache the result
      if (response?.data?.success) {
        favoritesCache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        });
      }

      return response.data;
    } catch (error) {
      // Return cached data on error if available
      const cached = favoritesCache.get('user_favorites');
      if (cached) {
        return cached.data;
      }
      throw error;
    }
  },

  clearCache: (propertyId = null) => {
    if (propertyId) {
      favoritesCache.delete(`favorite_status_${propertyId}`);
    } else {
      favoritesCache.clear();
    }
  }
};

// Add checkHealth method to the api object
api.checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return true;
  } catch (error) {
    console.error('Health check error:', error);
    return false;
  }
};

// Helper function to build full URL
const buildUrl = (path) => {
  if (typeof path === 'function') {
    return (...args) => `${api.defaults.baseURL}${path(...args)}`;
  }
  return `${api.defaults.baseURL}${path}`;
};

// Update the endpoints export to use buildUrl
export const endpoints = {
  health: { check: checkHealth },
  auth: {
    login: buildUrl('/auth/login'),
    register: buildUrl('/auth/register'),
    logout: buildUrl('/auth/logout'),
    refresh: buildUrl('/auth/refresh'),
    verify: buildUrl('/auth/verify')
  },
  profile,
  properties,
  propertyViews,
  testimonials,
  chat,
  notifications,
  agents,
  contact,
  maps: {
    extractCoordinates: maps.extractCoordinates,
    geocode: maps.geocode,
    health: maps.health
  },
  faqs,
  blogs,
  favorites
};

export { checkHealth };
export default api;