import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, StyleSheet, Text, View, ActivityIndicator, RefreshControl } from 'react-native';
import PropertyCard from '../components/properties/PropertyCard';
import { propertyService } from '../services/propertyService';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FeaturedPage() {
  const router = useRouter();
  const { isDark } = useTheme();
  const [featuredProperties, setFeaturedProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Function to load featured properties
  const loadFeaturedProperties = useCallback(async () => {
    try {
      if (!refreshing) setIsLoading(true);
      const response = await propertyService.getFeaturedProperties();
      
      if (response.success) {
        setFeaturedProperties(response.data || []);
        setError(null);
      } else {
        setError('Failed to load featured properties');
      }
    } catch (err) {
      console.error('Error loading featured properties:', err);
      setError('Error loading featured properties. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  // Load properties on mount
  useEffect(() => {
    loadFeaturedProperties();
  }, [loadFeaturedProperties]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFeaturedProperties();
  }, [loadFeaturedProperties]);

  const handlePropertyPress = (id) => {
    router.push({
      pathname: '/propertyDetails',
      params: { id }
    });
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]} edges={['top']}>
      <Stack.Screen options={{ 
        title: 'Featured Properties',
        headerTitleStyle: {
          color: isDark ? '#FFF' : '#333',
        },
        headerStyle: {
          backgroundColor: isDark ? '#1A1A1A' : '#fff',
        },
        headerShadowVisible: false,
      }} />
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={[styles.content, isDark && styles.darkSection]}>
        <Text style={[styles.heading, isDark && styles.darkText]}>Showcased Properties</Text>
        <Text style={[styles.subheading, isDark && styles.darkSubText]}>Explore our selection of premium properties</Text>
        
        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0061FF" />
            <Text style={[styles.loadingText, isDark && styles.darkSubText]}>Loading featured properties...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : featuredProperties.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, isDark && styles.darkSubText]}>No featured properties available</Text>
          </View>
        ) : (
          <FlatList
            data={featuredProperties}
            renderItem={({ item }) => (
              <PropertyCard 
                property={item}
                onPress={() => handlePropertyPress(item.id)}
                listView={true}
                style={styles.listItem}
                isDark={isDark}
              />
            )}
            keyExtractor={item => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#0061FF"
                colors={["#0061FF"]}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  darkContainer: {
    backgroundColor: '#1A1A1A',
  },
  content: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f8f8',
  },
  darkSection: {
    backgroundColor: '#1A1A1A',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  darkText: {
    color: '#FFF',
  },
  subheading: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  darkSubText: {
    color: '#CCC',
  },
  listContainer: {
    paddingBottom: 20,
  },
  listItem: {
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF4949',
    textAlign: 'center',
  },
}); 