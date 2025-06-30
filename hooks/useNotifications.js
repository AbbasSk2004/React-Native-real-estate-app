import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  showBrowserNotification, 
  playNotificationSound
} from '../utils/notificationUtils';
import notificationService from '../services/notificationService';
import { useToast } from './useToast';
import websocketService from '../services/websocket';

// Keep track of last notification timestamp (singleton)
let lastNotificationTimestamp = new Map();

export const useNotifications = (options = {}) => {
  const {
    enableBrowserNotifications = true,
    enableSound = true,
    autoMarkRead = false
  } = options;

  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();
  const mountedRef = useRef(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const isManualFetchRef = useRef(false);
  const abortControllerRef = useRef(null);

  const updateNotificationState = useCallback((updatedNotifications) => {
    if (mountedRef.current) {
      setNotifications(updatedNotifications);
      setUnreadCount(updatedNotifications.filter(n => !n.read).length);
    }
  }, []);

  const fetchNotifications = useCallback(async (force = false) => {
    if (!isAuthenticated || !user?.id || !mountedRef.current) {
      return;
    }

    try {
      // Only show loading on initial load or manual fetch
      if (isInitialLoad || isManualFetchRef.current) {
        setLoading(true);
      }
      setError(null);
      
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      const response = await notificationService.getAllNotifications(abortControllerRef.current.signal);
      
      if (mountedRef.current) {
        // Only set error if it's not a network error with cached data
        if (response.error && !(response.type === 'network_error' && response.data?.notifications?.length > 0)) {
          setError(response.error);
        }
        
        const newNotifications = response.data.notifications || [];
        
        // Check for new notifications only if the data is not from cache
        if (!response.data.fromCache) {
          const lastTimestamp = lastNotificationTimestamp.get(user.id) || 0;
          const hasNewNotifications = newNotifications.some(notification => 
            new Date(notification.created_at).getTime() > lastTimestamp
          );

          if (hasNewNotifications) {
            // Update the timestamp of the latest notification
            const latestTimestamp = Math.max(
              ...newNotifications.map(n => new Date(n.created_at).getTime()),
              lastTimestamp // Include current timestamp to prevent issues if array is empty
            );
            lastNotificationTimestamp.set(user.id, latestTimestamp);

            // Show browser notification if enabled and not the initial load
            if (!isInitialLoad && enableBrowserNotifications && typeof document !== 'undefined' && document.hidden) {
              const newUnreadCount = newNotifications.filter(n => !n.read).length;
              if (newUnreadCount > unreadCount) {
                showBrowserNotification('New Notification', 'You have new notifications');
                if (enableSound) {
                  playNotificationSound();
                }
              }
            }
          }
        }

        setNotifications(newNotifications);
        setUnreadCount(newNotifications.filter(n => !n.read).length || 0);
      }
    } catch (err) {
      // Ignore AbortError as it's intentional when refreshing
      if (err.name === 'AbortError') {
        console.log('Fetch aborted intentionally');
      } else if (mountedRef.current) {
        console.error('Fetch notification error:', err);
        // Don't set error for network errors on manual refreshes
        if (!(isManualFetchRef.current && err.message && err.message.includes('Network'))) {
          setError(err.message || 'Network error occurred');
        }
      }
    } finally {
      if (mountedRef.current) {
        // Only update loading state for initial load or manual fetch
        if (isInitialLoad || isManualFetchRef.current) {
          setLoading(false);
        }
        setIsInitialLoad(false);
        isManualFetchRef.current = false;
      }
      
      // Clear abort controller reference
      abortControllerRef.current = null;
    }
  }, [isAuthenticated, user?.id, enableBrowserNotifications, enableSound, unreadCount, isInitialLoad]);

  // Manual fetch wrapper that sets isManualFetch flag
  const manualFetch = useCallback(async () => {
    isManualFetchRef.current = true;
    await fetchNotifications(true);
  }, [fetchNotifications]);

  // Fetch notifications when component mounts
  useEffect(() => {
    mountedRef.current = true;

    if (isAuthenticated && user?.id) {
      // Always fetch once on mount
      fetchNotifications();
    }

    return () => {
      mountedRef.current = false;
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [isAuthenticated, user?.id, fetchNotifications]);

  // WebSocket integration: listen for real-time notification events
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    // Ensure a single socket connection
    websocketService.connect();
    
    console.log('[useNotifications] Setting up WebSocket listeners');

    // --- Handlers for server-emitted events ---
    const handleCreated = (data) => {
      console.log('[useNotifications] Received event data:', data);
      
      // Handle notification_created event
      if (data.notification) {
        const notification = data.notification;
        console.log('[useNotifications] Received real-time notification:', notification);
        
        setNotifications(prev => {
          // Avoid duplicates
          if (prev.some(n => n.id === notification.id)) return prev;
          const updated = [notification, ...prev];
          if (!notification.read) {
            setUnreadCount(updated.filter(n => !n.read).length);
          }
          // Optional UX: play sound / browser notification when app is in background (web only)
          if (enableBrowserNotifications && typeof document !== 'undefined' && document.hidden) {
            showBrowserNotification(notification.title, notification.message);
            if (enableSound) {
              playNotificationSound();
            }
          }
          return updated;
        });
      }
      // Handle new_message event which might not have notification property
      else if (data.content && data.conversation_id) {
        console.log('[useNotifications] Received message:', data);
        // Fetch notifications to ensure we have the latest
        fetchNotifications(true);
      }
    };

    const handleUpdated = ({ notification }) => {
      if (!notification) return;
      
      console.log('[useNotifications] Notification updated:', notification);
      
      setNotifications(prev => {
        const updated = prev.map(n => (n.id === notification.id ? notification : n));
        setUnreadCount(updated.filter(n => !n.read).length);
        return updated;
      });
    };

    const handleDeleted = ({ id }) => {
      if (!id) return;
      
      console.log('[useNotifications] Notification deleted:', id);
      
      setNotifications(prev => {
        const updated = prev.filter(n => n.id !== id);
        setUnreadCount(updated.filter(n => !n.read).length);
        return updated;
      });
    };

    const handleConnection = ({ connected }) => {
      console.log('[useNotifications] WebSocket connection status:', connected);
      
      if (connected) {
        // On reconnect, pull any missed data to ensure consistency
        fetchNotifications(true);
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
      clearTimeout(reconnectTimeout);
      unsubCreate();
      unsubUpdate();
      unsubDelete();
      unsubConn();
      console.log('[useNotifications] WebSocket listeners removed');
    };
  }, [isAuthenticated, user?.id, enableBrowserNotifications, enableSound, fetchNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    if (!isAuthenticated || !user) return;

    try {
      const { error } = await notificationService.markAsRead(notificationId);
      if (error) throw error;

      if (mountedRef.current) {
        const updatedNotifications = notifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        );
        updateNotificationState(updatedNotifications);
      }
    } catch (err) {
      if (mountedRef.current) {
        toast.error('Failed to mark notification as read');
      }
    }
  }, [isAuthenticated, user, notifications, toast, updateNotificationState]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      const { error } = await notificationService.markAllAsRead();
      if (error) throw error;

      if (mountedRef.current) {
        const updatedNotifications = notifications.map(notification => ({ 
          ...notification, 
          read: true 
        }));
        updateNotificationState(updatedNotifications);
        toast.success('All notifications marked as read');
      }
    } catch (err) {
      if (mountedRef.current) {
        toast.error('Failed to mark all notifications as read');
      }
    }
  }, [isAuthenticated, user, notifications, toast, updateNotificationState]);

  const bulkMarkAsRead = useCallback(async (notificationIds) => {
    if (!isAuthenticated || !user) return;

    try {
      const { error } = await notificationService.bulkMarkAsRead(notificationIds);
      if (error) throw error;

      if (mountedRef.current) {
        const updatedNotifications = notifications.map(notification => ({
          ...notification,
          read: notification.read || notificationIds.includes(notification.id)
        }));
        updateNotificationState(updatedNotifications);
      }
    } catch (err) {
      if (mountedRef.current) {
        toast.error('Failed to mark notifications as read');
      }
    }
  }, [isAuthenticated, user, notifications, toast, updateNotificationState]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    if (!isAuthenticated || !user) return;

    try {
      const { error } = await notificationService.delete(notificationId);
      if (error) throw error;

      if (mountedRef.current) {
        const updatedNotifications = notifications.filter(
          notification => notification.id !== notificationId
        );
        updateNotificationState(updatedNotifications);
        toast.success('Notification deleted');
      }
    } catch (err) {
      if (mountedRef.current) {
        toast.error('Failed to delete notification');
      }
    }
  }, [isAuthenticated, user, notifications, toast, updateNotificationState]);

  // Add clearAllNotifications function
  const clearAllNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      const { error } = await notificationService.clearAllNotifications();
      if (error) throw error;

      if (mountedRef.current) {
        setNotifications([]);
        setUnreadCount(0);
        toast.success('All notifications cleared');
      }
    } catch (err) {
      if (mountedRef.current) {
        toast.error('Failed to clear notifications');
        throw err; // Re-throw to handle in the component
      }
    }
  }, [isAuthenticated, user, toast]);

  // Auto mark as read when viewing
  useEffect(() => {
    if (autoMarkRead && notifications.length > 0 && isAuthenticated && user) {
      const unreadNotifications = notifications.filter(n => !n.read);
      if (unreadNotifications.length > 0) {
        const unreadIds = unreadNotifications.map(n => n.id);
        bulkMarkAsRead(unreadIds);
      }
    }
  }, [autoMarkRead, notifications, markAsRead, isAuthenticated, user, bulkMarkAsRead]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications: manualFetch, // Use manualFetch for explicit fetches
    markAsRead,
    markAllAsRead,
    bulkMarkAsRead,
    deleteNotification,
    clearAllNotifications,
    refetch: manualFetch
  };
};