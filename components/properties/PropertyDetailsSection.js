import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PROPERTY_TYPE_FIELDS } from '../../utils/propertyTypeFields';
import FavoriteButton from '../common/FavoriteButton';
import { endpoints } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import favoriteEvents from '../../utils/favoriteEvents';

const PropertyDetailsSection = ({ property, isDark = false }) => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [viewCount, setViewCount] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Format creation date without using date-fns
  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Recently added';
      
      const date = new Date(dateString);
      const now = new Date();
      
      // Check if invalid date
      if (isNaN(date.getTime())) {
        return 'Recently added';
      }
      
      const diffTime = Math.abs(now - date);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} ${months === 1 ? 'month' : 'months'} ago`;
      } else {
        const years = Math.floor(diffDays / 365);
        return `${years} ${years === 1 ? 'year' : 'years'} ago`;
      }
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Recently added';
    }
  };
  
  // Format price display
  const formatPrice = (price) => {
    if (!price && price !== 0) return 'Price on request';
    return `$${price.toLocaleString()}`;
  };
  
  // Get property type fields configuration
  const propertyType = property?.property_type || 'Apartment';
  
  // Emit helper
  const broadcastFavorite = (status) => {
    if (!property?.id) return;
    favoriteEvents.emit('favoriteToggled', {
      propertyId: property.id,
      isFavorite: status,
    });
  };

  // Listen for favorite changes from cards/list
  useEffect(() => {
    const handler = ({ propertyId, isFavorite: status }) => {
      if (propertyId === property.id) {
        setIsFavorite(status);
      }
    };
    favoriteEvents.on('favoriteToggled', handler);
    return () => favoriteEvents.off('favoriteToggled', handler);
  }, [property?.id]);
  
  useEffect(() => {
    const init = async () => {
      if (!property?.id) return;
      // Retrieve view count
      try {
        const viewData = await endpoints.propertyViews.getViewCount(property.id);
        if (typeof viewData === 'number') {
          setViewCount(viewData);
        } else if (viewData && typeof viewData === 'object') {
          const count = viewData.count || viewData.data?.count || 0;
          setViewCount(count);
        }
      } catch (err) {
        console.error('Error retrieving view count:', err);
      }

      // Only attempt favorites logic if user is authenticated
      if (!isAuthenticated) {
        return;
      }

      // Check favorite status
      try {
        const resp = await endpoints.properties.checkFavoriteStatus(property.id);
        setIsFavorite(resp === true || resp?.isFavorited === true);
        broadcastFavorite(resp === true || resp?.isFavorited === true);
      } catch (checkErr) {
        console.error('Error checking favorite status:', checkErr);
      }
    };

    init();
  }, [property?.id, isAuthenticated]);
  
  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      router.push('/sign-in');
      return;
    }
    
    if (!property?.id) return;
    
    // Immediately update UI for better UX
    const newStatus = !isFavorite;
    setIsFavorite(newStatus);
    broadcastFavorite(newStatus);
    
    try {
      if (newStatus) {
        await endpoints.properties.addToFavorites(property.id);
      } else {
        await endpoints.properties.removeFromFavorites(property.id);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      try {
        const statusResp = await endpoints.properties.checkFavoriteStatus(property.id);
        const realStatus = statusResp === true || statusResp?.isFavorited === true;
        setIsFavorite(realStatus);
        broadcastFavorite(realStatus);
      } catch (statusErr) {
        // Revert the optimistic update on unknown failures
        setIsFavorite(!newStatus);
        broadcastFavorite(!newStatus);
      }
    }
  };
  
  // Helper function to render property details
  const renderPropertyDetails = () => {
    const allDetails = [];
    
    // Property Type first as requested
    if (property?.property_type) {
      allDetails.push({
        icon: 'home-outline',
        value: property.property_type,
        label: 'Type'
      });
    }
    
    // Core details
    if (property?.bedrooms !== undefined && property?.bedrooms !== null) {
      allDetails.push({
        icon: 'bed-outline',
        value: property.bedrooms,
        label: 'Bedrooms'
      });
    }
    
    if (property?.bathrooms !== undefined && property?.bathrooms !== null) {
      allDetails.push({
        icon: 'water-outline',
        value: property.bathrooms,
        label: 'Bathrooms'
      });
    }
    
    if (property?.area !== undefined && property?.area !== null) {
      allDetails.push({
        icon: 'resize-outline',
        value: `${property.area} m²`,
        label: 'Area'
      });
    }
    
    // Year built (moved from features to details)
    if (property?.year_built) {
      allDetails.push({
        icon: 'calendar-outline',
        value: property.year_built,
        label: 'Built'
      });
    }
    
    // Additional details based on property type
    if (property?.livingrooms !== undefined && property?.livingrooms !== null) {
      allDetails.push({
        icon: 'tv-outline',
        value: property.livingrooms,
        label: 'Living Rooms'
      });
    }
    
    if (property?.parking_spaces !== undefined && property?.parking_spaces !== null) {
      allDetails.push({
        icon: 'car-outline',
        value: property.parking_spaces,
        label: 'Parking'
      });
    }
    
    if (property?.floor !== undefined && property?.floor !== null) {
      allDetails.push({
        icon: 'layers-outline',
        value: property.floor,
        label: 'Floor'
      });
    }
    
    if (property?.garden_area) {
      allDetails.push({
        icon: 'leaf-outline',
        value: `${property.garden_area} m²`,
        label: 'Garden Area'
      });
    }
    
    if (property?.plot_size) {
      allDetails.push({
        icon: 'map-outline',
        value: `${property.plot_size} m²`,
        label: 'Plot Size'
      });
    }
    
    if (property?.shop_front_width) {
      allDetails.push({
        icon: 'storefront-outline',
        value: `${property.shop_front_width} m`,
        label: 'Shop Front'
      });
    }
    
    if (property?.storage_area) {
      allDetails.push({
        icon: 'cube-outline',
        value: `${property.storage_area} m²`,
        label: 'Storage'
      });
    }
    
    if (property?.land_type) {
      allDetails.push({
        icon: 'earth-outline',
        value: property.land_type,
        label: 'Land Type'
      });
    }
    
    if (property?.zoning) {
      allDetails.push({
        icon: 'business-outline',
        value: property.zoning,
        label: 'Zoning'
      });
    }
    
    if (property?.meeting_rooms !== undefined && property?.meeting_rooms !== null) {
      allDetails.push({
        icon: 'people-outline',
        value: property.meeting_rooms,
        label: 'Meeting Rooms'
      });
    }
    
    if (property?.office_layout) {
      allDetails.push({
        icon: 'grid-outline',
        value: property.office_layout,
        label: 'Office Layout'
      });
    }
    
    if (property?.units !== undefined && property?.units !== null) {
      allDetails.push({
        icon: 'business-outline',
        value: property.units,
        label: 'Units'
      });
    }
    
    if (property?.elevators !== undefined && property?.elevators !== null) {
      allDetails.push({
        icon: 'arrow-up-outline',
        value: property.elevators,
        label: 'Elevators'
      });
    }
    
    if (property?.ceiling_height) {
      allDetails.push({
        icon: 'resize-outline',
        value: `${property.ceiling_height} m`,
        label: 'Ceiling Height'
      });
    }
    
    if (property?.loading_docks !== undefined && property?.loading_docks !== null) {
      allDetails.push({
        icon: 'boat-outline',
        value: property.loading_docks,
        label: 'Loading Docks'
      });
    }
    
    if (property?.farm_area) {
      allDetails.push({
        icon: 'leaf-outline',
        value: `${property.farm_area} m²`,
        label: 'Farm Area'
      });
    }
    
    if (property?.water_source) {
      allDetails.push({
        icon: 'water-outline',
        value: property.water_source,
        label: 'Water Source'
      });
    }
    
    if (property?.crop_types) {
      allDetails.push({
        icon: 'nutrition-outline',
        value: property.crop_types,
        label: 'Crop Types'
      });
    }
    
    if (property?.view) {
      allDetails.push({
        icon: 'eye-outline',
        value: property.view,
        label: 'View'
      });
    }
    
    return allDetails;
  };
  
  if (!property) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3366FF" />
      </View>
    );
  }
  
  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      {/* Status Badge */}
      <View style={styles.headerRow}>
        <View style={[
          styles.statusBadge, 
          property.status === 'For Rent' ? styles.rentBadge : styles.saleBadge
        ]}>
          <Text style={styles.statusText}>{property.status || 'For Sale'}</Text>
        </View>
        
        <View style={styles.metaInfoContainer}>
          {/* Views counter */}
          <View style={styles.viewsContainer}>
            <Ionicons name="eye-outline" size={16} color={isDark ? '#AAA' : '#666'} />
            <Text style={[styles.viewsText, isDark && styles.darkSubText]}>{viewCount}</Text>
          </View>
          
          {/* Date added */}
          <Text style={[styles.dateText, isDark && styles.darkSubText]}>{formatDate(property.created_at)}</Text>
        </View>
      </View>
      
      {/* Property Title */}
      <Text style={[styles.title, isDark && styles.darkText]} numberOfLines={2}>{property.title}</Text>
      
      {/* Location (moved below title, includes village) */}
      <View style={styles.locationContainer}>
        <Ionicons name="location-outline" size={18} color={isDark ? '#AAA' : '#666'} />
        <Text style={[styles.location, isDark && styles.darkSubText]}>
          {property.address ? `${property.address}, ` : ''}
          {property.city || ''}
          {property.village ? `, ${property.village}` : ''}
          {property.governate ? `, ${property.governate}` : ''}
        </Text>
      </View>
      
      {/* Price and Favorite */}
      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatPrice(property.price)}</Text>
        <View style={styles.favoriteContainer}>
          <FavoriteButton 
            isFavorite={isFavorite} 
            onPress={handleToggleFavorite}
            size={28}
          />
        </View>
      </View>
      
      {/* Property Specs - Now shows all available details */}
      <View style={styles.specsContainer}>
        {renderPropertyDetails().map((detail, index) => (
          <View style={styles.specItem} key={index}>
            <Ionicons name={detail.icon} size={22} color="#3366FF" />
            <View style={styles.specTextContainer}>
              <Text style={[styles.specValue, isDark && styles.darkText]}>{detail.value}</Text>
              <Text style={[styles.specLabel, isDark && styles.darkSubText]}>{detail.label}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: -20,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkContainer: {
    backgroundColor: '#2A2A2A',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  saleBadge: {
    backgroundColor: '#e8f5ff',
  },
  rentBadge: {
    backgroundColor: '#ebf9eb',
  },
  statusText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#3366FF',
  },
  metaInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  viewsText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  darkSubText: {
    color: '#CCC',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#191d31',
    marginBottom: 8,
  },
  darkText: {
    color: '#FFF',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  location: {
    fontSize: 16,
    color: '#666',
    marginLeft: 5,
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  price: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#3366FF',
  },
  favoriteContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  specsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  specItem: {
    alignItems: 'center',
    width: '25%',
    marginBottom: 16,
  },
  specTextContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  specValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#191d31',
  },
  specLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default PropertyDetailsSection; 