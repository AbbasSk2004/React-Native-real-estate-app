import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PropertyCard from '../components/properties/PropertyCard';
import EmptyState from '../components/common/EmptyState';
import useUserProperties from '../hooks/useUserProperties';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { propertyService } from '../services/propertyService';

export default function MyProperties() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const { properties, loading, error, refetch } = useUserProperties();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handlePropertyPress = (id) => {
    router.push({
      pathname: '/propertyDetails',
      params: { id }
    });
  };

  const confirmDelete = (id) => {
    Alert.alert(
      'Delete Property',
      'Are you sure you want to delete this property? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(id) }
      ]
    );
  };

  const handleDelete = async (id) => {
    try {
      await propertyService.deleteProperty(id);
      await refetch();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to delete property');
    }
  };

  const handleFeature = async (id) => {
    try {
      // Attempt to mark property as featured
      await propertyService.updateProperty(id, { is_featured: true });
      await refetch();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to feature property');
    }
  };

  const promptFeature = (id) => {
    Alert.alert(
      'Get Featured',
      'Featured listings appear on the home page and make it easier for other users to find your property faster. The cost is $5.',
      [
        { text: 'Back', style: 'cancel' },
        { 
          text: 'Next', 
          onPress: () => {
            console.log('Navigating to payment form with property ID:', id);
            // Make sure to use the correct pathname
            router.push({
              pathname: 'paymentform',
              params: { propertyId: id, price: 5 }
            });
          }
        },
      ]
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
        <Stack.Screen
          options={{
            headerTitle: 'My Properties',
            headerTitleAlign: 'center',
          }}
        />
        <EmptyState
          icon="log-in-outline"
          title="Sign In Required"
          message="Please sign in to view your properties"
          actionLabel="Sign In"
          onAction={() => router.push('/sign-in')}
          isDark={isDark}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <Stack.Screen
        options={{
          headerTitle: 'My Properties',
          headerTitleAlign: 'center',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={isDark ? "#FFF" : "#333"} />
            </TouchableOpacity>
          ),
        }}
      />

      {loading && properties.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0061FF" />
        </View>
      ) : properties.length === 0 ? (
        <EmptyState
          icon="home-outline"
          title="No Properties Found"
          message="You haven't added any properties yet"
          actionLabel="Explore Properties"
          onAction={() => router.push('/(tabs)/explore')}
          isDark={isDark}
        />
      ) : (
        <FlatList
          key="oneColumn"
          data={properties}
          keyExtractor={(item) => item.id.toString()}
          numColumns={1}
          renderItem={({ item }) => (
            <PropertyCard 
              property={item} 
              onPress={() => handlePropertyPress(item.id)}
              style={styles.propertyCard}
              isDark={isDark}
              onDelete={() => confirmDelete(item.id)}
              onFeature={() => promptFeature(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              colors={['#0061FF']}
              tintColor="#0061FF"
            />
          }
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              <Text style={[styles.resultsText, isDark && styles.darkText]}>
                {properties.length} {properties.length === 1 ? 'property' : 'properties'} found
              </Text>
            </View>
          }
        />
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load properties. Please try again.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  darkContainer: {
    backgroundColor: '#1A1A1A',
  },
  backButton: {
    marginLeft: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  headerContainer: {
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 16,
    color: '#666',
  },
  darkText: {
    color: '#CCC',
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  propertyCard: {
    flex: 1,
    margin: 8,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#FF4949',
    marginBottom: 8,
  },
  retryButton: {
    padding: 10,
    backgroundColor: '#0061FF',
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
}); 