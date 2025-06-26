import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Linking, 
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useGlobalChat } from '../../context/ChatContext';

const PropertyOwnerSection = ({ property, onInquiryPress, isDark = false }) => {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { startNewConversation } = useGlobalChat();
  
  // Check if current user is the property owner
  const isOwner = isAuthenticated && user && property?.profiles_id === user?.id;
  
  // Extract owner/agent information
  const owner = property?.profiles || {};
  const agentName = owner?.firstname && owner?.lastname
    ? `${owner.firstname} ${owner.lastname}`
    : owner?.firstname || 'Property Agent';
  
  // Use profile photo if available, otherwise use a placeholder container
  const hasProfilePhoto = !!owner?.profile_photo;
  
  // Get contact info with fallbacks
  const phone = owner?.phone || '';
  const email = owner?.email || '';
  
  // Handle actions
  const handleCallPress = () => {
    if (!phone) return;
    
    const phoneUrl = Platform.OS === 'android' 
      ? `tel:${phone}` 
      : `telprompt:${phone}`;
      
    Linking.canOpenURL(phoneUrl)
      .then(supported => {
        if (supported) {
          Linking.openURL(phoneUrl);
        }
      })
      .catch(err => console.error('Error opening phone app:', err));
  };
  
  const handleWhatsAppPress = () => {
    if (!phone) return;
    
    const whatsappUrl = `whatsapp://send?phone=${phone.replace(/[^0-9]/g, '')}`;
    
    Linking.canOpenURL(whatsappUrl)
      .then(supported => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        } else {
          // Fallback to web WhatsApp
          return Linking.openURL(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`);
        }
      })
      .catch(err => console.error('Error opening WhatsApp:', err));
  };
  
  const handleChatPress = async () => {
    if (!isAuthenticated) {
      router.push('/sign-in');
      return;
    }
    
    if (!owner?.profiles_id || !property?.id) return;
    
    try {
      let conversation;
      
      // Check if startNewConversation function is available
      if (typeof startNewConversation === 'function') {
        // Start or retrieve a conversation with the owner about this property
        conversation = await startNewConversation(
          { profiles_id: owner.profiles_id },
          property.id
        );
      } else {
        // Fallback to direct navigation if the function is not available
        router.push({
          pathname: '/chat',
          params: { 
            userId: owner.profiles_id,
            userName: agentName,
            userAvatar: owner.profile_photo,
            propertyId: property.id,
            propertyTitle: property.title
          }
        });
        return;
      }
      
      if (conversation) {
        // Navigate to chat screen with the conversation
        router.push({
          pathname: '/chat',
          params: { 
            conversationId: conversation.id,
            userId: owner.profiles_id,
            userName: agentName,
            userAvatar: owner.profile_photo,
            propertyId: property.id,
            propertyTitle: property.title
          }
        });
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    }
  };
  
  const handleEmailPress = () => {
    if (!email) return;
    
    Linking.openURL(`mailto:${email}?subject=Regarding Property: ${property?.title || 'Property Inquiry'}`);
  };
  
  const handleInquiryPress = () => {
    if (!isAuthenticated) {
      router.push('/sign-in');
      return;
    }
    
    onInquiryPress();
  };
  
  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Contact Info</Text>
      
      {/* Agent Info */}
      <View style={styles.agentInfoContainer}>
        {hasProfilePhoto ? (
          <Image 
            source={{ uri: owner.profile_photo }} 
            style={styles.agentPhoto} 
          />
        ) : (
          <View style={[styles.agentPhoto, styles.agentPhotoFallback]}>
            <Text style={styles.agentPhotoInitial}>
              {agentName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.agentDetails}>
          <Text style={[styles.agentName, isDark && styles.darkText]}>{agentName}</Text>
          {email && <Text style={[styles.agentEmail, isDark && styles.darkSubText]}>{email}</Text>}
          {phone && <Text style={[styles.agentPhone, isDark && styles.darkSubText]}>{phone}</Text>}
        </View>
      </View>
      
      {/* Contact Options */}
      <View style={styles.contactOptions}>
        {phone && (
          <TouchableOpacity 
            style={[styles.contactButton, isDark && styles.darkContactButton]} 
            onPress={handleCallPress}
          >
            <Ionicons name="call" size={20} color="#3366FF" />
            <Text style={[styles.contactButtonText, isDark && styles.darkContactText]}>Call</Text>
          </TouchableOpacity>
        )}
        
        {phone && (
          <TouchableOpacity 
            style={[styles.contactButton, isDark && styles.darkContactButton]} 
            onPress={handleWhatsAppPress}
          >
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            <Text style={[styles.contactButtonText, isDark && styles.darkContactText]}>WhatsApp</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.contactButton, isDark && styles.darkContactButton]} 
          onPress={handleChatPress}
        >
          <Ionicons name="chatbubble-ellipses" size={20} color="#FF6B6B" />
          <Text style={[styles.contactButtonText, isDark && styles.darkContactText]}>Chat</Text>
        </TouchableOpacity>
        
        {email && (
          <TouchableOpacity 
            style={[styles.contactButton, isDark && styles.darkContactButton]} 
            onPress={handleEmailPress}
          >
            <Ionicons name="mail" size={20} color="#FFA500" />
            <Text style={[styles.contactButtonText, isDark && styles.darkContactText]}>Email</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Inquiry Button */}
      <TouchableOpacity 
        style={styles.inquiryButton}
        onPress={handleInquiryPress}
      >
        <Text style={styles.inquiryButtonText}>
          Submit Inquiry
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  darkContainer: {
    backgroundColor: '#2A2A2A',
    shadowColor: '#000',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#191d31',
    marginBottom: 16,
  },
  darkText: {
    color: '#FFF',
  },
  darkSubText: {
    color: '#CCC',
  },
  agentInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  agentPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
  },
  agentDetails: {
    marginLeft: 12,
    flex: 1,
  },
  agentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#191d31',
    marginBottom: 4,
  },
  agentEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  agentPhone: {
    fontSize: 14,
    color: '#666',
  },
  contactOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingVertical: 12,
    width: '48%',
    marginBottom: 8,
  },
  darkContactButton: {
    backgroundColor: '#333',
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  darkContactText: {
    color: '#FFF',
  },
  inquiryButton: {
    backgroundColor: '#3366FF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inquiryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  agentPhotoFallback: {
    backgroundColor: '#3366FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentPhotoInitial: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#D3D3D3',
  },
});

export default PropertyOwnerSection; 