import api from './api';

export const faqService = {
  getAllFaqs: async () => {
    try {
      const response = await api.get('/faqs');
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to fetch FAQs');
    } catch (error) {
      console.error('Error in faqService.getAllFaqs:', error);
      throw error;
    }
  },

  getFeaturedFaqs: async () => {
    try {
      const response = await api.get('/faqs/featured');
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to fetch featured FAQs');
    } catch (error) {
      console.error('Error in faqService.getFeaturedFaqs:', error);
      throw error;
    }
  },

  getFaqsByCategory: async (category) => {
    try {
      const response = await api.get(`/faqs/category/${category}`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to fetch FAQs by category');
    } catch (error) {
      console.error('Error in faqService.getFaqsByCategory:', error);
      throw error;
    }
  },

  createFaq: async (faqData) => {
    try {
      const response = await api.post('/faqs', {
        ...faqData,
        author_id: faqData.author_id // Make sure to include author_id in the request
      });
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to create FAQ');
    } catch (error) {
      console.error('Error in faqService.createFaq:', error);
      throw error;
    }
  },

  updateFaq: async (id, faqData) => {
    try {
      const response = await api.put(`/faqs/${id}`, {
        ...faqData,
        author_id: faqData.author_id // Make sure to include author_id in the request
      });
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to update FAQ');
    } catch (error) {
      console.error('Error in faqService.updateFaq:', error);
      throw error;
    }
  },

  deleteFaq: async (id, author_id) => {
    try {
      const response = await api.delete(`/faqs/${id}`, {
        data: { author_id } // Include author_id in the request body for verification
      });
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to delete FAQ');
    } catch (error) {
      console.error('Error in faqService.deleteFaq:', error);
      throw error;
    }
  }
}; 