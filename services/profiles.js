import api, { endpoints } from './api';

// Profiles service for handling user profile operations
const profilesService = {
  // Get the current user's profile
  getProfile: async () => {
    try {
      const response = await endpoints.profile.get();
      return response.data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  },

  // Update the user's profile
  updateProfile: async (profileData) => {
    try {
      // Handle multipart form data for profile photo
      const formData = new FormData();
      
      // Add text fields
      if (profileData.firstname !== undefined) {
        formData.append('firstname', profileData.firstname);
      }
      
      if (profileData.lastname !== undefined) {
        formData.append('lastname', profileData.lastname);
      }
      
      if (profileData.phone !== undefined) {
        formData.append('phone', profileData.phone);
      }
      
      // Add profile photo if it exists and is a file (not a URL)
      if (profileData.profile_photo && typeof profileData.profile_photo === 'string' && profileData.profile_photo.startsWith('file://')) {
        const filename = profileData.profile_photo.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('profile_photo', {
          uri: profileData.profile_photo,
          name: filename,
          type
        });
      }
      
      const response = await api.put('/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Invalidate cached profile so UI fetches fresh data next time
      if (endpoints?.profile?.clearCache) {
        endpoints.profile.clearCache();
      }
      
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },
  
  // Change user password
  changePassword: async (passwordData) => {
    try {
      const response = await api.post('/profile/change-password', passwordData);
      return response.data;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }
};

export default profilesService;
