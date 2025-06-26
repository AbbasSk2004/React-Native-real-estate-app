import axios from 'axios';
import api from './api';

const API_URL = process.env.REACT_APP_API_URL;

export const PropertyInquiryService = {
  // Get all inquiries for a specific property
  getPropertyInquiries: async (propertyId) => {
    try {
      const response = await api.get(`/property-inquiries/property/${propertyId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get all inquiries for the authenticated user
  getUserInquiries: async () => {
    try {
      const response = await api.get('/property-inquiries/user');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Create a new property inquiry
  createInquiry: async (inquiryData) => {
    try {
      const response = await api.post('/property-inquiries', inquiryData);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Please login to send an inquiry');
      }
      throw error.response?.data || error.message;
    }
  },

  // Update inquiry status
  updateInquiryStatus: async (inquiryId, status) => {
    try {
      const response = await api.patch(
        `/property-inquiries/${inquiryId}/status`,
        { status }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete an inquiry
  deleteInquiry: async (inquiryId) => {
    try {
      await api.delete(`/property-inquiries/${inquiryId}`);
      return true;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};
