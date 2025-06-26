import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaView, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import ContactSubmissionForm from '../components/contact_submission';

const ContactScreen = () => {
  const { isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ContactSubmissionForm />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  darkContainer: {
    backgroundColor: '#1A1A1A',
  },
});

export default ContactScreen; 