

export const PROPERTY_STATUS = [
  { value: 'For Sale', label: 'For Sale' },
  { value: 'For Rent', label: 'For Rent' }
];

export const FURNISHING_STATUS = [
  'Unfurnished',
  'Semi-furnished',
  'Fully furnished'
];

export const GOVERNORATES = {
  'beirut': 'Beirut',
  'mount_lebanon': 'Mount Lebanon',
  'north_lebanon': 'North Lebanon',
  'south_lebanon': 'South Lebanon',
  'bekaa': 'Bekaa',
  'nabatiyeh': 'Nabatiyeh',
  'akkar': 'Akkar',
  'baalbek_hermel': 'Baalbek-Hermel'
};

export const CITIES = {
  'beirut': ['Achrafieh', 'Ain El Mraiseh', 'Bachoura', 'Mazraa', 'Medawar', 'Minet El Hosn', 'Moussaitbeh', 'Port', 'Ras Beirut', 'Rmeil', 'Saifi', 'Zuqaq al-Blat'],
  'mount_lebanon': ['Aley', 'Baabda', 'Byblos', 'Chouf', 'Keserwan', 'Metn'],
  'north_lebanon': ['Batroun', 'Bcharre', 'Koura', 'Minieh-Danniyeh', 'Tripoli', 'Zgharta'],
  'south_lebanon': ['Jezzine', 'Sidon', 'Tyre'],
  'bekaa': ['Rachaya', 'Western Bekaa', 'Zahleh'],
  'nabatiyeh': ['Bint Jbeil', 'Hasbaya', 'Marjeyoun', 'Nabatieh'],
  'akkar': ['Akkar'],
  'baalbek_hermel': ['Baalbek', 'Hermel']
};

export const AGENT_SPECIALTIES = [
  'Residential',
  'Commercial',
  'Luxury Homes',
  'Investment Properties',
  'New Construction',
  'Land Development'
];

export const EXPERIENCE_LEVELS = [
  { value: '1', label: '0-2 Years' },
  { value: '2', label: '3-5 Years' },
  { value: '3', label: '5-10 Years' },
  { value: '4', label: '10+ Years' }
];

export const PRICE_RANGES = [
  { value: 50000, label: 'Under $50,000' },
  { value: 100000, label: 'Under $100,000' },
  { value: 200000, label: 'Under $200,000' },
  { value: 500000, label: 'Under $500,000' },
  { value: 1000000, label: 'Under $1,000,000' },
  { value: 2000000, label: 'Under $2,000,000' }
];

export const BEDROOM_OPTIONS = [
  { value: 1, label: '1 Bedroom' },
  { value: 2, label: '2 Bedrooms' },
  { value: 3, label: '3 Bedrooms' },
  { value: 4, label: '4 Bedrooms' },
  { value: 5, label: '5+ Bedrooms' }
];

export const BATHROOM_OPTIONS = [
  { value: 1, label: '1 Bathroom' },
  { value: 2, label: '2 Bathrooms' },
  { value: 3, label: '3 Bathrooms' },
  { value: 4, label: '4 Bathrooms' },
  { value: 5, label: '5+ Bathrooms' }
];

export const PROPERTY_FEATURES = [
  { key: 'airConditioning', label: 'Air Conditioning', icon: 'fa-snowflake' },
  { key: 'heating', label: 'Heating', icon: 'fa-fire' },
  { key: 'internet', label: 'Internet', icon: 'fa-wifi' },
  { key: 'parking', label: 'Parking', icon: 'fa-car' },
  { key: 'swimmingPool', label: 'Swimming Pool', icon: 'fa-swimmer' },
  { key: 'generator', label: 'Generator', icon: 'fa-bolt' },
  { key: 'waterTank', label: 'Water Tank', icon: 'fa-tint' },
  { key: 'security', label: 'Security', icon: 'fa-shield-alt' },
  { key: 'balcony', label: 'Balcony', icon: 'fa-building' },
  { key: 'elevator', label: 'Elevator', icon: 'fa-arrows-alt-v' },
  { key: 'solarPanels', label: 'Solar Panels', icon: 'fa-solar-panel' },
  { key: 'garden', label: 'Garden', icon: 'fa-leaf' },
  { key: 'fireplace', label: 'Fireplace', icon: 'fa-fire' },
  { key: 'bbqArea', label: 'BBQ Area', icon: 'fa-utensils' },
  { key: 'irrigation', label: 'Irrigation', icon: 'fa-tint' },
  { key: 'storage', label: 'Storage', icon: 'fa-box' },
  { key: 'electricity', label: 'Electricity', icon: 'fa-plug' },
  { key: 'roadAccess', label: 'Road Access', icon: 'fa-road' }
];

export const FILE_UPLOAD_LIMITS = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxFiles: 10
};

export const PAGINATION_LIMITS = {
  properties: 12,
  agents: 9,
  testimonials: 6,
  messages: 50
};

export const API_ENDPOINTS = {
  base: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  storage: process.env.REACT_APP_STORAGE_URL || 'http://localhost:3001/storage'
};

export const SOCIAL_MEDIA_PLATFORMS = [
  { key: 'facebook', label: 'Facebook', icon: 'fab fa-facebook-f', color: '#1877f2' },
  { key: 'twitter', label: 'Twitter', icon: 'fab fa-twitter', color: '#1da1f2' },
  { key: 'instagram', label: 'Instagram', icon: 'fab fa-instagram', color: '#e4405f' },
  { key: 'linkedin', label: 'LinkedIn', icon: 'fab fa-linkedin-in', color: '#0077b5' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'fab fa-whatsapp', color: '#25d366' }
];

export const NOTIFICATION_TYPES = {
  MESSAGE: 'message',
  PROPERTY_INQUIRY: 'property_inquiry',
  PROPERTY_APPROVED: 'property_approved',
  PROPERTY_REJECTED: 'property_rejected',
  AGENT_APPLICATION: 'agent_application',
  SYSTEM: 'system'
};

export const USER_ROLES = {
  USER: 'user',
  AGENT: 'agent',
  ADMIN: 'admin'
};