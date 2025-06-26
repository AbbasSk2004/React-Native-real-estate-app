// Define image paths for easy reference throughout the app

// Import local images
export const IMAGES = {
  // Logo and branding
  logo: { uri: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9' },
  logoWhite: { uri: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9' }, // Replace with white version if available
  
  // Default placeholders
  propertyPlaceholder: { uri: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0' },
  userPlaceholder: { uri: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d' },
  
  // Backgrounds
  authBackground: { uri: 'https://images.unsplash.com/photo-1560185007-5f0bb1866cab' },
  welcomeBackground: { uri: 'https://images.unsplash.com/photo-1560448205-4d9b3e6bb6db' },
  
  // UI elements
  noResults: { uri: 'https://images.unsplash.com/photo-1617575521317-d2974f3b56d2' },
  emptyState: { uri: 'https://images.unsplash.com/photo-1617575521317-d2974f3b56d2' },
  success: { uri: 'https://images.unsplash.com/photo-1552072092-7f9b8d63efcb' },
  error: { uri: 'https://images.unsplash.com/photo-1544441891-bb6aecb8b1c9' },
  
  // Feature images
  featured1: { uri: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0' },
  featured2: { uri: 'https://images.unsplash.com/photo-1560184897-502a475f7a0d' },
  featured3: { uri: 'https://images.unsplash.com/photo-1560185008-a9295944525d' },
  
  // Category icons
  categoryHouse: { uri: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be' },
  categoryApartment: { uri: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267' },
  categoryCondo: { uri: 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4' },
  categoryVilla: { uri: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914' },
};

// Function to get an image
export const getImage = (imageKey) => {
  return IMAGES[imageKey] || IMAGES.propertyPlaceholder;
}; 