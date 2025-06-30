import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import notificationService from '../services/notificationService';
import { NOTIFICATION_TYPES, showBrowserNotification, playNotificationSound } from '../utils/notificationUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import websocketService from '../services/websocket';

const NotificationContext = createContext();

// Determine if we're running in a web or native environment
const isWeb = Platform.OS === 'web';

// Storage keys
const PERMISSION_REQUESTED_KEY = 'notification_permission_requested';

// Configure notification handler for when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  const [expoPushToken, setExpoPushToken] = useState('');
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Request notification permissions
  const requestNotificationPermissions = useCallback(async () => {
    if (isWeb) return; // Skip for web platform
    
    try {
      // Check if permission was already requested
      const permissionRequested = await AsyncStorage.getItem(PERMISSION_REQUESTED_KEY);
      
      // Only proceed if we haven't requested before or if we're forcing a re-request
      if (!permissionRequested) {
        // Check if physical device (permissions work differently on emulators)
        const deviceType = await Device.getDeviceTypeAsync();
        
        if (deviceType !== Device.DeviceType.PHONE && deviceType !== Device.DeviceType.TABLET) {
          console.log('Not requesting notifications on simulator/emulator');
          return;
        }
        
        // Request permission
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        // Save that we've requested permission
        await AsyncStorage.setItem(PERMISSION_REQUESTED_KEY, 'true');
        setPermissionStatus(finalStatus);
        
        // Get Expo push token for the device
        if (finalStatus === 'granted') {
          try {
            // Attempt to infer projectId from Constants (EAS build) if available
            const inferredProjectId =
              Constants?.expoConfig?.extra?.eas?.projectId ||
              Constants?.easConfig?.projectId ||
              null;

            // Skip remote push token retrieval when running inside Expo Go from SDK 53+.
            if (Constants.appOwnership !== 'expo') {
              const tokenResponse = inferredProjectId
                ? await Notifications.getExpoPushTokenAsync({ projectId: inferredProjectId })
                : await Notifications.getExpoPushTokenAsync();

              setExpoPushToken(tokenResponse.data);

              // Send token to backend (TODO)
              if (isAuthenticated && tokenResponse.data) {
                // await notificationService.registerPushToken(tokenResponse.data);
              }
            } else {
              console.info(
                'Skipping remote push token registration in Expo Go. To test remote notifications, run a development build (`expo start --dev-client`) or an EAS build.'
              );
            }
          } catch (tokenErr) {
            console.error('Failed to obtain Expo push token:', tokenErr);
          }
        }
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
    }
  }, [isAuthenticated]);

  // Request permissions on first load if not on web
  useEffect(() => {
    if (!isWeb) {
      requestNotificationPermissions();
    }
  }, [requestNotificationPermissions]);
  
  // Use the useNotifications hook for notification data and operations
  const {
    loading: notificationsLoading,
    error: notificationsError,
    fetchNotifications: notificationsFetch,
    markAsRead,
    markAllAsRead,
    bulkMarkAsRead,
    deleteNotification,
    clearAllNotifications
  } = useNotifications({
    enableBrowserNotifications: true,
    enableSound: true,
    autoMarkRead: false
  });

  // Add a new function to force refresh notifications and unreadCount
  const fetchNotifications = useCallback(async () => {
    try {
      // Show loading state
      setLoading(true);
      setError(null);
      
      // Fetch notifications from the service
      const response = await notificationService.getAllNotifications();
      
      if (response.error) {
        // Only set error if it's not a network error with cached data
        if (!(response.type === 'network_error' && response.data?.notifications?.length > 0)) {
          setError(response.error);
        }
      }
      
      const newNotifications = response.data.notifications || [];
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter(n => !n.read).length);
    } catch (err) {
      // Only show errors if they're not network errors, which are handled by service
      if (!err.message || !err.message.includes('Network')) {
        setError(err.message || 'Failed to fetch notifications');
        console.error('Error fetching notifications:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Enhanced markAsRead that ensures unreadCount is updated
  const enhancedMarkAsRead = useCallback(async (notificationId) => {
    await markAsRead(notificationId);
    // Refresh to ensure unreadCount is updated
    await fetchNotifications();
  }, [markAsRead, fetchNotifications]);

  // Enhanced markAllAsRead that ensures unreadCount is updated
  const enhancedMarkAllAsRead = useCallback(async () => {
    await markAllAsRead();
    // Refresh to ensure unreadCount is updated
    await fetchNotifications();
  }, [markAllAsRead, fetchNotifications]);

  // Enhanced bulkMarkAsRead that ensures unreadCount is updated
  const enhancedBulkMarkAsRead = useCallback(async (notificationIds) => {
    await bulkMarkAsRead(notificationIds);
    // Refresh to ensure unreadCount is updated
    await fetchNotifications();
  }, [bulkMarkAsRead, fetchNotifications]);

  // Initial fetch of notifications when component mounts
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      console.log('[NotificationContext] Initial fetch of notifications');
      fetchNotifications();
    }
  }, [isAuthenticated, user?.id, fetchNotifications]);

  // Group notifications by date
  const notificationsByDate = notifications.reduce((groups, notification) => {
    const date = new Date(notification.created_at).toLocaleDateString();
    
    if (!groups[date]) {
      groups[date] = [];
    }
    
    groups[date].push(notification);
    return groups;
  }, {});

  // Get notifications by type
  const getNotificationsByType = useCallback((type) => {
    return notifications.filter(notification => notification.type === type);
  }, [notifications]);
  
  // Get unread notifications by type
  const getUnreadCountByType = useCallback((type) => {
    return notifications.filter(
      notification => notification.type === type && !notification.read
    ).length;
  }, [notifications]);

  // WebSocket integration: listen for real-time notification events
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    // Ensure a single socket connection
    websocketService.connect();
    
    console.log('[NotificationContext] Setting up WebSocket listeners');

    // --- Handlers for server-emitted events ---
    const handleCreated = (data) => {
      console.log('[NotificationContext] Received event data:', data);
      
      // Handle notification_created event
      if (data.notification) {
        const notification = data.notification;
        console.log('[NotificationContext] Received notification:', notification);
        
        setNotifications(prev => {
          // Avoid duplicates
          if (prev.some(n => n.id === notification.id)) return prev;
          const updated = [notification, ...prev];
          if (!notification.read) {
            setUnreadCount(updated.filter(n => !n.read).length);
          }
          // Optional UX: play sound / browser notification when app is in background (web only)
          if (typeof document !== 'undefined' && document.hidden) {
            showBrowserNotification(notification.title, notification.message);
            playNotificationSound();
          }
          return updated;
        });
      }
      // Handle new_message event which might not have notification property
      else if (data.content && data.conversation_id) {
        console.log('[NotificationContext] Received message:', data);
        // Fetch notifications to ensure we have the latest
        fetchNotifications();
      }
    };

    const handleUpdated = ({ notification }) => {
      if (!notification) return;
      
      console.log('[NotificationContext] Updated notification:', notification);
      
      setNotifications(prev => {
        const updated = prev.map(n => (n.id === notification.id ? notification : n));
        setUnreadCount(updated.filter(n => !n.read).length);
        return updated;
      });
    };

    const handleDeleted = ({ id }) => {
      if (!id) return;
      
      console.log('[NotificationContext] Deleted notification:', id);
      
      setNotifications(prev => {
        const updated = prev.filter(n => n.id !== id);
        setUnreadCount(updated.filter(n => !n.read).length);
        return updated;
      });
    };

    const handleConnection = ({ connected }) => {
      console.log('[NotificationContext] WebSocket connection status:', connected);
      
      if (connected) {
        // On reconnect, refresh to ensure we have the latest data
        fetchNotifications();
      }
    };

    // Subscribe to events and capture unsubscribe functions
    const unsubCreate = websocketService.subscribe('notification_created', handleCreated);
    const unsubUpdate = websocketService.subscribe('notification_updated', handleUpdated);
    const unsubDelete = websocketService.subscribe('notification_deleted', handleDeleted);
    const unsubConn   = websocketService.subscribe('connection', handleConnection);
    
    // Force a reconnect when this effect runs to ensure we have a fresh connection
    const reconnectTimeout = setTimeout(() => {
      websocketService.reconnect();
    }, 300);

    // Cleanup on unmount / auth change
    return () => {
      console.log('[NotificationContext] Cleaning up WebSocket listeners');
      clearTimeout(reconnectTimeout);
      unsubCreate();
      unsubUpdate();
      unsubDelete();
      unsubConn();
    };
  }, [isAuthenticated, user?.id, fetchNotifications]);

  const value = {
    notifications,
    notificationsByDate,
    unreadCount,
    loading,
    error,
    NOTIFICATION_TYPES,
    fetchNotifications,
    markAsRead: enhancedMarkAsRead,
    markAllAsRead: enhancedMarkAllAsRead,
    bulkMarkAsRead: enhancedBulkMarkAsRead,
    deleteNotification,
    clearAllNotifications,
    getNotificationsByType,
    getUnreadCountByType,
    lastRefreshTime,
    expoPushToken,
    permissionStatus,
    requestNotificationPermissions
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Hook to use notification context
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;