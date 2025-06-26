import React from 'react';
import { Stack } from 'expo-router';
import AddPropertyScreen from '../screens/AddPropertyScreen';

export default function AddProperty() {
  return (
    <>
      <Stack.Screen options={{ 
        headerTitle: "Add Property",
      }} />
      <AddPropertyScreen />
    </>
  );
} 