import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import profilesService from '../services/profiles';
import { useAuth } from '../context/AuthContext';
import { getProfileImageUrl } from '../utils/imageUtils';
import { useTheme } from '../context/ThemeContext';

// Default avatar URL
const DEFAULT_AVATAR = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

export default function EditProfile() {
  const router = useRouter();
  const { user, updateUserState } = useAuth();
  const { isDark } = useTheme();
  const [profileImage, setProfileImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    phone: '',
  });
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setIsLoadingProfile(true);
      const response = await profilesService.getProfile();
      
      if (response.success && response.data) {
        const profile = response.data;
        setFormData({
          firstname: profile.firstname || '',
          lastname: profile.lastname || '',
          phone: profile.phone || '',
        });
        
        if (profile.profile_photo) {
          setProfileImage(getProfileImageUrl(profile.profile_photo));
        }
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleInputChange = (field, value) => {
    if (field === 'phone') {
      // Only allow numbers, +, and spaces in the input
      const filteredText = value.replace(/[^\d\s+]/g, '');
      setFormData(prev => ({
        ...prev,
        phone: filteredText
      }));
      
      // Clear error when user is typing
      if (phoneError) setPhoneError('');
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const validatePhoneNumber = (phone) => {
    if (!phone.trim()) {
      return { isValid: false, error: 'Phone number is required' };
    }

    // Remove any spaces or dashes
    let formattedPhone = phone.replace(/[\s-]/g, '');

    // Normalize prefixes
    if (formattedPhone.startsWith('00961')) {
      formattedPhone = '+' + formattedPhone.substring(2); // Convert 00961 to +961
    }

    // Handle numbers that already start with +961
    if (formattedPhone.startsWith('+961')) {
      const numberBody = formattedPhone.substring(4);
      if (/^[1-9]\d{6,7}$/.test(numberBody)) {
        return { isValid: true, formattedNumber: '+961' + numberBody };
      }
      return {
        isValid: false,
        error: 'Please enter a valid Lebanese phone number (e.g., +96176837310 or 76937310)'
      };
    }

    // Handle numbers that start with 0 (local format)
    if (formattedPhone.startsWith('0')) {
      const numberBody = formattedPhone.substring(1);
      if (/^[1-9]\d{6,7}$/.test(numberBody)) {
        return { isValid: true, formattedNumber: '+961' + numberBody };
      }
      return {
        isValid: false,
        error: 'Please enter a valid Lebanese phone number (e.g., 76937310)' 
      };
    }

    // Handle numbers without any prefix (7 or 8 digits)
    if (/^[1-9]\d{6,7}$/.test(formattedPhone)) {
      return { isValid: true, formattedNumber: '+961' + formattedPhone };
    }

    return {
      isValid: false,
      error: 'Please enter a valid Lebanese phone number (e.g., +96176837310 or 76937310)'
    };
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please grant camera roll permissions to change your profile picture.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleSaveProfile = async () => {
    // Validate first and last names
    if (!formData.firstname.trim() || !formData.lastname.trim()) {
      Alert.alert('Required Fields', 'Please enter your first and last name');
      return;
    }

    // Validate phone number
    const phoneValidation = validatePhoneNumber(formData.phone);
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.error);
      return;
    }

    // Format the phone number to Lebanese format
    const formattedPhone = phoneValidation.formattedNumber;

    const firstname = formData.firstname.trim();
    const lastname = formData.lastname.trim();

    setIsLoading(true);
    try {
      const response = await profilesService.updateProfile({
        firstname,
        lastname,
        phone: formattedPhone,
        profile_photo: profileImage
      });

      if (response.success) {
        // Update user state in auth context if needed
        if (updateUserState && response.data) {
          const updatedProfilePhoto = getProfileImageUrl(response.data.profile_photo || profileImage);
          updateUserState({
            ...user,
            firstname,
            lastname,
            phone: formattedPhone,
            profile_photo: updatedProfilePhoto,
            profile: {
              ...(user.profile || {}),
              firstname,
              lastname,
              phone: formattedPhone,
              profile_photo: updatedProfilePhoto,
            },
          });
        }

        Alert.alert(
          'Success',
          'Profile updated successfully',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = () => {
    router.push('/change-password');
  };

  if (isLoadingProfile) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
        <Stack.Screen options={{ title: 'Edit Profile' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0061FF" />
          <Text style={[styles.loadingText, isDark && styles.darkText]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <Stack.Screen options={{ title: 'Edit Profile' }} />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        {/* Profile Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: profileImage || DEFAULT_AVATAR }} 
            style={styles.profileImage} 
          />
          <TouchableOpacity style={styles.editImageButton} onPress={pickImage}>
            <Ionicons name="camera" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          {/* First Name */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, isDark && styles.darkText]}>First Name</Text>
            <TextInput
              style={[styles.input, isDark && styles.darkInput]}
              value={formData.firstname}
              onChangeText={(text) => handleInputChange('firstname', text)}
              placeholder="Enter your first name"
              placeholderTextColor={isDark ? "#999" : "#999"}
              autoCapitalize="words"
            />
          </View>

          {/* Last Name */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, isDark && styles.darkText]}>Last Name</Text>
            <TextInput
              style={[styles.input, isDark && styles.darkInput]}
              value={formData.lastname}
              onChangeText={(text) => handleInputChange('lastname', text)}
              placeholder="Enter your last name"
              placeholderTextColor={isDark ? "#999" : "#999"}
              autoCapitalize="words"
            />
          </View>

          {/* Phone Number */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, isDark && styles.darkText]}>Phone Number</Text>
            <TextInput
              style={[styles.input, phoneError ? styles.inputError : null, isDark && styles.darkInput]}
              value={formData.phone}
              onChangeText={(text) => handleInputChange('phone', text)}
              placeholder="Enter your phone number"
              placeholderTextColor={isDark ? "#999" : "#999"}
              keyboardType="phone-pad"
            />
            {phoneError ? (
              <Text style={styles.errorText}>{phoneError}</Text>
            ) : null}
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]} 
            onPress={handleSaveProfile}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          {/* Change Password Button */}
          <TouchableOpacity 
            style={[styles.passwordButton, isDark && styles.darkPasswordButton]} 
            onPress={handleChangePassword}
          >
            <Text style={styles.passwordButtonText}>Change Password</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  darkContainer: {
    backgroundColor: '#1A1A1A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
  },
  darkText: {
    color: '#FFFFFF',
  },
  scrollContainer: {
    padding: 16,
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 24,
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: '#0061FF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  formContainer: {
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#333',
  },
  darkInput: {
    backgroundColor: '#2A2A2A',
    borderColor: '#444',
    color: '#FFFFFF',
  },
  inputError: {
    borderColor: '#FF4949',
  },
  errorText: {
    color: '#FF4949',
    fontSize: 14,
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#0061FF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  passwordButton: {
    borderWidth: 1,
    borderColor: '#0061FF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: 'transparent',
  },
  darkPasswordButton: {
    borderColor: '#0061FF',
  },
  passwordButtonText: {
    color: '#0061FF',
    fontSize: 16,
    fontWeight: '600',
  },
}; 