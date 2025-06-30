import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
  Modal,
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useTheme, THEMES } from '../../context/ThemeContext';
import SwipeWrapper from '../../components/common/SwipeWrapper';
import { checkNotificationPermissions, requestNotificationPermissions } from '../../utils/notificationUtils';

const SettingItem = ({
  icon,
  title,
  onPress,
  showSwitch = false,
  switchValue = false,
  onSwitchChange,
  textColor = '#333',
  isDark = false
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.settingItem, isDark && styles.darkSettingItem]}
    disabled={showSwitch}
  >
    <View style={styles.settingLeft}>
      <Ionicons name={icon} size={24} color={textColor === '#333' ? '#666' : textColor} />
      <Text style={[styles.settingText, { color: textColor }]}>{title}</Text>
    </View>
    {showSwitch ? (
      <Switch
        value={switchValue}
        onValueChange={onSwitchChange}
        trackColor={{ false: '#767577', true: '#0061FF' }}
        thumbColor={switchValue ? '#fff' : '#f4f3f4'}
      />
    ) : (
      <Ionicons name="chevron-forward" size={24} color="#CCC" />
    )}
  </TouchableOpacity>
);

export default function Profile() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const { unreadCount, permissionStatus, requestNotificationPermissions } = useNotification();
  const { theme, setTheme, isDark } = useTheme();
  const [notificationSettings, setNotificationSettings] = useState({
    pushNotifications: true,
    smsNotifications: false,
    promotionalOffers: true,
    securityAlerts: true
  });
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    const initComponent = async () => {
      await loadSettings();
      setIsLoading(false);
    };
    
    initComponent();
  }, []);

  // Add effect to log user information for debugging
  useEffect(() => {
    console.log("Auth state in Profile:", { isAuthenticated, user: user ? "User exists" : "No user" });
  }, [isAuthenticated, user]);

  // Add a useEffect to update notificationSettings when permissionStatus changes
  useEffect(() => {
    if (permissionStatus === 'granted' && notificationSettings) {
      // When permissions are granted, make sure push notifications are enabled
      if (!notificationSettings.pushNotifications) {
        const updatedSettings = {
          ...notificationSettings,
          pushNotifications: true
        };
        setNotificationSettings(updatedSettings);
        AsyncStorage.setItem('notificationSettings', JSON.stringify(updatedSettings))
          .catch(error => console.error('Error saving notification settings:', error));
      }
    }
  }, [permissionStatus, notificationSettings]);

  const loadSettings = async () => {
    try {
      const savedNotifications = await AsyncStorage.getItem('notificationSettings');
      
      if (savedNotifications !== null) {
        setNotificationSettings(JSON.parse(savedNotifications));
      }
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (authLoading || isLoading) return "Loading...";
    if (!user) return "Guest";
    
    if (user.profile && (user.profile.firstname || user.profile.lastname)) {
      return `${user.profile.firstname || ''} ${user.profile.lastname || ''}`.trim();
    }
    
    if (user.firstname || user.lastname) {
      return `${user.firstname || ''} ${user.lastname || ''}`.trim();
    }
    
    return user.email ? user.email.split('@')[0] : "Guest";
  };
  
  // Get user email
  const getUserEmail = () => {
    if (authLoading || isLoading) return "";
    if (!user) return "";
    
    if (user.profile && user.profile.email) {
      return user.profile.email;
    }
    
    return user.email || "";
  };
  
  // Get user profile image
  const getUserProfileImage = () => {
    if (authLoading || isLoading) return "https://ui-avatars.com/api/?name=Loading&background=0061FF&color=fff&size=150&rounded=true";
    if (!user) return "https://ui-avatars.com/api/?name=Guest&background=0061FF&color=fff&size=150&rounded=true";
    
    if (user.profile && user.profile.profile_photo) {
      return user.profile.profile_photo;
    }
    
    if (user.profile_photo) {
      return user.profile_photo;
    }
    
    return `https://ui-avatars.com/api/?name=${getUserDisplayName()}&background=0061FF&color=fff&size=150&rounded=true`;
  };

  const handleProfileImagePress = async () => {
    if (!isAuthenticated) {
      router.push('/sign-in');
      return;
    }
    // Authenticated: open full-screen modal to view image
    setShowImageModal(true);
  };

  const handleNotificationToggle = async (key) => {
    try {
      // Special handling for push notifications
      if (key === 'pushNotifications') {
        // If trying to enable push notifications
        if (!notificationSettings.pushNotifications) {
          // Use the requestNotificationPermissions from NotificationContext instead of the imported util
          try {
            // First, let's try to request permissions using the context method
            await requestNotificationPermissions();
            
            // Check the permission status from the context
            if (permissionStatus !== 'granted') {
              Alert.alert(
                "Permission Required",
                "Push notifications require permission. Please enable notifications for this app in your device settings.",
                [{ text: "OK" }]
              );
              return;
            }
          } catch (error) {
            console.error('Error requesting notification permissions:', error);
            Alert.alert(
              "Permission Error",
              "There was an issue requesting notification permissions. Please try again or check your device settings.",
              [{ text: "OK" }]
            );
            return;
          }
        }
      }
      
      // Continue with normal toggle logic
      const updatedSettings = {
        ...notificationSettings,
        [key]: !notificationSettings[key]
      };
      
      setNotificationSettings(updatedSettings);
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error toggling notification setting:', error);
    }
  };

  const handleDarkModeToggle = (value) => {
    setTheme(value ? THEMES.DARK : THEMES.LIGHT);
  };

  const handleLogout = () => {
    if (!isAuthenticated) {
      router.push('/sign-in');
      return;
    }
    
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              
              // Call the logout function from auth context
              const result = await logout();
              console.log("Logout result:", result);
              
              /*
               * Reset the navigation stack before redirecting.  This guarantees
               * that we exit the nested "(tabs)" navigator and land on the
               * root Welcome screen (app/index.js), regardless of the current
               * depth or timing of auth-state updates.
               */
              try {
                // Clear any intermediate routes that may still be in history
                if (router.canDismiss()) {
                  router.dismissAll();
                }
              } catch (_) {
                // noop – router.canDismiss might not be available on very old
                // Expo Router versions, but replace('/') below will still work
              }

              // Finally navigate to the Sign-In screen
              router.replace('/sign-in');
            } catch (error) {
              console.error("Logout error:", error);
              Alert.alert(
                "Error", 
                "Failed to logout properly. Please restart the app to ensure you're fully logged out."
              );
            } finally {
              setIsLoggingOut(false);
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  return (
    <SwipeWrapper tabIndex={3}>
      <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
        <Stack.Screen
          options={{
            headerTitle: 'Profile',
            headerRight: () => (
              <TouchableOpacity
                onPress={() => {
                  if (isAuthenticated) {
                    router.push('/notifications');
                  } else {
                    Alert.alert(
                      "Login Required",
                      "Please sign in to view your notifications.",
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Sign In", onPress: () => router.push('/sign-in') }
                      ]
                    );
                  }
                }}
                style={styles.headerButton}
              >
                <Ionicons name="notifications-outline" size={24} color={isDark ? "#FFF" : "#333"} />
                {isAuthenticated && unreadCount > 0 && <View style={styles.notificationBadge} />}
              </TouchableOpacity>
            ),
            headerStyle: {
              backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5',
            },
            headerShadowVisible: false,
            headerTitleStyle: {
              color: isDark ? '#FFF' : '#333',
            },
          }}
        />

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            {(authLoading || isLoading) ? (
              // Loading indicator
              <View style={styles.loadingContainer}>
                <Text style={[styles.loadingText, isDark && { color: '#CCC' }]}>Loading profile...</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity onPress={handleProfileImagePress} style={styles.imageContainer}>
                  <Image source={{ uri: getUserProfileImage() }} style={styles.profileImage} />
                  {!isAuthenticated && (
                    <View style={styles.signInIconContainer}>
                      <Ionicons name="log-in" size={20} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={[styles.userName, isDark && styles.darkText]}>{getUserDisplayName()}</Text>
                {isAuthenticated ? (
                  <Text style={[styles.userEmail, isDark && { color: '#CCC' }]}>{getUserEmail()}</Text>
                ) : (
                  <Text style={[styles.userEmail, { color: '#0061FF' }]}>Tap to sign in</Text>
                )}
              </>
            )}
          </View>

          {/* Settings Sections */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Account Settings</Text>
            <SettingItem 
              icon="person-outline" 
              title="Edit Profile" 
              onPress={() => {
                if (isAuthenticated) {
                  router.push('/edit-profile');
                } else {
                  Alert.alert(
                    "Login Required",
                    "Please sign in to edit your profile.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Sign In", onPress: () => router.push('/sign-in') }
                    ]
                  );
                }
              }} 
              textColor={isDark ? '#FFF' : '#333'} 
              isDark={isDark}
            />
            <SettingItem 
              icon="card-outline" 
              title="Payment Methods" 
              onPress={() => {
                if (isAuthenticated) {
                  router.push('/payment-methods');
                } else {
                  Alert.alert(
                    "Login Required",
                    "Please sign in to manage your payment methods.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Sign In", onPress: () => router.push('/sign-in') }
                    ]
                  );
                }
              }} 
              textColor={isDark ? '#FFF' : '#333'} 
              isDark={isDark}
            />
            <SettingItem 
              icon="bookmark-outline" 
              title="Favorite Properties" 
              onPress={() => {
                if (isAuthenticated) {
                  router.push('/saved-properties');
                } else {
                  Alert.alert(
                    "Login Required",
                    "Please sign in to view your favorite properties.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Sign In", onPress: () => router.push('/sign-in') }
                    ]
                  );
                }
              }} 
              textColor={isDark ? '#FFF' : '#333'} 
              isDark={isDark}
            />
            <SettingItem 
              icon="home-outline" 
              title="My Properties" 
              onPress={() => {
                if (isAuthenticated) {
                  router.push('/my-properties');
                } else {
                  Alert.alert(
                    "Login Required",
                    "Please sign in to view your properties.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Sign In", onPress: () => router.push('/sign-in') }
                    ]
                  );
                }
              }} 
              textColor={isDark ? '#FFF' : '#333'} 
              isDark={isDark}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Preferences</Text>
            <SettingItem
              icon="moon-outline"
              title="Dark Mode"
              showSwitch={true}
              switchValue={isDark}
              onSwitchChange={handleDarkModeToggle}
              textColor={isDark ? '#FFF' : '#333'}
              isDark={isDark}
            />
            <SettingItem
              icon="notifications-outline"
              title="Push Notifications"
              showSwitch={true}
              switchValue={isAuthenticated ? notificationSettings.pushNotifications : false}
              onSwitchChange={() => {
                if (isAuthenticated) {
                  handleNotificationToggle('pushNotifications');
                } else {
                  Alert.alert(
                    "Login Required",
                    "Please sign in to manage notification settings.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Sign In", onPress: () => router.push('/sign-in') }
                    ]
                  );
                }
              }}
              textColor={isDark ? '#FFF' : '#333'}
              isDark={isDark}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Help & Support</Text>
            <SettingItem 
              icon="help-circle-outline" 
              title="FAQs" 
              onPress={() => router.push('/faqs')} 
              textColor={isDark ? '#FFF' : '#333'} 
              isDark={isDark}
            />
            <SettingItem 
              icon="chatbubble-outline" 
              title="Contact Us" 
              onPress={() => router.push('/contact')} 
              textColor={isDark ? '#FFF' : '#333'} 
              isDark={isDark}
            />
            <SettingItem 
              icon="shield-outline" 
              title="Privacy Policy" 
              onPress={() => router.push('/privacy')} 
              textColor={isDark ? '#FFF' : '#333'} 
              isDark={isDark}
            />
            <SettingItem 
              icon="document-text-outline" 
              title="Terms of Service" 
              onPress={() => router.push('/terms')} 
              textColor={isDark ? '#FFF' : '#333'} 
              isDark={isDark}
            />
          </View>

          <TouchableOpacity 
            style={[styles.logoutButton, isDark && styles.darkLogoutButton, isLoggingOut && styles.logoutButtonDisabled]} 
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <Text style={styles.logoutText}>Logging out...</Text>
            ) : (
              <>
                <Ionicons name="log-out-outline" size={24} color="#FF4949" />
                <Text style={styles.logoutText}>{isAuthenticated ? "Logout" : "Sign In"}</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Full screen image modal */}
        <Modal visible={showImageModal} transparent={true} animationType="fade">
          <View style={styles.modalContainer}>
            <Pressable style={styles.modalBackground} onPress={() => setShowImageModal(false)} />
            <Image source={{ uri: getUserProfileImage() }} style={styles.modalImage} />
            <Pressable style={styles.modalCloseButton} onPress={() => setShowImageModal(false)}>
              <Ionicons name="close" size={32} color="#FFF" />
            </Pressable>
          </View>
        </Modal>
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
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  imageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#0061FF',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#0061FF',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  darkText: {
    color: '#FFF',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    marginBottom: 8,
    borderRadius: 8,
  },
  darkSettingItem: {
    backgroundColor: '#2A2A2A',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 32,
    marginBottom: 24,
    marginHorizontal: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
  },
  darkLogoutButton: {
    backgroundColor: '#2A2A2A',
  },
  logoutButtonDisabled: {
    backgroundColor: '#CCC',
  },
  logoutText: {
    fontSize: 16,
    color: '#FF4949',
    marginLeft: 8,
    fontWeight: '500',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
    width: '100%',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'black',
    opacity: 0.5,
  },
  modalImage: {
    width: '80%',
    height: '80%',
    borderRadius: 10,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 