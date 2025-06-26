import { useState, useCallback } from 'react';
import { Platform } from 'react-native';

// Check if we're in a React Native environment
const isNative = Platform.OS !== 'web';

// Helper for showing native toast in React Native
const showNativeToast = (message, type = 'info') => {
  if (isNative && global.ToastAndroid) {
    // Android native toast
    global.ToastAndroid.showWithGravityAndOffset(
      message,
      global.ToastAndroid.LONG,
      global.ToastAndroid.BOTTOM,
      0,
      50
    );
    return true;
  } else if (isNative && global.AlertIOS) {
    // iOS alert as toast alternative
    global.AlertIOS.alert(type.charAt(0).toUpperCase() + type.slice(1), message);
    return true;
  }
  return false;
};

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    // Try to use native toast for React Native
    const usedNative = showNativeToast(message, type);
    
    // If on web or native toast unavailable, use our custom toast system
    if (!usedNative) {
      const id = Date.now() + Math.random();
      const toast = { id, message, type, duration };
      
      setToasts(prev => [...prev, toast]);
      
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      
      return id;
    }
    
    return null;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = () => {
    setToasts([]);
  };

  const success = useCallback((message, duration) => addToast(message, 'success', duration), [addToast]);
  const error = useCallback((message, duration) => addToast(message, 'error', duration), [addToast]);
  const warning = useCallback((message, duration) => addToast(message, 'warning', duration), [addToast]);
  const info = useCallback((message, duration) => addToast(message, 'info', duration), [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info
  };
};