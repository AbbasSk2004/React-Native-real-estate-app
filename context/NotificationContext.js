import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import notificationService from '../services/notificationService';
import { NOTIFICATION_TYPES } from '../utils/notificationUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

const NotificationContext = createContext();

// Determine if we're running in a web or native environment
const isWeb = Platform.OS === 'web';

// Storage keys
const SETTINGS_STORAGE_KEY = 'notification_settings';
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
  const [settings, setSettings] = useState(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  const [expoPushToken, setExpoPushToken] = useState('');
  const [permissionStatus, setPermissionStatus] = useState(null);
  
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

  // Load local settings from storage when component mounts
  useEffect(() => {
    const loadLocalSettings = async () => {
      try {
        let storedSettings = null;
        
        if (isWeb && typeof window !== 'undefined' && window.localStorage) {
          const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
          if (stored) {
            storedSettings = JSON.parse(stored);
          }
        } else {
          const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
          if (stored) {
            storedSettings = JSON.parse(stored);
          }
        }
        
        if (storedSettings) {
          setSettings(storedSettings);
        }
        
        // Request permissions on first load if not on web
        if (!isWeb) {
          requestNotificationPermissions();
        }
      } catch (error) {
        console.error('Error loading notification settings from storage:', error);
      }
    };
    
    loadLocalSettings();
  }, [requestNotificationPermissions]);
  
  // Save settings to storage whenever they change
  useEffect(() => {
    const saveSettings = async () => {
      if (!settings) return;
      
      try {
        const serialized = JSON.stringify(settings);
        
        if (isWeb && typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(SETTINGS_STORAGE_KEY, serialized);
        } else {
          await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, serialized);
        }
      } catch (error) {
        console.error('Error saving notification settings to storage:', error);
      }
    };
    
    saveSettings();
  }, [settings]);
  
  // Use the useNotifications hook for notification data and operations
  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    bulkMarkAsRead,
    deleteNotification,
    clearAllNotifications
  } = useNotifications({
    enableBrowserNotifications: settings?.push_notifications || false,
    enableSound: settings?.sound_notifications || false,
    autoMarkRead: false
  });

  // Add a new function to force refresh notifications and unreadCount
  const refreshNotifications = useCallback(async () => {
    // Trigger a refresh of the notification data
    await fetchNotifications();
    // Update the last refresh time to trigger dependencies
    setLastRefreshTime(Date.now());
  }, [fetchNotifications]);

  // Enhanced markAsRead that ensures unreadCount is updated
  const enhancedMarkAsRead = useCallback(async (notificationId) => {
    await markAsRead(notificationId);
    // Refresh to ensure unreadCount is updated
    await refreshNotifications();
  }, [markAsRead, refreshNotifications]);

  // Enhanced markAllAsRead that ensures unreadCount is updated
  const enhancedMarkAllAsRead = useCallback(async () => {
    await markAllAsRead();
    // Refresh to ensure unreadCount is updated
    await refreshNotifications();
  }, [markAllAsRead, refreshNotifications]);

  // Enhanced bulkMarkAsRead that ensures unreadCount is updated
  const enhancedBulkMarkAsRead = useCallback(async (notificationIds) => {
    await bulkMarkAsRead(notificationIds);
    // Refresh to ensure unreadCount is updated
    await refreshNotifications();
  }, [bulkMarkAsRead, refreshNotifications]);

  // Load notification settings on auth change
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchSettings();
    }
  }, [isAuthenticated, user]);

  // Function to fetch notification settings
  const fetchSettings = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoadingSettings(true);
      setSettingsError(null);
      const { data, error } = await notificationService.getSettings();
      
      if (error) throw new Error(error);
      
      if (data && data.data) {
        setSettings(data.data);
      } else {
        // If no settings exist, use defaults
        setSettings({
          email_notifications: true,
          push_notifications: true,
          sms_notifications: false,
          chat_messages: true,
          property_updates: true,
          system_updates: true,
          marketing_emails: false,
          weekly_digest: true,
          instant_notifications: true,
          quiet_hours_enabled: false,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00'
        });
      }
    } catch (err) {
      setSettingsError(err.message || 'Failed to load notification settings');
      console.error('Error fetching notification settings:', err);
    } finally {
      setIsLoadingSettings(false);
    }
  }, [isAuthenticated]);

  // Update notification settings
  const updateSettings = useCallback(async (newSettings) => {
    if (!isAuthenticated) {
      throw new Error('You must be logged in to update notification settings');
    }
    
    try {
      const { data, error } = await notificationService.updateSettings(newSettings);
      
      if (error) throw new Error(error);
      
      if (data) {
        setSettings(data);
        return { success: true };
      }
      
      throw new Error('Failed to update notification settings');
    } catch (err) {
      console.error('Error updating notification settings:', err);
      throw err;
    }
  }, [isAuthenticated]);

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

  // Refresh notifications on an interval to ensure badge counts stay up-to-date
  useEffect(() => {
    if (isAuthenticated) {
      // Initial fetch
      refreshNotifications();
      
      // Set up interval to refresh
      const intervalId = setInterval(() => {
        refreshNotifications();
      }, 60000); // Every minute
      
      return () => clearInterval(intervalId);
    }
  }, [isAuthenticated, refreshNotifications]);

  const value = {
    notifications,
    notificationsByDate,
    unreadCount,
    loading,
    error,
    settings,
    isLoadingSettings,
    settingsError,
    NOTIFICATION_TYPES,
    fetchNotifications: refreshNotifications, // Replace with enhanced version
    markAsRead: enhancedMarkAsRead, // Replace with enhanced version
    markAllAsRead: enhancedMarkAllAsRead, // Replace with enhanced version
    bulkMarkAsRead: enhancedBulkMarkAsRead, // Replace with enhanced version
    deleteNotification,
    clearAllNotifications,
    fetchSettings,
    updateSettings,
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