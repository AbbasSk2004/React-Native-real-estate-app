import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { getImage } from '../constants/images';

const NoResult = ({ query = '', message = null }) => {
  // Try to get the no-results image, if not available use placeholder
  const noResultsImage = getImage('noResults');
  
  // Generate a message based on the query
  const generateMessage = () => {
    if (message) return message;
    
    if (query && query.trim().length > 0) {
      return `No results found for "${query}"`;
    }
    
    return 'No properties found';
  };

  return (
    <View style={styles.container}>
      {/* Use the image from constants if available, otherwise use icon */}
      {noResultsImage ? (
        <Image 
          source={noResultsImage} 
          style={styles.image}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.iconContainer}>
          <Ionicons name="search-outline" size={80} color="#D1D5DB" />
        </View>
      )}
      
      <Text style={styles.message}>{generateMessage()}</Text>
      <Text style={styles.subMessage}>
        Try adjusting your search or filters to find what you're looking for
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  image: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  message: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  subMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default NoResult; 