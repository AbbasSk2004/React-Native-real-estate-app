import { toast } from 'react-toastify';

// Error types enum
export const ErrorTypes = {
  AUTH: 'AUTH',
  VALIDATION: 'VALIDATION',
  NETWORK: 'NETWORK',
  SERVER: 'SERVER',
  DATABASE: 'DATABASE',
  UNKNOWN: 'UNKNOWN'
};

// Error messages
const ErrorMessages = {
  [ErrorTypes.AUTH]: {
    default: 'Authentication error occurred',
    expired: 'Your session has expired. Please log in again.',
    invalid: 'Invalid credentials',
    required: 'Authentication required',
    unauthorized: 'You are not authorized to perform this action'
  },
  [ErrorTypes.VALIDATION]: {
    default: 'Validation error occurred',
    required: 'Required fields are missing',
    invalid: 'Invalid input provided',
    format: 'Invalid format'
  },
  [ErrorTypes.NETWORK]: {
    default: 'Network error occurred',
    offline: 'You are offline. Please check your internet connection.',
    timeout: 'Request timed out. Please try again.',
    connection: 'Unable to connect to server'
  },
  [ErrorTypes.SERVER]: {
    default: 'Server error occurred',
    maintenance: 'Server is under maintenance',
    unavailable: 'Service temporarily unavailable'
  },
  [ErrorTypes.DATABASE]: {
    default: 'Database error occurred',
    connection: 'Database connection failed',
    constraint: 'Database constraint violation',
    notFound: 'Record not found'
  },
  [ErrorTypes.UNKNOWN]: {
    default: 'An unexpected error occurred'
  }
};

// Determine error type based on error object
const getErrorType = (error) => {
  if (!error) return ErrorTypes.UNKNOWN;

  // Check for network errors
  if (!error.response) {
    return ErrorTypes.NETWORK;
  }

  // Check status code ranges
  const status = error.response?.status;
  if (status) {
    if (status === 401 || status === 403) return ErrorTypes.AUTH;
    if (status === 400 || status === 422) return ErrorTypes.VALIDATION;
    if (status >= 500) return ErrorTypes.SERVER;
  }

  // Check error messages for specific keywords
  const errorMessage = (error.message || '').toLowerCase();
  if (errorMessage.includes('network') || errorMessage.includes('offline')) {
    return ErrorTypes.NETWORK;
  }
  if (errorMessage.includes('auth') || errorMessage.includes('token') || errorMessage.includes('session')) {
    return ErrorTypes.AUTH;
  }
  if (errorMessage.includes('database') || errorMessage.includes('constraint') || errorMessage.includes('record')) {
    return ErrorTypes.DATABASE;
  }

  return ErrorTypes.UNKNOWN;
};

// Get appropriate error message based on error type and specific error
const getErrorMessage = (error, errorType) => {
  const messages = ErrorMessages[errorType];
  
  // Try to get specific error message
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  // Check for specific error conditions
  if (errorType === ErrorTypes.AUTH) {
    if (error.response?.status === 401) return messages.expired;
    if (error.response?.status === 403) return messages.unauthorized;
  }

  if (errorType === ErrorTypes.NETWORK) {
    if (!navigator.onLine) return messages.offline;
    if (error.code === 'ECONNABORTED') return messages.timeout;
  }

  return error.message || messages.default;
};

// General error handler
export const handleError = (error) => {
  if (error.response) {
    // Server responded with error
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return data.message || 'Invalid request';
      case 401:
        return 'Please log in to continue';
      case 403:
        return 'You do not have permission to perform this action';
      case 404:
        return 'The requested resource was not found';
      case 422:
        return data.message || 'Validation error';
      case 429:
        return 'Too many attempts. Please try again later';
      case 500:
        return 'Server error. Please try again later';
      default:
        return data.message || 'An unexpected error occurred';
    }
  }
  
  if (error.request) {
    // Request made but no response
    return 'Unable to connect to server. Please check your internet connection';
  }
  
  // Something else happened
  return error.message || 'An unexpected error occurred';
};

// Add auth error handler
export const handleAuthError = (error) => {
  // Check if it's a token expiration or invalid token error
  if (error?.response?.status === 401 || 
      (error?.message && error.message.toLowerCase().includes('token'))) {
    
    // Don't clear tokens if we're in the process of refreshing
    if (!error.config?._isRefreshing) {
      // Clear tokens from both storages
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refresh_token');

      // Dispatch auth state change event
      window.dispatchEvent(new CustomEvent('auth-state-change', {
        detail: {
          isAuthenticated: false,
          user: null
        }
      }));

      // Only redirect if not already on auth pages
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/sign-in') && !currentPath.includes('/auth/')) {
        window.location.href = '/sign-in';
      }
    }

    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    if (error.response?.status === 401) {
      return 'Your session has expired. Please log in again.';
    }

    return 'Authentication error. Please log in again.';
  }

  return handleError(error);
};

// Check if token is valid
export const isTokenValid = (token) => {
  try {
    if (!token) return false;
    
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    
    return currentTime < expirationTime;
  } catch (err) {
    console.error('Token validation error:', err);
    return false;
  }
};

// Refresh auth token
export const refreshAuthToken = async (endpoints) => {
  const refresh_token = localStorage.getItem('refresh_token') || 
                       sessionStorage.getItem('refresh_token');
  
  if (!refresh_token) {
    throw new Error('No refresh token available');
  }
  
  try {
    const response = await endpoints.auth.refresh(refresh_token);
    const { access_token, refresh_token: new_refresh_token } = response.data;
    
    if (!access_token) {
      throw new Error('No access token received');
    }
    
    // Update tokens in storage
    const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
    storage.setItem('token', access_token);
    if (new_refresh_token) {
      storage.setItem('refresh_token', new_refresh_token);
    }
    
    // Update Authorization header
    endpoints.auth.setAuthToken(access_token);
    
    return access_token;
  } catch (error) {
    // Clear tokens on refresh failure
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refresh_token');
    endpoints.auth.setAuthToken(null);
    throw error;
  }
};

// Clean OAuth data from storage
export const cleanupOAuthStorage = () => {
  sessionStorage.removeItem('oauth_state');
  sessionStorage.removeItem('oauthProvider');
  sessionStorage.removeItem('redirectAfterLogin');
  sessionStorage.removeItem('processing_oauth_callback');
};

// Update API error interceptor
export const setupErrorInterceptors = (apiInstance) => {
  // Request interceptor
  apiInstance.interceptors.request.use(
    (config) => {
      // Don't add token to refresh token requests
      if (config._isRefreshing) {
        return config;
      }

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token && isTokenValid(token)) {
        config.headers.Authorization = `Bearer ${token}`;
      } else if (token) {
        // Token exists but is invalid, try to refresh
        refreshAuthToken(apiInstance)
          .then(newToken => {
            config.headers.Authorization = `Bearer ${newToken}`;
          })
          .catch(() => {
            // If refresh fails, handle auth error
            handleAuthError({ response: { status: 401 } });
          });
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor
  apiInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Don't retry refresh token requests
      if (originalRequest._isRefreshing) {
        return Promise.reject(error);
      }

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const newToken = await refreshAuthToken(apiInstance);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiInstance(originalRequest);
        } catch (refreshError) {
          return Promise.reject(handleAuthError(refreshError));
        }
      }

      return Promise.reject(error);
    }
  );
};

// Retry helper for failed requests
export const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }
      
      // Wait before retrying
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError;
};

// Helper function to check if error is auth-related
export const isAuthError = (error) => {
  return getErrorType(error) === ErrorTypes.AUTH;
};

// Helper function to check if error is network-related
export const isNetworkError = (error) => {
  return getErrorType(error) === ErrorTypes.NETWORK;
};

// Helper function to check if error is validation-related
export const isValidationError = (error) => {
  return getErrorType(error) === ErrorTypes.VALIDATION;
};

// Helper function to format validation errors
export const formatValidationErrors = (errors) => {
  if (!errors) return [];
  
  if (Array.isArray(errors)) {
    return errors.map(err => ({
      field: err.field || err.param,
      message: err.message || err.msg,
      value: err.value
    }));
  }
  
  return Object.entries(errors).map(([field, message]) => ({
    field,
    message,
    value: null
  }));
};

export default handleError;