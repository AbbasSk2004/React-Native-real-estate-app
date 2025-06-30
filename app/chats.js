import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import {
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Alert,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDebounce } from '../hooks/useDebounce';
import { ThemedView, ThemedText } from '../components/common/ThemedView';
import { chatService } from '../services/chat.service';

export default function ChatsList() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { isDark, getThemeColors } = useTheme();
  const colors = getThemeColors();
  const { 
    conversations, 
    loadingConversations,
    fetchConversations,
    setActiveConversationId,
    searchQuery,
    setSearchQuery,
    searchResults,
    handleSearch,
    startNewConversation,
    deleteChatHistory
  } = useGlobalChat();
  
  const [filteredChats, setFilteredChats] = useState([]);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);
  
  // Initial data fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
    }
  }, [isAuthenticated]);
  
  // Filter conversations based on search query
  useEffect(() => {
    if (debouncedSearchQuery.trim() === '') {
      const sorted = [...conversations].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      setFilteredChats(sorted);
    } else {
      const filtered = conversations.filter(chat => {
        const otherParticipant = getOtherParticipant(chat);
        const fullName = `${otherParticipant?.firstname || ''} ${otherParticipant?.lastname || ''}`.toLowerCase();
        return fullName.includes(debouncedSearchQuery.toLowerCase());
      });
      const sortedFiltered = filtered.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      setFilteredChats(sortedFiltered);
    }
  }, [debouncedSearchQuery, conversations]);
  
  // Get the other participant in the conversation
  const getOtherParticipant = (conversation) => {
    if (!conversation) return null;
    if (!conversation.participant1 || !conversation.participant2) return null;
    
    // Use the participant that is not the current user
    return conversation.participant1_id === user?.id 
      ? conversation.participant2 
      : conversation.participant1;
  };
  
  // Format timestamp to relative time
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const messageDate = new Date(timestamp);
    const diffInSeconds = Math.floor((now - messageDate) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${minutes === 1 ? 'min' : 'mins'}`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      if (days === 1) {
        return 'Yesterday';
      } else if (days < 7) {
        return `${days} days`;
      } else {
        return messageDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      }
    }
  };
  
  // Determine if a user is online.
  // NOTE: Replace this with a proper presence-tracking solution once available.
  const isUserOnline = (participant) => {
    // If the backend provides a real-time presence flag, use it here.
    // Fallback to false to avoid random flicker in the UI.
    return !!participant?.is_online;
  };
  
  // Navigate to individual chat
  const handleChatPress = (chat) => {
    // Set active conversation in context
    setActiveConversationId(chat.id);
    
    const otherParticipant = getOtherParticipant(chat);
    
    const isOnline = isUserOnline(otherParticipant);
    
    router.push({
      pathname: '/chat',
      params: { 
        conversationId: chat.id,
        userId: otherParticipant?.profiles_id,
        userName: `${otherParticipant?.firstname || ''} ${otherParticipant?.lastname || ''}`.trim(),
        userAvatar: otherParticipant?.profile_photo,
        propertyId: chat.property_id,
        propertyTitle: chat.property?.title,
        isOnline: isOnline ? 'true' : 'false'
      }
    });
  };
  
  // Calculate unread messages count
  const getUnreadCount = (conversation) => {
    if (!conversation || !conversation.messages) return 0;
    
    return conversation.messages.filter(msg => 
      !msg.read && msg.sender_id !== user?.id
    ).length;
  };
  
  // Delete conversation with confirmation
  const handleDeleteConversation = (conversationId) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteChatHistory(conversationId) }
      ]
    );
  };
  
  // Handle pull-to-refresh
  const handleRefresh = async () => {
    if (!isAuthenticated) return;
    setRefreshing(true);
    try {
      // Clear caches so that fresh data is fetched
      chatService.clearAllCache?.();
      await fetchConversations({ silent: true, force: true });
    } catch (error) {
      console.error('Error refreshing conversations:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // Memoized chat item component to prevent unnecessary re-renders
  const formatRelativeTimestamp = (ts) => {
    if (!ts) return '';
    const now = new Date();
    const messageDate = new Date(ts);
    const diffInSeconds = Math.floor((now - messageDate) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${minutes === 1 ? 'min' : 'mins'}`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
    }
    const days = Math.floor(diffInSeconds / 86400);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days`;
    return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const ChatItem = React.memo(({ chat, currentUserId, onPress, onLongPress }) => {
    if (!chat) return null;

    const isUserOnline = (participant) => !!participant?.is_online;

    const otherParticipant = !chat.participant1 || !chat.participant2
      ? null
      : (chat.participant1_id === currentUserId ? chat.participant2 : chat.participant1);

    if (!otherParticipant) return null;

    const userName = `${otherParticipant.firstname || ''} ${otherParticipant.lastname || ''}`.trim();
    const userAvatar = otherParticipant.profile_photo;

    const lastMessage = chat.last_message?.content || 'Start a conversation';
    const timestamp = chat.last_message?.created_at || chat.updated_at;

    const unreadCount = Array.isArray(chat.messages)
      ? chat.messages.filter((msg) => !msg.read && msg.sender_id !== currentUserId).length
      : 0;

    const isOnline = isUserOnline(otherParticipant);

    return (
      <TouchableOpacity
        style={[styles.chatItem, { borderBottomColor: colors.border }]}
        activeOpacity={0.7}
        onPress={() => onPress(chat)}
        onLongPress={() => onLongPress(chat.id)}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: userAvatar || 'https://via.placeholder.com/100x100' }}
            style={styles.avatar}
          />
          {isOnline && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <ThemedText style={styles.userName}>{userName || 'User'}</ThemedText>
            <ThemedText style={styles.timestamp} color={colors.textMuted}>{formatRelativeTimestamp(timestamp)}</ThemedText>
          </View>

          <View style={styles.chatFooter}>
            <ThemedText
              style={[styles.lastMessage, unreadCount > 0 && styles.unreadMessage]}
              color={unreadCount > 0 ? colors.text : colors.textSecondary}
              numberOfLines={1}
            >
              {lastMessage}
            </ThemedText>

            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  });

  // Stable renderItem using useCallback
  const renderChatItem = useCallback(({ item }) => (
    <ChatItem 
      chat={item} 
      currentUserId={user?.id} 
      onPress={handleChatPress} 
      onLongPress={handleDeleteConversation}
    />
  ), [user?.id]);

  // Stable key extractor
  const keyExtractor = useCallback((item) => item.id.toString(), []);

  if (!isAuthenticated) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen 
          options={{
            headerShown: false,
          }} 
        />
        
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed-outline" size={64} color={colors.textMuted} />
          <ThemedText style={styles.emptyStateTitle}>Authentication Required</ThemedText>
          <ThemedText style={styles.emptyStateMessage} color={colors.textSecondary}>
            Please sign in to view your chats
          </ThemedText>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/sign-in')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: false,
        }} 
      />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <ThemedText style={styles.headerTitle}>Chats</ThemedText>
        
        <TouchableOpacity style={styles.optionsButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      {/* Search Bar */}
      <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search for users"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
            clearButtonMode="while-editing"
          />
        </View>
      </View>
      
      {/* Chats List */}
      {filteredChats.length > 0 ? (
        <FlatList
          data={filteredChats}
          renderItem={renderChatItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.chatsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      ) : !loadingConversations ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color={colors.textMuted} />
          <ThemedText style={styles.emptyStateTitle}>No chats found</ThemedText>
          <ThemedText style={styles.emptyStateMessage} color={colors.textSecondary}>
            {searchQuery.trim() !== '' 
              ? `No users matching "${searchQuery}"`
              : "Your messages will appear here"
            }
          </ThemedText>
        </View>
      ) : null}

      {/* Overlay loader shown during background refresh */}
      {loadingConversations && !refreshing && (
        <View style={styles.overlayLoader} pointerEvents="none">
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  optionsButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    paddingVertical: 0,
  },
  chatsList: {
    paddingVertical: 8,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    backgroundColor: '#4CAF50',
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: '#0061FF',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    textAlign: 'center',
  },
  overlayLoader: {
    position: 'absolute',
    top: 80, // below header & search bar
    alignSelf: 'center',
  },
  signInButton: {
    backgroundColor: '#0061FF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  }
}); 