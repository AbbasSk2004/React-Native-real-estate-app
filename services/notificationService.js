import api from './api';
import { formatNotificationForDisplay } from '../utils/notificationUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { showBrowserNotification } from '../utils/notificationUtils';

const CACHE_KEY = 'cached_notifications';
const CACHE_TIMESTAMP_KEY = 'notifications_cache_timestamp';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

// Determine if we're running in a web or native environment
const isWeb = Platform.OS === 'web';

// Cache utilities
const getCachedNotifications = async () => {
  try {
    let cached, timestamp;
    
    if (isWeb && typeof window !== 'undefined' && window.localStorage) {
      cached = localStorage.getItem(CACHE_KEY);
      timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    } else {
      // Use AsyncStorage for React Native
      cached = await AsyncStorage.getItem(CACHE_KEY);
      timestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
    }
    
    if (!cached || !timestamp) {
      return null;
    }

    // Check if cache is still valid (within CACHE_DURATION)
    if (Date.now() - Number(timestamp) > CACHE_DURATION) {
      if (isWeb && typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      } else {
        await AsyncStorage.removeItem(CACHE_KEY);
        await AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY);
      }
      return null;
    }

    return JSON.parse(cached);
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
};

const setCachedNotifications = async (notifications) => {
  try {
    const serialized = JSON.stringify(notifications);
    
    if (isWeb && typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(CACHE_KEY, serialized);
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } else {
      // Use AsyncStorage for React Native
      await AsyncStorage.setItem(CACHE_KEY, serialized);
      await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    }
  } catch (error) {
    console.error('Error writing to cache:', error);
  }
};

const clearCache = async () => {
  try {
    if (isWeb && typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    } else {
      await AsyncStorage.removeItem(CACHE_KEY);
      await AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY);
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

// Retry utility with exponential backoff
const retryRequest = async (requestFn, maxRetries = 2, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on cancellation or client errors
      if (error.name === 'CanceledError' || 
          error.name === 'AbortError' || 
          (error.response && error.response.status < 500)) {
        throw error;
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Wait before retrying with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

const notificationService = {
  // Get all notifications for the current user
  getAllNotifications: async (signal) => {
    try {
      // First, try to get cached notifications
      const cachedData = await getCachedNotifications();
      
      // Make the API request
      const response = await api.get('/notifications', { signal });
      
      if (!response.data || !response.data.success) {
        // If API request fails but we have cache, return cached data
        if (cachedData) {
          return {
            data: {
              notifications: cachedData,
              fromCache: true
            },
            error: null
          };
        }
        throw new Error(response.data?.error || 'Failed to fetch notifications');
      }
      
      // Process notifications to format them for display
      const notifications = response.data.data || [];
      const formattedNotifications = notifications.map(notification => 
        formatNotificationForDisplay(notification)
      );
      
      // Cache the new notifications
      await setCachedNotifications(formattedNotifications);
      
      return {
        data: {
          notifications: formattedNotifications,
          fromCache: false
        },
        error: null
      };
    } catch (error) {
      // Check for abort or cancellation - don't treat as error
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        throw error; // Rethrow to be handled by caller
      }
      
      // Try to return cached data if available
      const cachedData = await getCachedNotifications();
      if (cachedData) {
        // Don't log this as an error since we have cached data
        console.log('Using cached notifications due to network error');
        return {
          data: {
            notifications: cachedData,
            fromCache: true
          },
          error: null
        };
      }
      
      // Only log actual errors when we can't use cache
      console.error('Error fetching notifications:', error);
      
      // Create a more descriptive error
      const errorMessage = error.response 
        ? `Server error: ${error.response.status}` 
        : error.request 
          ? 'Network error occurred' 
          : error.message || 'Unknown error';
      
      return {
        data: {
          notifications: [],
          fromCache: false
        },
        error: errorMessage,
        type: error.request ? 'network_error' : 'api_error'
      };
    }
  },

  // Clear cache (useful when logging out)
  clearCache: async () => {
    await clearCache();
  },

  // Mark a notification as read
  markAsRead: async (notificationId) => {
    try {
      const response = await api.put(`/notifications/${notificationId}/read`);
      return { data: response.data.data, error: null };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { data: null, error };
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      const response = await api.put('/notifications/read-all');
      
      // Clear the cache since notification read states have changed
      await notificationService.clearCache();
      
      return { data: response.data.data, error: null };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { data: null, error };
    }
  },

  // Delete a notification
  delete: async (notificationId) => {
    const makeRequest = () => api.delete(`/notifications/${notificationId}`, {
      timeout: 5000
    });
    
    try {
      const response = await retryRequest(makeRequest);
      
      // Clear the cache since notifications have changed
      await notificationService.clearCache();
      
      return { data: response.data, error: null };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { data: null, error };
    }
  },

  // Get unread notification count
  getUnreadCount: async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      return { data: response.data, error: null };
    } catch (error) {
      console.error('Error getting unread count:', error);
      return { data: { count: 0 }, error };
    }
  },

  // Get notification statistics
  getNotificationStats: async () => {
    try {
      const response = await api.get('/notifications/stats');
      return { data: response.data.data, error: null };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return { data: null, error };
    }
  },

  // Get notifications by type
  getNotificationsByType: async (type) => {
    try {
      const response = await api.get(`/notifications/type/${type}`);
      return { data: response.data.data, error: null };
    } catch (error) {
      console.error(`Error fetching ${type} notifications:`, error);
      return { data: null, error };
    }
  },

  // Bulk operations
  bulkMarkAsRead: async (notificationIds) => {
    try {
      const response = await api.put('/notifications/bulk-read', {
        notification_ids: notificationIds
      });
      
      // Clear cache since notification states have changed
      await notificationService.clearCache();
      
      return { data: response.data.data, error: null };
    } catch (error) {
      console.error('Error bulk marking notifications as read:', error);
      return { data: null, error };
    }
  },

  bulkDelete: async (notificationIds) => {
    try {
      const response = await api.delete('/notifications/bulk-delete', {
        data: { notification_ids: notificationIds }
      });
      
      // Clear cache since notifications have been deleted
      await notificationService.clearCache();
      
      return { data: response.data.data, error: null };
    } catch (error) {
      console.error('Error bulk deleting notifications:', error);
      return { data: null, error };
    }
  },

  // Clear all notifications for the current user
  clearAllNotifications: async () => {
    try {
      // First get all notifications to get their IDs
      const { data: notificationsResponse } = await notificationService.getAllNotifications();
      if (!notificationsResponse?.notifications?.length) {
        return { data: [], error: null };
      }

      const notificationIds = notificationsResponse.notifications.map(n => n.id);
      
      // Then bulk delete them
      const response = await notificationService.bulkDelete(notificationIds);
      
      // Clear the cache after successful deletion
      await notificationService.clearCache();
      
      return response;
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      return { data: null, error };
    }
  },

  // Test notification
  testNotification: async () => {
    try {
      const response = await api.post('/notifications/test');
      return { data: response.data.data, error: null };
    } catch (error) {
      console.error('Error sending test notification:', error);
      return { data: null, error };
    }
  },

  // Get notification types
  getNotificationTypes: () => {
    return [
      { value: 'all', label: 'All Notifications' },
      { value: 'message', label: 'Messages' },
      { value: 'favorite_added', label: 'Property Favorites' },
      { value: 'testimonial_approved', label: 'Testimonial Approvals' },
      { value: 'agent_application_approved', label: 'Agent Application Approved' },
      { value: 'agent_application_rejected', label: 'Agent Application Rejected' },
      { value: 'property_inquiry', label: 'Property Inquiries' },
      { value: 'property_approved', label: 'Property Approvals' },
      { value: 'property_rejected', label: 'Property Rejections' },
      { value: 'system', label: 'System Updates' }
    ];
  },

  // Format notification for display
  formatNotification: (notification) => {
    const now = new Date();
    const created = new Date(notification.created_at);
    const diffInMinutes = Math.floor((now - created) / (1000 * 60));
    
    let timeAgo;
    if (diffInMinutes < 1) {
      timeAgo = 'Just now';
    } else if (diffInMinutes < 60) {
      timeAgo = `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      timeAgo = `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      timeAgo = `${days}d ago`;
    }

    return {
      ...notification,
      timeAgo,
      formattedDate: created.toLocaleDateString(),
      formattedTime: created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }
};

// ==========================
// Local push notification helper
// ==========================

/**
 * Display a local push / browser notification for the given payload.
 * Works on native (Expo + FCM) and web.
 * This does NOT require the Expo push token – it simply triggers a system
 * notification on the device, which is useful when you are already connected via
 * WebSocket and want to surface the event even if Expo remote push is not
 * configured.
 *
 * @param {object} notification - The notification payload from the server.
 *   Expected fields: { title, message, type, data }
 */
export const showLocalNotification = async (notification) => {
  if (!notification) return;

  const title = notification.title || 'New notification';
  const body = notification.message || notification.content || 'You have a new notification';

  // Web platform ➜ use the existing browser notification helper
  if (Platform.OS === 'web') {
    showBrowserNotification(title, body);
    return;
  }

  // Native platforms ➜ use expo-notifications local push
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: notification.data || {},
        sound: true,
      },
      trigger: null, // Immediate
    });
  } catch (err) {
    console.error('[notificationService] Failed to show local notification:', err);
  }
};

// Re-export in the default export, so callers can do:
// import notificationService, { showLocalNotification } from '...'
// without causing breaking changes.

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  ...notificationService,
  showLocalNotification,
}; 