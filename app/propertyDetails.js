import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PropertyImageGallery from '../components/properties/PropertyImageGallery';
import PropertyDetailsSection from '../components/properties/PropertyDetailsSection';
import PropertyDescriptionSection from '../components/properties/PropertyDescriptionSection';
import PropertyOwnerSection from '../components/properties/PropertyOwnerSection';
import SimilarPropertiesSection from '../components/properties/SimilarPropertiesSection';
import PropertyInquiryModal from '../components/properties/PropertyInquiryModal';
import { propertyService } from '../services/propertyService';
import { PropertyInquiryService } from '../services/property_inquiry';
import { endpoints } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ChatProvider } from '../context/ChatContext';
import { useTheme } from '../context/ThemeContext';

const getPropertyCacheKey = (id) => `property_${id}`;

const PropertyDetailsScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { isDark } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState(null);
  const [error, setError] = useState(null);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  
  useEffect(() => {
    fetchPropertyDetails();
  }, [id]);
  
  const fetchPropertyDetails = async () => {
    if (!id) {
      setError('Invalid property ID');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const propertyData = await propertyService.getPropertyById(id);
      
      if (!propertyData) {
        throw new Error('Property not found');
      }
      
      setProperty(propertyData);
      
      // Record view for analytics - using multiple methods for reliability
      try {
        await endpoints.propertyViews.recordView(id);
      } catch (viewError) {
        console.error('Failed to record property view:', viewError);
        // Don't throw - just log the error
      }
      
      // Check if the current user is the owner
      if (propertyData && isAuthenticated && user) {
        setIsOwner(propertyData.profiles_id === user.id);
      } else {
        setIsOwner(false);
      }
    } catch (error) {
      console.error('Error fetching property details:', error);
      setError(error.message || 'Failed to load property details');
    } finally {
      setLoading(false);
    }
  };
  
  const handleShare = async () => {
    if (!property) return;
    
    try {
      const shareUrl = `${property.location_url || 'https://realestate.com/property/'}${property.id}`;
      
      await Share.share({
        title: property.title,
        message: `Check out this property: ${property.title} - ${shareUrl}`,
        url: shareUrl,
      });
    } catch (error) {
      console.error('Error sharing property:', error);
    }
  };
  
  const handleInquirySubmit = async (inquiryData) => {
    try {
      // Use the PropertyInquiryService to create a new inquiry
      const response = await PropertyInquiryService.createInquiry({
        property_id: property.id,
        ...inquiryData
      });
      
      return true;
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      throw error;
    }
  };
  
  const handleShowInquiryModal = () => {
    // If user is the owner, don't open the inquiry form
    if (isOwner) {
      return;
    }
    
    if (!isAuthenticated) {
      router.push('/sign-in');
      return;
    }
    
    setShowInquiryModal(true);
  };
  
  // Header appearance based on theme
  const headerThemeStyles = {
    headerStyle: {
      backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
      height: 56, // standard material header height for vertical centering
    },
    contentStyle: {
      backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
      
    },
    headerShadowVisible: !isDark,
    headerTitleStyle: {
      color: isDark ? '#FFFFFF' : '#333',
      fontWeight: '600',
      transform: [{ translateY: 6 }],
    },
    headerTitleContainerStyle: {
      transform: [{ translateY: 6 }],
    },
    headerTintColor: isDark ? '#FFFFFF' : '#333',
    headerStatusBarHeight: 0,
  };
  
  const headerOptions = {
    ...headerThemeStyles,
    headerShown: true,
    title: 'Property Details',
    headerLeft: () => (
      <TouchableOpacity onPress={() => router.back()} style={styles.shareButton}>
        <Ionicons name="arrow-back" size={24} color={isDark ? '#FFF' : '#333'} />
      </TouchableOpacity>
    ),
    headerRight: () => (
      <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
        <Ionicons name="share-outline" size={24} color={isDark ? '#FFF' : '#333'} />
      </TouchableOpacity>
    ),
  };
  
  if (loading) {
    return (
      <>
        <Stack.Screen options={headerOptions} />
        <View style={[styles.loadingContainer, isDark && styles.darkContainer]}>
          <ActivityIndicator size="large" color="#3366FF" />
        </View>
      </>
    );
  }
  
  if (error) {
    return (
      <>
        <Stack.Screen options={headerOptions} />
        <View style={[styles.errorContainer, isDark && styles.darkContainer]}>
          <Ionicons name="alert-circle-outline" size={60} color="#FF6B6B" />
          <Text style={[styles.errorText, isDark && styles.darkText]}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchPropertyDetails}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }
  
  if (!property) {
    return (
      <>
        <Stack.Screen options={headerOptions} />
        <View style={[styles.errorContainer, isDark && styles.darkContainer]}>
          <Ionicons name="home-outline" size={60} color={isDark ? '#CCC' : '#666'} />
          <Text style={[styles.errorText, isDark && styles.darkText]}>Property not found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }
  
  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      <Stack.Screen options={headerOptions} />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        style={[styles.scrollView, isDark && styles.darkScrollView]}
      >
        {/* Property Images */}
        <PropertyImageGallery images={property.images || [property.main_image]} />
        
        {/* Property Basic Details */}
        <PropertyDetailsSection property={property} isDark={isDark} />
        
        {/* Property Description and Features */}
        <PropertyDescriptionSection property={property} isDark={isDark} />
        
        {/* Property Owner/Agent Info - Hide if user is the owner */}
        {!isOwner && (
          <ChatProvider>
            <PropertyOwnerSection 
              property={property} 
              onInquiryPress={handleShowInquiryModal}
              isDark={isDark}
            />
          </ChatProvider>
        )}
        
        {/* Similar Properties */}
        <SimilarPropertiesSection 
          propertyId={property.id}
          propertyType={property.property_type}
          isDark={isDark}
        />
      </ScrollView>
      
      {/* Property Inquiry Modal - Don't render for owners */}
      {!isOwner && (
        <PropertyInquiryModal 
          visible={showInquiryModal} 
          onClose={() => setShowInquiryModal(false)} 
          onSubmit={handleInquirySubmit}
          propertyTitle={property?.title || 'Property'}
          propertyOwnerId={property?.profiles_id}
          isDark={isDark}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  darkContainer: {
    backgroundColor: '#1A1A1A',
  },
  scrollView: {
    flex: 1,
  },
  darkScrollView: {
    backgroundColor: '#1A1A1A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginVertical: 20,
  },
  darkText: {
    color: '#FFF',
  },
  retryButton: {
    backgroundColor: '#3366FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginVertical: 8,
  },
  backButtonText: {
    color: '#3366FF',
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    padding: 8,
  },
});

export default PropertyDetailsScreen; 