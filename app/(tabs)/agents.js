import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Linking,
    Alert,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { endpoints } from '../../services/api';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import SwipeWrapper from '../../components/common/SwipeWrapper';
import { useTheme } from '../../context/ThemeContext';

export default function Agents() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { unreadCount } = useNotification();
  const { isDark } = useTheme();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError(null);
      const response = await endpoints.agents.getAll();
      if (response.data?.success && Array.isArray(response.data.data)) {
        setAgents(response.data.data);
      } else {
        setError('Failed to load agents');
      }
    } catch (err) {
      console.error('Error fetching agents:', err);
      if (err.message?.includes('Network') || err.type === 'network_error') {
        setError('Network connection error. Please check your internet connection and try again.');
      } else {
        setError('An error occurred while loading agents');
      }
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const handleChatPress = () => {
    router.push('/chat');
  };

  const handleNotificationPress = () => {
    router.push('/notifications');
  };

  const handleAgentPress = (agentId) => {
    router.push({
      pathname: '/agentDetails',
      params: { id: agentId }
    });
  };

  const handleBecomeAgentPress = () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Login Required",
        "You need to be logged in to apply as an agent.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => router.push('/sign-in') }
        ]
      );
    } else {
      router.push('/agent-application');
    }
  };

  const openSocialLink = (url) => {
    if (url) {
      Linking.openURL(url).catch(err => console.error('Error opening URL:', err));
    }
  };

  const openWhatsApp = (phone) => {
    if (phone) {
      // Remove any non-numeric characters
      const cleanPhone = phone.replace(/\D/g, '');
      Linking.openURL(`https://wa.me/${cleanPhone}`).catch(err => 
        console.error('Error opening WhatsApp:', err)
      );
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAgents(false);
    setRefreshing(false);
  };

  const getFullName = (agent) => {
    if (agent.profiles) {
      const firstName = agent.profiles.firstname || '';
      const lastName = agent.profiles.lastname || '';
      if (firstName || lastName) {
        return `${firstName} ${lastName}`.trim();
      }
    }
    return 'Agent';
  };

  const renderAgentCard = ({ item }) => {
    const fullName = getFullName(item);
    const profileImage = item.image || item.profiles?.profile_photo || 'https://via.placeholder.com/60x60';
    
    return (
      <View style={[styles.agentCard, isDark && styles.darkAgentCard]}>
        <TouchableOpacity
          onPress={() => handleAgentPress(item.id)}
          style={styles.agentCardContent}
        >
          <Image 
            source={{ uri: profileImage }} 
            style={styles.agentImage}
          />
          <View style={styles.agentInfo}>
            <Text style={[styles.agentName, isDark && styles.darkText]}>{fullName}</Text>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="briefcase-outline" size={16} color="#0061FF" />
                <Text style={[styles.statLabel, isDark && styles.darkStatLabel]}>Specialty:</Text>
                <Text style={[styles.statText, isDark && styles.darkStatText]}>{item.specialty || 'Real Estate Agent'}</Text>
              </View>
            </View>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="time-outline" size={16} color="#0061FF" />
                <Text style={[styles.statLabel, isDark && styles.darkStatLabel]}>Experience:</Text>
                <Text style={[styles.statText, isDark && styles.darkStatText]}>{item.experience || 'Experienced Agent'} year</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.socialContainer}>
          {item.phone && (
            <TouchableOpacity 
              style={[styles.socialButton, styles.whatsappButton]}
              onPress={() => openWhatsApp(item.phone)}
            >
              <FontAwesome name="whatsapp" size={18} color="#fff" />
              <Text style={styles.socialButtonText}>WhatsApp</Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.socialIconsContainer}>
            {item.facebook_url && (
              <TouchableOpacity 
                style={[styles.socialIcon, isDark && styles.darkSocialIcon]}
                onPress={() => openSocialLink(item.facebook_url)}
              >
                <FontAwesome name="facebook" size={18} color="#3b5998" />
              </TouchableOpacity>
            )}
            
            {item.twitter_url && (
              <TouchableOpacity 
                style={[styles.socialIcon, isDark && styles.darkSocialIcon]}
                onPress={() => openSocialLink(item.twitter_url)}
              >
                <FontAwesome name="twitter" size={18} color="#1DA1F2" />
              </TouchableOpacity>
            )}
            
            {item.instagram_url && (
              <TouchableOpacity 
                style={[styles.socialIcon, isDark && styles.darkSocialIcon]}
                onPress={() => openSocialLink(item.instagram_url)}
              >
                <FontAwesome name="instagram" size={18} color="#C13584" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0061FF" />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={isDark ? "#CCC" : "#666"} />
          <Text style={[styles.errorTitle, isDark && styles.darkText]}>Oops!</Text>
          <Text style={[styles.errorText, isDark && styles.darkSubText]}>{error}</Text>
        </View>
      );
    }

    if (agents.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="people-outline" size={48} color={isDark ? "#CCC" : "#666"} />
          <Text style={[styles.errorTitle, isDark && styles.darkText]}>No Agents Found</Text>
          <Text style={[styles.errorText, isDark && styles.darkSubText]}>There are no agents available at the moment.</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={agents}
        renderItem={renderAgentCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.agentsList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#0061FF"]}
            tintColor="#0061FF"
          />
        }
      />
    );
  };

  return (
    <SwipeWrapper tabIndex={2}>
      <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
        <Stack.Screen
          options={{
            headerTitle: 'Our Agents',
            headerRight: () => (
              <TouchableOpacity
                onPress={() => router.push('/notifications')}
                style={styles.headerButton}
              >
                <Ionicons name="notifications-outline" size={24} color={isDark ? "#FFF" : "#333"} />
                {unreadCount > 0 && <View style={styles.notificationBadge} />}
              </TouchableOpacity>
            ),
          }}
        />
        
        <View style={styles.header}>
          <Text style={[styles.subtitle, isDark && styles.darkSubText]}>Find the perfect agent to help with your real estate needs</Text>
        </View>
        
        {renderContent()}
        
        <TouchableOpacity 
          style={[styles.becomeAgentButton, isDark && styles.darkBecomeAgentButton]} 
          onPress={handleBecomeAgentPress}
        >
          <Text style={styles.becomeAgentText}>Become an Agent</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </SwipeWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  darkContainer: {
    backgroundColor: '#1A1A1A',
  },
  header: {
    padding: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 16,
  },
  darkSubText: {
    color: '#CCC',
  },
  darkText: {
    color: '#FFF',
  },
  agentsList: {
    padding: 16,
  },
  agentCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  darkAgentCard: {
    backgroundColor: '#2A2A2A',
  },
  agentCardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  agentImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  statsContainer: {
    marginTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  darkStatLabel: {
    color: '#AAA',
  },
  statText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginLeft: 4,
  },
  darkStatText: {
    color: '#DDD',
  },
  socialContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    padding: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 50,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  socialButtonText: {
    color: '#FFF',
    marginLeft: 6,
    fontWeight: '500',
  },
  socialIconsContainer: {
    flexDirection: 'row',
  },
  socialIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  darkSocialIcon: {
    backgroundColor: '#333',
  },
  headerButton: {
    marginRight: 16,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5E5E',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  becomeAgentButton: {
    backgroundColor: '#0061FF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    position: 'absolute',
    bottom: 24,
    right: 24,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  darkBecomeAgentButton: {
    backgroundColor: '#0061FF',
  },
  becomeAgentText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 