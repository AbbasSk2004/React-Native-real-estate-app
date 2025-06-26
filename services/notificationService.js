import api from './api';
import { formatNotificationForDisplay } from '../utils/notificationUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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

const validateSettings = (settings) => {
  const { notification_preferences } = settings;
  
  if (!notification_preferences) {
    throw new Error('Invalid settings format: notification_preferences is required');
  }

  const requiredFields = [
    'push_enabled',
    'email_enabled',
    'sms_enabled',
    'notification_types',
    'digest_settings',
    'quiet_hours'
  ];

  const missingFields = requiredFields.filter(field => 
    notification_preferences[field] === undefined
  );

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  return true;
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
      console.error('Error fetching notifications:', error);
      
      // Try to return cached data if available
      const cachedData = await getCachedNotifications();
      if (cachedData) {
        return {
          data: {
            notifications: cachedData,
            fromCache: true
          },
          error: null
        };
      }
      
      return {
        data: {
          notifications: [],
          fromCache: false
        },
        error: error.message
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

  // Get notification settings
  getSettings: async (signal) => {
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }

    const makeRequest = () => api.get('/notifications/settings', { 
      signal,
      timeout: 5000
    });
    
    try {
      const response = await retryRequest(makeRequest);
      return { data: response.data, error: null };
    } catch (error) {
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
        console.error('Error fetching notification settings:', error);
      }
      return { data: null, error };
    }
  },

  // Update notification settings
  updateSettings: async (settings) => {
    try {
      validateSettings(settings);
      const response = await api.put('/notifications/settings', settings);
      return { data: response.data.data, error: null };
    } catch (error) {
      console.error('Error updating notification settings:', error);
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
  },

  // Check if notification should be shown based on settings
  shouldShowNotification: (notification, settings) => {
    if (!settings) return true;
    
    // Check notification type settings
    const typeEnabled = settings[`${notification.type}_enabled`] !== false;
    if (!typeEnabled) return false;
    
    // Check quiet hours
    if (settings.quiet_hours_enabled) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;
      
      const [startHour, startMinute] = settings.quiet_hours_start.split(':').map(Number);
      const [endHour, endMinute] = settings.quiet_hours_end.split(':').map(Number);
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;
      
      if (startTime <= endTime) {
        // Same day quiet hours
        if (currentTime >= startTime && currentTime <= endTime) {
          return false;
        }
      } else {
        // Overnight quiet hours
        if (currentTime >= startTime || currentTime <= endTime) {
          return false;
        }
      }
    }
    
    return true;
  }
};

export default notificationService; 