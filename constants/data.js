// Sample property data
export const properties = [
  {
    id: '1',
    title: 'Modern Apartment in Downtown',
    description: 'Beautiful modern apartment with amazing city views. This spacious 2-bedroom apartment features high-end finishes, open floor plan, and luxury amenities.',
    price: 350000,
    location: 'Downtown, Metro City',
    bedrooms: 2,
    bathrooms: 2,
    area: 1200,
    type: 'Apartment',
    isFeatured: true,
    isRecommended: true,
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2',
    ],
    amenities: ['Swimming Pool', 'Gym', 'Security', 'Parking', 'Balcony']
  },
  {
    id: '2',
    title: 'Luxury Villa with Pool',
    description: 'Stunning luxury villa in an exclusive neighborhood. Features include a private pool, spacious garden, and elegant interior design.',
    price: 1200000,
    location: 'Hillside Heights, Metro City',
    bedrooms: 5,
    bathrooms: 4,
    area: 3500,
    type: 'Villa',
    isFeatured: true,
    isRecommended: false,
    images: [
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914',
      'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83',
      'https://images.unsplash.com/photo-1576941089067-2de3c901e126',
    ],
    amenities: ['Swimming Pool', 'Garden', 'Garage', 'Security System', 'Smart Home']
  },
  {
    id: '3',
    title: 'Cozy Family Home',
    description: 'Charming family home in a quiet neighborhood. Perfect for families looking for comfort and convenience.',
    price: 450000,
    location: 'Suburban Heights, Metro City',
    bedrooms: 3,
    bathrooms: 2,
    area: 1800,
    type: 'House',
    isFeatured: false,
    isRecommended: true,
    images: [
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be',
      'https://images.unsplash.com/photo-1554995207-c18c203602cb',
      'https://images.unsplash.com/photo-1556912167-f556f1f39fdf',
    ],
    amenities: ['Garden', 'Garage', 'Fireplace', 'Basement', 'Patio']
  },
  {
    id: '4',
    title: 'Oceanfront Condo',
    description: 'Breathtaking oceanfront condo with panoramic views. Enjoy luxury living with direct beach access.',
    price: 780000,
    location: 'Beachside, Metro City',
    bedrooms: 3,
    bathrooms: 2,
    area: 1600,
    type: 'Condo',
    isFeatured: true,
    isRecommended: true,
    images: [
      'https://images.unsplash.com/photo-1560185127-6ed189bf02f4',
      'https://images.unsplash.com/photo-1542889601-399c4f3a8402',
      'https://images.unsplash.com/photo-1564078516393-cf04bd966897',
    ],
    amenities: ['Beach Access', 'Swimming Pool', 'Gym', 'Security', 'Balcony']
  },
  {
    id: '5',
    title: 'Urban Loft Apartment',
    description: 'Stylish urban loft in the heart of the arts district. Features exposed brick walls, high ceilings, and modern design.',
    price: 420000,
    location: 'Arts District, Metro City',
    bedrooms: 1,
    bathrooms: 1,
    area: 950,
    type: 'Apartment',
    isFeatured: false,
    isRecommended: true,
    images: [
      'https://images.unsplash.com/photo-1554995207-c18c203602cb',
      'https://images.unsplash.com/photo-1556912167-f556f1f39fdf',
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be',
    ],
    amenities: ['Rooftop Terrace', 'Elevator', 'Security', 'Storage', 'Pet Friendly']
  },
];

// Sample categories
export const categories = [
  { id: '1', name: 'House', icon: 'home' },
  { id: '2', name: 'Apartment', icon: 'apartment' },
  { id: '3', name: 'Condo', icon: 'business' },
  { id: '4', name: 'Villa', icon: 'villa' },
  { id: '5', name: 'Land', icon: 'landscape' },
];

// Sample locations
export const locations = [
  { id: '1', name: 'Downtown', city: 'Metro City', properties: 45 },
  { id: '2', name: 'Suburban Heights', city: 'Metro City', properties: 28 },
  { id: '3', name: 'Beachside', city: 'Metro City', properties: 17 },
  { id: '4', name: 'Hillside Heights', city: 'Metro City', properties: 23 },
  { id: '5', name: 'Arts District', city: 'Metro City', properties: 34 },
]; 