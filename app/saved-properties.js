import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PropertyCard from '../components/properties/PropertyCard';
import { endpoints } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function SavedProperties() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isDark, getThemeColors } = useTheme();
  const colors = getThemeColors();
  const [savedProperties, setSavedProperties] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load saved properties on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadSavedProperties();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadSavedProperties = async () => {
    try {
      setLoading(true);
      const response = await endpoints.favorites.getUserFavorites();
      
      if (response?.success && Array.isArray(response.data)) {
        setSavedProperties(response.data);
      } else {
        setSavedProperties([]);
      }
    } catch (error) {
      console.log('Error loading saved properties:', error);
      Alert.alert('Error', 'Failed to load your saved properties');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSavedProperties();
    setRefreshing(false);
  };

  const handlePropertyPress = (id) => {
    router.push({
      pathname: '/propertyDetails',
      params: { id }
    });
  };

  const handleRemoveProperty = async (propertyId) => {
    Alert.alert(
      "Remove Property",
      "Are you sure you want to remove this property from saved?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await endpoints.favorites.removeFromFavorites(propertyId);
              setSavedProperties(prev => prev.filter(property => property.id !== propertyId));
              Alert.alert('Success', 'Property removed from saved');
            } catch (error) {
              console.error('Error removing property from favorites:', error);
              Alert.alert('Error', 'Failed to remove property from favorites');
            }
          }
        }
      ]
    );
  };

  const handleLoginPress = () => {
    router.push('/sign-in');
  };

  // --------------------
  // Header appearance based on theme
  // --------------------
  const headerThemeStyles = {
    headerStyle: {
      backgroundColor: colors.background,
    },
    headerShadowVisible: !isDark,
    headerTitleStyle: {
      color: colors.text,
    },
    headerTintColor: colors.text,
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
        <Stack.Screen
          options={{
            ...headerThemeStyles,
            headerTitle: 'Saved Properties',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0061FF" />
          <Text style={[styles.loadingText, isDark && styles.darkText]}>Loading saved properties...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
        <Stack.Screen
          options={{
            ...headerThemeStyles,
            headerTitle: 'Saved Properties',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={64} color={isDark ? "#444" : "#ccc"} />
          <Text style={[styles.emptyTitle, isDark && styles.darkText]}>Login Required</Text>
          <Text style={[styles.emptyText, isDark && styles.darkSubText]}>
            Please sign in to view and manage your saved properties.
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={handleLoginPress}
          >
            <Text style={styles.exploreButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <Stack.Screen
        options={{
          ...headerThemeStyles,
          headerTitle: 'Saved Properties',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {savedProperties.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={64} color={isDark ? "#444" : "#ccc"} />
            <Text style={[styles.emptyTitle, isDark && styles.darkText]}>No Saved Properties</Text>
            <Text style={[styles.emptyText, isDark && styles.darkSubText]}>
              Properties you save will appear here. Start exploring to find your dream property!
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => router.push('/featured')}
            >
              <Text style={styles.exploreButtonText}>Explore Properties</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.propertiesContainer}>
            <Text style={[styles.savedCount, isDark && styles.darkText]}>
              {savedProperties.length} Saved {savedProperties.length === 1 ? 'Property' : 'Properties'}
            </Text>
            {savedProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onPress={() => handlePropertyPress(property.id)}
                onRemove={() => handleRemoveProperty(property.id)}
                isDark={isDark}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  darkContainer: {
    backgroundColor: '#1A1A1A',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  backButton: {
    marginLeft: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  darkText: {
    color: '#FFF',
  },
  darkSubText: {
    color: '#CCC',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: '#0061FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  propertiesContainer: {
    paddingBottom: 24,
  },
  savedCount: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
}); 