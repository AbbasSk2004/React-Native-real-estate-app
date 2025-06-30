import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { endpoints } from '../services/api';
import authStorage from '../utils/authStorage';
import { useTheme } from '../context/ThemeContext';

const SPECIALTIES = [
  'Select your specialty',
  'Residential',
  'Commercial',
  'Luxury Homes',
  'Investment Properties'
];

export default function AgentApplication() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    phoneNumber: '',
    specialty: '',
    yearsExperience: '',
    aboutMe: '',
    facebookUrl: '',
    twitterUrl: '',
    instagramUrl: '',
    profilePhoto: null,
    cv: null
  });
  const [phoneError, setPhoneError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showSpecialtyModal, setShowSpecialtyModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingApplication, setExistingApplication] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Theme
  const { getThemeColors, isDark } = useTheme();
  const colors = getThemeColors();

  // Header and dynamic styles for dark / light themes
  const headerThemeStyles = {
    headerStyle: { backgroundColor: colors.background },
    headerShadowVisible: !isDark,
    headerTintColor: colors.text,
    headerTitleStyle: { color: colors.text },
  };

  const inputDynamicStyle = {
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
  };

  useEffect(() => {
    checkAuthStatus();
    checkExistingApplication();
  }, []);

  const checkAuthStatus = async () => {
    const token = await authStorage.getAccessToken();
    setIsAuthenticated(!!token);
    
    if (!token) {
      Alert.alert(
        "Login Required",
        "You need to be logged in to apply as an agent.",
        [
          { text: "Cancel", onPress: () => router.back(), style: "cancel" },
          { text: "Sign In", onPress: () => router.push('/sign-in') }
        ]
      );
    }
  };

  const checkExistingApplication = async () => {
    try {
      setLoading(true);
      const response = await endpoints.agents.getApplicationDetails();
      
      if (response?.success && response?.data) {
        setExistingApplication(response.data);
        
        // Pre-fill form with existing data if available
        setFormData({
          phoneNumber: response.data.phone || '',
          specialty: response.data.specialty || '',
          yearsExperience: response.data.experience || '',
          aboutMe: response.data.about_me || '',
          facebookUrl: response.data.facebook_url || '',
          twitterUrl: response.data.twitter_url || '',
          instagramUrl: response.data.instagram_url || '',
          profilePhoto: response.data.image || null,
          cv: response.data.cv_resume_url || null
        });
        
        // If application already exists, show the submitted view
        if (response.data.status) {
          setSubmitted(true);
        }
      }
    } catch (error) {
      console.error('Error fetching application details:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (type) => {
    try {
      if (type === 'photo') {
        // Pick profile photo using ImagePicker
        const imageResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });

        if (!imageResult.canceled && imageResult.assets?.[0]) {
          setFormData({ ...formData, profilePhoto: imageResult.assets[0].uri });
        }
      } else {
        // Pick CV/Resume using DocumentPicker (supports PDFs, PPTs, DOC/DOCX and TXT)
        const docResult = await DocumentPicker.getDocumentAsync({
          type: [
            'application/pdf',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
          ],
          copyToCacheDirectory: true,
          multiple: false,
        });

        // Support both the legacy and the new result shapes of expo-document-picker.
        // SDK < 49: { type: 'success', uri, name, mimeType, size }
        // SDK >= 49: { canceled: boolean, assets: [ { uri, name, mimeType, size } ] }

        const legacySuccess = docResult.type === 'success' && docResult.uri;
        const newSuccess = !docResult.canceled && Array.isArray(docResult.assets) && docResult.assets.length > 0;

        if (legacySuccess || newSuccess) {
          const fileInfo = legacySuccess
            ? {
                uri: docResult.uri,
                name: docResult.name,
                mimeType: docResult.mimeType,
              }
            : {
                uri: docResult.assets[0].uri,
                name: docResult.assets[0].name,
                mimeType: docResult.assets[0].mimeType,
              };

          const { uri, name, mimeType } = fileInfo;

          const acceptedMimeTypes = [
            'application/pdf',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
          ];

          const allowedExtensions = ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'txt'];

          const fileName = name || uri.split('/').pop();
          const fileExtension = fileName?.split('.').pop().toLowerCase();

          const mimeIsAccepted = mimeType && acceptedMimeTypes.includes(mimeType);
          const extIsAccepted = fileExtension && allowedExtensions.includes(fileExtension);

          if (mimeIsAccepted || extIsAccepted) {
            setFormData({
              ...formData,
              cv: uri,
              cvMimeType: mimeType || undefined,
              cvName: fileName,
            });
          } else {
            Alert.alert(
              'Invalid File Type',
              'Please select a PDF, PPT, DOCX, or TXT file for your CV/Resume.'
            );
          }
        }
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to select file. Please try again.');
    }
  };

  const validatePhoneNumber = (phone) => {
    // Check if the phone number is empty
    if (!phone.trim()) {
      return { isValid: false, error: 'Phone number is required' };
    }
    
    // Remove any spaces or dashes
    let formattedPhone = phone.replace(/[\s-]/g, '');
    
    // Check if it's a valid Lebanese phone number
    // Lebanese numbers can start with +961 or 00961 followed by 1 or 3-9 and then 6 or 7 more digits
    // Or they can start with 0 followed by 1 or 3-9 and then 6 or 7 more digits
    const lebaneseRegex = /^(\+961|00961|0)(1|3|4|5|6|7|8|9)\d{6,7}$/;
    
    if (!lebaneseRegex.test(formattedPhone)) {
      // If it doesn't match the pattern, check if it's a number without the country code
      const shortNumberRegex = /^(1|3|4|5|6|7|8|9)\d{6,7}$/;
      
      if (shortNumberRegex.test(formattedPhone)) {
        // Add the Lebanese country code
        formattedPhone = '+961' + formattedPhone;
        return { isValid: true, formattedNumber: formattedPhone };
      } else if (/^0(1|3|4|5|6|7|8|9)\d{6,7}$/.test(formattedPhone)) {
        // If it starts with 0, replace it with +961
        formattedPhone = '+961' + formattedPhone.substring(1);
        return { isValid: true, formattedNumber: formattedPhone };
      }
      
      return { 
        isValid: false, 
        error: 'Please enter a valid Lebanese phone number (e.g., +9611234567 or 03123456)'
      };
    }
    
    return { isValid: true, formattedNumber: formattedPhone };
  };

  const handlePhoneChange = (text) => {
    // Only allow numbers, +, and spaces in the input
    const filteredText = text.replace(/[^\d\s+]/g, '');
    setFormData({...formData, phoneNumber: filteredText});
    
    // Clear error when user is typing
    if (phoneError) setPhoneError('');
  };

  const handleYearsExperienceChange = (text) => {
    // Only allow numbers
    const filteredText = text.replace(/[^\d]/g, '');
    setFormData({...formData, yearsExperience: filteredText});
  };

  const handleSubmit = async () => {
    // Validate phone number
    const phoneValidation = validatePhoneNumber(formData.phoneNumber);
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.error);
      return;
    }
    
    // Format the phone number to Lebanese format
    const formattedPhone = phoneValidation.formattedNumber;
    
    // Validate other required fields
    if (!formData.specialty || !formData.yearsExperience || 
        !formData.aboutMe || !formData.profilePhoto || !formData.cv) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    // Check if CV is an accepted file type
    if (formData.cv) {
      const fileExtension = formData.cv.split('.').pop().toLowerCase();
      if (!['pdf', 'ppt', 'pptx', 'doc', 'docx', 'txt'].includes(fileExtension)) {
        Alert.alert('Invalid CV Format', 'Please upload your CV in PDF, PPT, DOCX, or TXT format.');
        return;
      }
    }

    if (!isAuthenticated) {
      Alert.alert('Login Required', 'You need to be logged in to submit an application.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create form data for multipart/form-data submission
      const apiFormData = new FormData();
      
      // Add text fields with formatted phone number
      apiFormData.append('phone', formattedPhone);
      apiFormData.append('specialization', formData.specialty);
      apiFormData.append('experience', formData.yearsExperience);
      apiFormData.append('bio', formData.aboutMe);
      apiFormData.append('languages', 'English'); // Default value
      
      // Add profile photo
      if (formData.profilePhoto && formData.profilePhoto.startsWith('file://')) {
        const filename = formData.profilePhoto.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        apiFormData.append('profilePhoto', {
          uri: Platform.OS === 'ios' 
            ? formData.profilePhoto.replace('file://', '') 
            : formData.profilePhoto,
          name: filename,
          type
        });
      }
      
      // Add CV/Resume
      if (formData.cv) {
        const filename = formData.cvName || formData.cv.split('/').pop() || `resume.${Date.now()}`;

        // Prefer mimeType captured earlier, fallback to extension inference
        let type = formData.cvMimeType || 'application/octet-stream';

        if (!formData.cvMimeType) {
          const fileExtension = filename.split('.').pop().toLowerCase();
          if (fileExtension === 'pdf') type = 'application/pdf';
          else if (fileExtension === 'ppt') type = 'application/vnd.ms-powerpoint';
          else if (fileExtension === 'pptx') type = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          else if (fileExtension === 'doc') type = 'application/msword';
          else if (fileExtension === 'docx') type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          else if (fileExtension === 'txt') type = 'text/plain';
        }

        apiFormData.append('cvResume', {
          uri: Platform.OS === 'ios' && formData.cv.startsWith('file://')
            ? formData.cv.replace('file://', '')
            : formData.cv,
          name: filename,
          type,
        });
      }
      
      // Add social links (optional)
      if (formData.facebookUrl) apiFormData.append('facebook_url', formData.facebookUrl);
      if (formData.twitterUrl) apiFormData.append('twitter_url', formData.twitterUrl);
      if (formData.instagramUrl) apiFormData.append('instagram_url', formData.instagramUrl);
      
      // Submit the application
      const response = await endpoints.agents.apply(apiFormData);
      
      if (response?.data?.success) {
        setSubmitted(true);
        setExistingApplication(response.data.data);
      } else {
        Alert.alert('Error', response?.data?.message || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      Alert.alert(
        'Submission Error', 
        error.response?.data?.message || 'An error occurred while submitting your application'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setSubmitted(false);
  };

  const handleNewApplication = () => {
    setFormData({
      phoneNumber: '',
      specialty: '',
      yearsExperience: '',
      aboutMe: '',
      facebookUrl: '',
      twitterUrl: '',
      instagramUrl: '',
      profilePhoto: null,
      cv: null
    });
    setSubmitted(false);
  };

  const renderSpecialtyModal = () => (
    <Modal
      visible={showSpecialtyModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowSpecialtyModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowSpecialtyModal(false)}
      >
        <View style={styles.modalContent}>
          {SPECIALTIES.map((specialty, index) => (
            <TouchableOpacity
              key={index}
              style={styles.specialtyOption}
              onPress={() => {
                setFormData({...formData, specialty: specialty === 'Select your specialty' ? '' : specialty});
                setShowSpecialtyModal(false);
              }}
            >
              <Text style={[
                styles.specialtyText,
                formData.specialty === specialty && styles.selectedSpecialty
              ]}>
                {specialty}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#0061FF" />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          {submitted ? 'Submitting application...' : 'Loading...'}
        </Text>
      </SafeAreaView>
    );
  }

  if (submitted) {
    const applicationData = existingApplication || {
      phone: formData.phoneNumber,
      specialty: formData.specialty,
      experience: formData.yearsExperience,
      about_me: formData.aboutMe,
      image: formData.profilePhoto,
      status: 'pending'
    };
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            ...headerThemeStyles,
            headerTitle: '',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <ScrollView style={[styles.scrollView, { backgroundColor: colors.background }]}>
          <View style={styles.submittedContainer}>
            {applicationData.image && (
              <Image 
                source={{ uri: applicationData.image }} 
                style={styles.profileImage}
              />
            )}
            <Text style={[styles.title, { color: colors.text }]}>Agent Profile</Text>
            <Text style={[styles.successText, { color: colors.text }]}>
              {applicationData.status === 'approved' 
                ? 'Application Approved!' 
                : applicationData.status === 'rejected'
                ? 'Application Rejected'
                : 'Application Submitted Successfully!'}
            </Text>
            {applicationData.status === 'pending' && (
              <Text style={[styles.pendingText, { color: colors.text }]}>Your application is being reviewed</Text>
            )}
          </View>

          <View style={[styles.infoSection, isDark && styles.darkInfoSection]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Information</Text>
            <Text style={[styles.infoText, { color: colors.text }]}>Phone: {applicationData.phone}</Text>
          </View>

          <View style={[styles.infoSection, isDark && styles.darkInfoSection]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Professional Details</Text>
            <Text style={[styles.infoText, { color: colors.text }]}>Specialty: {applicationData.specialty}</Text>
            <Text style={[styles.infoText, { color: colors.text }]}>Experience: {applicationData.experience}</Text>
          </View>

          <View style={[styles.infoSection, isDark && styles.darkInfoSection]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>About Me</Text>
            <Text style={[styles.infoText, { color: colors.text }]}>{applicationData.about_me}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          ...headerThemeStyles,
          headerTitle: '',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={[styles.scrollView, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Become an Agent</Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>Join our network of professional real estate agents</Text>
        </View>

        {/* Phone Number */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Phone Number* (Lebanese Format)</Text>
          <TextInput
            style={[styles.input, inputDynamicStyle, phoneError ? styles.inputError : null]}
            placeholder="Phone Number"
            placeholderTextColor={colors.textMuted || '#888'}
            keyboardType="phone-pad"
            value={formData.phoneNumber}
            onChangeText={handlePhoneChange}
          />
          {phoneError ? (
            <Text style={[styles.errorText, { color: colors.text }]}>{phoneError}</Text>
          ) : (
            <Text style={[styles.helperText, { color: colors.text }]}>
              Enter a Lebanese number (e.g., +9613123456 or 03123456)
            </Text>
          )}
        </View>

        {/* Specialty */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Specialty*</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowSpecialtyModal(true)}
          >
            <Text style={[
              styles.specialtyPlaceholder,
              formData.specialty && styles.specialtySelected
            ]}>
              {formData.specialty || 'Select your specialty'}
            </Text>
            <Ionicons name="chevron-down" size={24} color="#666" style={styles.dropdownIcon} />
          </TouchableOpacity>
        </View>

        {/* Years of Experience */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Years of Experience*</Text>
          <TextInput
            style={[styles.input, inputDynamicStyle]}
            placeholder="Enter years of experience"
            placeholderTextColor={colors.textMuted || '#888'}
            keyboardType="numeric"
            value={formData.yearsExperience}
            onChangeText={handleYearsExperienceChange}
          />
        </View>

        {/* About Me */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>About Me*</Text>
          <TextInput
            style={[styles.input, styles.textArea, inputDynamicStyle]}
            placeholder="Tell us about your professional background..."
            placeholderTextColor={colors.textMuted || '#888'}
            multiline
            numberOfLines={4}
            value={formData.aboutMe}
            onChangeText={(text) => setFormData({...formData, aboutMe: text})}
          />
        </View>

        {/* Social Links (optional) */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Facebook URL</Text>
          <TextInput
            style={[styles.input, inputDynamicStyle]}
            placeholder="https://facebook.com/yourprofile"
            placeholderTextColor={colors.textMuted || '#888'}
            keyboardType="url"
            autoCapitalize="none"
            value={formData.facebookUrl}
            onChangeText={(text) => setFormData({...formData, facebookUrl: text})}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Twitter URL</Text>
          <TextInput
            style={[styles.input, inputDynamicStyle]}
            placeholder="https://twitter.com/yourhandle"
            placeholderTextColor={colors.textMuted || '#888'}
            keyboardType="url"
            autoCapitalize="none"
            value={formData.twitterUrl}
            onChangeText={(text) => setFormData({...formData, twitterUrl: text})}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Instagram URL</Text>
          <TextInput
            style={[styles.input, inputDynamicStyle]}
            placeholder="https://instagram.com/yourprofile"
            placeholderTextColor={colors.textMuted || '#888'}
            keyboardType="url"
            autoCapitalize="none"
            value={formData.instagramUrl}
            onChangeText={(text) => setFormData({...formData, instagramUrl: text})}
          />
        </View>

        {/* Profile Photo */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Profile Photo*</Text>
          <TouchableOpacity 
            style={[styles.uploadButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => pickImage('photo')}
          >
            {formData.profilePhoto ? (
              <Image 
                source={{ uri: formData.profilePhoto }} 
                style={styles.uploadedImage}
              />
            ) : (
              <Text style={[styles.uploadText, { color: colors.text }]}>Tap to upload profile photo</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* CV/Resume */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>CV/Resume* (PDF, PPT, DOCX, TXT)</Text>
          <TouchableOpacity 
            style={[styles.uploadButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => pickImage('cv')}
          >
            {formData.cv ? (
              <View style={styles.fileUploadedContainer}>
                <Ionicons name="document-text" size={32} color="#4CAF50" />
                <Text style={[styles.uploadedText, { color: colors.text }]}>CV uploaded ✓</Text>
                <Text style={[styles.fileNameText, { color: colors.text }]}>
                  {formData.cvName || formData.cv.split('/').pop().substring(0, 20)}
                  {formData.cvName || formData.cv.split('/').pop().length > 20 ? '...' : ''}
                </Text>
                <Text style={[styles.fileTypeText, { color: colors.text }]}>{formData.cvMimeType ? formData.cvMimeType.toUpperCase() : formData.cv.split('.').pop().toUpperCase()} Document</Text>
              </View>
            ) : (
              <View style={styles.fileUploadContainer}>
                <Ionicons name="document-attach" size={32} color="#666" />
                <Text style={[styles.uploadText, { color: colors.text }]}>Tap to upload your CV/Resume</Text>
                <Text style={[styles.fileTypeText, { color: colors.text }]}>PDF, PPT, DOCX, TXT formats</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, !isAuthenticated && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={!isAuthenticated}
        >
          <Text style={[styles.submitButtonText, { color: colors.text }]}>
            {isAuthenticated ? 'Submit Application' : 'Login Required'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {renderSpecialtyModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    padding: 16,
  },
  backButton: {
    marginLeft: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  uploadButton: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 150,
  },
  uploadedImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  uploadText: {
    color: '#666',
  },
  uploadedText: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#0061FF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  disabledButton: {
    backgroundColor: '#B0C4DE',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  specialtyOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  specialtyText: {
    fontSize: 16,
    color: '#333',
  },
  selectedSpecialty: {
    color: '#0061FF',
    fontWeight: '600',
  },
  specialtyPlaceholder: {
    color: '#666',
  },
  specialtySelected: {
    color: '#333',
  },
  dropdownIcon: {
    position: 'absolute',
    right: 12,
  },
  // Submitted view styles
  submittedContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  successText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '500',
  },
  pendingText: {
    color: '#FFA500',
    fontSize: 14,
    marginTop: 8,
  },
  infoSection: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  darkInfoSection: {
    backgroundColor: '#2A2A2A',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  fileUploadContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileUploadedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileNameText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  fileTypeText: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
}); 