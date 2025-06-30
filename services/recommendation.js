import api from './api';

// Cross-platform storage helpers – fall back to in-memory store on native
const isWebStorageAvailable = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const memoryStore = {};

const safeStorage = {
  getItem: (key) => {
    if (isWebStorageAvailable()) {
      try {
        return window.localStorage.getItem(key);
      } catch (_) {
        return null;
      }
    }
    return memoryStore[key] ?? null;
  },
  setItem: (key, value) => {
    if (isWebStorageAvailable()) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (_) {/* ignore */}
    }
    memoryStore[key] = value;
  },
  removeItem: (key) => {
    if (isWebStorageAvailable()) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch (_) {/* ignore */}
    }
    delete memoryStore[key];
  }
};

// Constants for local storage
const USER_PREFERENCES_KEY = 'user_property_preferences';
const VIEWED_PROPERTIES_KEY = 'user_viewed_properties';
const MAX_STORED_VIEWS = 20;

// Helper function to calculate similarity score between two properties
const calculateSimilarity = (property1, property2) => {
  let score = 0;
  
  // Compare property type (highest weight)
  if (property1.property_type === property2.property_type) score += 5;
  
  // Compare price range (within 20% range)
  const priceRange = Math.abs(property1.price - property2.price) / property1.price;
  if (priceRange <= 0.2) score += 4;
  
  // Compare location
  if (property1.governate === property2.governate) score += 3;
  if (property1.city === property2.city) score += 2;
  
  // Compare features
  if (property1.bedrooms === property2.bedrooms) score += 1;
  if (property1.bathrooms === property2.bathrooms) score += 1;
  if (property1.area && property2.area) {
    const areaRange = Math.abs(property1.area - property2.area) / property1.area;
    if (areaRange <= 0.2) score += 1;
  }

  return score;
};

// Store user filter preferences in local storage
export const storeUserPreferences = (filters) => {
  try {
    // Only store non-empty filters
    const cleanFilters = Object.entries(filters)
      .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});
      
    if (Object.keys(cleanFilters).length > 0) {
      const existingPrefs = JSON.parse(safeStorage.getItem(USER_PREFERENCES_KEY) || '[]');
      
      // Add timestamp to preferences
      const prefWithTimestamp = {
        ...cleanFilters,
        timestamp: Date.now()
      };
      
      // Keep only the last 10 preference sets
      const updatedPrefs = [prefWithTimestamp, ...existingPrefs].slice(0, 10);
      safeStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(updatedPrefs));
    }
  } catch (error) {
    console.error('Error storing user preferences:', error);
  }
};

// Store viewed property in local storage
export const storeViewedProperty = async (property) => {
  try {
    if (!property || !property.id) return;

    // ------------------------------------------------------------
    // 1. Update local (or in-memory) cache so we can make instant
    //    client-side recommendations even before the server reply.
    // ------------------------------------------------------------
    const viewedProperties = JSON.parse(safeStorage.getItem(VIEWED_PROPERTIES_KEY) || '[]');

    // Remove existing entry so the newest occurrence is always first
    const existingIndex = viewedProperties.findIndex(p => p.id === property.id);
    if (existingIndex !== -1) viewedProperties.splice(existingIndex, 1);

    const propertyWithTimestamp = {
      id: property.id,
      property_type: property.property_type,
      price: property.price,
      governate: property.governate,
      city: property.city,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      area: property.area,
      timestamp: Date.now()
    };

    const updatedViews = [propertyWithTimestamp, ...viewedProperties].slice(0, MAX_STORED_VIEWS);
    safeStorage.setItem(VIEWED_PROPERTIES_KEY, JSON.stringify(updatedViews));

    // ------------------------------------------------------------
    // 2. Notify the backend so the Python ML engine can use the
    //    centralized `property_views` table. We send the request in
    //    the background; failures are logged but not surfaced.
    // ------------------------------------------------------------
    try {
      await api.post(`/property-views/${property.id}`);
    } catch (err) {
      // Fail silently; the local cache is still available for JS fallback
      console.warn('Failed to record property view on server:', err?.message || err);
    }
  } catch (error) {
    console.error('Error storing viewed property:', error);
  }
};

// Get user's stored preferences and viewed properties
const getUserLocalData = () => {
  try {
    const preferences = JSON.parse(safeStorage.getItem(USER_PREFERENCES_KEY) || '[]');
    const viewedProperties = JSON.parse(safeStorage.getItem(VIEWED_PROPERTIES_KEY) || '[]');
    return { preferences, viewedProperties };
  } catch (error) {
    console.error('Error getting user local data:', error);
    return { preferences: [], viewedProperties: [] };
  }
};

// Get recommended properties for non-authenticated users
const getDefaultRecommendations = async (limit = 5) => {
  try {
    const response = await api.get('/properties/recommended');
    const properties = response?.data?.data || [];
    // Add source to the data
    const recommendations = properties.slice(0, limit);
    recommendations.source = 'default';
    return recommendations;
  } catch (error) {
    console.error('Error getting recommended properties:', error);
    return [];
  }
};

// Get recommended properties based on user's local preferences and viewing history
const getLocalRecommendations = async (limit = 5) => {
  try {
    const { preferences, viewedProperties } = getUserLocalData();
    
    // If no local data, return default recommendations
    if (preferences.length === 0 && viewedProperties.length === 0) {
      return getDefaultRecommendations(limit);
    }
    
    // Get all available properties
    const propertiesResponse = await api.get('/properties', {
      params: { pageSize: 50 }, // Get a larger set to filter from
      validateStatus: (status) => status === 200 || status === 401
    });
    
    if (propertiesResponse.status === 401 || !propertiesResponse?.data?.properties?.length) {
      return [];
    }
    
    const allProperties = propertiesResponse?.data?.properties || [];
    
    if (!allProperties.length) {
      return [];
    }
    
    // Filter out properties the user has already viewed
    const viewedIds = viewedProperties.map(p => p.id);
    const unviewedProperties = allProperties.filter(p => !viewedIds.includes(p.id));
    
    // Calculate scores based on viewed properties
    const propertiesWithScores = unviewedProperties.map(property => {
      let totalScore = 0;
      
      // Score based on viewed properties
      if (viewedProperties.length > 0) {
        const viewScore = viewedProperties.reduce((score, viewedProp) => {
          return score + calculateSimilarity(viewedProp, property);
        }, 0) / viewedProperties.length;
        
        totalScore += viewScore * 2; // Double weight for viewed properties
      }
      
      // Score based on filter preferences
      if (preferences.length > 0) {
        const preferenceScore = preferences.reduce((score, pref) => {
          let prefScore = 0;
          
          // Match property type
          if (pref.propertyType && property.property_type === pref.propertyType) {
            prefScore += 3;
          }
          
          // Match location
          if (pref.governorate && property.governate === pref.governorate) {
            prefScore += 2;
          }
          if (pref.city && property.city === pref.city) {
            prefScore += 2;
          }
          
          // Match price range
          if (pref.priceMin && pref.priceMax) {
            if (property.price >= pref.priceMin && property.price <= pref.priceMax) {
              prefScore += 2;
            }
          } else if (pref.priceMin && property.price >= pref.priceMin) {
            prefScore += 1;
          } else if (pref.priceMax && property.price <= pref.priceMax) {
            prefScore += 1;
          }
          
          // Match area range
          if (pref.areaMin && pref.areaMax) {
            if (property.area >= pref.areaMin && property.area <= pref.areaMax) {
              prefScore += 2;
            }
          } else if (pref.areaMin && property.area >= pref.areaMin) {
            prefScore += 1;
          } else if (pref.areaMax && property.area <= pref.areaMax) {
            prefScore += 1;
          }
          
          // Match bedrooms/bathrooms
          if (pref.bedrooms && property.bedrooms >= pref.bedrooms) {
            prefScore += 1;
          }
          if (pref.bathrooms && property.bathrooms >= pref.bathrooms) {
            prefScore += 1;
          }
          
          // Apply recency weight (more recent preferences get higher weight)
          const ageInDays = (Date.now() - (pref.timestamp || 0)) / (1000 * 60 * 60 * 24);
          const recencyWeight = Math.max(0.5, 1 - (ageInDays / 30)); // Weight decreases over 30 days
          
          return score + (prefScore * recencyWeight);
        }, 0) / preferences.length;
        
        totalScore += preferenceScore;
      }
      
      return {
        property,
        score: totalScore
      };
    });
    
    // Sort by score and return top recommendations
    const recommendations = propertiesWithScores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.property);
    
    // Add source to the data
    recommendations.source = 'js';
    return recommendations;
  } catch (error) {
    console.error('Error in getLocalRecommendations:', error);
    return getDefaultRecommendations(limit);
  }
};

// Get personalized recommendations from the server (for logged-in users)
const getPersonalizedRecommendations = async (userId, limit = 5) => {
  try {
    if (!userId) {
      return getLocalRecommendations(limit);
    }

    // Try to get ML-based recommendations from the server first
    try {
      const mlResponse = await api.get('/recommendation/recommended', {
        params: { user_id: userId, limit },
        validateStatus: (status) => status === 200 || status === 401 || status === 500
      });

      // If we got successful ML recommendations, use them
      if (mlResponse.status === 200 && mlResponse?.data?.success && 
          Array.isArray(mlResponse?.data?.data) && mlResponse?.data?.data.length > 0) {
        console.log('Using ML-based recommendations from server');
        // Add source to the data
        const recommendations = mlResponse.data.data;
        recommendations.source = mlResponse.data.source || 'ml';
        return recommendations;
      }
      
      console.log('ML recommendations unavailable, falling back to local algorithm');
    } catch (mlError) {
      console.error('Error getting ML recommendations:', mlError);
      console.log('Falling back to local recommendation algorithm');
    }

    // Get user's recently viewed properties from server
    try {
      const viewsResponse = await api.get('/property-views/user', {
        validateStatus: (status) => status === 200 || status === 401 // Accept 401 as valid response
      });

      // If unauthorized or no views, fall back to local recommendations
      if (viewsResponse.status === 401 || !viewsResponse?.data?.data?.length) {
        return getLocalRecommendations(limit);
      }

      const recentViews = viewsResponse?.data?.data || [];

      // Get all available properties
      const propertiesResponse = await api.get('/properties', {
        validateStatus: (status) => status === 200 || status === 401
      });

      // If unauthorized or no properties, return empty array
      if (propertiesResponse.status === 401 || !propertiesResponse?.data?.properties?.length) {
        return [];
      }

      const allProperties = propertiesResponse?.data?.properties || [];
      
      if (!allProperties.length) {
        return [];
      }

      // Calculate similarity scores for each property based on viewing history
      const propertyScores = allProperties
        .filter(prop => !recentViews.find(view => view.property_id === prop.id)) // Exclude viewed properties
        .map(property => {
          const totalScore = recentViews.reduce((score, view) => {
            return score + calculateSimilarity(view.property, property);
          }, 0);
          
          return {
            property,
            score: totalScore / recentViews.length // Average score
          };
        });

      // Sort by score and return top recommendations
      const recommendations = propertyScores
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.property);
      
      // Add source to the data
      recommendations.source = 'js';
      return recommendations;

    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return getLocalRecommendations(limit);
    }
  } catch (error) {
    console.error('Error in getPersonalizedRecommendations:', error);
    return getLocalRecommendations(limit);
  }
};

// ------------------------------------------------------------
// Simple in-memory cache for recommendation results to avoid
// hammering the /properties/recommended endpoint every render.
// ------------------------------------------------------------
const REC_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const recCache = new Map(); // key -> { data, timestamp }

const getRecCacheKey = (userId, limit) => `${userId || 'guest'}_${limit}`;

// Helper to get from cache
const getCachedRecs = (userId, limit) => {
  const key = getRecCacheKey(userId, limit);
  const entry = recCache.get(key);
  if (entry && (Date.now() - entry.timestamp) < REC_CACHE_DURATION) {
    return entry.data;
  }
  return null;
};

// Helper to set cache
const setCachedRecs = (userId, limit, data) => {
  recCache.set(getRecCacheKey(userId, limit), {
    data,
    timestamp: Date.now()
  });
};

// In-flight promise dedupe to avoid parallel calls
const pendingRecPromises = new Map();

// Main recommendation function that handles both authenticated and non-authenticated users
export const getRecommendedProperties = async (userId = null, limit = 5) => {
  try {
    // Check cache first
    const cached = getCachedRecs(userId, limit);
    if (cached) return cached;

    // Deduplicate concurrent requests
    const pendingKey = getRecCacheKey(userId, limit);
    if (pendingRecPromises.has(pendingKey)) {
      return pendingRecPromises.get(pendingKey);
    }

    const fetchPromise = (async () => {
      let result;
      if (userId) {
        result = await getPersonalizedRecommendations(userId, limit);
      } else {
        result = await getLocalRecommendations(limit);
      }

      // Cache successful result
      if (Array.isArray(result)) {
        setCachedRecs(userId, limit, result);
      }

      return result;
    })();

    pendingRecPromises.set(pendingKey, fetchPromise);

    try {
      return await fetchPromise;
    } finally {
      pendingRecPromises.delete(pendingKey);
    }
  } catch (error) {
    console.error('Error in getRecommendedProperties:', error);
    return [];
  }
}; 