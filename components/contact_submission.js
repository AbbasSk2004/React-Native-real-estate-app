import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { contactSubmissionService } from '../services/contact_submission';

const ContactSubmissionForm = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { isDark } = useTheme();
  
  // Initialize form state with user data if available
  const [form, setForm] = useState({
    name: user?.profile?.firstname && user?.profile?.lastname 
      ? `${user.profile.firstname} ${user.profile.lastname}` 
      : '',
    email: user?.profile?.email || '',
    phone: '',
    message: '',
    preferred_contact: 'email'
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateForm = () => {
    // Use the service's validation method
    const { isValid, errors: validationErrors } = contactSubmissionService.validateContactForm(form);
    setErrors(validationErrors);
    return isValid;
  };

  const handleChange = (field, value) => {
    setForm({
      ...form,
      [field]: value
    });
    
    // Clear error when user types
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: null
      });
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Use the contact submission service instead of direct axios call
      const response = await contactSubmissionService.submitContactForm(form);
      
      if (response.success) {
        setIsSuccess(true);
        setForm({
          name: '',
          email: '',
          phone: '',
          message: '',
          preferred_contact: 'email'
        });
        
        Alert.alert(
          'Message Sent',
          'Thank you for your message. We will get back to you soon!',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        // Handle specific backend validation errors
        if (response.error === 'validation_error') {
          // Set specific field error if available
          if (response.message?.includes('email')) {
            setErrors({ ...errors, email: response.message });
          } else if (response.message?.includes('phone')) {
            setErrors({ ...errors, phone: response.message });
          } else {
            Alert.alert('Form Error', response.message || 'Please check your input and try again');
          }
        } else {
          Alert.alert('Error', response.message || 'Failed to send message');
        }
      }
    } catch (error) {
      console.error('Contact submission error:', error);
      Alert.alert(
        'Error',
        'Failed to send message. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, isDark && styles.darkContainer]}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color={isDark ? '#FFF' : '#333'} 
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDark && styles.darkText]}>
            Contact Us
          </Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.formContainer}>
          <Text style={[styles.formDescription, isDark && styles.darkText]}>
            Have a question or need assistance? Fill out the form below and our team will get back to you as soon as possible.
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark && styles.darkText]}>Full Name*</Text>
            <TextInput
              style={[
                styles.input, 
                isDark && styles.darkInput,
                errors.name && styles.inputError
              ]}
              value={form.name}
              onChangeText={(value) => handleChange('name', value)}
              placeholder="Your full name"
              placeholderTextColor={isDark ? '#888' : '#999'}
            />
            {errors.name && (
              <Text style={styles.errorText}>{errors.name}</Text>
            )}
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark && styles.darkText]}>Email*</Text>
            <TextInput
              style={[
                styles.input, 
                isDark && styles.darkInput,
                errors.email && styles.inputError
              ]}
              value={form.email}
              onChangeText={(value) => handleChange('email', value)}
              placeholder="your.email@example.com"
              placeholderTextColor={isDark ? '#888' : '#999'}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark && styles.darkText]}>Phone Number (Lebanese)</Text>
            <TextInput
              style={[
                styles.input, 
                isDark && styles.darkInput,
                errors.phone && styles.inputError
              ]}
              value={form.phone}
              onChangeText={(value) => handleChange('phone', value)}
              placeholder="e.g. +961 3 123456 or 03 123456"
              placeholderTextColor={isDark ? '#888' : '#999'}
              keyboardType="phone-pad"
            />
            {errors.phone && (
              <Text style={styles.errorText}>{errors.phone}</Text>
            )}
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark && styles.darkText]}>Preferred Contact Method*</Text>
            <View style={[
              styles.pickerContainer, 
              isDark && styles.darkPickerContainer
            ]}>
              <Picker
                selectedValue={form.preferred_contact}
                onValueChange={(value) => handleChange('preferred_contact', value)}
                style={[styles.picker, isDark && styles.darkPicker]}
                dropdownIconColor={isDark ? '#FFF' : '#333'}
              >
                <Picker.Item label="Email" value="email" />
                <Picker.Item label="Phone" value="phone" />
                <Picker.Item label="WhatsApp" value="whatsapp" />
              </Picker>
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark && styles.darkText]}>Message*</Text>
            <TextInput
              style={[
                styles.textArea, 
                isDark && styles.darkInput,
                errors.message && styles.inputError
              ]}
              value={form.message}
              onChangeText={(value) => handleChange('message', value)}
              placeholder="How can we help you?"
              placeholderTextColor={isDark ? '#888' : '#999'}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            {errors.message && (
              <Text style={styles.errorText}>{errors.message}</Text>
            )}
          </View>
          
          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitting && styles.disabledButton
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>Send Message</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  darkText: {
    color: '#FFF',
  },
  formContainer: {
    padding: 16,
  },
  formDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  darkInput: {
    backgroundColor: '#2A2A2A',
    borderColor: '#444',
    color: '#FFF',
  },
  textArea: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
  },
  inputError: {
    borderColor: '#FF4949',
  },
  errorText: {
    color: '#FF4949',
    fontSize: 14,
    marginTop: 4,
  },
  pickerContainer: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
  },
  darkPickerContainer: {
    backgroundColor: '#2A2A2A',
    borderColor: '#444',
  },
  picker: {
    height: 50,
  },
  darkPicker: {
    color: '#FFF',
  },
  submitButton: {
    backgroundColor: '#0061FF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: '#7EB0FF',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ContactSubmissionForm;
