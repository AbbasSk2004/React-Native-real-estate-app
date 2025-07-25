import Constants from 'expo-constants';

/**
 * Helper functions for environment detection and configuration
 */

/**
 * Check if the app is running in production mode
 * @returns {boolean} true if in production mode
 */
export const isProduction = () => {
  // Check for explicit environment setting
  if (process.env.EXPO_PUBLIC_ENV) {
    return process.env.EXPO_PUBLIC_ENV === 'production';
  }
  
  // Check if running in Expo Go (always development)
  if (Constants.appOwnership === 'expo') {
    return false;
  }
  
  // Check for release channel (production builds use release channels)
  if (Constants.manifest?.releaseChannel && 
      Constants.manifest.releaseChannel !== 'default') {
    return true;
  }
  
  // Check if this is a standalone app (likely production)
  if (Constants.appOwnership === 'standalone') {
    return true;
  }
  
  // Default to development
  return false;
};

/**
 * Get the current environment name
 * @returns {string} 'development' or 'production'
 */
export const getEnvironment = () => {
  return isProduction() ? 'production' : 'development';
};

/**
 * Log the current environment configuration
 */
export const logEnvironmentInfo = () => {
  console.log(`[Environment] Running in ${getEnvironment()} mode`);
  console.log(`[Environment] API URL: ${process.env.EXPO_PUBLIC_API_BASE_URL || 'Not explicitly set'}`);
};

/**
 * Suppress verbose console logs for specific subsystems to keep the log output clean.
 * This runs as early as possible because this file is imported before the app starts.
 */

(() => {
  // Prefixes of log messages we want to hide
  const SUPPRESSED_PREFIXES = [
    '[WebSocket]',
    '[useNotifications]',
    '[NotificationContext]',
    'Auth state in Profile:',
    'Using ML-based recommendations',
  ];

  const shouldSuppress = (msg) => {
    if (typeof msg !== 'string') return false;
    return SUPPRESSED_PREFIXES.some((prefix) => msg.startsWith(prefix));
  };

  // Preserve original implementations
  const originalLog = console.log;

  // Override console.log
  console.log = (...args) => {
    if (args.length && shouldSuppress(args[0])) {
      return; // Drop suppressed logs
    }
    originalLog(...args);
  };
})(); 