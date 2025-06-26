import React, { useState, useRef } from 'react';
import { 
  View, 
  Image, 
  StyleSheet, 
  FlatList, 
  Dimensions, 
  TouchableOpacity, 
  Modal, 
  StatusBar,
  Animated,
  Text
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const PropertyImageGallery = ({ images = [] }) => {
  const [showGallery, setShowGallery] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);
  const modalFlatListRef = useRef(null);
  
  // Default image if no images are provided
  const defaultImage = { uri: 'https://via.placeholder.com/800x600/EAEAEA/999999?text=No+Image+Available' };
  
  // Use provided images or fallback to default
  const imageData = images && images.length > 0 
    ? images.map(img => typeof img === 'string' ? { uri: img } : img) 
    : [defaultImage];

  const handleViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const handleSlideChange = (index) => {
    setActiveIndex(index);
    if (modalFlatListRef.current) {
      modalFlatListRef.current.scrollToIndex({ index, animated: true });
    }
    if (flatListRef.current && !showGallery) {
      flatListRef.current.scrollToIndex({ index, animated: true });
    }
  };

  const renderPagination = () => {
    return (
      <View style={styles.paginationContainer}>
        {imageData.map((_, index) => (
          <View 
            key={index} 
            style={[
              styles.paginationDot, 
              activeIndex === index && styles.paginationDotActive
            ]} 
          />
        ))}
      </View>
    );
  };

  const renderItem = ({ item, index }) => (
    <TouchableOpacity 
      activeOpacity={0.9}
      onPress={() => {
        setActiveIndex(index);
        setShowGallery(true);
      }}
      style={styles.imageItemContainer}
    >
      <Image 
        source={item} 
        style={styles.image}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  const renderGalleryItem = ({ item }) => (
    <View style={styles.galleryItemContainer}>
      <Image 
        source={item} 
        style={styles.galleryImage}
        resizeMode="contain"
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={imageData}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={renderItem}
        keyExtractor={(_, index) => `image-${index}`}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        initialScrollIndex={0}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />
      
      {renderPagination()}
      
      {/* Image counter badge */}
      <View style={styles.imageCounterContainer}>
        <Ionicons name="images-outline" size={16} color="#fff" />
        <Text style={styles.imageCounterText}>
          {activeIndex + 1}/{imageData.length}
        </Text>
      </View>

      {/* Fullscreen Gallery Modal */}
      <Modal
        visible={showGallery}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setShowGallery(false)}
      >
        <View style={styles.galleryContainer}>
          <StatusBar hidden />
          
          {/* Close button */}
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setShowGallery(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          
          {/* Image counter */}
          <View style={styles.galleryCounter}>
            <Text style={styles.galleryCounterText}>
              {activeIndex + 1}/{imageData.length}
            </Text>
          </View>
          
          <FlatList
            ref={modalFlatListRef}
            data={imageData}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            renderItem={renderGalleryItem}
            keyExtractor={(_, index) => `gallery-image-${index}`}
            initialScrollIndex={activeIndex}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            onViewableItemsChanged={handleViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          />
          
          {/* Navigation arrows */}
          {activeIndex > 0 && (
            <TouchableOpacity 
              style={[styles.navButton, styles.leftNavButton]}
              onPress={() => handleSlideChange(activeIndex - 1)}
            >
              <Ionicons name="chevron-back" size={30} color="#fff" />
            </TouchableOpacity>
          )}
          
          {activeIndex < imageData.length - 1 && (
            <TouchableOpacity 
              style={[styles.navButton, styles.rightNavButton]}
              onPress={() => handleSlideChange(activeIndex + 1)}
            >
              <Ionicons name="chevron-forward" size={30} color="#fff" />
            </TouchableOpacity>
          )}
          
          {renderPagination()}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    height: 250,
    width: '100%',
    backgroundColor: '#f0f0f0',
  },
  imageItemContainer: {
    width,
    height: 250,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#fff',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  imageCounterContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageCounterText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '600',
    fontSize: 14,
  },
  galleryContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  galleryItemContainer: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryCounter: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  galleryCounterText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  leftNavButton: {
    left: 16,
  },
  rightNavButton: {
    right: 16,
  },
});

export default PropertyImageGallery; 