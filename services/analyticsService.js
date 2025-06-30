import { endpoints } from './api';

// Cache for analytics data with timestamps
const analyticsCache = new Map();
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

export const getPropertyAnalytics = async (propertyId, forceRefresh = false) => {
  try {
    // Check cache first if not forcing refresh
    const now = Date.now();
    const cachedData = analyticsCache.get(propertyId);
    
    if (!forceRefresh && cachedData && (now - cachedData.timestamp < CACHE_EXPIRY_TIME)) {
      return cachedData.data;
    }
    
    // Get basic view count
    const viewResponse = await endpoints.propertyViews.getViewCount(propertyId);
    
    // Support both numeric and object responses
    const views = typeof viewResponse === 'number'
      ? viewResponse
      : (viewResponse?.data?.count ?? 0);
    
    // Get additional analytics data when implemented
    // const analyticsResponse = await api.get(`/analytics/properties/${propertyId}`);
    
    const result = {
      success: true,
      data: {
        views,
        // Add more analytics data here as we implement them
        // favorites: analyticsResponse.data.favorites,
        // inquiries: analyticsResponse.data.inquiries,
        // etc.
      }
    };
    
    // Update cache
    analyticsCache.set(propertyId, {
      data: result,
      timestamp: now
    });
    
    return result;
  } catch (error) {
    console.error('Error fetching property analytics:', error);
    throw error;
  }
};

// Force refresh property analytics
export const refreshPropertyAnalytics = async (propertyId) => {
  return getPropertyAnalytics(propertyId, true);
};

export const getUserPropertyAnalytics = async () => {
  try {
    // Get total views across all user properties
    const viewsResponse = await endpoints.propertyViews.getUserTotalViews();
    
    // Get additional user analytics data when implemented
    // const analyticsResponse = await api.get('/analytics/user/properties');
    
    return {
      success: true,
      data: {
        totalViews: viewsResponse.data.total || 0,
        // Add more analytics data here as we implement them
        // totalProperties: analyticsResponse.data.totalProperties,
        // totalInquiries: analyticsResponse.data.totalInquiries,
        // etc.
      }
    };
  } catch (error) {
    console.error('Error fetching user property analytics:', error);
    throw error;
  }
};

export const recordPropertyView = async (propertyId) => {
  try {
    const result = await endpoints.propertyViews.recordView(propertyId);
    
    // Invalidate cache after recording a view
    analyticsCache.delete(propertyId);
    
    return result;
  } catch (error) {
    console.error('Error recording property view:', error);
    throw error;
  }
};

// Export the endpoints for direct access if needed
export const analyticsEndpoints = {
  recordView: endpoints.propertyViews.recordView,
  getViewCount: endpoints.propertyViews.getViewCount,
  getUserTotalViews: endpoints.propertyViews.getUserTotalViews,
  refreshAnalytics: refreshPropertyAnalytics
};