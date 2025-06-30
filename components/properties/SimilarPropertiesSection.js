import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  ScrollView,
  Dimensions,
  TouchableOpacity
} from 'react-native';
import { useRouter } from 'expo-router';
import { endpoints } from '../../services/api';
import PropertyCard from './PropertyCard';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.7;

const SimilarPropertiesSection = ({ propertyId, propertyType, isDark = false }) => {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    fetchSimilarProperties();
  }, [propertyId]);
  
  const fetchSimilarProperties = async () => {
    if (!propertyId) return;
    
    setLoading(true);
    setError(null);
    try {
      try {
        const response = await endpoints.properties.getSimilarProperties(propertyId);
        if (response?.data?.success && response?.data?.data) {
          setProperties(response.data.data);
        } else if (Array.isArray(response?.data)) {
          setProperties(response.data);
        } else {
          // Fallback: fetch by property type
          const fallback = await endpoints.properties.getAll({ propertyType, pageSize: 6 });
          const list = fallback?.data?.properties || [];
          setProperties(list.filter(p => p.id !== propertyId));
        }
      } catch (serviceError) {
        console.error('Error fetching similar properties:', serviceError);
        setError('Failed to load similar properties');
      }
    } catch (error) {
      console.error('Error fetching similar properties:', error);
      setError('Failed to load similar properties');
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };
  
  const handlePropertyPress = (id) => {
    if (id === propertyId) return; // Prevent navigating to the same property
    
    // Record view when a property is clicked
    endpoints.propertyViews.recordView(id).catch(err => console.error('Failed to record property view:', err));
    
    router.push(`/propertyDetails?id=${id}`);
  };
  
  const handleRetry = () => {
    setRetrying(true);
    fetchSimilarProperties();
  };
  
  if (loading) {
    return (
      <View style={[styles.loadingContainer, isDark && styles.darkContainer]}>
        <ActivityIndicator size="large" color="#3366FF" />
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={[styles.errorContainer, isDark && styles.darkContainer]}>
        <Ionicons name="alert-circle-outline" size={30} color="#FF6B6B" />
        <Text style={[styles.errorText, isDark && styles.darkSubText]}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={handleRetry}
          disabled={retrying}
        >
          {retrying ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.retryButtonText}>Retry</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }
  
  if (properties.length === 0) {
    return null; // Don't render the section if no similar properties
  }
  
  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Similar Properties</Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 16} // Snap to card width + margin
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContainer}
      >
        {properties.map((property) => (
          <View key={property.id} style={styles.cardWrapper}>
            <PropertyCard 
              property={property} 
              onPress={() => handlePropertyPress(property.id)}
              featuredStyle={true}
              isDark={isDark}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  errorContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 10,
  },
  retryButton: {
    backgroundColor: '#3366FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#191d31',
    marginBottom: 16,
  },
  scrollContainer: {
    paddingBottom: 8,
    paddingRight: 16,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginRight: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
  },
  darkContainer: {
    backgroundColor: '#2A2A2A',
  },
  darkText: {
    color: '#FFF',
  },
  darkSubText: {
    color: '#CCC',
  },
});

export default SimilarPropertiesSection; 