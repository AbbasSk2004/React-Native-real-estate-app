import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function FavoriteButton({ isFavorite, onPress, style, size = 22, disabled = false, iconColor, loading = false }) {
  const { isAuthenticated } = useAuth();
  
  // Don't render the button if user is not authenticated
  if (!isAuthenticated) return null;
  
  return (
    <TouchableOpacity 
      style={[styles.favoriteButton, style, (disabled || loading) && { opacity: 0.5 }]}
      onPress={(e) => {
        if (e?.stopPropagation) e.stopPropagation();
        if (!loading) {
          onPress && onPress();
        }
      }}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size={size} color={iconColor || "#FF5E5E"} />
      ) : (
        <Ionicons 
          name={isFavorite ? "heart" : "heart-outline"} 
          size={size} 
          color={iconColor || "#FF5E5E"} 
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    // border removed for cleaner look
  },
}); 