// API Configuration
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get the appropriate base URL for different environments:
// - If the developer explicitly provided EXPO_PUBLIC_API_BASE_URL, always use that
// - In dev mode, try to derive the host that served the JS bundle (works for both emulators & physical devices)
// - Fallbacks for Android emulators and the web
const getBaseUrl = () => {
  // 1️⃣ Explicit override (handy for CI or production preview):
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  // 2️⃣ Try to infer the host that served the JS bundle.
  // Expo SDK 49 replaced manifest with expoConfig / manifest2
  // Try several possible fields that expose the development server host.
  const hostUri =
    Constants.manifest?.debuggerHost ||
    Constants.expoConfig?.hostUri ||   // SDK 49+ (dev client / Expo Go)
    Constants.manifest2?.debuggerHost; // Fallback for other environments

  if (hostUri) {
    const host = hostUri.split(':').shift();
    return `http://${host}:3001/api`;
  }

  // 3️⃣ Web fallback
  if (Platform.OS === 'web') {
    return 'http://localhost:3001/api';
  }

  // 4️⃣ Android emulator special alias
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3001/api';
  }

  // 5️⃣ Default catch-all (iOS simulator & others)
  return 'http://localhost:3001/api';
};

// Export the API base URL
export const API_BASE_URL = getBaseUrl();

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@auth_access_token',
  REFRESH_TOKEN: '@auth_refresh_token',
  USER_DATA: '@user_data'
};

// API Endpoints
export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh'
  },
  PROPERTIES: {
    LIST: '/properties',
    FEATURED: '/properties/featured',
    SEARCH: '/properties/search',
    DETAILS: (id) => `/properties/${id}`
  },
  USER: {
    PROFILE: '/user/profile',
    FAVORITES: '/user/favorites',
    LISTINGS: '/user/listings'
  }
};

// Cache durations (in milliseconds)
export const CACHE_DURATION = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 24 * 60 * 60 * 1000 // 24 hours
}; 