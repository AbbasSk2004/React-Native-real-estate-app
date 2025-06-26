import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import {
    Alert,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import { 
  getNotificationIcon, 
  getNotificationColor, 
  formatRelativeTime,
  NOTIFICATION_TYPES
} from '../utils/notificationUtils';

export default function Notifications() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  
  // Using global NotificationContext instead of local hook to keep badge in sync
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    permissionStatus,
    requestNotificationPermissions
  } = useNotification();
  
  // Mark all notifications as read when leaving the screen
  useEffect(() => {
    // When component unmounts, mark all notifications as read
    return () => {
      if (isAuthenticated && unreadCount > 0) {
        markAllAsRead();
      }
    };
  }, [isAuthenticated, unreadCount, markAllAsRead]);
  
  // Handle trash icon press to delete all notifications
  const handleDeleteAllPress = () => {
    Alert.alert(
      "Delete All Notifications",
      "Are you sure you want to delete all notifications? This cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete All",
          style: "destructive",
          onPress: () => {
            clearAllNotifications();
          }
        }
      ]
    );
  };
  
  // Handle notification press
  const handleNotificationPress = (notification) => {
    // Mark as read if unread
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Navigate based on notification type and data
    if (notification.data && notification.data.action_url) {
      router.push(notification.data.action_url);
      return;
    }
    
    // Default navigation based on type
    switch (notification.type) {
      case NOTIFICATION_TYPES.FAVORITE_ADDED:
      case NOTIFICATION_TYPES.NEW_LISTING:
      case NOTIFICATION_TYPES.PRICE_CHANGE:
      case NOTIFICATION_TYPES.PROPERTY_APPROVED:
      case NOTIFICATION_TYPES.PROPERTY_REJECTED:
        if (notification.data && notification.data.property_id) {
          router.push(`/propertyDetails?id=${notification.data.property_id}`);
        } else {
          router.push('/properties');
        }
        break;
      case NOTIFICATION_TYPES.MESSAGE:
        if (notification.data && notification.data.conversation_id) {
          router.push(`/chat?id=${notification.data.conversation_id}`);
        } else {
          router.push('/chat');
        }
        break;
      case NOTIFICATION_TYPES.APPOINTMENT:
        router.push('/appointments');
        break;
      case NOTIFICATION_TYPES.PROPERTY_INQUIRY:
        if (notification.data && notification.data.property_id) {
          router.push(`/propertyDetails?id=${notification.data.property_id}&tab=inquiries`);
        } else {
          router.push('/inquiries');
        }
        break;
      case NOTIFICATION_TYPES.TESTIMONIAL_APPROVED:
        router.push('/profile?tab=testimonials');
        break;
      case NOTIFICATION_TYPES.AGENT_APPLICATION_APPROVED:
      case NOTIFICATION_TYPES.AGENT_APPLICATION_REJECTED:
        router.push('/profile?tab=agent');
        break;
      default:
        router.push('/profile');
    }
  };
  
  // Handle long press to show options
  const handleNotificationLongPress = (notification) => {
    Alert.alert(
      'Notification Options',
      'What would you like to do?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: notification.read ? 'Mark as Unread' : 'Mark as Read',
          onPress: () => toggleReadStatus(notification.id, notification.read),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteNotification(notification.id),
        },
      ]
    );
  };
  
  // Toggle read status
  const toggleReadStatus = async (id, currentReadStatus) => {
    if (currentReadStatus) {
      // Currently we don't have a backend endpoint to mark as unread
      // This would need to be implemented in the backend
      Alert.alert('Feature not available', 'Marking as unread is not supported yet.');
    } else {
      await markAsRead(id);
    }
  };
  
  // Handle refresh - fetch fresh notifications from server
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };
  
  // Fetch notifications when component mounts
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Handle permission request button press
  const handleRequestPermissions = () => {
    requestNotificationPermissions();
  };

  // Render notification item
  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleNotificationPress(item)}
      onLongPress={() => handleNotificationLongPress(item)}
      style={[
        styles.notificationItem,
        item.read ? styles.readNotification : styles.unreadNotification,
        isDark && item.read ? styles.darkReadNotification : isDark && styles.darkUnreadNotification
      ]}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        {/* Notification Icon/Avatar */}
        <View style={styles.iconContainer}>
          {item.data?.sender_avatar ? (
            <Image 
              source={{ uri: item.data.sender_avatar }} 
              style={styles.avatar}
            />
          ) : (
            <View style={[
              styles.iconBackground,
              { backgroundColor: getNotificationColor(item.type) }
            ]}>
              <Ionicons 
                name={getNotificationIcon(item.type)} 
                size={20} 
                color="#FFFFFF" 
              />
            </View>
          )}
        </View>

        {/* Notification Text */}
        <View style={styles.textContent}>
          <Text style={[
            styles.notificationTitle, 
            !item.read && styles.unreadText,
            isDark && styles.darkText
          ]} numberOfLines={1}>
            {item.title}
          </Text>
          
          <Text style={[
            styles.notificationMessage,
            isDark && styles.darkSubText
          ]} numberOfLines={2}>
            {item.message}
          </Text>
          
          <Text style={[styles.notificationTime, isDark && styles.darkSubText]}>
            {formatRelativeTime(item.created_at)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    // Only show permission request button on mobile platforms when permissions aren't granted
    const showPermissionButton = Platform.OS !== 'web' && permissionStatus !== 'granted';
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons 
          name="notifications-off-outline" 
          size={60} 
          color={isDark ? "#444" : "#ccc"} 
        />
        <Text style={[styles.emptyTitle, isDark && styles.darkText]}>No Notifications</Text>
        <Text style={[styles.emptyText, isDark && styles.darkSubText]}>
          You don't have any notifications yet. When you get notifications, they'll appear here.
        </Text>
        
        {showPermissionButton && (
          <TouchableOpacity 
            style={styles.permissionButton} 
            onPress={handleRequestPermissions}
          >
            <Text style={styles.permissionButtonText}>
              Enable Push Notifications
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#0061FF" />
      <Text style={[styles.loadingText, isDark && styles.darkSubText]}>Loading notifications...</Text>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
        <Stack.Screen options={{ 
          headerTitle: 'Notifications',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color={isDark ? "#FFF" : "#333"} />
            </TouchableOpacity>
          ),
        }} />
        <View style={styles.emptyContainer}>
          <Ionicons 
            name="lock-closed-outline" 
            size={60} 
            color={isDark ? "#444" : "#ccc"} 
          />
          <Text style={[styles.emptyTitle, isDark && styles.darkText]}>Login Required</Text>
          <Text style={[styles.emptyText, isDark && styles.darkSubText]}>
            Please sign in to view your notifications.
          </Text>
          <TouchableOpacity 
            style={styles.signInButton} 
            onPress={() => router.push('/sign-in')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <Stack.Screen options={{ 
        headerTitle: 'Notifications',
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={isDark ? "#FFF" : "#333"} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          notifications.length > 0 && (
            <TouchableOpacity onPress={handleDeleteAllPress} style={styles.headerButton}>
              <Ionicons name="trash-outline" size={24} color={isDark ? "#FFF" : "#333"} />
            </TouchableOpacity>
          )
        ),
      }} />
      
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#0061FF']}
            tintColor={isDark ? "#FFFFFF" : "#0061FF"}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 && styles.emptyListContent
        ]}
        ListEmptyComponent={loading ? renderLoading() : renderEmptyState()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  darkContainer: {
    backgroundColor: '#1A1A1A',
  },
  headerButton: {
    padding: 8,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationItem: {
    borderRadius: 12,
    marginVertical: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  readNotification: {
    backgroundColor: '#F8F8F8',
  },
  unreadNotification: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: '#0061FF',
  },
  darkReadNotification: {
    backgroundColor: '#222222',
  },
  darkUnreadNotification: {
    backgroundColor: '#2A2A2A',
    borderLeftWidth: 4,
    borderLeftColor: '#0061FF',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  iconBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: '700',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubText: {
    color: '#AAAAAA',
  },
  signInButton: {
    backgroundColor: '#0061FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionButton: {
    backgroundColor: '#0061FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 