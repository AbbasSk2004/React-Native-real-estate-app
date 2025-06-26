import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform
} from 'react-native';
import {  PROPERTY_STATUS, BEDROOM_OPTIONS, BATHROOM_OPTIONS } from '../../utils/constants';
import { PROPERTY_TYPE_FIELDS, lebanonCities, lebanonVillages, COMMON_FEATURES } from '../../utils/propertyTypeFields';
import { propertyService } from '../../services/propertyService';
import { PROPERTY_TYPES } from '../../utils/propertyTypes';
import { storeUserPreferences } from '../../services/recommendation';
// Convert array constants to format needed for the filter
const propertyTypes = PROPERTY_TYPES.map(type => type.label);
const statusOptions = PROPERTY_STATUS.map(status => status.value);
const bedroomOptions = ['1', '2', '3', '4', '5+'];
const bathroomOptions = ['1', '2', '3', '4+'];
const governorates = Object.keys(lebanonCities);

export default function Filters({ visible, onClose, onApply, initialFilters = {}, isDark = false }) {
  const [filters, setFilters] = useState({
    propertyType: initialFilters.propertyType || '',
    status: initialFilters.status || '',
    governate: initialFilters.governate || initialFilters.governorate || '',
    city: initialFilters.city || '',
    village: initialFilters.village || '',
    priceRange: {
      min: initialFilters.priceRange?.min || initialFilters.priceMin || '',
      max: initialFilters.priceRange?.max || initialFilters.priceMax || '',
    },
    area: {
      min: initialFilters.area?.min || initialFilters.areaMin || '',
      max: initialFilters.area?.max || initialFilters.areaMax || '',
    },
    bedrooms: initialFilters.bedrooms || '',
    bathrooms: initialFilters.bathrooms || '',
    features: initialFilters.features || {}
  });
   
  const [loading, setLoading] = useState(false);
  const [typeConfig, setTypeConfig] = useState(null);
  const [cities, setCities] = useState([]);
  const [villages, setVillages] = useState([]);
  const [cityDisabled, setCityDisabled] = useState(true);
  const [villageDisabled, setVillageDisabled] = useState(true);

  // Update type config when property type changes
  useEffect(() => {
    if (filters.propertyType) {
      const config = PROPERTY_TYPE_FIELDS[filters.propertyType] || PROPERTY_TYPE_FIELDS['Apartment'];
      setTypeConfig(config);
    } else {
      setTypeConfig(null);
    }
  }, [filters.propertyType]);

  // Update cities when governate changes
  useEffect(() => {
    if (filters.governate) {
      setCities(lebanonCities[filters.governate] || []);
      setCityDisabled(false);
      
      // Reset city and village when governate changes
      if (filters.city) {
        handleInputChange('city', '');
      }
      setVillages([]);
      setVillageDisabled(true);
    } else {
      setCities([]);
      setCityDisabled(true);
    }
  }, [filters.governate]);

  // Update villages when city changes
  useEffect(() => {
    if (filters.city) {
      const cityVillages = lebanonVillages[filters.city] || [];
      setVillages(cityVillages);
      setVillageDisabled(false);
      
      // Reset village when city changes
      if (filters.village && !cityVillages.includes(filters.village)) {
        handleInputChange('village', '');
      }
    } else {
      setVillages([]);
      setVillageDisabled(true);
    }
  }, [filters.city]);

  const handleInputChange = (name, value) => {
    let processedValue = value;

    // Convert numeric values
    if (['priceMin', 'priceMax', 'areaMin', 'areaMax', 'bedrooms', 'bathrooms'].includes(name)) {
      processedValue = value === '' ? '' : value;
    }

    if (name === 'priceMin' || name === 'priceMax') {
      setFilters(prev => ({
        ...prev,
        priceRange: {
          ...prev.priceRange,
          [name === 'priceMin' ? 'min' : 'max']: processedValue
        }
      }));
    } else if (name === 'areaMin' || name === 'areaMax') {
      setFilters(prev => ({
        ...prev,
        area: {
          ...prev.area,
          [name === 'areaMin' ? 'min' : 'max']: processedValue
        }
      }));
    } else {
      setFilters(prev => ({ ...prev, [name]: processedValue }));
    }
  };

  const handleOptionSelect = (category, value) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category] === value ? '' : value
    }));
  };

  const handleRangeChange = (category, field, value) => {
    setFilters(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value.replace(/[^0-9]/g, '')
      }
    }));
  };

  const handleFeatureToggle = (featureName) => {
    setFilters(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [featureName]: !prev.features?.[featureName]
      }
    }));
  };

  const handleApply = async () => {
    setLoading(true);
    try {
      // Convert filters to format expected by propertyService
      const serviceFilters = {
        propertyType: filters.propertyType || undefined,
        status: filters.status || undefined,
        governorate: filters.governate || filters.governorate || undefined,
        city: filters.city || undefined,
        village: filters.village || undefined,
        priceMin: filters.priceRange.min ? parseInt(filters.priceRange.min) : undefined,
        priceMax: filters.priceRange.max ? parseInt(filters.priceRange.max) : undefined,
        areaMin: filters.area.min ? parseInt(filters.area.min) : undefined,
        areaMax: filters.area.max ? parseInt(filters.area.max) : undefined,
        bedrooms: filters.bedrooms || undefined,
        bathrooms: filters.bathrooms || undefined,
        features: Object.keys(filters.features || {}).filter(key => filters.features[key])
      };
      
      // Store preferences locally for recommendation engine
      storeUserPreferences(serviceFilters);
      
      // This is where we would connect to the property service
      // const results = await propertyService.getProperties(serviceFilters);
      
      onApply(filters);
      onClose();
    } catch (error) {
      console.error('Error applying filters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFilters({
      propertyType: '',
      status: '',
      governate: '',
      city: '',
      village: '',
      priceRange: { min: '', max: '' },
      area: { min: '', max: '' },
      bedrooms: '',
      bathrooms: '',
      features: {}
    });
  };

  const renderOptionButtons = (options, category, selectedValue) => (
    <View style={styles.optionsContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={[
            styles.optionButton,
            isDark && styles.darkOptionButton,
            selectedValue === option && styles.optionButtonSelected
          ]}
          onPress={() => handleOptionSelect(category, option)}
        >
          <Text style={[
            styles.optionText,
            isDark && styles.darkOptionText,
            selectedValue === option && styles.optionTextSelected
          ]}>
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderDropdown = (label, name, options, value, onChange, disabled = false) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, isDark && styles.darkText]}>{label}</Text>
      <View style={[styles.dropdownContainer, disabled && styles.disabledDropdown, isDark && styles.darkRangeInput]}>
        <TouchableOpacity 
          style={styles.dropdown}
          disabled={disabled}
          onPress={() => {
            // In a real implementation, this would open a dropdown/picker
            // For now, we'll just cycle through options
            if (options.length > 0 && !disabled) {
              const currentIndex = options.indexOf(value);
              const nextIndex = (currentIndex + 1) % options.length;
              onChange(options[nextIndex]);
            }
          }}
        >
          <Text style={[
            styles.dropdownText,
            isDark && styles.darkText
          ]}>
            {value || `Select ${label}`}
          </Text>
          <Ionicons name="chevron-down" size={16} color={isDark ? "#CCC" : "#666"} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, isDark && styles.darkModalContent]}>
          {/* Header */}
          <View style={[styles.header, isDark && styles.darkHeader]}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={isDark ? "#FFF" : "#333"} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, isDark && styles.darkText]}>Filters</Text>
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Property Type */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Property Type</Text>
              {renderOptionButtons(propertyTypes, 'propertyType', filters.propertyType)}
            </View>

            {/* Status */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Status</Text>
              {renderOptionButtons(statusOptions, 'status', filters.status)}
            </View>

            {/* Location - Governorate */}
            {renderDropdown('Governorate', 'governate', governorates, filters.governate, 
              (value) => handleInputChange('governate', value))}

            {/* Location - City */}
            {renderDropdown('City', 'city', cities, filters.city, 
              (value) => handleInputChange('city', value), cityDisabled)}

            {/* Location - Village */}
            {renderDropdown('Village', 'village', villages, filters.village, 
              (value) => handleInputChange('village', value), villageDisabled)}

            {/* Price Range */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Price Range (USD)</Text>
              <View style={styles.rangeContainer}>
                <View style={[styles.rangeInput, isDark && styles.darkRangeInput]}>
                  <TextInput
                    style={[styles.input, isDark && styles.darkInput]}
                    placeholder="Min"
                    placeholderTextColor={isDark ? "#999" : "#999"}
                    keyboardType="numeric"
                    value={filters.priceRange.min}
                    onChangeText={(value) => handleRangeChange('priceRange', 'min', value)}
                  />
                </View>
                <Text style={[styles.rangeSeparator, isDark && styles.darkText]}>-</Text>
                <View style={[styles.rangeInput, isDark && styles.darkRangeInput]}>
                  <TextInput
                    style={[styles.input, isDark && styles.darkInput]}
                    placeholder="Max"
                    placeholderTextColor={isDark ? "#999" : "#999"}
                    keyboardType="numeric"
                    value={filters.priceRange.max}
                    onChangeText={(value) => handleRangeChange('priceRange', 'max', value)}
                  />
                </View>
              </View>
            </View>

            {/* Area */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Area (m²)</Text>
              <View style={styles.rangeContainer}>
                <View style={[styles.rangeInput, isDark && styles.darkRangeInput]}>
                  <TextInput
                    style={[styles.input, isDark && styles.darkInput]}
                    placeholder="Min"
                    placeholderTextColor={isDark ? "#999" : "#999"}
                    keyboardType="numeric"
                    value={filters.area.min}
                    onChangeText={(value) => handleRangeChange('area', 'min', value)}
                  />
                </View>
                <Text style={[styles.rangeSeparator, isDark && styles.darkText]}>-</Text>
                <View style={[styles.rangeInput, isDark && styles.darkRangeInput]}>
                  <TextInput
                    style={[styles.input, isDark && styles.darkInput]}
                    placeholder="Max"
                    placeholderTextColor={isDark ? "#999" : "#999"}
                    keyboardType="numeric"
                    value={filters.area.max}
                    onChangeText={(value) => handleRangeChange('area', 'max', value)}
                  />
                </View>
              </View>
            </View>

            {/* Bedrooms - only show if the selected property type has bedrooms */}
            {(!typeConfig || typeConfig.showStandard?.bedrooms !== false) && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Bedrooms</Text>
                {renderOptionButtons(bedroomOptions, 'bedrooms', filters.bedrooms)}
              </View>
            )}

            {/* Bathrooms - only show if the selected property type has bathrooms */}
            {(!typeConfig || typeConfig.showStandard?.bathrooms !== false) && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Bathrooms</Text>
                {renderOptionButtons(bathroomOptions, 'bathrooms', filters.bathrooms)}
              </View>
            )}

            {/* Property-specific fields based on type */}
            {typeConfig && typeConfig.details && typeConfig.details.map(detail => (
              <View key={detail.name} style={styles.section}>
                <Text style={[styles.sectionTitle, isDark && styles.darkText]}>{detail.label}</Text>
                <View style={[styles.rangeInput, isDark && styles.darkRangeInput]}>
                  <TextInput
                    style={[styles.input, isDark && styles.darkInput]}
                    placeholder={detail.placeholder || `Enter ${detail.label}`}
                    placeholderTextColor={isDark ? "#999" : "#999"}
                    keyboardType={detail.type === 'number' ? 'numeric' : 'default'}
                    value={filters[detail.name] || ''}
                    onChangeText={(value) => handleInputChange(detail.name, value)}
                  />
                </View>
              </View>
            ))}

            {/* Features */}
            {typeConfig && typeConfig.features && typeConfig.features.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Features</Text>
                <View style={styles.featuresContainer}>
                  {typeConfig.features.map(feature => (
                    <TouchableOpacity
                      key={feature}
                      style={[
                        styles.featureItem,
                        isDark && styles.darkFeatureItem,
                        filters.features?.[feature] && styles.featureItemSelected
                      ]}
                      onPress={() => handleFeatureToggle(feature)}
                    >
                      <Text style={[
                        styles.featureText,
                        isDark && styles.darkFeatureText,
                        filters.features?.[feature] && styles.featureTextSelected
                      ]}>
                        {COMMON_FEATURES[feature] || feature}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Apply Button */}
          <TouchableOpacity 
            style={styles.applyButton} 
            onPress={handleApply}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    maxHeight: '90%',
  },
  darkModalContent: {
    backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  darkHeader: {
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  darkText: {
    color: '#FFF',
  },
  resetText: {
    color: '#0061FF',
    fontSize: 16,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    margin: 6,
  },
  optionButtonSelected: {
    backgroundColor: '#0061FF',
    borderColor: '#0061FF',
  },
  optionText: {
    color: '#666',
    fontSize: 14,
  },
  optionTextSelected: {
    color: '#fff',
  },
  rangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rangeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  input: {
    paddingVertical: 8,
    fontSize: 14,
    color: '#333',
  },
  darkInput: {
    color: '#FFF',
  },
  rangeSeparator: {
    paddingHorizontal: 12,
    color: '#666',
  },
  applyButton: {
    backgroundColor: '#0061FF',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  darkRangeInput: {
    borderColor: '#444',
    backgroundColor: '#2A2A2A',
  },
  disabledDropdown: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  featureItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    margin: 6,
  },
  darkFeatureItem: {
    borderColor: '#444',
  },
  featureItemSelected: {
    backgroundColor: '#0061FF',
    borderColor: '#0061FF',
  },
  featureText: {
    fontSize: 14,
    color: '#666',
  },
  darkFeatureText: {
    color: '#CCC',
  },
  featureTextSelected: {
    color: '#fff',
  },
  darkOptionButton: {
    backgroundColor: '#2A2A2A',
    borderColor: '#444',
  },
  darkOptionText: {
    color: '#CCC',
  },
}); 