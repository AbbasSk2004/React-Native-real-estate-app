// Notification utility functions
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Storage key for permission tracking
const PERMISSION_REQUESTED_KEY = 'notification_permission_requested';

export const NOTIFICATION_TYPES = {
  MESSAGE: 'message',
  PROPERTY_INQUIRY: 'property_inquiry',
  PROPERTY_APPROVED: 'property_approved',
  PROPERTY_REJECTED: 'property_rejected',
  AGENT_APPLICATION: 'agent_application',
  FAVORITE_ADDED: 'favorite_added',
  PRICE_CHANGE: 'price_drop',
  NEW_LISTING: 'new_property',
  SYSTEM: 'system',
  TESTIMONIAL_APPROVED: 'testimonial_approved',
  AGENT_APPLICATION_APPROVED: 'agent_application_approved',
  AGENT_APPLICATION_REJECTED: 'agent_application_rejected'
};

// Determine if we're running in a web or native environment
const isWeb = Platform.OS === 'web';

// Map notification types to icons (for Ionicons)
export const getNotificationIcon = (type) => {
  switch (type) {
    case NOTIFICATION_TYPES.FAVORITE_ADDED:
      return 'heart';
    case NOTIFICATION_TYPES.NEW_LISTING:
      return 'home';
    case NOTIFICATION_TYPES.PRICE_CHANGE:
      return 'trending-down';
    case NOTIFICATION_TYPES.MESSAGE:
      return 'chatbubble-ellipses';
    case NOTIFICATION_TYPES.PROPERTY_INQUIRY:
      return 'help-circle';
    case NOTIFICATION_TYPES.PROPERTY_APPROVED:
      return 'checkmark-circle';
    case NOTIFICATION_TYPES.PROPERTY_REJECTED:
      return 'close-circle';
    case NOTIFICATION_TYPES.TESTIMONIAL_APPROVED:
      return 'star';
    case NOTIFICATION_TYPES.AGENT_APPLICATION_APPROVED:
      return 'person-add';
    case NOTIFICATION_TYPES.AGENT_APPLICATION_REJECTED:
      return 'person-remove';
    case NOTIFICATION_TYPES.SYSTEM:
      return 'settings';
    default:
      return 'notifications';
  }
};

// Map notification types to colors for UI
export const getNotificationColor = (type) => {
  switch (type) {
    case NOTIFICATION_TYPES.FAVORITE_ADDED:
      return '#FF5E5E';
    case NOTIFICATION_TYPES.NEW_LISTING:
      return '#0061FF';
    case NOTIFICATION_TYPES.PRICE_CHANGE:
      return '#4CAF50';
    case NOTIFICATION_TYPES.MESSAGE:
      return '#9C27B0';
    case NOTIFICATION_TYPES.PROPERTY_INQUIRY:
      return '#00BCD4';
    case NOTIFICATION_TYPES.PROPERTY_APPROVED:
      return '#4CAF50';
    case NOTIFICATION_TYPES.PROPERTY_REJECTED:
      return '#F44336';
    case NOTIFICATION_TYPES.TESTIMONIAL_APPROVED:
      return '#FFC107';
    case NOTIFICATION_TYPES.AGENT_APPLICATION_APPROVED:
      return '#2196F3';
    case NOTIFICATION_TYPES.AGENT_APPLICATION_REJECTED:
      return '#795548';
    case NOTIFICATION_TYPES.SYSTEM:
      return '#607D8B';
    default:
      return '#666876';
  }
};

// Get notification action URL for navigation
export const getNotificationActionUrl = (notification) => {
  if (notification.data?.action_url) {
    return notification.data.action_url;
  }

  switch (notification.type) {
    case 'message':
      return notification.data?.conversation_id ? `/chat?id=${notification.data.conversation_id}` : '/messages';
    case 'favorite_added':
      return notification.data?.property_id ? `/properties/${notification.data.property_id}` : '/profile';
    case 'testimonial_approved':
      return '/profile';
    case 'agent_application_approved':
    case 'agent_application_rejected':
      return '/profile';
    case 'property_inquiry':
      return notification.data?.property_id ? `/properties/${notification.data.property_id}` : '/inquiries';
    case 'property_approved':
    case 'property_rejected':
      return notification.data?.property_id ? `/properties/${notification.data.property_id}` : '/profile';
    default:
      return null;
  }
};

// Format notification timestamp to relative time
export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  
  const now = new Date();
  const notificationDate = new Date(timestamp);
  const diffInSeconds = Math.floor((now - notificationDate) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return notificationDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  }
};

// Display a browser notification if supported
export const showBrowserNotification = (title, body, icon = null) => {
  // Only available in browser environments
  if (!isWeb || typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }
  
  // Check if permission is already granted
  if (Notification.permission === 'granted') {
    const options = {
      body,
      icon: icon || '/images/notification-icon.png',
      badge: '/images/notification-badge.png'
    };
    
    const notification = new Notification(title, options);
    
    // Add click handler to the notification
    notification.onclick = function() {
      window.focus();
      this.close();
    };
    
    return notification;
  }
  
  // Request permission if not asked before
  if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        showBrowserNotification(title, body, icon);
      }
    });
  }
};

// Play notification sound if supported
export const playNotificationSound = () => {
  // Only available in browser environments
  if (!isWeb || typeof window === 'undefined' || !('Audio' in window)) {
    return;
  }
  
  try {
    const audio = new Audio('/sounds/notification.mp3');
    audio.play().catch(error => {
      console.error('Error playing notification sound:', error);
    });
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

// Format notification data for display
export const formatNotificationForDisplay = (notification) => {
  if (!notification) return null;
  
  return {
    ...notification,
    formattedTime: formatRelativeTime(notification.created_at),
    icon: getNotificationIcon(notification.type),
    color: getNotificationColor(notification.type),
    actionUrl: getNotificationActionUrl(notification)
  };
};

export const getNotificationTypeLabel = (type) => {
  const labels = {
    'message': 'Messages',
    'favorite_added': 'Property Favorites',
    'testimonial_approved': 'Testimonial Approvals',
    'agent_application_approved': 'Agent Application Approved',
    'agent_application_rejected': 'Agent Application Rejected',
    'property_inquiry': 'Property Inquiries',
    'property_approved': 'Property Approvals',
    'property_rejected': 'Property Rejections',
    'system': 'System Updates'
  };
  return labels[type] || 'Other';
};

export const getNotificationTypeDescription = (type) => {
  const descriptions = {
    'message': 'Notifications about new messages from other users',
    'favorite_added': 'Notifications when someone favorites your property',
    'testimonial_approved': 'Notifications when your testimonial is approved',
    'agent_application_approved': 'Notifications when your agent application is approved',
    'agent_application_rejected': 'Notifications when your agent application is rejected',
    'property_inquiry': 'Notifications about new property inquiries',
    'property_approved': 'Notifications when your property is approved',
    'property_rejected': 'Notifications when your property is rejected',
    'system': 'System-wide notifications and updates'
  };
  return descriptions[type] || 'General notifications';
};

export const groupNotificationsByDate = (notifications) => {
  const groups = {};
  
  notifications.forEach(notification => {
    const date = new Date(notification.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let groupName;
    if (date.toDateString() === today.toDateString()) {
      groupName = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupName = 'Yesterday';
    } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
      groupName = 'This Week';
    } else {
      groupName = 'Older';
    }
    
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(notification);
  });
  
  return groups;
};

export const filterNotifications = (notifications, filter) => {
  switch (filter) {
    case 'unread':
      return notifications.filter(n => !n.read);
    case 'read':
      return notifications.filter(n => n.read);
    case 'all':
    default:
      return notifications;
  }
};

export const shouldShowNotificationToast = (notification, settings) => {
  if (!settings) return true;
  
  // Check if toast notifications are enabled
  if (settings.toast_notifications === false) {
    return false;
  }
  
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
};

export const createBrowserNotification = (notification) => {
  // Check if browser notifications are supported
  if (!('Notification' in window)) {
    console.log('This browser does not support desktop notification');
    return;
  }

  // Check if permission is granted
  if (Notification.permission === 'granted') {
    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      tag: notification.id,
      requireInteraction: false,
      silent: false
    });

    // Handle click on browser notification
    browserNotification.onclick = () => {
      const actionUrl = getNotificationActionUrl(notification);
      if (actionUrl) {
        window.focus();
        window.location.href = actionUrl;
      }
      browserNotification.close();
    };

    // Auto close after 5 seconds
    setTimeout(() => {
      browserNotification.close();
    }, 5000);
  } else if (Notification.permission !== 'denied') {
    // Request permission
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        createBrowserNotification(notification);
      }
    });
  }
};

export const getNotificationPriority = (type) => {
  const priorities = {
    'message': 1,
    'favorite_added': 2,
    'testimonial_approved': 3,
    'agent_application_approved': 4,
    'agent_application_rejected': 4,
    'property_inquiry': 5,
    'property_approved': 6,
    'property_rejected': 6,
    'system': 7
  };
  return priorities[type] || 8;
};

export const sortNotificationsByPriority = (notifications) => {
  return notifications.sort((a, b) => {
    const priorityA = getNotificationPriority(a.type);
    const priorityB = getNotificationPriority(b.type);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    return new Date(b.created_at) - new Date(a.created_at);
  });
};

export const getNotificationStats = (notifications) => {
  const stats = {
    total: notifications.length,
    unread: 0,
    byType: {},
    byPriority: {
      high: 0,
      medium: 0,
      low: 0
    },
    recent: 0 // Last 24 hours
  };

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  notifications.forEach(notification => {
    // Count unread
    if (!notification.read) {
      stats.unread++;
    }

    // Count by type
    if (!stats.byType[notification.type]) {
      stats.byType[notification.type] = 0;
    }
    stats.byType[notification.type]++;

    // Count by priority
    const priority = getNotificationPriority(notification.type);
    if (priority >= 4) {
      stats.byPriority.high++;
    } else if (priority >= 2) {
      stats.byPriority.medium++;
    } else {
      stats.byPriority.low++;
    }

    // Count recent
    if (new Date(notification.created_at) >= oneDayAgo) {
      stats.recent++;
    }
  });

  return stats;
};

export const markNotificationAsRead = async (notificationId, apiEndpoint) => {
  try {
    await apiEndpoint.markNotificationRead(notificationId);
    return true;
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return false;
  }
};

export const deleteNotification = async (notificationId, apiEndpoint) => {
  try {
    await apiEndpoint.deleteNotification(notificationId);
    return true;
  } catch (error) {
    console.error('Failed to delete notification:', error);
    return false;
  }
};

export const bulkMarkAsRead = async (notificationIds, apiEndpoint) => {
  try {
    const promises = notificationIds.map(id => apiEndpoint.markNotificationRead(id));
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('Failed to bulk mark notifications as read:', error);
    return false;
  }
};

export const bulkDeleteNotifications = async (notificationIds, apiEndpoint) => {
  try {
    const promises = notificationIds.map(id => apiEndpoint.deleteNotification(id));
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('Failed to bulk delete notifications:', error);
    return false;
  }
};

// Check and request notification permissions
export const checkNotificationPermissions = async () => {
  // Skip for web platform - web uses a different permission model
  if (Platform.OS === 'web') {
    return { granted: false, canAskAgain: true };
  }
  
  try {
    // Check if device is a physical device
    const deviceType = await Device.getDeviceTypeAsync();
    const isPhysicalDevice = deviceType === Device.DeviceType.PHONE || deviceType === Device.DeviceType.TABLET;
    
    // On emulators/simulators, just return as if permissions are granted
    if (!isPhysicalDevice) {
      return { granted: true, canAskAgain: false };
    }
    
    // Check current permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    return { 
      granted: existingStatus === 'granted',
      canAskAgain: existingStatus !== 'denied',
      status: existingStatus
    };
  } catch (error) {
    console.error('Error checking notification permissions:', error);
    return { granted: false, canAskAgain: true, error };
  }
};

// Request notification permissions
export const requestNotificationPermissions = async () => {
  // Skip for web platform
  if (Platform.OS === 'web') {
    return { granted: false };
  }
  
  try {
    // Check if we've already requested permissions
    const permissionRequested = await AsyncStorage.getItem(PERMISSION_REQUESTED_KEY);
    
    // Check if device is a physical device
    const deviceType = await Device.getDeviceTypeAsync();
    const isPhysicalDevice = deviceType === Device.DeviceType.PHONE || deviceType === Device.DeviceType.TABLET;
    
    // On emulators/simulators, just return as if permissions are granted
    if (!isPhysicalDevice) {
      return { granted: true };
    }
    
    // Get current permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    // If not granted and we can ask (or haven't asked before), request permission
    if (existingStatus !== 'granted' && (!permissionRequested || existingStatus === 'undetermined')) {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      
      // Mark that we've requested permissions
      await AsyncStorage.setItem(PERMISSION_REQUESTED_KEY, 'true');
    }
    
    // If permission granted, get push token
    if (finalStatus === 'granted') {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants?.expoConfig?.extra?.eas?.projectId,
      });
      
      return { 
        granted: true, 
        token: token.data 
      };
    }
    
    return { 
      granted: finalStatus === 'granted',
      status: finalStatus
    };
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return { granted: false, error };
  }
};