import { useState, useEffect } from 'react';
import { endpoints } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from './useToast';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const fetchFavorites = async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      const response = await endpoints.getFavorites();
      setFavorites(response.data);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const isFavorite = (propertyId) => {
    return favorites.some(fav => fav.property_id === propertyId);
  };

  const toggleFavorite = async (propertyId) => {
    if (!isAuthenticated) {
      toast.warning('Please login to add favorites');
      return;
    }

    try {
      if (isFavorite(propertyId)) {
        await endpoints.removeFavorite(propertyId);
        setFavorites(prev => prev.filter(fav => fav.property_id !== propertyId));
        toast.success('Removed from favorites');
      } else {
        const response = await endpoints.addFavorite({ property_id: propertyId });
        setFavorites(prev => [...prev, response.data]);
        toast.success('Added to favorites');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update favorites');
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [isAuthenticated]);

  return {
    favorites,
    loading,
    isFavorite,
    toggleFavorite,
    refetch: fetchFavorites
  };
};