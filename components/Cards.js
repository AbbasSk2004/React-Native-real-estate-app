import { useNavigation } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const PropertyCard = ({ item }) => {
  const navigation = useNavigation();

  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('propertyDetails', { id: item.id })}
    >
      <Image 
        source={{ uri: item.images[0] }} 
        style={styles.image} 
        resizeMode="cover"
      />
      <View style={styles.details}>
        <Text style={styles.price}>${item.price.toLocaleString()}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.location}>{item.location}</Text>
        <View style={styles.specs}>
          <Text style={styles.spec}>{item.bedrooms} beds</Text>
          <Text style={styles.spec}>{item.bathrooms} baths</Text>
          <Text style={styles.spec}>{item.area} sqft</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const Cards = ({ data, horizontal = true }) => {
  return (
    <View style={[styles.container, horizontal ? styles.horizontal : styles.grid]}>
      {data.map((item) => (
        <PropertyCard key={item.id} item={item} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  horizontal: {
    flexDirection: 'row',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: 280,
    marginRight: 15,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 15,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 180,
  },
  details: {
    padding: 12,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  title: {
    fontSize: 16,
    marginVertical: 4,
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  specs: {
    flexDirection: 'row',
    marginTop: 5,
  },
  spec: {
    marginRight: 10,
    fontSize: 13,
    color: '#777',
  },
});

export default Cards; 