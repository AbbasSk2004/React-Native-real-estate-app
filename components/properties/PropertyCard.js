import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import FavoriteButton from '../common/FavoriteButton';
import { PROPERTY_TYPE_FIELDS, CARD_FIELD_ICONS } from '../../utils/propertyTypeFields';
import { endpoints } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getPropertyAnalytics } from '../../services/analyticsService';
import favoriteEvents from '../../utils/favoriteEvents';

export default function PropertyCard({ property, onPress, style, featuredStyle = false, listView = false, isDark = false, onDelete, onFeature }) {
  const { isAuthenticated } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [views, setViews] = useState(0);
  
  // Fetch favourite status once we know the user and property id
  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      if (!isAuthenticated || !property?.id) return;
      try {
        const resp = await endpoints.properties.checkFavoriteStatus(property.id);
        if (isMounted) {
          setIsFavorite(resp === true || resp?.isFavorited === true);
        }
      } catch (err) {
        // Silent fail – we'll default to false
      }
    };
    fetchStatus();
    return () => { isMounted = false; };
  }, [isAuthenticated, property?.id]);

  // Fetch view count
  useEffect(() => {
    let isMounted = true;
    const fetchViews = async () => {
      if (!property?.id) return;
      try {
        const analytics = await getPropertyAnalytics(property.id);
        if (isMounted && analytics?.data?.views) {
          setViews(analytics.data.views);
        }
      } catch (err) {
        console.error('Error fetching views:', err);
      }
    };
    fetchViews();
    return () => { isMounted = false; };
  }, [property?.id]);
  
  // Format price display
  const formatPrice = (price) => {
    if (!price) return '$0';
    return `$${price.toLocaleString()}`;
  };
  
  // Get the image URL from the property data
  const propertyImage = property.main_image 
    ? { uri: property.main_image }
    : { uri: 'https://via.placeholder.com/300x200/EAEAEA/999999?text=No+Image' };
    
  // Keep all instances of PropertyCard in sync by broadcasting any change
  // and listening for changes from other instances.

  // Emit helper
  const broadcastFavorite = (status) => {
    if (!property?.id) return;
    favoriteEvents.emit('favoriteToggled', {
      propertyId: property.id,
      isFavorite: status,
    });
  };

  // Subscribe to favorite changes from other cards
  useEffect(() => {
    const handler = ({ propertyId, isFavorite: status }) => {
      if (propertyId === property.id) {
        setIsFavorite(status);
      }
    };
    favoriteEvents.on('favoriteToggled', handler);
    return () => favoriteEvents.off('favoriteToggled', handler);
  }, [property?.id]);

  const toggleFavorite = async () => {
    if (!isAuthenticated || favLoading || !property?.id) return;

    // Optimistically update UI
    const newStatus = !isFavorite;
    setIsFavorite(newStatus);
    broadcastFavorite(newStatus);
    setFavLoading(true);

    try {
      if (newStatus) {
        await endpoints.properties.addToFavorites(property.id);
      } else {
        await endpoints.properties.removeFromFavorites(property.id);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      // Edge-case: backend might return 5xx for meaningless duplicates. Verify real status.
      try {
        const statusResp = await endpoints.properties.checkFavoriteStatus(property.id);
        const realStatus = statusResp === true || statusResp?.isFavorited === true;
        setIsFavorite(realStatus);
        broadcastFavorite(realStatus);
      } catch (statusErr) {
        // If we still can't determine, revert optimistic update
        setIsFavorite(!newStatus);
        broadcastFavorite(!newStatus);
      }
    } finally {
      setFavLoading(false);
    }
  };

  // Format location string
  const location = `${property.city || ''}${property.governate ? `, ${property.governate}` : ''}`;
  
  // Get property type fields
  const propertyType = property.property_type || 'Apartment';
  const typeConfig = PROPERTY_TYPE_FIELDS[propertyType] || PROPERTY_TYPE_FIELDS['Apartment'];
  const cardFields = typeConfig.cardFields || ['bedrooms', 'bathrooms', 'area'];
  
  // Determine property status and color
  const statusRaw = (property.status || '').toString().toLowerCase();
  let statusText = 'For Sale';
  if (statusRaw.includes('rent')) {
    statusText = 'For Rent';
  } else if (statusRaw.includes('sale')) {
    statusText = 'For Sale';
  } else if (property.status) {
    // Fallback to whatever backend sent
    statusText = property.status;
  }
  const statusColor = statusText === 'For Rent' ? '#FF6B00' : '#0061FF';
  
  // Helper function to render spec item based on field type
  const renderSpecItem = (field, isFeatureStyle = false) => {
    let iconName = 'help-circle-outline';
    let value = null;
    let unit = '';
    
    // Map field names to actual property schema field names if needed
    const fieldMapping = {
      'bedrooms': 'bedrooms',
      'bathrooms': 'bathrooms',
      'area': 'area',
      'parkingSpaces': 'parking_spaces',
      'meetingRooms': 'meeting_rooms',
      'shopFrontWidth': 'shop_front_width',
      'storageArea': 'storage_area',
      'floors': 'floor', // In schema it's singular 'floor' not 'floors'
      'units': 'units',
      'plotSize': 'plot_size',
      'landType': 'land_type',
      'ceilingHeight': 'ceiling_height',
      'loadingDocks': 'loading_docks',
      'waterSource': 'water_source',
      'cropTypes': 'crop_types'
    };
    
    // Get the actual field name from the mapping
    const actualField = fieldMapping[field] || field;
    
    // Get the value using the actual field name
    value = property[actualField];
    
    // Set default value if null or undefined
    if (value === null || value === undefined) {
      value = 0;
    }
    
    // Set icon and format value based on field type
    switch (field) {
      case 'bedrooms':
        iconName = 'bed-outline';
        break;
      case 'bathrooms':
        iconName = 'water-outline';
        break;
      case 'area':
        iconName = 'resize-outline';
        value = `${value} m²`;
        break;
      case 'parkingSpaces':
      case 'parking_spaces':
        iconName = 'car-outline';
        break;
      case 'meetingRooms':
      case 'meeting_rooms':
        iconName = 'business-outline';
        break;
      case 'shopFrontWidth':
      case 'shop_front_width':
        iconName = 'storefront-outline';
        value = `${value} m`;
        break;
      case 'storageArea':
      case 'storage_area':
        iconName = 'cube-outline';
        value = `${value} m²`;
        break;
      case 'floors':
      case 'floor':
        iconName = 'layers-outline';
        break;
      case 'units':
        iconName = 'home-outline';
        break;
      case 'plotSize':
      case 'plot_size':
        iconName = 'map-outline';
        value = `${value} m²`;
        break;
      case 'landType':
      case 'land_type':
        iconName = 'earth-outline';
        break;
      case 'ceilingHeight':
      case 'ceiling_height':
        iconName = 'arrow-up-outline';
        value = `${value} m`;
        break;
      case 'loadingDocks':
      case 'loading_docks':
        iconName = 'boat-outline';
        break;
      case 'waterSource':
      case 'water_source':
        iconName = 'water-outline';
        break;
      case 'cropTypes':
      case 'crop_types':
        iconName = 'leaf-outline';
        break;
      default:
        iconName = 'information-circle-outline';
    }
    
    return (
      <View style={isFeatureStyle ? styles.featuredSpecItem : styles.specItem} key={field}>
        <Ionicons name={iconName} size={isFeatureStyle ? 16 : 14} color={isFeatureStyle ? "#fff" : "#191d31"} />
        <Text style={isFeatureStyle ? styles.featuredSpecText : styles.specText}>
          {value}
        </Text>
      </View>
    );
  };
    
  if (featuredStyle) {
    return (
      <TouchableOpacity 
        style={[styles.featuredContainer, style]}
        onPress={onPress}
      >
        <Image 
          source={propertyImage}
          style={styles.featuredImage}
          resizeMode="cover"
        />
        <View style={styles.featuredGradient} />
        
        <View style={styles.viewsContainer}>
          <Ionicons name="eye-outline" size={18} color="#0061FF" />
          <Text style={styles.viewsText}>{views}</Text>
        </View>
        
        {isAuthenticated && (
          <FavoriteButton 
            isFavorite={isFavorite}
            onPress={toggleFavorite}
            disabled={favLoading}
          />
        )}
        
        <View style={styles.featuredDetailsContainer}>
          <View style={styles.featuredTitleRow}>
            <Text style={styles.featuredTitle} numberOfLines={1}>{property.title}</Text>
            <Text style={[styles.featuredStatus, { color: statusColor }]}>{statusText}</Text>
          </View>
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={16} color="#fff" style={styles.locationIcon} />
            <Text style={styles.featuredLocation} numberOfLines={1}>{location}</Text>
          </View>
          
          <View style={styles.featuredSpecsRow}>
            {cardFields.map(field => renderSpecItem(field, true))}
          </View>
          
          <View style={styles.featuredPriceRow}>
            <Text style={styles.featuredPrice}>{formatPrice(property.price)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
  
  // List view layout (horizontal card)
  if (listView) {
    return (
      <TouchableOpacity 
        style={[styles.listContainer, style]}
        onPress={onPress}
      >
        <View style={styles.listImageContainer}>
          <Image 
            source={propertyImage}
            style={styles.listImage}
            resizeMode="cover"
          />
          
          <View style={styles.viewsContainer}>
            <Ionicons name="eye-outline" size={16} color="#0061FF" />
            <Text style={styles.viewsText}>{views}</Text>
          </View>
        </View>
        
        <View style={styles.listDetailsContainer}>
          <View>
            <Text style={styles.listTitle} numberOfLines={1}>
              {property?.title && property.title.trim().length > 0
                ? property.title
                : `Beautiful ${property.property_type || 'Property'}`}
            </Text>
            {/* Status below title */}
            <Text style={[styles.statusInline, { color: statusColor }]}>{statusText}</Text>
            
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={14} color="#666876" style={styles.locationIcon} />
              <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
            </View>
          </View>
          
          <View style={styles.listBottomContainer}>
            <View style={styles.listSpecsContainer}>
              {cardFields.map(field => renderSpecItem(field))}
            </View>
            
            <Text style={styles.price}>{formatPrice(property.price)}</Text>
          </View>
        </View>
        
        {isAuthenticated && (
          <FavoriteButton 
            isFavorite={isFavorite}
            onPress={toggleFavorite}
            disabled={favLoading}
          />
        )}
      </TouchableOpacity>
    );
  }
  
  // Default grid view layout
  return (
    <TouchableOpacity
      style={[
        styles.card,
        featuredStyle && styles.featuredCard,
        listView && styles.listViewCard,
        isDark && styles.darkCard,
        style
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Property Image */}
      <View style={styles.imageContainer}>
        <Image source={propertyImage} style={styles.image} />
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      </View>

      {/* Property Details */}
      <View style={[styles.contentContainer, isDark && styles.darkContentContainer]}>
        {/* Title Row with inline favorite button */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, isDark && styles.darkText]} numberOfLines={1}>
            {property.title || `Beautiful ${property.property_type || 'Property'}`}
          </Text>

          <View style={styles.actionIcons}>
            <FavoriteButton
              isFavorite={isFavorite}
              onPress={toggleFavorite}
              loading={favLoading}
              style={[styles.inlineFavoriteButton, styles.actionIcon]}
              isAuthenticated={isAuthenticated}
            />

            {property.is_featured ? (
              <Ionicons name="star" size={20} color="#FFB100" style={styles.actionIcon} />
            ) : (
              onFeature && (
                <TouchableOpacity onPress={onFeature} style={[styles.actionIcon, styles.featureButton]}>
                  <Ionicons name="star-outline" size={16} color="#FFB100" />
                  <Text style={styles.featureText}>Get Featured</Text>
                </TouchableOpacity>
              )
            )}

            {onDelete && (
              <TouchableOpacity onPress={onDelete} style={styles.actionIcon}>
                <Ionicons name="trash-outline" size={20} color="#FF4949" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Price Container placed below title */}
        <View style={styles.priceContainer}>
          <Text style={[styles.price, isDark && styles.darkText]}>{formatPrice(property.price)}</Text>
          {property.monthly_payment > 0 && (
            <Text style={[styles.priceMonth, isDark && styles.darkSubText]}>
              ${property.monthly_payment}/mo
            </Text>
          )}
        </View>

        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={14} color={isDark ? '#AAA' : "#666"} />
          <Text style={[styles.locationText, isDark && styles.darkSubText]} numberOfLines={1}>
            {location || 'Location not available'}
          </Text>
        </View>

        <View style={styles.specsContainer}>
          {cardFields.map((field, index) => (
            <View key={`${field}-${index}`} style={styles.specItem}>
              {renderSpecItem(field, featuredStyle)}
            </View>
          ))}
        </View>

        <View style={styles.agentContainer}>
          <Text style={[styles.viewsCount, isDark && styles.darkSubText]}>
            <Ionicons name="eye-outline" size={12} color={isDark ? '#AAA' : "#666"} /> {views} views
          </Text>
          {property.created_at && (
            <Text style={[styles.postedDate, isDark && styles.darkSubText]}>
              {new Date(property.created_at).toLocaleDateString('en-US', {
                month: 'short', 
                day: 'numeric'
              })}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  darkCard: {
    backgroundColor: '#2A2A2A',
  },
  featuredCard: {
    width: 280,
    marginRight: 16,
  },
  listViewCard: {
    flexDirection: 'row',
    height: 140,
  },
  imageContainer: {
    position: 'relative',
    height: 180,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  contentContainer: {
    padding: 16,
  },
  darkContentContainer: {
    backgroundColor: '#2A2A2A',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#191d31',
    marginRight: 8,
  },
  darkText: {
    color: '#FFF',
  },
  priceMonth: {
    fontSize: 14,
    color: '#666',
  },
  darkSubText: {
    color: '#AAA',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 25,
    fontWeight: '700',
    color: '#191d31',
    flex: 1,
    marginRight: 8,
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    marginLeft: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  specsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  specItem: {
    marginRight: 16,
  },
  specItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  specIcon: {
    marginRight: 4,
  },
  specText: {
    fontSize: 14,
    color: '#666',
  },
  agentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewsCount: {
    fontSize: 12,
    color: '#666',
  },
  postedDate: {
    fontSize: 12,
    color: '#666',
  },
  featuredContainer: {
    width: 240,
    height: 320,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  featuredImage: {
    width: '100%', 
    height: '100%',
    borderRadius: 16,
  },
  featuredGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  viewsContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    top: 12,
    left: 12,
    zIndex: 10,
  },
  viewsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0061FF',
    marginLeft: 2,
  },
  featuredDetailsContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  locationIcon: {
    marginRight: 4,
  },
  featuredLocation: {
    fontSize: 14,
    color: '#fff',
  },
  featuredSpecsRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  featuredSpecItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  featuredSpecText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 4,
  },
  featuredPriceRow: {
    marginTop: 12,
  },
  featuredPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  featuredTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  featuredStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  listContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
    flexDirection: 'row',
    height: 130,
    position: 'relative',
  },
  listImageContainer: {
    position: 'relative',
    width: 120,
  },
  listImage: {
    height: '100%',
    width: '100%',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  listDetailsContainer: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  statusInline: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  listBottomContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  listSpecsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FFB100',
    borderRadius: 16,
  },
  featureText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#FFB100',
    fontWeight: '600',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#191d31',
  },
  inlineFavoriteButton: {
    position: 'relative',
    top: 0,
    right: 0,
  },
}); 