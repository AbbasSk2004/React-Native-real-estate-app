import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import Terms from '../components/terms';

export default function TermsScreen() {
  const { isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]} edges={['top']}>
      <Stack.Screen
        options={{
          headerTitle: 'Terms of Service',
          headerTitleStyle: {
            color: isDark ? '#FFF' : '#333',
          },
          headerStyle: {
            backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5',
          },
          headerTintColor: isDark ? '#FFF' : '#333',
          headerShadowVisible: false,
        }}
      />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Terms />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  darkContainer: {
    backgroundColor: '#1A1A1A',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
}); 