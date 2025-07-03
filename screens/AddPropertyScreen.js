import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { propertyService } from '../services/propertyService';
import { PROPERTY_TYPES } from '../utils/propertyTypes';
import { PROPERTY_TYPE_FIELDS, COMMON_FEATURES, lebanonCities, lebanonVillages } from '../utils/propertyTypeFields';
import { useToast } from '../hooks/useToast';
import { useTheme } from '../context/ThemeContext';

// Ensure placeholder text is visible in release builds
import { TextInput as RNTextInput } from 'react-native';
if (RNTextInput && RNTextInput.defaultProps == null) {
  RNTextInput.defaultProps = {};
}
if (RNTextInput) {
  RNTextInput.defaultProps.placeholderTextColor = '#888888';
}

const AddPropertyScreen = () => {
  const router = useRouter();
  const toast = useToast();
  const { user, isAuthenticated } = useAuth();
  const { getThemeColors, isDarkMode } = useTheme();
  const colors = getThemeColors();
  const currentYear = new Date().getFullYear();

  // Form state
  const [form, setForm] = useState({
    propertyTitle: '',
    propertyType: '',
    propertyStatus: '',
    price: '',
    governorate: '',
    city: '',
    address: '',
    bedrooms: '',
    bathrooms: '',
    parkingSpaces: '',
    area: '',
    yearBuilt: '',
    furnishingStatus: '',
    description: '',
    termsConditions: false,
    status: 'For Sale',
    airConditioning: false,
    heating: false,
    internet: false,
    parking: false,
    swimmingPool: false,
    generator: false,
    waterTank: false,
    security: false,
    balcony: false,
    elevator: false,
    solarPanels: false,
    village: '',
    livingrooms: '',
    floor: '',
    year_built: '',
    garden_area: '',
    location_url: ''
  });

  // Extra fields state
  const [extraFields, setExtraFields] = useState({});
  
  // Image states
  const [mainImage, setMainImage] = useState(null);
  const [additionalImages, setAdditionalImages] = useState([]);
  
  // Location states
  const [cities, setCities] = useState([]);
  const [villages, setVillages] = useState([]);
  const [cityDisabled, setCityDisabled] = useState(true);
  const [villageDisabled, setVillageDisabled] = useState(true);
  
  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Request media library permission on mount
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission required',
            'We need permission to access your photos to upload property images.'
          );
        }
      }
    })();
  }, []);

  // Get current property type configuration
  const typeConfig = PROPERTY_TYPE_FIELDS[form.propertyType] || {
    details: [],
    features: [],
    showStandard: {
      bedrooms: true,
      bathrooms: true,
      parkingSpaces: true,
      yearBuilt: true,
      furnishingStatus: true
    }
  };

  // Reset extra fields when property type changes
  useEffect(() => {
    setExtraFields({});
    if (form.propertyType && typeConfig) {
      const newFeatures = {};
      typeConfig.features.forEach(feature => {
        newFeatures[feature] = form[feature] || false;
      });
      setForm(prevForm => ({ ...prevForm, ...newFeatures }));
    }
  }, [form.propertyType]);

  // Handle input changes
  const handleInputChange = (name, value) => {
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Format price with commas
  const handlePriceChange = (value) => {
    // Remove non-numeric characters
    let numericValue = value.replace(/[^0-9]/g, '');
    
    // Format with commas if there's a value
    if (numericValue) {
      const formatted = parseInt(numericValue, 10).toLocaleString('en-US');
      setForm(prev => ({
        ...prev,
        price: formatted
      }));
    } else {
      setForm(prev => ({
        ...prev,
        price: ''
      }));
    }
  };

  // Handle extra field changes
  const handleExtraFieldChange = (name, value) => {
    setExtraFields(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle feature toggle
  const handleFeatureToggle = (name) => {
    setForm(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  // Handle terms checkbox toggle
  const handleTermsToggle = () => {
    setForm(prev => ({
      ...prev,
      termsConditions: !prev.termsConditions
    }));
  };

  // Handle governorate change
  const handleGovernorateChange = (selectedGovernorate) => {
    setForm(prev => ({
      ...prev,
      governorate: selectedGovernorate,
      city: '',
      village: ''
    }));
    
    setCities(lebanonCities[selectedGovernorate] || []);
    setCityDisabled(!selectedGovernorate);
    
    setVillages([]);
    setVillageDisabled(true);
  };

  // Handle city change
  const handleCityChange = (selectedCity) => {
    setForm(prev => ({ ...prev, city: selectedCity, village: '' }));

    if (selectedCity) {
      const cityVillages = lebanonVillages[selectedCity] || [];
      setVillages(cityVillages);
      setVillageDisabled(false);
      
      if (cityVillages.length === 1) {
        setForm(prev => ({ ...prev, village: cityVillages[0] }));
      }
    } else {
      setVillages([]);
      setVillageDisabled(true);
    }
  };

  // Handle image selection
  const handleImagePick = async (isMain = true) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: !isMain,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (isMain) {
          setMainImage(result.assets[0]);
        } else {
          setAdditionalImages(prev => [...prev, ...result.assets]);
        }
      }
    } catch (error) {
      console.error('ImagePicker error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  // Form validation
  const validateForm = () => {
    const requiredFields = [
      'propertyTitle',
      'propertyType',
      'price',
      'governorate',
      'city',
      'address',
      'description',
      'area'
    ];

    // Optional numeric fields that should be validated if present
    const numericFields = {
      bedrooms: { min: 0, max: 20 },
      bathrooms: { min: 0, max: 15 },
      livingrooms: { min: 0, max: 10 },
      area: { min: 1 },
      floor: { min: -5, max: 200 },
      yearBuilt: { min: 1800, max: currentYear },
      garden_area: { min: 0 }
    };

    const missing = requiredFields.filter(field => !form[field]);
    const errors = [];
    
    if (missing.length > 0) {
      Alert.alert(
        'Missing Fields',
        'Please fill in all required fields: ' + missing.join(', '),
        [{ text: 'OK' }]
      );
      return false;
    }

    // Validate numeric fields if they have values
    Object.entries(numericFields).forEach(([field, range]) => {
      if (form[field] !== '' && form[field] !== null) {
        const value = Number(form[field]);
        if (isNaN(value)) {
          errors.push(`${field} must be a valid number`);
        } else {
          if (range.min !== undefined && value < range.min) {
            errors.push(`${field} must be at least ${range.min}`);
          }
          if (range.max !== undefined && value > range.max) {
            errors.push(`${field} must be no more than ${range.max}`);
          }
        }
      }
    });

    if (errors.length > 0) {
      Alert.alert(
        'Validation Errors',
        errors.join('\n'),
        [{ text: 'OK' }]
      );
      return false;
    }

    if (!mainImage) {
      Alert.alert(
        'Missing Image',
        'Please select a main image for the property',
        [{ text: 'OK' }]
      );
      return false;
    }

    if (!form.termsConditions) {
      Alert.alert(
        'Terms and Conditions',
        'Please accept the terms and conditions',
        [{ text: 'OK' }]
      );
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();

      // Add basic fields with correct field names for backend
      formData.append('title', form.propertyTitle);
      formData.append('property_type', form.propertyType);
      formData.append('status', form.status);
      formData.append('price', form.price.replace(/,/g, ''));
      formData.append('governate', form.governorate);
      formData.append('city', form.city);
      formData.append('address', form.address);
      formData.append('description', form.description);
      formData.append('area', form.area);

      // Add optional fields if they have values
      if (form.village) formData.append('village', form.village);
      if (form.bedrooms) formData.append('bedrooms', form.bedrooms);
      if (form.bathrooms) formData.append('bathrooms', form.bathrooms);
      if (form.livingrooms) formData.append('livingrooms', form.livingrooms);
      if (form.parkingSpaces) formData.append('parking_spaces', form.parkingSpaces);
      if (form.yearBuilt || form.year_built) formData.append('year_built', form.yearBuilt || form.year_built);
      if (form.furnishingStatus) formData.append('furnishing_status', form.furnishingStatus);
      if (form.floor) formData.append('floor', form.floor);
      if (form.garden_area) formData.append('garden_area', form.garden_area);
      if (form.location_url) formData.append('location_url', form.location_url);

      // Add extra fields
      Object.keys(extraFields).forEach(key => {
        if (extraFields[key] !== '' && extraFields[key] !== null) {
          // Special handling for Farm-specific fields
          if (form.propertyType === 'Farm' && (key === 'waterSource' || key === 'cropTypes')) {
            const snakeKey = key === 'waterSource' ? 'water_source' : 'crop_types';
            formData.append(snakeKey, extraFields[key]);
          } else {
            // Convert camelCase to snake_case for backend
            const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            formData.append(snakeKey, extraFields[key]);
          }
        }
      });

      // Add features as JSON
      const features = {};
      typeConfig.features.forEach(feature => {
        features[feature] = form[feature] || false;
      });
      formData.append('features', JSON.stringify(features));

      // Add images
      if (mainImage) {
        const mainImageFile = {
          uri: mainImage.uri,
          type: 'image/jpeg',
          name: 'main_image.jpg'
        };
        formData.append('images', mainImageFile);
      }

      additionalImages.forEach((image, index) => {
        const imageFile = {
          uri: image.uri,
          type: 'image/jpeg',
          name: `additional_image_${index}.jpg`
        };
        formData.append('images', imageFile);
      });

      // Debug log
      console.log('Submitting form data:');
      for (let [key, value] of formData._parts) {
        console.log(`${key}: ${value}`);
      }

      // Submit to API
      const response = await propertyService.createProperty(formData);

      if (response.success) {
        Alert.alert('Success', 'Property added successfully!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        throw new Error(response.error || 'Failed to create property');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Error adding property');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dynamic styles helpers
  const inputDynamicStyle = {
    borderColor: colors.border,
    color: colors.text,
    backgroundColor: colors.surface
  };
  const pickerDynamicStyle = {
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Add New Property</Text>

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>

            <TextInput
              style={[styles.input, inputDynamicStyle]}
              placeholder="Property Title"
              placeholderTextColor={colors.textMuted}
              value={form.propertyTitle}
              onChangeText={(value) => handleInputChange('propertyTitle', value)}
            />

            <Picker
              selectedValue={form.propertyType}
              onValueChange={(value) => handleInputChange('propertyType', value)}
              style={[styles.picker, styles.pickerText, pickerDynamicStyle]}
            >
              <Picker.Item label="Select Property Type" value="" />
              {PROPERTY_TYPES.map(type => (
                <Picker.Item key={type.value} label={type.label} value={type.value} />
              ))}
            </Picker>

            <Picker
              selectedValue={form.status}
              onValueChange={(value) => handleInputChange('status', value)}
              style={[styles.picker, styles.pickerText, pickerDynamicStyle]}
            >
              <Picker.Item label="For Sale" value="For Sale" />
              <Picker.Item label="For Rent" value="For Rent" />
            </Picker>

            <TextInput
              style={[styles.input, inputDynamicStyle]}
              placeholder="Price (USD)"
              placeholderTextColor={colors.textMuted}
              value={form.price}
              onChangeText={handlePriceChange}
              keyboardType="numeric"
            />
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>

            <Picker
              selectedValue={form.governorate}
              onValueChange={handleGovernorateChange}
              style={[styles.picker, styles.pickerText, pickerDynamicStyle]}
            >
              <Picker.Item label="Select Governorate" value="" />
              {Object.keys(lebanonCities).map(gov => (
                <Picker.Item key={gov} label={gov} value={gov} />
              ))}
            </Picker>

            <Picker
              selectedValue={form.city}
              onValueChange={handleCityChange}
              style={[styles.picker, styles.pickerText, pickerDynamicStyle]}
              enabled={!cityDisabled}
            >
              <Picker.Item label="Select City" value="" />
              {cities.map(city => (
                <Picker.Item key={city} label={city} value={city} />
              ))}
            </Picker>

            <Picker
              selectedValue={form.village}
              onValueChange={(value) => handleInputChange('village', value)}
              style={[styles.picker, styles.pickerText, pickerDynamicStyle]}
              enabled={!villageDisabled}
            >
              <Picker.Item label="Select Village" value="" />
              {villages.map(village => (
                <Picker.Item key={village} label={village} value={village} />
              ))}
            </Picker>

            <TextInput
              style={[styles.input, inputDynamicStyle]}
              placeholder="Detailed Address"
              placeholderTextColor={colors.textMuted}
              value={form.address}
              onChangeText={(value) => handleInputChange('address', value)}
              multiline
            />

            <TextInput
              style={[styles.input, inputDynamicStyle]}
              placeholder="Location URL (Google Maps)"
              placeholderTextColor={colors.textMuted}
              value={form.location_url}
              onChangeText={(value) => handleInputChange('location_url', value)}
            />
          </View>

          {/* Property Details */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Property Details</Text>

            <TextInput
              style={[styles.input, inputDynamicStyle]}
              placeholder="Area (m²)"
              placeholderTextColor={colors.textMuted}
              value={form.area}
              onChangeText={(value) => handleInputChange('area', value.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
            />

            {typeConfig.showStandard.bedrooms && (
              <TextInput
                style={[styles.input, inputDynamicStyle]}
                placeholder="Number of Bedrooms"
                placeholderTextColor={colors.textMuted}
                value={form.bedrooms}
                onChangeText={(value) => handleInputChange('bedrooms', value.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
              />
            )}

            {typeConfig.showStandard.bathrooms && (
              <TextInput
                style={[styles.input, inputDynamicStyle]}
                placeholder="Number of Bathrooms"
                placeholderTextColor={colors.textMuted}
                value={form.bathrooms}
                onChangeText={(value) => handleInputChange('bathrooms', value.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
              />
            )}

            {typeConfig.showStandard.parkingSpaces && (
              <TextInput
                style={[styles.input, inputDynamicStyle]}
                placeholder="Number of Parking Spaces"
                placeholderTextColor={colors.textMuted}
                value={form.parkingSpaces}
                onChangeText={(value) => handleInputChange('parkingSpaces', value.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
              />
            )}

            {typeConfig.showStandard.livingrooms && (
              <TextInput
                style={[styles.input, inputDynamicStyle]}
                placeholder="Number of Living Rooms"
                placeholderTextColor={colors.textMuted}
                value={form.livingrooms}
                onChangeText={(value) => handleInputChange('livingrooms', value.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
              />
            )}

            {typeConfig.showStandard.yearBuilt && (
              <Picker
                selectedValue={form.yearBuilt}
                onValueChange={(value) => handleInputChange('yearBuilt', value)}
                style={[styles.picker, styles.pickerText, pickerDynamicStyle]}
              >
                <Picker.Item label="Select Year Built" value="" />
                {Array.from({ length: currentYear - 1799 }, (_, i) => currentYear - i).map(year => (
                  <Picker.Item key={year} label={`${year}`} value={`${year}`} />
                ))}
              </Picker>
            )}

            {typeConfig.showStandard.furnishingStatus && (
              <Picker
                selectedValue={form.furnishingStatus}
                onValueChange={(value) => handleInputChange('furnishingStatus', value)}
                style={[styles.picker, styles.pickerText, pickerDynamicStyle]}
              >
                <Picker.Item label="Select Furnishing Status" value="" />
                <Picker.Item label="Furnished" value="Furnished" />
                <Picker.Item label="Semi-Furnished" value="Semi-Furnished" />
                <Picker.Item label="Unfurnished" value="Unfurnished" />
              </Picker>
            )}

            {/* Extra fields based on property type */}
            {typeConfig.details.map(field => (
              <View key={field.name}>
                {form.propertyType === 'Office' && field.name === 'officeLayout' ? (
                  <Picker
                    selectedValue={extraFields[field.name] || ''}
                    onValueChange={(value) => handleExtraFieldChange(field.name, value)}
                    style={[styles.picker, styles.pickerText, pickerDynamicStyle]}
                  >
                    <Picker.Item label="Select Office Layout" value="" />
                    <Picker.Item label="Open Plan" value="Open Plan" />
                    <Picker.Item label="Cubicles" value="Cubicles" />
                    <Picker.Item label="Private Offices" value="Private Offices" />
                    <Picker.Item label="Co-working" value="Co-working" />
                    <Picker.Item label="Other" value="Other" />
                  </Picker>
                ) : form.propertyType === 'Land' && field.name === 'landType' ? (
                  <Picker
                    selectedValue={extraFields[field.name] || ''}
                    onValueChange={(value) => handleExtraFieldChange(field.name, value)}
                    style={[styles.picker, styles.pickerText, pickerDynamicStyle]}
                  >
                    <Picker.Item label="Select Land Type" value="" />
                    <Picker.Item label="Residential" value="Residential" />
                    <Picker.Item label="Agricultural" value="Agricultural" />
                    <Picker.Item label="Commercial" value="Commercial" />
                    <Picker.Item label="Industrial" value="Industrial" />
                    <Picker.Item label="Mixed-Use" value="Mixed-Use" />
                    <Picker.Item label="Other" value="Other" />
                  </Picker>
                ) : form.propertyType === 'Land' && field.name === 'zoning' ? (
                  <Picker
                    selectedValue={extraFields[field.name] || ''}
                    onValueChange={(value) => handleExtraFieldChange(field.name, value)}
                    style={[styles.picker, styles.pickerText, pickerDynamicStyle]}
                  >
                    <Picker.Item label="Select Zoning" value="" />
                    <Picker.Item label="Residential" value="Residential" />
                    <Picker.Item label="Commercial" value="Commercial" />
                    <Picker.Item label="Mixed-Use" value="Mixed-Use" />
                    <Picker.Item label="Agricultural" value="Agricultural" />
                    <Picker.Item label="Industrial" value="Industrial" />
                    <Picker.Item label="Other" value="Other" />
                  </Picker>
                ) : form.propertyType === 'Farm' && field.name === 'waterSource' ? (
                  <Picker
                    selectedValue={extraFields[field.name] || ''}
                    onValueChange={(value) => handleExtraFieldChange(field.name, value)}
                    style={[styles.picker, styles.pickerText, pickerDynamicStyle]}
                  >
                    <Picker.Item label="Select Water Source" value="" />
                    <Picker.Item label="Well" value="Well" />
                    <Picker.Item label="River" value="River" />
                    <Picker.Item label="Municipal" value="Municipal" />
                    <Picker.Item label="None" value="None" />
                    <Picker.Item label="Other" value="Other" />
                  </Picker>
                ) : form.propertyType === 'Farm' && field.name === 'cropTypes' ? (
                  <Picker
                    selectedValue={extraFields[field.name] || ''}
                    onValueChange={(value) => handleExtraFieldChange(field.name, value)}
                    style={[styles.picker, styles.pickerText, pickerDynamicStyle]}
                  >
                    <Picker.Item label="Select Crop Type" value="" />
                    <Picker.Item label="Olives" value="Olives" />
                    <Picker.Item label="Grapes" value="Grapes" />
                    <Picker.Item label="Wheat" value="Wheat" />
                    <Picker.Item label="Vegetables" value="Vegetables" />
                    <Picker.Item label="Fruits" value="Fruits" />
                    <Picker.Item label="Other" value="Other" />
                  </Picker>
                ) : field.type === 'select' ? (
                  <Picker
                    selectedValue={extraFields[field.name] || ''}
                    onValueChange={(value) => handleExtraFieldChange(field.name, value)}
                    style={[styles.picker, styles.pickerText]}
                  >
                    <Picker.Item label={field.label} value="" />
                    {field.options && field.options.map(option => (
                      <Picker.Item key={option} label={option} value={option} />
                    ))}
                  </Picker>
                ) : (
                  <TextInput
                    style={[styles.input, inputDynamicStyle]}
                    placeholder={field.label}
                    placeholderTextColor={colors.textMuted}
                    value={extraFields[field.name] || ''}
                    onChangeText={(value) => handleExtraFieldChange(field.name, value)}
                    keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                  />
                )}
              </View>
            ))}
          </View>

          {/* Features */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Features</Text>
            <View style={styles.featuresGrid}>
              {typeConfig.features.map(feature => (
                <TouchableOpacity
                  key={feature}
                  style={[styles.featureButton, form[feature] && styles.featureButtonActive]}
                  onPress={() => handleFeatureToggle(feature)}
                >
                  <Text style={[styles.featureText, form[feature] && styles.featureTextActive]}>
                    {COMMON_FEATURES[feature] || feature}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, inputDynamicStyle]}
              placeholder="Property Description"
              placeholderTextColor={colors.textMuted}
              value={form.description}
              onChangeText={(value) => handleInputChange('description', value)}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Images */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Images</Text>
            
            <TouchableOpacity 
              style={styles.imagePickerButton}
              onPress={() => handleImagePick(true)}
            >
              <MaterialIcons name="add-photo-alternate" size={24} color="#0061FF" />
              <Text style={styles.imagePickerText}>
                {mainImage ? 'Change Main Image' : 'Add Main Image'}
              </Text>
            </TouchableOpacity>

            {mainImage && (
              <Image
                source={{ uri: mainImage.uri }}
                style={styles.previewImage}
              />
            )}

            <TouchableOpacity 
              style={styles.imagePickerButton}
              onPress={() => handleImagePick(false)}
            >
              <MaterialIcons name="add-photo-alternate" size={24} color="#0061FF" />
              <Text style={styles.imagePickerText}>Add Additional Images</Text>
            </TouchableOpacity>

            <View style={styles.additionalImagesGrid}>
              {additionalImages.map((image, index) => (
                <Image
                  key={index}
                  source={{ uri: image.uri }}
                  style={styles.additionalImage}
                />
              ))}
            </View>
          </View>
          
          {/* Terms and Conditions */}
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.termsRow}
              onPress={handleTermsToggle}
            >
              <View style={[
                styles.checkbox, 
                form.termsConditions ? styles.checkboxChecked : {}
              ]}>
                {form.termsConditions && (
                  <MaterialIcons name="check" size={16} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.termsText}>
                I agree to the Terms and Conditions and Privacy Policy
              </Text>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Property</Text>
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
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  picker: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  pickerText: {
    color: '#000',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  featureButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    padding: 8,
    margin: 6,
    minWidth: '45%',
    alignItems: 'center',
  },
  featureButtonActive: {
    backgroundColor: '#0061FF',
    borderColor: '#0061FF',
  },
  featureText: {
    color: '#666',
  },
  featureTextActive: {
    color: '#fff',
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0061FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  imagePickerText: {
    marginLeft: 8,
    color: '#0061FF',
    fontSize: 16,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  additionalImagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  additionalImage: {
    width: '30%',
    aspectRatio: 1,
    margin: 6,
    borderRadius: 8,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: '#0061FF',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#0061FF',
    borderColor: '#0061FF',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#0061FF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default AddPropertyScreen; 