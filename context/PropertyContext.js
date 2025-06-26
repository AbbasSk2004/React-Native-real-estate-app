import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { endpoints } from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from '../hooks/useToast';

const PropertyContext = createContext();

// Action types
const PROPERTY_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_PROPERTIES: 'SET_PROPERTIES',
  ADD_PROPERTY: 'ADD_PROPERTY',
  UPDATE_PROPERTY: 'UPDATE_PROPERTY',
  DELETE_PROPERTY: 'DELETE_PROPERTY',
  SET_FEATURED_PROPERTIES: 'SET_FEATURED_PROPERTIES',
  SET_FILTERS: 'SET_FILTERS',
  SET_SEARCH_RESULTS: 'SET_SEARCH_RESULTS',
  SET_PROPERTY_DETAILS: 'SET_PROPERTY_DETAILS',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_PAGINATION: 'SET_PAGINATION',
  INCREMENT_VIEW_COUNT: 'INCREMENT_VIEW_COUNT'
};

// Initial state
const initialState = {
  properties: [],
  featuredProperties: [],
  searchResults: [],
  currentProperty: null,
  loading: false,
  error: null,
  filters: {
    propertyType: '',
    status: 'all',
    priceRange: { min: 0, max: 1000000 },
    bedrooms: '',
    bathrooms: '',
    city: '',
    governorate: '',
    keyword: '',
    featured: false,
    sortBy: 'created_at',
    sortOrder: 'desc'
  },
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: 12
  }
};

// Reducer
const propertyReducer = (state, action) => {
  switch (action.type) {
    case PROPERTY_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    case PROPERTY_ACTIONS.SET_PROPERTIES:
      return { 
        ...state, 
        properties: action.payload,
        loading: false,
        error: null
      };

    case PROPERTY_ACTIONS.ADD_PROPERTY:
      return {
        ...state,
        properties: [action.payload, ...state.properties],
        loading: false
      };

    case PROPERTY_ACTIONS.UPDATE_PROPERTY:
      return {
        ...state,
        properties: state.properties.map(property =>
          property.id === action.payload.id ? action.payload : property
        ),
        currentProperty: state.currentProperty?.id === action.payload.id 
          ? action.payload 
          : state.currentProperty,
        loading: false
      };

    case PROPERTY_ACTIONS.DELETE_PROPERTY:
      return {
        ...state,
        properties: state.properties.filter(property => property.id !== action.payload),
        loading: false
      };

    case PROPERTY_ACTIONS.SET_FEATURED_PROPERTIES:
      return { 
        ...state, 
        featuredProperties: action.payload,
        loading: false
      };

    case PROPERTY_ACTIONS.SET_FILTERS:
      return { 
        ...state, 
        filters: { ...state.filters, ...action.payload }
      };

    case PROPERTY_ACTIONS.SET_SEARCH_RESULTS:
      return { 
        ...state, 
        searchResults: action.payload,
        loading: false
      };

    case PROPERTY_ACTIONS.SET_PROPERTY_DETAILS:
      return { 
        ...state, 
        currentProperty: action.payload,
        loading: false,
        error: null
      };

    case PROPERTY_ACTIONS.SET_ERROR:
      return { 
        ...state, 
        error: action.payload,
        loading: false
      };

    case PROPERTY_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };

    case PROPERTY_ACTIONS.SET_PAGINATION:
      return { 
        ...state, 
        pagination: { ...state.pagination, ...action.payload }
      };

    case PROPERTY_ACTIONS.INCREMENT_VIEW_COUNT:
      return {
        ...state,
        currentProperty: state.currentProperty?.id === action.payload
          ? { ...state.currentProperty, views_count: (state.currentProperty.views_count || 0) + 1 }
          : state.currentProperty,
        properties: state.properties.map(property =>
          property.id === action.payload
            ? { ...property, views_count: (property.views_count || 0) + 1 }
            : property
        )
      };

    default:
      return state;
  }
};

// Provider component
export const PropertyProvider = ({ children }) => {
  const [state, dispatch] = useReducer(propertyReducer, initialState);
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  // Fetch properties with filters
  const fetchProperties = useCallback(async (filters = {}, page = 1) => {
    try {
      dispatch({ type: PROPERTY_ACTIONS.SET_LOADING, payload: true });
      
      const queryParams = {
        ...state.filters,
        ...filters,
        page,
        limit: state.pagination.pageSize
      };

      const response = await endpoints.properties.getAll(queryParams);
      
      dispatch({ type: PROPERTY_ACTIONS.SET_PROPERTIES, payload: response.data.properties });
      dispatch({ 
        type: PROPERTY_ACTIONS.SET_PAGINATION, 
        payload: {
          currentPage: page,
          totalPages: response.data.totalPages,
          totalCount: response.data.totalCount
        }
      });
    } catch (error) {
      dispatch({ type: PROPERTY_ACTIONS.SET_ERROR, payload: error.message });
      toast.error('Failed to fetch properties');
    }
  }, [state.filters, state.pagination.pageSize, toast]);

  // Fetch featured properties
  const fetchFeaturedProperties = useCallback(async () => {
    try {
      dispatch({ type: PROPERTY_ACTIONS.SET_LOADING, payload: true });
      const response = await endpoints.properties.getFeatured();
      dispatch({ type: PROPERTY_ACTIONS.SET_FEATURED_PROPERTIES, payload: response.data });
    } catch (error) {
      dispatch({ type: PROPERTY_ACTIONS.SET_ERROR, payload: error.message });
      toast.error('Failed to fetch featured properties');
    }
  }, [toast]);

  // Fetch property details
  const fetchPropertyDetails = useCallback(async (propertyId) => {
    try {
      dispatch({ type: PROPERTY_ACTIONS.SET_LOADING, payload: true });
      const response = await endpoints.getProperty(propertyId);
      dispatch({ type: PROPERTY_ACTIONS.SET_PROPERTY_DETAILS, payload: response.data });
      
      // Track property view
      if (isAuthenticated) {
        await endpoints.trackPropertyView(propertyId);
        dispatch({ type: PROPERTY_ACTIONS.INCREMENT_VIEW_COUNT, payload: propertyId });
      }
    } catch (error) {
      dispatch({ type: PROPERTY_ACTIONS.SET_ERROR, payload: error.message });
      toast.error('Failed to fetch property details');
    }
  }, [isAuthenticated, toast]);

  // Add new property
  const addProperty = useCallback(async (propertyData) => {
    try {
      dispatch({ type: PROPERTY_ACTIONS.SET_LOADING, payload: true });
      const response = await endpoints.addProperty(propertyData);
      dispatch({ type: PROPERTY_ACTIONS.ADD_PROPERTY, payload: response.data });
      toast.success('Property added successfully');
      return response.data;
    } catch (error) {
      dispatch({ type: PROPERTY_ACTIONS.SET_ERROR, payload: error.message });
      toast.error('Failed to add property');
      throw error;
    }
  }, [toast]);

  // Update property
  const updateProperty = useCallback(async (propertyId, propertyData) => {
    try {
      dispatch({ type: PROPERTY_ACTIONS.SET_LOADING, payload: true });
      const response = await endpoints.updateProperty(propertyId, propertyData);
      dispatch({ type: PROPERTY_ACTIONS.UPDATE_PROPERTY, payload: response.data });
      toast.success('Property updated successfully');
      return response.data;
    } catch (error) {
      dispatch({ type: PROPERTY_ACTIONS.SET_ERROR, payload: error.message });
      toast.error('Failed to update property');
      throw error;
    }
  }, [toast]);

  // Delete property
  const deleteProperty = useCallback(async (propertyId) => {
    try {
      dispatch({ type: PROPERTY_ACTIONS.SET_LOADING, payload: true });
      await endpoints.deleteProperty(propertyId);
      dispatch({ type: PROPERTY_ACTIONS.DELETE_PROPERTY, payload: propertyId });
      toast.success('Property deleted successfully');
    } catch (error) {
      dispatch({ type: PROPERTY_ACTIONS.SET_ERROR, payload: error.message });
      toast.error('Failed to delete property');
      throw error;
    }
  }, [toast]);

  // Search properties
  const searchProperties = useCallback(async (searchTerm, filters = {}) => {
    try {
      dispatch({ type: PROPERTY_ACTIONS.SET_LOADING, payload: true });
      const queryParams = {
        keyword: searchTerm,
        ...filters
      };
      const response = await endpoints.getProperties(queryParams);
      dispatch({ type: PROPERTY_ACTIONS.SET_SEARCH_RESULTS, payload: response.data.properties });
    } catch (error) {
      dispatch({ type: PROPERTY_ACTIONS.SET_ERROR, payload: error.message });
      toast.error('Search failed');
    }
  }, [toast]);

  // Update filters
  const updateFilters = useCallback((newFilters) => {
    dispatch({ type: PROPERTY_ACTIONS.SET_FILTERS, payload: newFilters });
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    dispatch({ type: PROPERTY_ACTIONS.SET_FILTERS, payload: initialState.filters });
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: PROPERTY_ACTIONS.CLEAR_ERROR });
  }, []);

  const value = {
    // State
    ...state,
    
    // Actions
    fetchProperties,
    fetchFeaturedProperties,
    fetchPropertyDetails,
    addProperty,
    updateProperty,
    deleteProperty,
    searchProperties,
    updateFilters,
    clearFilters,
    clearError
  };

  return (
    <PropertyContext.Provider value={value}>
      {children}
    </PropertyContext.Provider>
  );
};

// Hook to use property context
export const useProperty = () => {
  const context = useContext(PropertyContext);
  if (!context) {
    throw new Error('useProperty must be used within a PropertyProvider');
  }
  return context;
};