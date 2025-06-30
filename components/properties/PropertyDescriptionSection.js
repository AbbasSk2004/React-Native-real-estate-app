import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COMMON_FEATURES } from '../../utils/propertyTypeFields';

const PropertyDescriptionSection = ({ property, isDark = false }) => {
  const [showFullDescription, setShowFullDescription] = useState(false);
  
  // Handle missing description
  const description = property?.description || 'No description available for this property.';
  
  // Calculate if description is long enough to truncate
  const isLongDescription = description.length > 300;
  
  // Get formatted description text based on showFullDescription state
  const displayDescription = isLongDescription && !showFullDescription
    ? `${description.substring(0, 300)}...`
    : description;
  
  // Extract features from property
  const getPropertyFeatures = () => {
    const features = [];
    
    // Check if features object exists
    if (property?.features && typeof property.features === 'object') {
      // Convert features object to array of feature names
      Object.entries(property.features).forEach(([key, value]) => {
        if (value === true && COMMON_FEATURES[key]) {
          features.push(COMMON_FEATURES[key]);
        }
      });
    }
    
    // Add some property-specific features if available
    if (property?.furnishing_status) {
      features.push(`${property.furnishing_status} Furnished`);
    }
    
    // Year built moved to details section
    
    return features;
  };
  
  const features = getPropertyFeatures();
  
  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      {/* Description Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Description</Text>
        <Text style={[styles.description, isDark && styles.darkSubText]}>{displayDescription}</Text>
        
        {isLongDescription && (
          <TouchableOpacity 
            onPress={() => setShowFullDescription(!showFullDescription)}
            style={styles.readMoreButton}
          >
            <Text style={[styles.readMoreText, isDark && { color: '#6699FF' }]}>
              {showFullDescription ? 'Read Less' : 'Read More'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Features Section */}
      {features.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Features</Text>
          <View style={styles.featuresContainer}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#3366FF" />
                <Text style={[styles.featureText, isDark && styles.darkSubText]}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#191d31',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#666',
  },
  readMoreButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  readMoreText: {
    color: '#3366FF',
    fontWeight: '600',
    fontSize: 14,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    paddingVertical: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  // Dark mode styles
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

export default PropertyDescriptionSection; 