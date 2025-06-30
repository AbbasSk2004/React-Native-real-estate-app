// Authentication error types
export const AUTH_ERROR_TYPES = {
  INVALID_TOKEN: 'invalid_token',
  TOKEN_EXPIRED: 'token_expired',
  REFRESH_FAILED: 'refresh_failed',
  UNAUTHORIZED: 'unauthorized',
  NETWORK_ERROR: 'network_error',
  SERVER_ERROR: 'server_error'
};

// Handle authentication errors
export const handleAuthError = (error) => {
  if (!error.response) {
    return {
      type: AUTH_ERROR_TYPES.NETWORK_ERROR,
      message: 'Network error occurred'
    };
  }

  switch (error.response.status) {
    case 401:
      return {
        type: AUTH_ERROR_TYPES.UNAUTHORIZED,
        message: 'Please log in to continue'
      };
    case 400:
    case 409:
      return {
        type: AUTH_ERROR_TYPES.SERVER_ERROR,
        message: error.response.data?.message || 'An unexpected error occurred'
      };
    case 403:
      return {
        type: AUTH_ERROR_TYPES.INVALID_TOKEN,
        message: 'You do not have permission to perform this action'
      };
    default:
      return {
        type: AUTH_ERROR_TYPES.SERVER_ERROR,
        message: error.response?.data?.message || 'An unexpected error occurred'
      };
  }
};

// Handle token refresh errors
export const handleTokenError = (error) => {
  if (!error.response) {
    return {
      type: AUTH_ERROR_TYPES.NETWORK_ERROR,
      message: 'Network error occurred while refreshing token'
    };
  }

  switch (error.response.status) {
    case 401:
      return {
        type: AUTH_ERROR_TYPES.TOKEN_EXPIRED,
        message: 'Your session has expired. Please log in again.'
      };
    case 400:
      return {
        type: AUTH_ERROR_TYPES.REFRESH_FAILED,
        message: 'Failed to refresh authentication. Please log in again.'
      };
    default:
      return {
        type: AUTH_ERROR_TYPES.SERVER_ERROR,
        message: 'An unexpected error occurred while refreshing authentication'
      };
  }
};

// Common error codes and messages
const AUTH_ERROR_CODES = {
  INVALID_TOKEN: 'invalid_token',
  TOKEN_EXPIRED: 'token_expired',
  REFRESH_FAILED: 'refresh_failed',
  STATE_MISMATCH: 'state_mismatch',
  SESSION_INVALID: 'session_invalid',
  UNAUTHORIZED: 'unauthorized',
  PROFILE_ERROR: 'profile_error',
  NETWORK_ERROR: 'network_error',
  OAUTH_ERROR: 'oauth_error'
};

const ERROR_MESSAGES = {
  [AUTH_ERROR_CODES.INVALID_TOKEN]: 'Invalid authentication token',
  [AUTH_ERROR_CODES.TOKEN_EXPIRED]: 'Your session has expired. Please log in again',
  [AUTH_ERROR_CODES.REFRESH_FAILED]: 'Failed to refresh authentication token',
  [AUTH_ERROR_CODES.STATE_MISMATCH]: 'Security validation failed. Please try again',
  [AUTH_ERROR_CODES.SESSION_INVALID]: 'Invalid or expired session',
  [AUTH_ERROR_CODES.UNAUTHORIZED]: 'You must be logged in to access this resource',
  [AUTH_ERROR_CODES.PROFILE_ERROR]: 'Failed to fetch user profile',
  [AUTH_ERROR_CODES.NETWORK_ERROR]: 'Network error occurred during authentication',
  [AUTH_ERROR_CODES.OAUTH_ERROR]: 'Authentication failed with the provider'
};

// Handle OAuth-specific errors
export const handleOAuthError = (error, provider = 'provider') => {
  console.error(`OAuth ${provider} error:`, error);

  // Extract error details
  const errorCode = error.code || error.error || AUTH_ERROR_CODES.OAUTH_ERROR;
  const errorMessage = error.message || error.error_description || ERROR_MESSAGES[AUTH_ERROR_CODES.OAUTH_ERROR];

  // Log detailed error for debugging
  console.error('OAuth error details:', {
    code: errorCode,
    message: errorMessage,
    provider,
    originalError: error
  });

  return {
    code: errorCode,
    message: errorMessage,
    provider,
    shouldRetry: !errorMessage.toLowerCase().includes('denied') && 
                 !errorMessage.toLowerCase().includes('cancelled')
  };
};

// Handle session-related errors
export const handleSessionError = (error) => {
  console.error('Session error:', error);

  return {
    code: AUTH_ERROR_CODES.SESSION_INVALID,
    message: ERROR_MESSAGES[AUTH_ERROR_CODES.SESSION_INVALID],
    shouldLogout: true
  };
};

// Validate OAuth state
export const validateOAuthState = (receivedState, storedState) => {
  if (!receivedState || !storedState || receivedState !== storedState) {
    console.error('State validation failed:', {
      received: receivedState,
      stored: storedState
    });
    
    return {
      isValid: false,
      error: {
        code: AUTH_ERROR_CODES.STATE_MISMATCH,
        message: ERROR_MESSAGES[AUTH_ERROR_CODES.STATE_MISMATCH]
      }
    };
  }

  return { isValid: true };
};

// Handle profile-related errors
export const handleProfileError = (error) => {
  console.error('Profile error:', error);

  return {
    code: AUTH_ERROR_CODES.PROFILE_ERROR,
    message: ERROR_MESSAGES[AUTH_ERROR_CODES.PROFILE_ERROR],
    shouldRetry: error?.code !== 'PGRST116' // Don't retry if profile not found
  };
}; 