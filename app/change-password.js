import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import profilesService from '../services/profiles';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function ChangePassword() {
  const router = useRouter();
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const { getThemeColors, isDark } = useTheme();
  const colors = getThemeColors();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user is typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { ...errors };
    
    // Validate current password
    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = 'Current password is required';
      isValid = false;
    }
    
    // Validate new password
    if (!formData.newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
      isValid = false;
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
      isValid = false;
    }
    
    // Validate confirm password
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your new password';
      isValid = false;
    } else if (formData.confirmPassword !== formData.newPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const handleChangePassword = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await profilesService.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      
      if (response.success) {
        // Force logout and redirect to sign-in so user can log in with new password
        await logout();
        Alert.alert(
          'Success',
          'Password changed successfully. Please log in again with your new credentials.',
          [{ text: 'OK', onPress: () => router.replace('/sign-in') }]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Error', 'Failed to change password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic styles
  const inputDynamicStyle = {
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
  };

  // Header theme styles
  const headerThemeStyles = {
    headerStyle: { backgroundColor: colors.background },
    headerShadowVisible: !isDark,
    headerTintColor: colors.text,
    headerTitleStyle: { color: colors.text },
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          ...headerThemeStyles,
          headerTitle: 'Change Password',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={[styles.scrollView, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          {/* Current Password Field */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Current Password *</Text>
            <TextInput
              value={formData.currentPassword}
              onChangeText={(value) => handleInputChange('currentPassword', value)}
              placeholder="Enter your current password"
              secureTextEntry
              style={[styles.input, inputDynamicStyle, errors.currentPassword ? styles.inputError : null]}
              placeholderTextColor={colors.textMuted || '#666876'}
            />
            {errors.currentPassword ? (
              <Text style={styles.errorText}>{errors.currentPassword}</Text>
            ) : null}
          </View>

          {/* New Password Field */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>New Password *</Text>
            <TextInput
              value={formData.newPassword}
              onChangeText={(value) => handleInputChange('newPassword', value)}
              placeholder="Enter your new password"
              secureTextEntry
              style={[styles.input, inputDynamicStyle, errors.newPassword ? styles.inputError : null]}
              placeholderTextColor={colors.textMuted || '#666876'}
            />
            {errors.newPassword ? (
              <Text style={styles.errorText}>{errors.newPassword}</Text>
            ) : (
              <Text style={[styles.helperText, { color: colors.text }]}>
                Password must be at least 8 characters long
              </Text>
            )}
          </View>

          {/* Confirm Password Field */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Confirm New Password *</Text>
            <TextInput
              value={formData.confirmPassword}
              onChangeText={(value) => handleInputChange('confirmPassword', value)}
              placeholder="Confirm your new password"
              secureTextEntry
              style={[styles.input, inputDynamicStyle, errors.confirmPassword ? styles.inputError : null]}
              placeholderTextColor={colors.textMuted || '#666876'}
            />
            {errors.confirmPassword ? (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            ) : null}
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={handleChangePassword}
            disabled={isLoading}
            style={[styles.saveButton, isLoading && styles.disabledButton]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>Change Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  backButton: {
    marginLeft: 16,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  formContainer: {
    marginVertical: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
  saveButton: {
    backgroundColor: '#0061FF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
}; 