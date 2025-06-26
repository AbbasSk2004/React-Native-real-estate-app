import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  showBrowserNotification, 
  playNotificationSound
} from '../utils/notificationUtils';
import notificationService from '../services/notificationService';
import { useToast } from './useToast';

// Create a singleton for polling to prevent multiple instances
let activePollingRequests = new Map();
let pollingTimeouts = new Map();
let lastNotificationTimestamp = new Map();

export const useNotifications = (options = {}) => {
  const {
    enableBrowserNotifications = true,
    enableSound = true,
    pollInterval = 10000, // 10 seconds for more real-time updates
    autoMarkRead = false
  } = options;

  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();
  const mountedRef = useRef(true);
  const lastFetchRef = useRef(Date.now());
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
    // If there's already a request in progress for this user, don't start another one
    if (activePollingRequests.get(user?.id)) {
      return;
    }

    if (!isAuthenticated || !user?.id || !mountedRef.current) {
      return;
    }

    // Don't fetch if the last fetch was too recent (unless forced)
    const now = Date.now();
    if (!force && !isInitialLoad && now - lastFetchRef.current < 5000) { // Throttle to max once per 5 seconds
      return;
    }

    try {
      // Only show loading on initial load or manual fetch
      if (isInitialLoad || isManualFetchRef.current) {
        setLoading(true);
      }
      setError(null);
      
      // Set the flag that we're fetching for this user
      activePollingRequests.set(user.id, true);
      lastFetchRef.current = now;
      
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      const lastTimestamp = lastNotificationTimestamp.get(user.id) || 0;
      const response = await notificationService.getAllNotifications(abortControllerRef.current.signal);
      
      if (mountedRef.current) {
        if (response.error) {
          setError(response.error);
        } else {
          const newNotifications = response.data.notifications || [];
          
          // Check for new notifications only if the data is not from cache
          if (!response.data.fromCache) {
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
      }
    } catch (err) {
      if (err.name !== 'AbortError' && mountedRef.current) {
        setError(err.message);
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
      // Clear the flag that we're fetching for this user
      activePollingRequests.delete(user?.id);
      
      // Clear abort controller reference
      abortControllerRef.current = null;
    }
  }, [isAuthenticated, user?.id, enableBrowserNotifications, enableSound, unreadCount, isInitialLoad]);

  // Manual fetch wrapper that sets isManualFetch flag
  const manualFetch = useCallback(async () => {
    isManualFetchRef.current = true;
    await fetchNotifications(true);
  }, [fetchNotifications]);

  const startPolling = useCallback(() => {
    if (!isAuthenticated || !user?.id) return;

    // Clear any existing polling for this user
    if (pollingTimeouts.has(user.id)) {
      clearTimeout(pollingTimeouts.get(user.id));
      pollingTimeouts.delete(user.id);
    }

    const poll = async () => {
      await fetchNotifications();
      if (mountedRef.current) {
        const timeoutId = setTimeout(poll, pollInterval);
        pollingTimeouts.set(user.id, timeoutId);
      }
    };

    // Start polling
    poll();
  }, [isAuthenticated, user?.id, pollInterval, fetchNotifications]);

  // Setup and cleanup for polling mechanism
  useEffect(() => {
    mountedRef.current = true;
    
    if (isAuthenticated && user?.id) {
      fetchNotifications();
      startPolling();
    }

    return () => {
      mountedRef.current = false;
      if (user?.id) {
        // Cleanup polling for this user
        if (pollingTimeouts.has(user.id)) {
          clearTimeout(pollingTimeouts.get(user.id));
          pollingTimeouts.delete(user.id);
        }
        activePollingRequests.delete(user.id);
      }
      
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [isAuthenticated, user?.id, startPolling, fetchNotifications]);

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