import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import authService from '../services/auth';

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Theme colors
  const { getThemeColors, isDarkMode } = useTheme();
  const colors = getThemeColors();

  // Header appearance based on theme
  const headerThemeStyles = {
    headerStyle: {
      backgroundColor: colors.background,
    },
    headerShadowVisible: !isDarkMode,
    headerTitleStyle: {
      color: colors.text,
    },
    headerTintColor: colors.text,
  };
  
  const handleSubmit = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await authService.forgotPassword(email);
      
      if (response.success) {
        // Navigate to OTP verification screen with email
        router.push({
          pathname: '/verify-otp',
          params: { email, mode: 'reset' }
        });
      } else {
        Alert.alert('Error', response.message || 'Failed to send reset code. Please try again.');
      }
    } catch (error) {
      Alert.alert(
        'Error', 
        error.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      enabled
    >
      <Stack.Screen 
        options={{ 
          ...headerThemeStyles,
          title: 'Forgot Password',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>Forgot Password</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter your email address and we'll send you a code to reset your password.
          </Text>
          
          <View style={styles.form}>
            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <Ionicons name="mail-outline" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Email Address"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.submitButton, { backgroundColor: colors.primary }, isLoading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <Text style={styles.submitButtonText}>Sending...</Text>
              ) : (
                <Text style={styles.submitButtonText}>Send Reset Code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.returnLink}
              onPress={() => router.push('/sign-in')}
            >
              <Text style={[styles.returnText, { color: colors.primary }]}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 24,
    paddingHorizontal: 12,
    height: 54,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#333',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#3366FF',
    borderRadius: 8,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  disabledButton: {
    backgroundColor: '#8EB0FF',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  returnLink: {
    alignItems: 'center',
    padding: 8,
  },
  returnText: {
    fontSize: 16,
    fontWeight: '500',
  },
  backButton: {
    padding: 8,
  },
});

export default ForgotPasswordScreen; 