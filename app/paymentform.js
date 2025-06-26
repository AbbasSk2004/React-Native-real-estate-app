import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { View, TouchableOpacity, SafeAreaView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import PaymentForm from '../components/paymentform';

export default function PaymentScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const params = useLocalSearchParams();
  
  // Extract params and ensure they're passed correctly
  const propertyId = params.propertyId;
  const price = params.price || 5;
  
  console.log("Payment screen params:", { propertyId, price });
  
  // Create navigation methods for the PaymentForm component
  const navigation = {
    navigate: (path) => {
      console.log("Navigating to:", path);
      if (path === 'MyProperties' || path === '/(tabs)') {
        // Navigate back to my-properties
        router.push('/my-properties');
      } else {
        router.push(path);
      }
    },
    goBack: () => router.back()
  };
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#1A1A1A' : '#F5F7FA' }}>
      <Stack.Screen
        options={{
          headerTitle: "Payment",
          headerTitleAlign: 'center',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
              <Ionicons name="arrow-back" size={24} color={isDark ? "#FFF" : "#333"} />
            </TouchableOpacity>
          ),
        }}
      />
      <PaymentForm 
        route={{ params: { propertyId, price } }}
        navigation={navigation}
      />
    </SafeAreaView>
  );
} 