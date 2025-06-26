import { endpoints } from './api';

export const getPropertyAnalytics = async (propertyId) => {
  try {
    // Get basic view count
    const viewResponse = await endpoints.propertyViews.getViewCount(propertyId);
    
    // Support both numeric and object responses
    const views = typeof viewResponse === 'number'
      ? viewResponse
      : (viewResponse?.data?.count ?? 0);
    
    // Get additional analytics data when implemented
    // const analyticsResponse = await api.get(`/analytics/properties/${propertyId}`);
    
    return {
      success: true,
      data: {
        views,
        // Add more analytics data here as we implement them
        // favorites: analyticsResponse.data.favorites,
        // inquiries: analyticsResponse.data.inquiries,
        // etc.
      }
    };
  } catch (error) {
    console.error('Error fetching property analytics:', error);
    throw error;
  }
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
    return await endpoints.propertyViews.recordView(propertyId);
  } catch (error) {
    console.error('Error recording property view:', error);
    throw error;
  }
};

// Export the endpoints for direct access if needed
export const analyticsEndpoints = {
  recordView: endpoints.propertyViews.recordView,
  getViewCount: endpoints.propertyViews.getViewCount,
  getUserTotalViews: endpoints.propertyViews.getUserTotalViews
};