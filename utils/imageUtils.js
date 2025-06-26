import { API_ENDPOINTS } from './constants';

const SUPABASE_STORAGE_URL = 'https://mmgfvjfgstcpqmlhctlw.supabase.co/storage/v1';

export const getImageUrl = (path) => {
  if (!path) return '/img/property-placeholder.jpg';
  
  // If already a full URL, return it
  if (path.startsWith('http')) {
    return path;
  }
  
  // Handle object format (for backward compatibility)
  if (typeof path === 'object') {
    if (path.url && path.url.startsWith('http')) {
      return path.url;
    }
    return '/img/property-placeholder.jpg';
  }
  
  // Otherwise, construct URL using Supabase storage URL format
  const cleanPath = path.replace(/\\/g, '/');
  return `${SUPABASE_STORAGE_URL}/object/public/property-images/${cleanPath}`;
};

export const getProfileImageUrl = (path) => {
  if (!path) return '/img/user-placeholder.jpg';
  
  // If already a full URL, return it
  if (path.startsWith('http')) {
    return path;
  }
  
  // Handle object format (for backward compatibility)
  if (typeof path === 'object') {
    if (path.url && path.url.startsWith('http')) {
      return path.url;
    }
    return '/img/user-placeholder.jpg';
  }
  
  // Otherwise, construct URL using Supabase storage URL format
  const cleanPath = path.replace(/\\/g, '/');
  return `${SUPABASE_STORAGE_URL}/object/public/property-images/${cleanPath}`;
};