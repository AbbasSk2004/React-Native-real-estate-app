import React, { useState, useEffect, useRef } from 'react';

import { PROPERTY_TYPES } from '../../utils/propertyTypes';
import { PROPERTY_TYPE_FIELDS, COMMON_FEATURES,lebanonVillages,lebanonCities } from '../../utils/propertyTypeFields';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { handleError } from '../../utils/errorHandler';
import { propertyService } from '../../services/propertyService';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';


// Logger utility for development debugging
const logger = {
  error: (message, error) => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(`[PropertyForm Error]: ${message}`, error);
    }
  }
};



function AddPropertyForm({ onSubmitSuccess }) {
  const mainImageInputRef = useRef(null);
  const additionalImagesInputRef = useRef(null);
  const currentYear = new Date().getFullYear();
  // State for form data
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
    status: '',
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
    garden_area: ''
  });

  // State for extra fields specific to property type
  const [extraFields, setExtraFields] = useState({});

  // State for file uploads
  const [mainImage, setMainImage] = useState(null);
  const [additionalImages, setAdditionalImages] = useState([]);

  // State for cities based on governorate
  const [cities, setCities] = useState([]);
  const [cityDisabled, setCityDisabled] = useState(true);

  // State for villages based on city
  const [villages, setVillages] = useState([]);
  const [villageDisabled, setVillageDisabled] = useState(true);
  // State for submission
  const [submitError, setSubmitError] = useState('');
  const [missingFields, setMissingFields] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    // When property type changes, reset extra fields and features for that type
    setExtraFields({});
    if (form.propertyType && typeConfig) {
      // Build a new features object based on the current type's features
      const newFeatures = {};
      typeConfig.features.forEach(feature => {
        newFeatures[feature] = form[feature] || false;
      });
      setForm(prevForm => ({ ...prevForm, ...newFeatures }));
    }
    // eslint-disable-next-line
  }, [form.propertyType]);

  // Cleanup effect for form submissions
  useEffect(() => {
    let mounted = true;

    // Cleanup function
    return () => {
      mounted = false;
      // Reset file inputs on unmount
      if (mainImageInputRef.current) {
        mainImageInputRef.current.value = '';
      }
      if (additionalImagesInputRef.current) {
        additionalImagesInputRef.current.value = '';
      }
    };
  }, []);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: value
    });
  };

  // Handle extra field changes
  const handleExtraFieldChange = (e) => {
    const { name, value } = e.target;
    setExtraFields({
      ...extraFields,
      [name]: value // Always store as string
    });
  };

  // Handle checkbox changes
  const handleFeatureChange = (e) => {
    const { name, checked } = e.target;
    setForm({
      ...form,
      [name]: checked
    });
  };

  // Handle terms checkbox
  const handleTermsChange = (e) => {
    setForm({
      ...form,
      termsConditions: e.target.checked
    });
  };

  // Helper function to show toast messages
  const showStatusMessage = (type, message) => {
    toast[type](message, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true
    });
  };
  // Handle governorate change and load cities
  const handleGovernorateChange = (e) => {
    const selectedGovernorate = e.target.value;
    
    // Reset all location fields
    setForm(prev => ({ 
      ...prev, 
      governorate: selectedGovernorate, 
      city: '', 
      village: '' 
    }));
    
    // Update cities based on governorate
    setCities(lebanonCities[selectedGovernorate] || []);
    setCityDisabled(!selectedGovernorate);
    
    // Reset villages
    setVillages([]);
    setVillageDisabled(true);  };

  // Handle city change and load villages
  const handleCityChange = (e) => {
    const selectedCity = e.target.value;
    
    // Always update form state with new city and reset village
    setForm(prev => ({ ...prev, city: selectedCity, village: '' }));

    // Handle villages based on city selection
    if (selectedCity) {
      const cityVillages = lebanonVillages[selectedCity] || [];
      setVillages(cityVillages);
      
      // Always enable village selection when a city is selected
      setVillageDisabled(false);
      
      // If there's exactly one village, automatically select it
      if (cityVillages.length === 1) {
        setForm(prev => ({ ...prev, village: cityVillages[0] }));
      }
    } else {
      // Reset villages and disable village selection when no city is selected
      setVillages([]);
      setVillageDisabled(true);
    }
  };

  // Add location URL field
  const handleLocationUrlChange = (e) => {
    setForm({ ...form, location_url: e.target.value });
  };

  // Image upload handler
  const handleImageUpload = async (file) => {
    try {
      // Create FormData for image upload
      const imageFormData = new FormData();
      imageFormData.append('image', file);

      // Upload image to your storage service
      const response = await api.post('/upload/image', imageFormData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (!response.data?.url) {
        throw new Error('Image upload failed');
      }

      return response.data;
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    }
  };

  // Handle main image changes
  const handleMainImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size exceeds 5MB. Please choose a smaller image.');
        e.target.value = '';
        return;
      }
      
      // Check file type
      if (!file.type.match('image.*')) {
        toast.error('Please select an image file.');
        e.target.value = '';
        return;
      }
      
      setMainImage(file);
    }
  };

  const handleAdditionalImagesChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Check number of files (max 10)
    if (files.length > 10) {
      alert('You can select a maximum of 10 images.');
      e.target.value = '';
      return;
    }
    
    // Check each file
    for (let i = 0; i < files.length; i++) {
      // Check file size (5MB max)
      if (files[i].size > 5 * 1024 * 1024) {
        alert(`File "${files[i].name}" exceeds 5MB. Please choose smaller images.`);
        e.target.value = '';
        return;
      }
      
      // Check file type
      if (!files[i].type.match('image.*')) {
        alert(`File "${files[i].name}" is not an image. Please select only image files.`);
        e.target.value = '';
        return;
      }
    }
    
    setAdditionalImages(files);
  };
  // Format price with commas
  const formatPrice = (e) => {
    // Remove non-numeric characters
    let value = e.target.value.replace(/[^0-9]/g, '');
    
    // Format with commas
    if (value) {
      value = parseInt(value, 10).toLocaleString('en-US');
    }
    
    setForm({
      ...form,
      price: value
    });
  };

  // Function to validate required fields
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
      year_built: { min: 1800, max: currentYear },
      garden_area: { min: 0 }
    };

    const errors = [];
    const missing = [];

    // Check required fields
    requiredFields.forEach(field => {
      if (!form[field] || form[field].trim() === '') {
        missing.push(field);
      }
    });

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

    return { isValid: errors.length === 0 && missing.length === 0, errors, missing };
  };

  // Handle form submission with error handling
  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setMissingFields([]);

    try {
      // Log the current form state
      console.log('Current form state:', form);
      console.log('Current extra fields:', extraFields);

      // Validate form
      const validationResult = validateForm();
      if (!validationResult.isValid) {
        setMissingFields(validationResult.missing);
        validationResult.missing.forEach(field => {
          toast.error(`Please fill in the ${field} field`);
        });
        validationResult.errors.forEach(error => {
          toast.error(error);
        });
        setIsSubmitting(false);
        return;
      }

      // Create FormData object
      const formData = new FormData();

      // Clean and format values
      const cleanPrice = form.price ? form.price.replace(/,/g, '') : '';
      const cleanArea = form.area ? form.area.toString() : '';
      const cleanBedrooms = form.bedrooms ? parseInt(form.bedrooms) : null;
      const cleanBathrooms = form.bathrooms ? parseInt(form.bathrooms) : null;
      const cleanLivingrooms = form.livingrooms ? parseInt(form.livingrooms) : null;
      const cleanParkingSpaces = form.parkingSpaces ? parseInt(form.parkingSpaces) : null;
      const cleanYearBuilt = form.yearBuilt || form.year_built || null;
      const cleanFloor = form.floor ? parseInt(form.floor) : null;
      const cleanGardenArea = form.garden_area ? parseFloat(form.garden_area) : null;

      // Add required fields with correct field names
      formData.append('title', form.propertyTitle.trim());
      formData.append('property_type', form.propertyType);
      formData.append('description', form.description.trim());
      formData.append('price', cleanPrice);
      formData.append('governate', form.governorate);
      formData.append('city', form.city);
      formData.append('village', form.village || '');
      formData.append('address', form.address.trim());
      formData.append('status', form.status || 'For Sale');
      formData.append('area', cleanArea);

      // Add numeric fields only if they have valid values
      if (cleanBedrooms !== null) formData.append('bedrooms', cleanBedrooms);
      if (cleanBathrooms !== null) formData.append('bathrooms', cleanBathrooms);
      if (cleanLivingrooms !== null) formData.append('livingrooms', cleanLivingrooms);
      if (cleanParkingSpaces !== null) formData.append('parking_spaces', cleanParkingSpaces);
      if (cleanYearBuilt !== null) formData.append('year_built', cleanYearBuilt);
      if (cleanFloor !== null) formData.append('floor', cleanFloor);
      if (cleanGardenArea !== null) formData.append('garden_area', cleanGardenArea);

      // Add string fields if they have values
      if (form.furnishingStatus) {
        formData.append('furnishing_status', form.furnishingStatus);
      }

      // Special handling for Farm property type
      if (form.propertyType === 'Farm') {
        console.log('Processing Farm fields...');
        // Explicitly handle Farm-specific fields
        if (extraFields.waterSource) {
          console.log('Adding water_source:', extraFields.waterSource);
          formData.append('water_source', extraFields.waterSource);
        }
        
        if (extraFields.cropTypes) {
          console.log('Adding crop_types:', extraFields.cropTypes);
          formData.append('crop_types', extraFields.cropTypes);
        }
      }

      // =========================
      //  Extra type-specific data
      // =========================
      // Append any extra fields the user filled in (e.g. waterSource, cropTypes …)
      // Convert camelCase to snake_case to match backend column names.
      Object.entries(extraFields).forEach(([key, value]) => {
        // Skip water_source and crop_types for Farm as they're already handled
        if (form.propertyType === 'Farm' && (key === 'waterSource' || key === 'cropTypes')) {
          return;
        }
        if (value !== '' && value !== null && value !== undefined) {
          const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          // Attempt to cast numeric strings to numbers; otherwise keep as is.
          const numericVal = !isNaN(value) && value !== '' ? Number(value) : value;
          formData.append(snakeKey, numericVal);
        }
      });

      // =========================
      //  Dynamic Features object
      // =========================
      const dynamicFeatureKeys = (typeConfig.features && typeConfig.features.length > 0)
        ? typeConfig.features
        : Object.keys(COMMON_FEATURES);

      const features = {};
      dynamicFeatureKeys.forEach(featureKey => {
        features[featureKey] = form[featureKey] || false;
      });

      formData.append('features', JSON.stringify(features));

      // ===== End dynamic section =====

      // Handle images
      if (mainImage) {
        formData.append('images', mainImage);
      }

      if (additionalImages.length > 0) {
        additionalImages.forEach(file => {
          formData.append('images', file);
        });
      }

      // Add location URL if exists
      if (form.location_url) {
        formData.append('location_url', form.location_url);
      }

      // Log detailed form data for debugging
      console.log('Form data being sent:');
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}: File - ${value.name} (${value.type})`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }

      // Log required fields check
      const requiredFields = ['title', 'property_type', 'price', 'governate', 'city', 'address', 'description', 'area'];
      console.log('Required fields check:');
      requiredFields.forEach(field => {
        console.log(`${field}: ${formData.get(field)}`);
      });

      // Make API call with proper error handling
      const response = await propertyService.createProperty(formData);

      if (!response || response.error) {
        throw new Error(response?.error?.message || 'Failed to create property');
      }

      toast.success('Property added successfully!');
      
      // Clear form and reset state
      setForm({
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
        status: '',
      });
      setMainImage(null);
      setAdditionalImages([]);
      setExtraFields({});

      // Reset file inputs
      if (mainImageInputRef.current) {
        mainImageInputRef.current.value = '';
      }
      if (additionalImagesInputRef.current) {
        additionalImagesInputRef.current.value = '';
      }

      // Call the onSubmitSuccess callback if provided
      if (onSubmitSuccess) {
        onSubmitSuccess(response);
      }
    } catch (err) {
      console.error('Property submission error:', err);
      toast.error(err.message || 'Failed to submit property');
      setSubmitError(err.message || 'Failed to submit property');
    } finally {
      setIsSubmitting(false);
    }
  };

  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i);

  return (
    <div className="container-xxl py-5">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <div className="container">
        {submitError && (
          <div className="alert alert-danger" role="alert">
            {submitError}
          </div>
        )}
        <div className="bg-light rounded p-3">
          <div className="bg-white rounded p-4" style={{border: '1px dashed rgba(0, 185, 142, .3)'}}>
            <div className="row g-5 align-items-center">
              <div className="col-lg-12 wow fadeIn" data-wow-delay="0.1s">
                <div className="text-center mb-4">
                  <h1 className="mb-3">List Your Property in Lebanon</h1>
                  <p>Complete the form below to list your property on our platform. Our commission-free model ensures you get the best value for your listing.</p>
                </div>
                <form id="propertyForm" onSubmit={handleSubmit} encType="multipart/form-data">
                  <div className="row g-3">
                    <div className="col-12">
                      <div className="bg-light rounded p-3 mb-2">
                        <h4 className="mb-0">Basic Information</h4>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating">
                        <input 
                          type="text" 
                          className={`form-control${missingFields.includes('propertyTitle') ? ' is-invalid' : ''}`}
                          id="propertyTitle" 
                          name="propertyTitle"
                          placeholder="Property Title"
                          value={form.propertyTitle}
                          onChange={handleInputChange}
                          required
                        />
                        <label htmlFor="propertyTitle">Property Title</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating">
                        <select 
                          className="form-select" 
                          id="propertyType"
                          name="propertyType"
                          value={form.propertyType}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="" disabled>Select Type</option>
                          {PROPERTY_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                        <label htmlFor="propertyType">Property Type</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating">
                        <select 
                          className="form-select" 
                          id="status"
                          name="status"
                          value={form.status}
                          onChange={handleInputChange}
                        >
                          <option value="" disabled>Select Status</option>
                          <option value="For Sale">For Sale</option>
                          <option value="For Rent">For Rent</option>
                        </select>
                        <label htmlFor="status">Property Status</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating">
                        <input 
                          type="text" 
                          className="form-control" 
                          id="price" 
                          name="price"
                          placeholder="Price"
                          value={form.price}
                          onChange={formatPrice}
                        />
                        <label htmlFor="price">Price (USD)</label>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="bg-light rounded p-3 mb-2 mt-3">
                        <h4 className="mb-0">Property Location</h4>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating">
                        <select 
                          className="form-select" 
                          id="governorate"
                          name="governorate"
                          value={form.governorate}
                          onChange={handleGovernorateChange}
                        >
                          <option value="" disabled>Select Governorate</option>
                          <option value="Beirut">Beirut</option>
                          <option value="Mount Lebanon">Mount Lebanon</option>
                          <option value="North Lebanon">North Lebanon</option>
                          <option value="South Lebanon">South Lebanon</option>
                          <option value="Bekaa">Bekaa</option>
                          <option value="Nabatieh">Nabatieh</option>
                          <option value="Akkar">Akkar</option>
                          <option value="Baalbek-Hermel">Baalbek-Hermel</option>
                        </select>
                        <label htmlFor="governorate">Governorate</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating">
                        <select 
                          className="form-select" 
                          id="city"
                          name="city"
                          value={form.city}
                          onChange={handleCityChange}
                          disabled={cityDisabled}
                        >                          <option value="">Select City</option>
                          {cities.map((city, index) => (
                            <option key={index} value={city}>{city}</option>
                          ))}
                        </select>
                        <label htmlFor="city">City/District</label>
                      </div>
                    </div>
                     <div className="col-md-6">
                      <div className="form-floating">
                        <select 
                          className="form-select" 
                          id="village"
                          name="village"
                          value={form.village || ''}
                          onChange={handleInputChange}
                          disabled={!form.city || villageDisabled}
                        >
                          <option value="">Select Village/Suburb</option>
                          {villages.map((village, index) => (
                            <option key={index} value={village}>{village}</option>
                          ))}
                        </select>
                        <label htmlFor="village">Village/Suburb</label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating">
                        <input 
                          type="text" 
                          className="form-control" 
                          id="address" 
                          name="address"
                          placeholder="Detailed Address"
                          value={form.address}
                          onChange={handleInputChange}
                        />
                        <label htmlFor="address">Detailed Address</label>
                      </div>
                    </div>
                   
                   
                    <div className="col-md-6">
                      <div className="form-floating">
                        <input
                          type="url"
                          className="form-control"
                          id="location_url"
                          name="location_url"
                          placeholder="Enter Google Maps URL"
                          value={form.location_url || ''}
                          onChange={handleLocationUrlChange}
                        />
                        <label htmlFor="location_url">Location URL</label>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="bg-light rounded p-3 mb-2 mt-3">
                        <h4 className="mb-0">Property Details</h4>
                      </div>
                    </div>
                    
                    {/* Area field (always shown) */}
                    <div className="col-md-6">
                      <div className="form-floating">
                        <input 
                          type="number" 
                          className="form-control" 
                          id="area" 
                          name="area"
                          placeholder="Area"
                          value={form.area}
                          onChange={handleInputChange}
                          min="0"
                          step="1"
                        />
                        <label htmlFor="area">Area (m²)</label>
                      </div>
                    </div>
                    
                    {/* Dynamic property-specific fields */}
                    {typeConfig.details.map(field => (
  <div className="col-md-6" key={field.name}>
    <div className="form-floating">
      {/* Special dropdown for Office Layout */}
      {form.propertyType === 'Office' && field.name === 'officeLayout' ? (
        <select
          className="form-select"
          id={field.name}
          name={field.name}
          value={extraFields[field.name] ?? ''}
          onChange={handleExtraFieldChange}
        >
          <option value="" disabled>Select Office Layout</option>
          <option value="Open Plan">Open Plan</option>
          <option value="Cubicles">Cubicles</option>
          <option value="Private Offices">Private Offices</option>
          <option value="Co-working">Co-working</option>
          <option value="Other">Other</option>
        </select>
      ) : form.propertyType === 'Land' && field.name === 'landType' ? (
        <select
          className="form-select"
          id={field.name}
          name={field.name}
          value={extraFields[field.name] ?? ''}
          onChange={handleExtraFieldChange}
        >
          <option value="" disabled>Select Land Type</option>
          <option value="Residential">Residential</option>
          <option value="Agricultural">Agricultural</option>
          <option value="Commercial">Commercial</option>
          <option value="Industrial">Industrial</option>
          <option value="Mixed-Use">Mixed-Use</option>
          <option value="Other">Other</option>
        </select>
      ) : form.propertyType === 'Land' && field.name === 'zoning' ? (
        <select
          className="form-select"
          id={field.name}
          name={field.name}
          value={extraFields[field.name] ?? ''}
          onChange={handleExtraFieldChange}
        >
          <option value="" disabled>Select Zoning</option>
          <option value="Residential">Residential</option>
          <option value="Commercial">Commercial</option>
          <option value="Mixed-Use">Mixed-Use</option>
          <option value="Agricultural">Agricultural</option>
          <option value="Industrial">Industrial</option>
          <option value="Other">Other</option>
        </select>
      ) : form.propertyType === 'Farm' && field.name === 'waterSource' ? (
        <select
          className="form-select"
          id={field.name}
          name={field.name}
          value={extraFields[field.name] ?? ''}
          onChange={handleExtraFieldChange}
        >
          <option value="" disabled>Select Water Source</option>
          <option value="Well">Well</option>
          <option value="River">River</option>
          <option value="Municipal">Municipal</option>
          <option value="None">None</option>
          <option value="Other">Other</option>
        </select>
      ) : form.propertyType === 'Farm' && field.name === 'cropTypes' ? (
        <select
          className="form-select"
          id={field.name}
          name={field.name}
          value={extraFields[field.name] ?? ''}
          onChange={handleExtraFieldChange}
        >
          <option value="" disabled>Select Crop Type</option>
          <option value="Olives">Olives</option>
          <option value="Grapes">Grapes</option>
          <option value="Wheat">Wheat</option>
          <option value="Vegetables">Vegetables</option>
          <option value="Fruits">Fruits</option>
          <option value="Other">Other</option>
        </select>
      ) : field.type === 'select' ? (
        <select
          className="form-select"
          id={field.name}
          name={field.name}
          value={extraFields[field.name] ?? ''}
          onChange={handleExtraFieldChange}
          required
        >
          <option value="" disabled>Select {field.label}</option>
          {field.options && field.options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          type={field.type}
          className="form-control"
          id={field.name}
          name={field.name}
          placeholder={field.label}
          value={extraFields[field.name] ?? ''}
          onChange={handleExtraFieldChange}
          required
          min={field.min !== undefined ? field.min : (field.type === 'number' ? "0" : undefined)}
          inputMode={field.type === 'number' ? "numeric" : undefined}
          pattern={field.type === 'number' ? "[0-9]*" : undefined}
        />
      )}
      <label htmlFor={field.name}>{field.label}</label>
    </div>
  </div>
))}
                    
                    {/* Conditionally show standard fields based on property type */}
                    {typeConfig.showStandard.bedrooms && (
                      <div className="col-md-3">
                        <div className="form-floating">
                          <input 
                            type="number" 
                            className="form-control" 
                            id="bedrooms" 
                            name="bedrooms"
                            placeholder="Bedrooms"
                            value={form.bedrooms}
                            onChange={handleInputChange}
                            min="0"
                            step="1"
                          />
                          <label htmlFor="bedrooms">Bedrooms</label>
                        </div>
                      </div>
                    )}
                    
                    {typeConfig.showStandard.bathrooms && (
                      <div className="col-md-3">
                        <div className="form-floating">
                          <input 
                            type="number" 
                            className="form-control" 
                            id="bathrooms" 
                            name="bathrooms"
                            placeholder="Bathrooms"
                            value={form.bathrooms}
                            onChange={handleInputChange}
                            min="0"
                            step="1"
                          />
                          <label htmlFor="bathrooms">Bathrooms</label>
                        </div>
                      </div>
                    )}
                    
                    {typeConfig.showStandard.livingrooms && (
                      <div className="col-md-3">
                        <div className="form-floating">
                          <input 
                            type="number" 
                            className="form-control" 
                            id="livingrooms" 
                            name="livingrooms"
                            placeholder="Living Rooms"
                            value={form.livingrooms}
                            onChange={handleInputChange}
                            min="0"
                            step="1"
                          />
                          <label htmlFor="livingrooms">Living Rooms</label>
                        </div>
                      </div>
                    )}
                    
                    {typeConfig.showStandard.parkingSpaces && (
                      <div className="col-md-3">
                        <div className="form-floating">
                          <input 
                            type="number" 
                            className="form-control" 
                            id="parkingSpaces" 
                            name="parkingSpaces"
                            placeholder="Parking Spaces"
                            value={form.parkingSpaces}
                            onChange={handleInputChange}
                            min="0"
                            step="1"
                          />
                          <label htmlFor="parkingSpaces">Parking Spaces</label>
                        </div>
                      </div>
                    )}
                    
                    {typeConfig.showStandard.yearBuilt && (
                      <div className="col-md-3">
                        <div className="form-floating">
                          <select
                            className="form-select"
                            id="yearBuilt"
                            name="yearBuilt"
                            value={form.yearBuilt}
                            onChange={handleInputChange}
                          >
                            <option value="" disabled>Select Year Built</option>
                            {years.map((year) => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                          <label htmlFor="yearBuilt">Year Built</label>
                        </div>
                      </div>
                    )}
                    
                    {typeConfig.showStandard.furnishingStatus && (
                      <div className="col-md-3">
                        <div className="form-floating">
                          <select 
                            className="form-select" 
                            id="furnishingStatus"
                            name="furnishingStatus"
                            value={form.furnishingStatus}
                            onChange={handleInputChange}
                          >
                            <option value="" disabled>Select Status</option>
                            <option value="Furnished">Furnished</option>
                            <option value="Semi-Furnished">Semi-Furnished</option>
                            <option value="Unfurnished">Unfurnished</option>
                          </select>
                          <label htmlFor="furnishingStatus">Furnishing Status</label>
                        </div>
                      </div>
                    )}
                    
                    {form.propertyType && (
                      <div className="col-12">
                        <div className="bg-light rounded p-3 mb-2 mt-3">
                          <h4 className="mb-0">Property Features</h4>
                        </div>
                      </div>
                    )}
                    
                                       {/* Dynamic property features */}
                    {form.propertyType && typeConfig.features.map(featureKey => (
                      <div className="col-md-4" key={featureKey}>
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id={featureKey}
                            name={featureKey}
                            checked={form[featureKey] || false}
                            onChange={handleFeatureChange}
                          />
                          <label className="form-check-label" htmlFor={featureKey}>
                            {COMMON_FEATURES[featureKey] || featureKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </label>
                        </div>
                      </div>
                    ))}
                    
                    <div className="col-12">
                      <div className="bg-light rounded p-3 mb-2 mt-3">
                        <h4 className="mb-0">Property Description</h4>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="form-floating">
                        <textarea 
                          className="form-control" 
                          placeholder="Description" 
                          id="description"
                          name="description"
                          style={{height: '150px'}}
                          value={form.description}
                          onChange={handleInputChange}
                        ></textarea>
                        <label htmlFor="description">Description</label>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="bg-light rounded p-3 mb-2 mt-3">
                        <h4 className="mb-0">Property Images</h4>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="mb-3">
                        <label htmlFor="mainImage" className="form-label">Main Image (Cover Photo)</label>
                        <input 
                          className="form-control" 
                          type="file" 
                          id="mainImage" 
                          accept="image/*"
                          onChange={handleMainImageChange}
                          ref={mainImageInputRef}
                          required
                        />
                        <div className="form-text">Recommended size: 1200 x 800 pixels. Max file size: 5MB</div>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="mb-3">
                        <label htmlFor="additionalImages" className="form-label">Additional Images (Select multiple)</label>
                        <input 
                          className="form-control" 
                          type="file" 
                          id="additionalImages" 
                          multiple 
                          accept="image/*"
                          onChange={handleAdditionalImagesChange}
                          ref={additionalImagesInputRef}
                          required
                        />
                        <div className="form-text">You can select up to 10 additional images. Max file size: 5MB each</div>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="form-check">
                        <input 
                          className="form-check-input" 
                          type="checkbox" 
                          id="termsConditions"
                          name="termsConditions"
                          checked={form.termsConditions}
                          onChange={handleTermsChange}
                          required
                        />
                        <label className="form-check-label" htmlFor="termsConditions">
                          I agree to the <button type="button" className="btn btn-link p-0 d-inline" data-bs-toggle="modal" data-bs-target="#termsModal">Terms and Conditions</button> and <button type="button" className="btn btn-link p-0 d-inline" data-bs-toggle="modal" data-bs-target="#privacyModal">Privacy Policy</button>
                        </label>
                      </div>
                    </div>
                    <div className="col-12 mt-4">
                      <button className="btn btn-primary w-100 py-3" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Submit Property'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Terms Modal */}
      <div className="modal fade" id="termsModal" tabIndex="-1" aria-labelledby="termsModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-scrollable modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="termsModalLabel">Terms and Conditions</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <TermsAndConditions />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" data-bs-dismiss="modal">I Understand</button>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Modal */}
      <div className="modal fade" id="privacyModal" tabIndex="-1" aria-labelledby="privacyModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-scrollable modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="privacyModalLabel">Privacy Policy</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <PrivacyPolicy />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" data-bs-dismiss="modal">I Understand</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddPropertyForm;


