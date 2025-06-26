import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import React from 'react';

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const flatListRef = useRef(null);
  const { isAuthenticated, user } = useAuth();
  const { isDark } = useTheme();
  
  const { 
    messages, 
    loadingMessages, 
    sendMessage: sendMessageToServer,
    setActiveConversationId,
    markMessagesAsRead,
    fetchMessages
  } = useGlobalChat();
  
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  // Extract params
  const conversationId = params.conversationId;
  const contactName = params.userName || 'Property Agent';
  const contactAvatar = params.userAvatar || 'https://via.placeholder.com/100x100';
  const isOnline = params.isOnline === 'true';
  const propertyTitle = params.propertyTitle;
  
  // Track the previous message count to detect new messages
  const prevMessagesLengthRef = useRef(0);
  // Track if initial scroll has been performed
  const initialScrollPerformedRef = useRef(false);
  
  // Helper to handle automatic scrolling when content size changes
  const onContentSizeChange = () => {
    if (!messages || messages.length === 0) return;

    // First load (initial) ⇒ jump without animation
    if (!initialScrollPerformedRef.current) {
      flatListRef.current?.scrollToEnd({ animated: false });
      initialScrollPerformedRef.current = true;
      prevMessagesLengthRef.current = messages.length;
      return;
    }

    // New messages received ⇒ smooth scroll
    if (messages.length > prevMessagesLengthRef.current) {
      flatListRef.current?.scrollToEnd({ animated: true });
      prevMessagesLengthRef.current = messages.length;
    }
  };
  
  // Set active conversation in context
  useEffect(() => {
    if (conversationId && isAuthenticated) {
      setActiveConversationId(conversationId);
      
      // Mark messages as read
      markMessagesAsRead(conversationId);
    }
  }, [conversationId, isAuthenticated]);
  
  // Force refresh on mount and every 3 seconds
  useEffect(() => {
    const refreshMessages = async () => {
      if (!conversationId || !isAuthenticated) return;
      
      try {
        // First fetch messages to get any new ones
        await fetchMessages(conversationId, true);
        // Then mark them as read
        await markMessagesAsRead(conversationId);
      } catch (error) {
        console.error('Error refreshing messages:', error);
      }
    };
    
    // Initial fetch
    refreshMessages();
    
    // Set up interval for periodic refresh
    const refreshInterval = setInterval(() => {
      refreshMessages();
    }, 3000);
    
    // Clean up
    return () => {
      clearInterval(refreshInterval);
    };
  }, [conversationId, isAuthenticated, markMessagesAsRead, fetchMessages]);
  
  const sendMessage = async () => {
    if (newMessage.trim().length === 0 || !conversationId) return;
    
    try {
      const messageContent = newMessage.trim();
      setNewMessage(''); // Clear input immediately
      setSending(true);
      await sendMessageToServer(messageContent, conversationId);
      
      // Scroll to bottom after sending a message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message if failed
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };
  
  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const messageDate = new Date(timestamp);
    return messageDate.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  // Message bubble component with memo for performance
  const MessageBubble = React.memo(({ message }) => {
    // Ensure message has all required properties
    if (!message || !message.content) {
      return null;
    }
    
    const isMe = message.sender_id === user?.id;
    const status = message.pending ? 'sent' : (message.read ? 'read' : 'delivered');
    
    return (
      <View style={[
        styles.messageBubbleContainer, 
        isMe ? styles.myMessageContainer : styles.theirMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isMe ? styles.myMessage : styles.theirMessage,
          isDark && isMe ? styles.darkMyMessage : isDark && styles.darkTheirMessage
        ]}>
          <Text style={[
            styles.messageText,
            isMe ? styles.myMessageText : styles.theirMessageText,
            isDark && isMe ? styles.darkMyMessageText : isDark && styles.darkTheirMessageText
          ]}>
            {message.content}
          </Text>
        </View>
        
        <View style={[
          styles.messageTimeContainer,
          isMe ? styles.myMessageTimeContainer : styles.theirMessageTimeContainer
        ]}>
          <Text style={[styles.messageTime, isDark && styles.darkMessageTime]}>
            {formatTime(message.created_at)}
          </Text>
          {isMe && (
            <View style={styles.statusContainer}>
              {status === 'sent' && (
                <Ionicons name="checkmark" size={14} color={isDark ? "#999" : "#666876"} />
              )}
              {status === 'delivered' && (
                <View style={styles.doubleCheckContainer}>
                  <Ionicons name="checkmark" size={14} color={isDark ? "#999" : "#666876"} />
                  <Ionicons name="checkmark" size={14} color={isDark ? "#999" : "#666876"} style={styles.secondCheckmark} />
                </View>
              )}
              {status === 'read' && (
                <View style={styles.doubleCheckContainer}>
                  <Ionicons name="checkmark" size={14} color="#0061FF" />
                  <Ionicons name="checkmark" size={14} color="#0061FF" style={styles.secondCheckmark} />
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  });
  
  // Date header component with memo for performance  
  const DateHeader = React.memo(({ date }) => (
    <View style={styles.dateHeaderContainer}>
      <View style={styles.dateHeader}>
        <Text style={[styles.dateHeaderText, isDark && styles.darkDateHeaderText]}>{date}</Text>
      </View>
    </View>
  ));

  // Show authentication required view if not logged in
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
        <Stack.Screen
          options={{
            headerTitle: 'Chat',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                <Ionicons name="arrow-back" size={24} color={isDark ? "#FFF" : "#333"} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.authRequiredContainer}>
          <Ionicons name="lock-closed-outline" size={64} color={isDark ? "#444" : "#ccc"} />
          <Text style={[styles.authRequiredTitle, isDark && styles.darkText]}>Login Required</Text>
          <Text style={[styles.authRequiredMessage, isDark && styles.darkSubText]}>
            Please sign in to view and send messages.
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

  // If we don't have a conversation ID, show error/empty state
  if (!conversationId) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
        <Stack.Screen
          options={{
            headerTitle: 'Chat',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                <Ionicons name="arrow-back" size={24} color={isDark ? "#FFF" : "#333"} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.noConversationContainer}>
          <Ionicons name="chatbubble-outline" size={64} color={isDark ? "#444" : "#ccc"} />
          <Text style={[styles.noConversationTitle, isDark && styles.darkText]}>No Conversation Selected</Text>
          <Text style={[styles.noConversationMessage, isDark && styles.darkSubText]}>
            Please select a conversation to view messages.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <Image source={{ uri: contactAvatar }} style={styles.contactAvatar} />
              <View style={styles.headerTextContainer}>
                <Text style={[styles.contactName, isDark && styles.darkText]} numberOfLines={1}>{contactName}</Text>
                {isOnline ? (
                  <Text style={styles.onlineStatus}>Online</Text>
                ) : propertyTitle ? (
                  <Text style={[styles.propertyTitle, isDark && styles.darkSubText]} numberOfLines={1}>{propertyTitle}</Text>
                ) : null}
              </View>
            </View>
          ),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color={isDark ? "#FFF" : "#333"} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages List */}
        {loadingMessages && (!messages || messages.length === 0) ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0061FF" />
            <Text style={[styles.loadingText, isDark && styles.darkSubText]}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => `${item.id}-${item.pending ? 'pending' : 'sent'}`}
            contentContainerStyle={styles.messagesContainer}
            onContentSizeChange={onContentSizeChange}
            renderItem={({ item }) => <MessageBubble message={item} />}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, isDark && styles.darkSubText]}>No messages yet. Start the conversation!</Text>
              </View>
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
        
        {/* Message Input */}
        <View style={[styles.inputContainer, isDark && styles.darkInputContainer]}>
          <TextInput
            style={[styles.textInput, isDark && styles.darkTextInput]}
            placeholder="Type your message..."
            placeholderTextColor={isDark ? "#999" : "#999"}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            onSubmitEditing={sendMessage}
            editable={!sending}
          />
          <TouchableOpacity 
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending) && styles.disabledSendButton 
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 8,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubText: {
    color: '#AAAAAA',
  },
  onlineStatus: {
    fontSize: 12,
    color: '#4CAF50',
  },
  propertyTitle: {
    fontSize: 12,
    color: '#666',
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubbleContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  theirMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
  },
  myMessage: {
    backgroundColor: '#0061FF',
    borderTopRightRadius: 2,
  },
  theirMessage: {
    backgroundColor: '#F0F2F5',
    borderTopLeftRadius: 2,
  },
  darkMyMessage: {
    backgroundColor: '#0061FF',
  },
  darkTheirMessage: {
    backgroundColor: '#2A2A2A',
  },
  messageText: {
    fontSize: 16,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  theirMessageText: {
    color: '#333333',
  },
  darkMyMessageText: {
    color: '#FFFFFF',
  },
  darkTheirMessageText: {
    color: '#FFFFFF',
  },
  messageTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  myMessageTimeContainer: {
    justifyContent: 'flex-end',
  },
  theirMessageTimeContainer: {
    justifyContent: 'flex-start',
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
  },
  darkMessageTime: {
    color: '#777',
  },
  statusContainer: {
    marginLeft: 4,
    flexDirection: 'row',
  },
  doubleCheckContainer: {
    flexDirection: 'row',
  },
  secondCheckmark: {
    marginLeft: -8,
  },
  dateHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
  },
  dateHeader: {
    backgroundColor: '#F0F2F5',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  dateHeaderText: {
    fontSize: 12,
    color: '#666',
  },
  darkDateHeaderText: {
    color: '#CCC',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  darkInputContainer: {
    borderTopColor: '#333',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F0F2F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    color: '#333',
    maxHeight: 120,
  },
  darkTextInput: {
    backgroundColor: '#2A2A2A',
    color: '#FFF',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0061FF',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  disabledSendButton: {
    backgroundColor: '#CCE0FF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
  authRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authRequiredTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  authRequiredMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  signInButton: {
    backgroundColor: '#0061FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noConversationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noConversationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  noConversationMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
}); 