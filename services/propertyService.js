import api from './api';
import authStorage from '../utils/authStorage';
import { ENDPOINTS } from '../config/constants';

// Constants for API calls
const API_TIMEOUT = 15000; // 15 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

export const propertyService = {
  // Get all properties with filters and pagination
  getProperties: async (params) => {
    const cacheKey = generateCacheKey(params);
    
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
        // Convert parameters to match backend expectations
        const queryParams = {
          page: params.page || 1,
          pageSize: params.pageSize || 12,
          status: params.status || undefined,
          propertyType: params.propertyType || undefined,
          governorate: params.governorate || params.governate || undefined,
          city: params.city || undefined,
          village: params.village || undefined,
          priceMin: params.priceMin || undefined,
          priceMax: params.priceMax || undefined,
          areaMin: params.areaMin || undefined,
          areaMax: params.areaMax || undefined,
          bedrooms: params.bedrooms || undefined,
          bathrooms: params.bathrooms || undefined,
          keyword: params.keyword || undefined,
          sortBy: params.sortBy || 'newest'
        };

        // Build query string, filtering out undefined values
        const queryString = Object.entries(queryParams)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&');

        const { data } = await api.get(`/properties?${queryString}`, {
          timeout: API_TIMEOUT
        });

        // Handle both success and error responses
        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch properties');
        }

        const responseData = {
          success: true,
          properties: data.properties || data.data || [],
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
        console.error('Error fetching properties:', error);
        // Return empty result set instead of throwing error for common issues
        if (error.response?.status === 401 || error.response?.status === 403) {
          return {
            success: true,
            properties: [],
            currentPage: params.page || 1,
            totalPages: 1,
            totalCount: 0,
            pageSize: params.pageSize || 12
          };
        }
        throw error;
      } finally {
        // Clean up pending request
        pendingRequests.delete(cacheKey);
      }
    });

    // Store the pending request
    pendingRequests.set(cacheKey, requestPromise);

    return requestPromise;
  },

  // Get single property by ID
  getPropertyById: async (id) => {
    const cacheKey = `property_${id}`;
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return cachedData.data;
    }

    return retryOperation(async () => {
      try {
        const { data } = await api.get(`/properties/${id}`, {
          timeout: API_TIMEOUT
        });

        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch property');
        }

        // Cache the successful response
        const propertyData = data.data || data.property;
        if (!propertyData) {
          throw new Error('Invalid property data received');
        }

        cache.set(cacheKey, {
          data: propertyData,
          timestamp: Date.now()
        });

        return propertyData;
      } catch (error) {
        console.error('Error fetching property:', error);
        if (error.response?.status === 404) {
          throw new Error('Property not found');
        }
        throw new Error(error.message || 'Failed to fetch property details');
      }
    });
  },

  // Clear cache for specific property
  clearPropertyCache: (id) => {
    const cacheKey = `property_${id}`;
    cache.delete(cacheKey);
  },

  // Clear all property caches
  clearAllCaches: () => {
    cache.clear();
    pendingRequests.clear();
  },

  // Get user's properties
  getUserProperties: async () => {
    // Check if user is authenticated
    const accessToken = authStorage.getAccessToken();
    if (!accessToken) {
      return { success: true, data: [] };
    }

    const cacheKey = 'user_properties';
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return cachedData.data;
    }

    return retryOperation(async () => {
      try {
        const { data } = await api.get('/properties/user/properties', {
          timeout: API_TIMEOUT,
          validateStatus: (status) => status === 200 || status === 401
        });

        // If unauthorized, return empty array
        if (data.status === 401) {
          return { success: true, data: [] };
        }

        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch properties');
        }

        // Cache the successful response
        cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });

        return data;
      } catch (error) {
        console.error('Error fetching user properties:', error);
        // Return empty array instead of throwing if unauthorized or other errors
        if (error.response?.status === 401) {
          return { success: true, data: [] };
        }
        throw new Error('Failed to fetch your properties. Please try again.');
      }
    });
  },

  // Toggle property favorite
  toggleFavorite: async (propertyId) => {
    return retryOperation(async () => {
      try {
        const { data } = await api.post(`/favorites/${propertyId}`, null, {
          timeout: API_TIMEOUT
        });
        return data.isFavorite;
      } catch (error) {
        console.error('Error toggling favorite:', error);
        throw error;
      }
    });
  },

  // Get user's favorite properties
  getUserFavorites: async () => {
    // Check if user is authenticated
    const accessToken = authStorage.getAccessToken();
    if (!accessToken) {
      return { success: true, data: [] };
    }

    const cacheKey = 'user_favorites';
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return cachedData.data;
    }

    return retryOperation(async () => {
      try {
        const { data } = await api.get('/favorites/user', {
          timeout: API_TIMEOUT,
          validateStatus: (status) => status === 200 || status === 401
        });

        // If unauthorized, return empty array
        if (data.status === 401) {
          return { success: true, data: [] };
        }

        // Cache the successful response
        cache.set(cacheKey, {
          data: data.data,
          timestamp: Date.now()
        });

        return data;
      } catch (error) {
        console.error('Error fetching user favorites:', error);
        // Return empty array instead of throwing if unauthorized
        if (error.response?.status === 401) {
          return { success: true, data: [] };
        }
        throw new Error('Failed to fetch your favorite properties. Please try again.');
      }
    });
  },

  // Remove property from favorites
  removeFavorite: async (propertyId) => {
    return retryOperation(async () => {
      try {
        const { data } = await api.delete(`/favorites/${propertyId}`, {
          timeout: API_TIMEOUT
        });

        // Clear favorites cache
        cache.delete('user_favorites');
        
        return data;
      } catch (error) {
        console.error('Error removing favorite:', error);
        throw new Error('Failed to remove property from favorites. Please try again.');
      }
    });
  },

  // Check if property is favorited
  checkFavoriteStatus: async (propertyId) => {
    return retryOperation(async () => {
      try {
        const { data } = await api.get(`/favorites/check/${propertyId}`, {
          timeout: API_TIMEOUT
        });
        return data.isFavorite;
      } catch (error) {
        console.error('Error checking favorite status:', error);
        throw error;
      }
    });
  },

  // Create new property
  createProperty: async (propertyData) => {
    return retryOperation(async () => {
      try {
        // Validate required fields
        const requiredFields = ['title', 'property_type', 'price', 'governate', 'city', 'address', 'description', 'area'];
        const missingFields = requiredFields.filter(field => {
          const value = propertyData.get(field);
          return !value || (typeof value === 'string' && value.trim() === '');
        });
        
        if (missingFields.length > 0) {
          console.error('Missing required fields:', missingFields);
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Validate numeric fields
        const numericFields = ['price', 'area', 'bedrooms', 'bathrooms', 'livingrooms', 'parking_spaces', 'year_built', 'floor', 'floors', 'units', 'elevators', 'plot_size', 'ceiling_height', 'loading_docks', 'meeting_rooms', 'shop_front_width', 'storage_area', 'garden_area'];
        numericFields.forEach(field => {
          const value = propertyData.get(field);
          if (value) {
            const numValue = parseFloat(value);
            if (isNaN(numValue)) {
              throw new Error(`Invalid numeric value for field: ${field}`);
            }
            // Replace the string value with the numeric value
            propertyData.set(field, numValue);
          }
        });

        // Log the form data being sent for debugging
        console.log('Sending form data to server:');
        for (let [key, value] of propertyData.entries()) {
          console.log(`${key}: ${value instanceof File ? value.name : value}`);
        }

        // NEW: include authorization header explicitly, to avoid interceptor skipping due to public endpoint pattern
        const accessToken = await authStorage.getAccessToken();
        const headers = {
          'Content-Type': 'multipart/form-data'
        };
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const { data } = await api.post('/properties', propertyData, {
          headers,
          timeout: 30000 // Increase timeout to 30 seconds
        });

        if (!data.success) {
          throw new Error(data.message || 'Failed to create property');
        }

        return data;
      } catch (error) {
        console.error('Error creating property:', error);
        
        if (error.response?.status === 401) {
          throw new Error('Unauthorized. Please log in again.');
        } else if (error.response?.data?.message) {
          throw new Error(error.response.data.message);
        } else if (error.response?.status === 413) {
          throw new Error('File size too large. Please reduce the size of your images.');
        } else if (!navigator.onLine) {
          throw new Error('No internet connection. Please check your network.');
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('Request timed out. Please try again.');
        } else {
          throw error;
        }
      }
    });
  },

  // Update property
  updateProperty: async (id, propertyData) => {
    return retryOperation(async () => {
      try {
        const formData = new FormData();
        Object.keys(propertyData).forEach(key => {
          if (key === 'images') {
            propertyData[key].forEach(image => {
              formData.append('images', image);
            });
          } else {
            formData.append(key, propertyData[key]);
          }
        });

        const { data } = await api.put(`/properties/${id}`, formData, {
          timeout: API_TIMEOUT,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        // Clear caches after updating property
        propertyService.clearPropertyCache(id);
        propertyService.clearAllCaches();

        return data.data;
      } catch (error) {
        console.error('Error updating property:', error);
        throw error;
      }
    });
  },

  // Delete property
  deleteProperty: async (id) => {
    return retryOperation(async () => {
      try {
        const { data } = await api.delete(`/properties/${id}`, {
          timeout: API_TIMEOUT
        });

        // Clear caches after deleting property
        propertyService.clearPropertyCache(id);
        propertyService.clearAllCaches();

        return data;
      } catch (error) {
        console.error('Error deleting property:', error);
        throw new Error('Failed to delete property. Please try again.');
      }
    });
  },

  // Get all properties with optional filters
  getAllProperties: async (filters = {}) => {
    const response = await api.get('/properties', { params: filters });
    return response.data;
  },

  // Get similar properties
  getSimilarProperties: async (propertyId, limit = 3, options = {}) => {
    const cacheKey = `similar_${propertyId}_${limit}`;
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      // Check if request was aborted
      if (options.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      return cachedData.data;
    }

    // Check for pending request with same parameters
    if (pendingRequests.has(cacheKey)) {
      const pendingRequest = pendingRequests.get(cacheKey);
      // If the request has a different signal, create a new one
      if (options.signal && pendingRequest.signal !== options.signal) {
        return new Promise((resolve, reject) => {
          pendingRequest.then(resolve, reject);
          options.signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      }
      return pendingRequest;
    }

    const requestPromise = (async () => {
      try {
        // Check if already aborted
        if (options.signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }

        const response = await api.get(`/properties/${propertyId}/similar`, {
          params: { limit },
          signal: options.signal,
          timeout: API_TIMEOUT
        });

        // Ensure we're returning the correct structure
        const responseData = {
          success: true,
          data: response.data?.data || []
        };

        // Cache the successful response
        cache.set(cacheKey, {
          data: responseData,
          timestamp: Date.now()
        });

        return responseData;
      } catch (error) {
        if (error.name === 'AbortError' || error.code === 'ECONNABORTED' || error.name === 'CanceledError') {
          throw error;
        }
        console.error('Error fetching similar properties:', error);
        throw error;
      } finally {
        pendingRequests.delete(cacheKey);
      }
    })();

    // Store the pending request
    pendingRequests.set(cacheKey, requestPromise);
    requestPromise.signal = options.signal;

    return requestPromise;
  },

  // Create property inquiry
  createInquiry: async (propertyId, inquiryData) => {
    const response = await api.post(`/properties/${propertyId}/inquiries`, inquiryData);
    return response.data;
  },

  // Get featured properties
  getFeaturedProperties: async () => {
    const cacheKey = 'featured_properties';
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return cachedData.data;
    }

    return retryOperation(async () => {
      try {
        const { data } = await api.get('/properties/featured', {
          timeout: API_TIMEOUT
        });

        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch featured properties');
        }

        const responseData = {
          success: true,
          data: data.data || []
        };

        // Cache the successful response
        cache.set(cacheKey, {
          data: responseData,
          timestamp: Date.now()
        });

        return responseData;
      } catch (error) {
        console.error('Error fetching featured properties:', error);
        throw new Error(error.message || 'Failed to fetch featured properties');
      }
    });
  },

  // Get property views
  getPropertyViews: async (propertyId, options = {}) => {
    const cacheKey = `views_${propertyId}`;
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return cachedData.data;
    }

    // Check for pending request
    if (pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey);
    }

    try {
      const response = await api.get(`/properties/${propertyId}/views`, {
        signal: options.signal,
        timeout: API_TIMEOUT
      });

      // Cache the successful response
      const data = response.data;
      cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error;
      }
      console.error('Error getting property views:', error);
      throw error;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  },

  // Record a property view
  recordPropertyView: async (propertyId) => {
    try {
      const response = await api.post(`/properties/${propertyId}/views`);
      return response.data;
    } catch (error) {
      console.error('Error recording property view:', error);
      throw error;
    }
  },

  // Get property details
  getPropertyDetails: async (id) => {
    try {
      const { data } = await api.get(ENDPOINTS.PROPERTIES.DETAILS(id));
      return {
        success: true,
        data: data.property
      };
    } catch (error) {
      console.error('Error fetching property details:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch property details'
      };
    }
  },

  // Search properties
  searchProperties: async (params) => {
    try {
      const { data } = await api.get(ENDPOINTS.PROPERTIES.SEARCH, { params });
      return {
        success: true,
        data: data.properties || [],
        total: data.total || 0
      };
    } catch (error) {
      console.error('Error searching properties:', error);
      return {
        success: false,
        error: error.message || 'Failed to search properties'
      };
    }
  }
};