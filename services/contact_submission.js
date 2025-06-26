import axios from 'axios';
import { API_BASE_URL } from '../config/constants';
import { handleError } from '../utils/errorHandler';

/**
 * Service for handling contact form submissions
 */
class ContactSubmissionService {
  /**
   * Submit a contact form to the backend
   * @param {Object} formData - Form data containing name, email, phone, message, and preferred_contact
   * @returns {Promise<Object>} - API response
   */
  async submitContactForm(formData) {
    try {
      console.log('Submitting contact form to:', `${API_BASE_URL}/contact`);
      console.log('Form data:', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || 'Not provided',
        preferred_contact: formData.preferred_contact,
        message_length: formData.message ? formData.message.length : 0
      });
      
      const response = await axios.post(`${API_BASE_URL}/contact`, formData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 seconds timeout
      });
      
      console.log('Contact form submission successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('Contact form submission error details:', error);
      
      // Handle specific error responses
      if (error.response) {
        const { status, data } = error.response;
        console.log(`Contact submission failed with status ${status}:`, data);
        
        // If it's a validation error (400), get the specific message
        if (status === 400) {
          return {
            success: false,
            message: data.message || 'Please check your form inputs and try again.',
            status,
            error: 'validation_error'
          };
        }
        
        // For database errors (500)
        if (status === 500 && data.error && data.error.includes('database')) {
          return {
            success: false,
            message: 'There was an issue with our database. Our team has been notified. Please try again later.',
            status,
            error: 'database_error'
          };
        }
        
        // Return formatted error response
        return {
          success: false,
          message: data.message || 'Failed to submit contact form',
          status,
          error: data.error || 'submission_failed'
        };
      }
      
      // Handle network errors
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          message: 'Request timed out. Please check your internet connection and try again.',
          error: 'timeout_error'
        };
      }
      
      // Handle other network errors or issues
      return {
        success: false,
        message: 'Network error. Please check your internet connection and try again.',
        error: 'network_error'
      };
    }
  }
  
  /**
   * Validate contact form data before submission
   * @param {Object} formData - Form data to validate
   * @returns {Object} - Validation result with errors if any
   */
  validateContactForm(formData) {
    const errors = {};
    
    // Validate name
    if (!formData.name || !formData.name.trim()) {
      errors.name = 'Full name is required';
    }
    
    // Validate email
    if (!formData.email || !formData.email.trim()) {
      errors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Invalid email format';
      }
    }
    
    // Validate phone if provided
    if (formData.phone && formData.phone.trim()) {
      // Lebanese phone number validation
      // Formats: +961 xx xxxxxx, 03 xxxxxx, 71 xxxxxx, etc.
      const phoneRegex = /^(\+961|0)([1-9]\d{0,1})[- ]?(\d{6,7})$/;
      if (!phoneRegex.test(formData.phone)) {
        errors.phone = 'Invalid Lebanese phone number format';
      }
    }
    
    // Validate message
    if (!formData.message || !formData.message.trim()) {
      errors.message = 'Message is required';
    } else if (formData.message.length > 1000) {
      errors.message = 'Message is too long (maximum 1000 characters)';
    }
    
    // Validate preferred contact
    if (!formData.preferred_contact) {
      errors.preferred_contact = 'Preferred contact method is required';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}

export const contactSubmissionService = new ContactSubmissionService();
