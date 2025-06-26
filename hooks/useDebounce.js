import { useState, useEffect } from 'react';

export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Additional utility hook for search optimization
export const useSearchOptimization = (initialFilters = {}) => {
  const [searchHistory, setSearchHistory] = useState([]);
  const [popularSearches, setPopularSearches] = useState([]);

  const addToHistory = (filters) => {
    setSearchHistory(prev => {
      const newHistory = [filters, ...prev.filter(item => 
        JSON.stringify(item) !== JSON.stringify(filters)
      )];
      return newHistory.slice(0, 10); // Keep only last 10 searches
    });
  };

  const getSearchSuggestions = (currentFilters) => {
    // Logic to suggest similar searches based on history
    return searchHistory.filter(search => 
      search.governorate === currentFilters.governorate ||
      search.propertyType === currentFilters.propertyType
    ).slice(0, 5);
  };

  return {
    searchHistory,
    popularSearches,
    addToHistory,
    getSearchSuggestions
  };
};