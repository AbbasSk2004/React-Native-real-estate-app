import api from './api';

export const saveSearchPreferences = async (userId, searchData) => {
  try {
    const { data, error } = await api.endpoints.saveSearchHistory(searchData);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving search:', error);
    throw error;
  }
};

export const getSearchPreferences = async (userId) => {
  try {
    const { data, error } = await api.endpoints.getSearchHistory();
    if (error) throw error;
    
    return data.map(item => ({
      id: item.id,
      name: item.search_query.name,
      filters: item.search_query.filters,
      sortBy: item.search_query.sortBy,
      savedAt: item.searched_at
    }));
  } catch (error) {
    console.error('Error fetching saved searches:', error);
    throw error;
  }
};

export const deleteSearchPreference = async (searchId) => {
  try {
    const { error } = await api.endpoints.deleteSearchHistory(searchId);
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting search:', error);
    throw error;
  }
};

export const updateSearchPreference = async (searchId, searchData) => {
  try {
    const { data, error } = await api.endpoints.updateSearchHistory(searchId, searchData);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating search:', error);
    throw error;
  }
};

export const recordSearch = async (userId, filters, resultsCount) => {
  try {
    const { error } = await api.endpoints.recordSearch(userId, filters, resultsCount);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error recording search:', error);
    return false;
  }
};

export const getSearchHistory = async (userId) => {
  try {
    const { data, error } = await api.endpoints.getSearchHistory();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching search history:', error);
    throw error;
  }
};

export const getPopularSearches = async (limit = 5) => {
  try {
    const { data, error } = await api.endpoints.getPopularSearches(limit);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting popular searches:', error);
    return [];
  }
};

export const saveSearch = async (userId, filters, searchName) => {
  try {
    const { error } = await api.endpoints.saveSearch(userId, filters, searchName);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving search:', error);
    return false;
  }
};

export const getSavedSearches = async (userId) => {
  try {
    const { data, error } = await api.endpoints.getSavedSearches(userId);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting saved searches:', error);
    return [];
  }
};

export const deleteSavedSearch = async (searchId) => {
  try {
    const { error } = await api.endpoints.deleteSavedSearch(searchId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting saved search:', error);
    return false;
  }
};

export const getSearchSuggestions = async (query) => {
  try {
    const { data, error } = await api.endpoints.getSearchSuggestions(query);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    throw error;
  }
};

export const searchAll = async (query) => {
  try {
    const { data, error } = await api.endpoints.searchAll(query);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error performing global search:', error);
    throw error;
  }
};