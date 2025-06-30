import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useCallback } from 'react';
import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PropertyCard from '../../components/properties/PropertyCard';
import { propertyService } from '../../services/propertyService';
import { useAuth } from '../../context/AuthContext';
import { PROPERTY_TYPES } from '../../utils/propertyTypes';
import { getRecommendedProperties } from '../../services/recommendation';
import { useNotification } from '../../context/NotificationContext';
import SwipeWrapper from '../../components/common/SwipeWrapper';
import { useTheme } from '../../context/ThemeContext';

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { unreadCount } = useNotification();
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [featuredProperties, setFeaturedProperties] = useState([]);
  const [recommendedProperties, setRecommendedProperties] = useState([]);
  const [recLoading, setRecLoading] = useState(true);
  const [recError, setRecError] = useState(null);
  const [recSource, setRecSource] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const userId = user?.profiles_id || user?.id || null;

  /*
   * Helper to fetch all data needed by this screen.
   * We call it on mount and whenever the user pulls to refresh.
   */
  const loadHomeData = useCallback(async () => {
    try {
      // When triggered from pull-to-refresh we'll show the spinner
      if (!refreshing) setIsLoading(true);
      const featuredResp = await propertyService.getFeaturedProperties();

      // Fetch recommendations using the new recommendation engine
      const recommended = await getRecommendedProperties(
        isAuthenticated ? userId : null,
        10 // limit
      );

      if (featuredResp.success) {
        setFeaturedProperties(featuredResp.data);
      } else {
        setError('Failed to load featured properties');
      }

      if (Array.isArray(recommended)) {
        setRecommendedProperties(recommended);
        // Check if recommendation source is available
        if (recommended.source) {
          setRecSource(recommended.source === 'ml' ? 'ML' : 
                      recommended.source === 'js' ? 'JS' : 'Default');
        } else {
          setRecSource(null);
        }
        setRecError(null);
      } else {
        setRecError('Failed to load recommendations');
        setRecSource(null);
      }
    } catch (err) {
      console.error('Error loading featured properties:', err);
      setError('Error loading featured properties');
      setRecSource(null);
    } finally {
      setIsLoading(false);
      setRecLoading(false);
    }
  }, [isAuthenticated, userId]);

  // Fetch data on mount
  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  }, [loadHomeData]);

  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return "Guest";
    
    if (user.profile && (user.profile.firstname || user.profile.lastname)) {
      return `${user.profile.firstname || ''} ${user.profile.lastname || ''}`.trim();
    }
    
    if (user.firstname || user.lastname) {
      return `${user.firstname || ''} ${user.lastname || ''}`.trim();
    }
    
    return user.email ? user.email.split('@')[0] : "Guest";
  };
  
  // Get user profile image
  const getUserProfileImage = () => {
    if (!user) return "https://ui-avatars.com/api/?name=Guest&background=0061FF&color=fff&size=150&rounded=true";
    
    if (user.profile && user.profile.profile_photo) {
      return user.profile.profile_photo;
    }
    
    if (user.profile_photo) {
      return user.profile_photo;
    }
    
    // Fallback to a generated avatar using the user's name
    return `https://ui-avatars.com/api/?name=${getUserDisplayName()}&background=0061FF&color=fff&size=150&rounded=true`;
  };

  const handlePropertyPress = (id) => {
    router.push({
      pathname: '/propertyDetails',
      params: { id }
    });
  };

  const handleCategoryPress = (category) => {
    setSelectedCategory(category);
    // In a real app, this would filter properties by category
  };

  const handlePlusPress = () => {
    if (isAuthenticated) {
      router.push('/add-property');
    } else {
      router.push('/sign-in');
    }
  };

  const handleChatPress = () => {
    router.push('/chats');
  };

  const handleBellPress = () => {
    router.push('/notifications');
  };

  const handleSeeAllRecommendations = () => {
    router.push('/recommendations');
  };

  const handleSeeAllFeatured = () => {
    router.push('/featured');
  };

  // Render recommendation section
  const renderRecommendationSection = () => (
    <View style={[styles.sectionContainer, isDark && styles.darkSection]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>
          Our Recommendation
          {recSource && <Text style={styles.recSourceBadge}> ({recSource})</Text>}
        </Text>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.recommendedScroll}
      >
        {recLoading ? (
          <ActivityIndicator style={{padding:20}} size="large" color="#0061FF" />
        ) : recError ? (
          <Text style={{color:'#FF4949'}}>{recError}</Text>
        ) : recommendedProperties.map((item) => (
          <View key={item.id} style={styles.recommendedCardWrapper}>
            <PropertyCard 
              property={item}
              onPress={() => handlePropertyPress(item.id)}
              featuredStyle={true}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );

  // Render featured properties section
  const renderFeaturedSection = () => (
    <View style={[styles.sectionContainer, isDark && styles.darkSection]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Featured Properties</Text>
        <TouchableOpacity onPress={handleSeeAllFeatured}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>
      
      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        <TouchableOpacity
          style={[
            styles.categoryButton,
            selectedCategory === 'All' && styles.selectedCategoryButton,
            isDark && styles.darkCategoryButton,
            selectedCategory === 'All' && isDark && styles.darkSelectedCategoryButton
          ]}
          onPress={() => handleCategoryPress('All')}
        >
          <Text 
            style={[
              styles.categoryText,
              selectedCategory === 'All' && styles.selectedCategoryText,
              isDark && styles.darkCategoryText,
              selectedCategory === 'All' && isDark && { color: '#FFF' }
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        
        {PROPERTY_TYPES.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.categoryButton,
              selectedCategory === type.value && styles.selectedCategoryButton,
              isDark && styles.darkCategoryButton,
              selectedCategory === type.value && isDark && styles.darkSelectedCategoryButton
            ]}
            onPress={() => handleCategoryPress(type.value)}
          >
            <Text 
              style={[
                styles.categoryText,
                selectedCategory === type.value && styles.selectedCategoryText,
                isDark && styles.darkCategoryText,
                selectedCategory === type.value && isDark && { color: '#FFF' }
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0061FF" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : featuredProperties.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, isDark && { color: '#CCC' }]}>No featured properties available</Text>
        </View>
      ) : (
        <View style={styles.featuredListWrapper}>
          {(
            (selectedCategory === 'All') ? featuredProperties : featuredProperties.filter(p => p.property_type === selectedCategory)
          ).slice(0, 10).map((item) => (
            <View key={item.id} style={styles.propertyCardWrapper}>
              <PropertyCard 
                property={item}
                onPress={() => handlePropertyPress(item.id)}
                listView={true}
                isDark={isDark}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SwipeWrapper tabIndex={0}>
      <SafeAreaView
        style={[styles.safeArea, isDark && styles.darkContainer]}
        edges={['left', 'right', 'bottom']}
      >
        <Stack.Screen
          options={{
            headerTitle: '',
            headerLeft: () => (
              <View style={styles.headerLeft}>
                <Image source={{ uri: getUserProfileImage() }} style={styles.headerAvatar} />
                <View>
                  <Text style={[styles.headerGreeting, isDark && styles.darkText]}>Hello, {getUserDisplayName()}</Text>
                </View>
              </View>
            ),
            headerRight: () => (
              <View style={styles.headerButtons}>
                <TouchableOpacity
                  onPress={handleChatPress}
                  style={[styles.headerButton, isDark && styles.darkHeaderButton]}
                >
                  <Ionicons name="chatbubbles-outline" size={24} color={isDark ? "#FFF" : "#333"} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleBellPress}
                  style={[styles.headerButton, isDark && styles.darkHeaderButton]}
                >
                  <Ionicons name="notifications-outline" size={24} color={isDark ? "#FFF" : "#333"} />
                  {unreadCount > 0 && <View style={styles.notificationBadge} />}
                </TouchableOpacity>
              </View>
            ),
            headerStyle: {
              backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
            },
          }}
        />
        <StatusBar style="dark" />
        
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#0061FF"
              colors={["#0061FF"]}
            />
          }
        >
          <View style={styles.headerContainer}>
            {/* Recommendation section */}
            {renderRecommendationSection()}
            
            {/* Featured Properties section */}
            {renderFeaturedSection()}
          </View>
        </ScrollView>
        {/* Floating Add Property Button */}
        {isAuthenticated && (
          <TouchableOpacity style={styles.fabAdd} onPress={handlePlusPress}>
            <Ionicons name="add" size={32} color="#FFF" />
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </SwipeWrapper>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  darkContainer: {
    backgroundColor: '#1A1A1A',
  },
  scrollViewContent: {
    paddingBottom: 80,
  },
  headerContainer: {
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  headerGreeting: {
    fontSize: 16,
    fontWeight: '500',
    color: '#191d31',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    position: 'relative',
  },
  darkHeaderButton: {
    backgroundColor: '#2A2A2A',
  },
  notificationBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4949',
    position: 'absolute',
    top: 10,
    right: 10,
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingVertical: 16,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 12,
  },
  selectedCategoryButton: {
    backgroundColor: '#0061FF',
  },
  categoryText: {
    fontSize: 14,
    color: '#666876',
  },
  selectedCategoryText: {
    color: '#fff',
    fontWeight: '500',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#191d31',
  },
  seeAllText: {
    fontSize: 14,
    color: '#0061FF',
  },
  recommendedScroll: {
    paddingRight: 16,
  },
  recommendedCardWrapper: {
    marginRight: 0,
    width: 280,
  },
  propertyCard: {
    width: '48%',
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    height: 120,
  },
  propertyImage: {
    width: '100%',
    height: '100%',
  },
  viewsContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewsText: {
    fontSize: 12,
    color: '#0061FF',
    marginLeft: 4,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyDetails: {
    padding: 12,
  },
  propertyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#191d31',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#666876',
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statText: {
    fontSize: 12,
    color: '#191d31',
    marginLeft: 4,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0061FF',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0061FF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#0061FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabAdd: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0061FF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#0061FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF4949',
    textAlign: 'center',
  },
  featuredListWrapper: {
    marginTop: 8,
  },
  propertyCardWrapper: {
    marginHorizontal: 0,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
  },
  darkSearchContainer: {
    borderColor: '#444',
  },
  darkSearchInput: {
    color: '#FFF',
  },
  darkText: {
    color: '#FFF',
  },
  darkSubText: {
    color: '#CCC',
  },
  darkCategoryButton: {
    backgroundColor: '#2A2A2A',
    borderColor: '#444',
  },
  darkSelectedCategoryButton: {
    backgroundColor: '#0061FF',
  },
  darkCategoryText: {
    color: '#CCC',
  },
  recSourceBadge: {
    fontSize: 12,
    color: '#0061FF',
    fontWeight: '400',
  },
}); 