// Icon mapping for use with Material Icons
export const ICONS = {
  // Navigation
  home: 'home',
  search: 'search',
  featured: 'star',
  profile: 'person',
  settings: 'settings',
  notifications: 'notifications',
  chat: 'chat',
  
  // Property types
  house: 'home',
  apartment: 'apartment',
  condo: 'business',
  villa: 'villa',
  land: 'landscape',
  
  // Property features
  bed: 'bed',
  bath: 'bathtub',
  area: 'square-foot',
  garage: 'garage',
  
  // Amenities
  pool: 'pool',
  gym: 'fitness-center',
  security: 'security',
  parking: 'local-parking',
  garden: 'grass',
  patio: 'deck',
  elevator: 'elevator',
  laundry: 'local-laundry-service',
  airConditioning: 'ac-unit',
  heating: 'heat',
  
  // Actions
  add: 'add',
  edit: 'edit',
  delete: 'delete',
  save: 'save',
  share: 'share',
  more: 'more-vert',
  filter: 'filter-list',
  sort: 'sort',
  
  // UI elements
  close: 'close',
  back: 'arrow-back',
  forward: 'arrow-forward',
  menu: 'menu',
  check: 'check',
  checkCircle: 'check-circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
  help: 'help',
  
  // Communication
  email: 'email',
  phone: 'phone',
  message: 'message',
  
  // Location
  location: 'location-on',
  directions: 'directions',
  map: 'map',
  
  // Financial
  money: 'attach-money',
  creditCard: 'credit-card',
  wallet: 'account-balance-wallet',
  
  // Media
  photo: 'photo',
  camera: 'camera',
  video: 'videocam',
  gallery: 'collections',
  
  // Social
  like: 'thumb-up',
  dislike: 'thumb-down',
  favorite: 'favorite',
  share: 'share',
};

// Function to get an icon name
export const getIcon = (iconKey) => {
  return ICONS[iconKey] || 'help-outline'; // Default fallback icon
}; 