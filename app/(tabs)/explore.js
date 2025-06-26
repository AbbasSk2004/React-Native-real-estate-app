import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useCallback } from 'react';
import {
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PropertyCard from '../../components/properties/PropertyCard';
import SearchBar from '../../components/SearchBar';
import { propertyService } from '../../services/propertyService';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import Filters from '../../components/common/Filters';
import { PROPERTY_TYPES } from '../../utils/propertyTypes';
import SwipeWrapper from '../../components/common/SwipeWrapper';
import { useTheme } from '../../context/ThemeContext';

export default function Explore() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { unreadCount } = useNotification();
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    propertyType: '',
    status: '',
    priceRange: { min: '', max: '' },
    area: { min: '', max: '' },
    bedrooms: '',
    bathrooms: '',
    governate: '',
    city: '',
    village: '',
    features: {}
  });
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Fetch properties from the API
  const fetchProperties = async (pageNum = 1, query = searchQuery, filtersParam = activeFilters) => {
    try {
      setIsLoading(true);
      
      // Prepare filter parameters
      const params = {
        page: pageNum,
        pageSize: 10,
        verified: true, // Only fetch verified properties
        keyword: query || undefined,
      };
      
      // Add active filters
      const currentFilters = filtersParam;

      if (currentFilters.propertyType) {
        // Map label (e.g., "Retail Space") to value expected by backend (e.g., "Retail")
        const typeObj = PROPERTY_TYPES.find(t => t.label === currentFilters.propertyType || t.value === currentFilters.propertyType);
        params.propertyType = typeObj ? typeObj.value : currentFilters.propertyType;
      }
      
      if (currentFilters.status) {
        params.status = currentFilters.status;
      }
      
      if (currentFilters.bedrooms) {
        params.bedrooms = parseInt(currentFilters.bedrooms);
      }
      
      if (currentFilters.bathrooms) {
        params.bathrooms = parseInt(currentFilters.bathrooms);
      }
      
      if (currentFilters.priceRange?.min) {
        params.priceMin = parseInt(currentFilters.priceRange.min);
      }
      
      if (currentFilters.priceRange?.max) {
        params.priceMax = parseInt(currentFilters.priceRange.max);
      }
      
      if (currentFilters.area?.min) {
        params.areaMin = parseInt(currentFilters.area.min);
      }
      
      if (currentFilters.area?.max) {
        params.areaMax = parseInt(currentFilters.area.max);
      }
      
      // Add location filters if they exist - backend uses 'governorate' query param
      if (currentFilters.governate || currentFilters.governorate) {
        params.governorate = currentFilters.governate || currentFilters.governorate;
      }
      
      if (currentFilters.city) {
        params.city = currentFilters.city;
      }
      
      if (currentFilters.village) {
        params.village = currentFilters.village;
      }
      
      // If any features are selected, add them
      if (currentFilters.features) {
        const selectedFeatures = Object.entries(currentFilters.features)
          .filter(([_, isSelected]) => isSelected)
          .map(([feature]) => feature);
          
        if (selectedFeatures.length > 0) {
          params.features = selectedFeatures;
        }
      }
      
      console.log('Fetching properties with params:', params);
      const response = await propertyService.getProperties(params);
      
      if (response.success) {
        if (pageNum === 1) {
          // Replace all properties if it's the first page
          setProperties(response.properties || []);
        } else {
          // Append properties for pagination
          setProperties(prev => [...prev, ...(response.properties || [])]);
        }
        
        setTotalPages(response.totalPages || 1);
        setError(null);
      } else {
        setError('Failed to fetch properties');
      }
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError('An error occurred while fetching properties');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchProperties();
  }, []);

  // Handle property press
  const handlePropertyPress = (id) => {
    router.push({
      pathname: '/propertyDetails',
      params: { id }
    });
  };

  // Handle search with debouncing
  const handleSearch = useCallback((text) => {
    setSearchQuery(text);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set a new timeout to delay the API call
    const newTimeout = setTimeout(() => {
      setPage(1); // Reset to first page
      fetchProperties(1, text);
    }, 500); // 500ms delay
    
    setSearchTimeout(newTimeout);
  }, [searchTimeout]);

  // Handle filter press
  const handleFilterPress = () => {
    setShowFilters(true);
  };

  // Handle apply filters
  const handleApplyFilters = (filters) => {
    console.log('Applying filters:', filters);
    setActiveFilters(filters);
    setPage(1);
    fetchProperties(1, searchQuery, filters);
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchProperties(1, searchQuery);
  };

  // Handle load more
  const handleLoadMore = () => {
    if (page < totalPages && !isLoading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProperties(nextPage, searchQuery);
    }
  };

  // Render footer for FlatList
  const renderFooter = () => {
    if (!isLoading) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="large" color="#0061FF" />
      </View>
    );
  };

  // Render empty state
  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search" size={60} color={isDark ? "#555" : "#ccc"} />
        <Text style={[styles.emptyText, isDark && styles.darkText]}>
          No properties found
        </Text>
        <Text style={[styles.emptySubText, isDark && styles.darkSubText]}>
          Try adjusting your search or filters
        </Text>
      </View>
    );
  };

  return (
    <SwipeWrapper tabIndex={1}>
      <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
        <Stack.Screen
          options={{
            headerTitle: 'Explore Properties',
            headerRight: () => (
              <TouchableOpacity
                onPress={() => router.push('/notifications')}
                style={styles.headerButton}
              >
                <Ionicons name="notifications-outline" size={24} color={isDark ? "#FFF" : "#333"} />
                {unreadCount > 0 && <View style={styles.notificationBadge} />}
              </TouchableOpacity>
            ),
          }}
        />

        <View style={styles.searchContainer}>
          <View style={styles.searchBarWrapper}>
            <SearchBar 
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search properties, locations..."
              isDark={isDark}
            />
          </View>
          <TouchableOpacity 
            style={[styles.filterButton, isDark && styles.darkFilterButton]} 
            onPress={handleFilterPress}
          >
            <Ionicons name="options-outline" size={24} color={isDark ? "#FFF" : "#333"} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={properties}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <PropertyCard 
              property={item} 
              onPress={() => handlePropertyPress(item.id)} 
              listView={true}
              style={styles.propertyCard}
              isDark={isDark}
            />
          )}
          contentContainerStyle={styles.listContainer}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
        />

        {showFilters && (
          <Filters 
            visible={showFilters}
            onClose={() => setShowFilters(false)}
            onApply={handleApplyFilters}
            initialFilters={activeFilters}
            isDark={isDark}
          />
        )}
      </SafeAreaView>
    </SwipeWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  darkContainer: {
    backgroundColor: '#1A1A1A',
  },
  header: {
    padding: 16,
  },
  darkHeader: {
    backgroundColor: '#1A1A1A',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  darkText: {
    color: '#FFF',
  },
  darkSubText: {
    color: '#CCC',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  searchBarWrapper: {
    flex: 1,
  },
  filterButton: {
    width: 50,
    height: 50,
    backgroundColor: '#FFF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  darkFilterButton: {
    backgroundColor: '#2A2A2A',
  },
  headerButton: {
    marginRight: 16,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5E5E',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  propertyCard: {
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  footerLoader: {
    padding: 20,
    alignItems: 'center',
  },
  // ... existing styles ...
}); 