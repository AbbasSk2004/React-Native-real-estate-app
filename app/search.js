import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { FlatList, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const filters = ['All', 'House', 'Apartment', 'Villa', 'Office'];
  
  const properties = [
    { id: '1', title: 'Modern Apartment', type: 'Apartment', location: 'Downtown', price: '$250,000' },
    { id: '2', title: 'Luxury Villa', type: 'Villa', location: 'Beachside', price: '$1,200,000' },
    { id: '3', title: 'Cozy Studio', type: 'Apartment', location: 'Midtown', price: '$120,000' },
    { id: '4', title: 'Family House', type: 'House', location: 'Suburbs', price: '$450,000' },
    { id: '5', title: 'Penthouse', type: 'Apartment', location: 'City Center', price: '$800,000' },
    { id: '6', title: 'Commercial Space', type: 'Office', location: 'Business District', price: '$500,000' },
  ];

  const filteredProperties = properties.filter(property => 
    (activeFilter === 'All' || property.type === activeFilter) &&
    (property.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     property.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity className="bg-white mb-4 rounded-lg p-4 shadow-sm">
      <View className="h-40 bg-gray-200 rounded-lg mb-2" />
      <Text className="text-lg font-bold">{item.title}</Text>
      <View className="flex-row justify-between items-center">
        <Text className="text-gray-500">{item.location}</Text>
        <Text className="text-blue-600 font-bold">{item.price}</Text>
      </View>
      <Text className="text-gray-400 mt-1">{item.type}</Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <View className="p-4">
        <Text className="text-2xl font-bold mb-4">Find Properties</Text>
        
        <View className="bg-gray-100 rounded-full px-4 py-2 mb-4 flex-row items-center">
          <Text className="mr-2">🔍</Text>
          <TextInput
            className="flex-1"
            placeholder="Search by location or property name"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          className="mb-4"
        >
          {filters.map((filter) => (
            <TouchableOpacity 
              key={filter}
              className={`mr-2 px-4 py-2 rounded-full ${activeFilter === filter ? 'bg-blue-500' : 'bg-gray-200'}`}
              onPress={() => setActiveFilter(filter)}
            >
              <Text className={activeFilter === filter ? 'text-white' : 'text-gray-800'}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <FlatList
          data={filteredProperties}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-10">
              <Text className="text-gray-500">No properties found</Text>
            </View>
          }
        />
      </View>
    </View>
  );
} 