import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AddPropertyScreen from '../screens/AddPropertyScreen';
import { useTheme } from '../context/ThemeContext';

export default function AddProperty() {
  const router = useRouter();
  const { getThemeColors, isDark } = useTheme();
  const colors = getThemeColors();

  // --------------------
  // Header appearance based on theme
  // --------------------
  const headerThemeStyles = {
    headerStyle: { backgroundColor: colors.background },
    headerShadowVisible: !isDark,
    headerTintColor: colors.text,
    headerTitleStyle: { color: colors.text },
  };

  return (
    <>
      <Stack.Screen 
        options={{
          ...headerThemeStyles,
          headerTitle: 'Add Property',
          headerTitleAlign: 'left',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <AddPropertyScreen />
    </>
  );
} 