import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Utility to detect if we are running in a React Native (non-web) environment
const isReactNative = Platform.OS !== 'web';

export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(initialValue);

  // Load value from storage (AsyncStorage or localStorage)
  useEffect(() => {
    const loadStoredValue = async () => {
      try {
        let item = null;
        if (isReactNative) {
          item = await AsyncStorage.getItem(key);
        } else if (typeof window !== 'undefined' && window.localStorage) {
          item = window.localStorage.getItem(key);
        }

        if (item !== null) {
          try {
            setStoredValue(JSON.parse(item));
          } catch (err) {
            // Fallback for legacy values that were stored as raw strings
            setStoredValue(item);
          }
        }
      } catch (error) {
        console.error(`Error reading storage key "${key}":`, error);
      }
    };

    loadStoredValue();
  }, [key]);

  // Setter that persists the value
  const setValue = async (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      const serialized = JSON.stringify(valueToStore);

      if (isReactNative) {
        await AsyncStorage.setItem(key, serialized);
      } else if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, serialized);
      }
    } catch (error) {
      console.error(`Error setting storage key "${key}":`, error);
    }
  };

  // Listen for storage changes only on web
  useEffect(() => {
    if (isReactNative || typeof window === 'undefined') return undefined;

    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue !== null) {
        try {
          try {
            setStoredValue(JSON.parse(e.newValue));
          } catch (err) {
            setStoredValue(e.newValue);
          }
        } catch (error) {
          console.error(`Error parsing storage key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
};