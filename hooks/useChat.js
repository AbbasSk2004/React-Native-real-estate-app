import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { chatService } from '../services/chat.service';
import { Alert, Platform } from 'react-native';

// Simple toast alternative function
const showNotification = (message, type = 'info') => {
  if (Platform.OS === 'web') {
    console.log(`[${type}]: ${message}`);
  } else {
    if (type === 'success') {
      Alert.alert('Success', message);
    } else if (type === 'error') {
      Alert.alert('Error', message);
    } else {
      Alert.alert('Notification', message);
    }
  }
};

export const useChat = () => {
  const { user, isAuthenticated, refreshToken } = useAuth();
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const fetchInProgress = useRef(false);
  const lastFetchTime = useRef(0);
  const MIN_FETCH_INTERVAL = 1000;
  const POLLING_INTERVAL = 3000;
  const CONVERSATION_POLLING_INTERVAL = 5000;

  // Clear any errors
  const clearError = () => setError(null);

  // Handle API errors
  const handleApiError = async (error) => {
    console.error('API Error:', error);
    if (error.message?.includes('token expired')) {
      try {
        await refreshToken();
        return true; // Indicate that we should retry the operation
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        setError('Session expired. Please sign in again.');
        return false;
      }
    }
    setError(error.message);
    return false;
  };

  // Mark messages as read
  const markMessagesAsRead = useCallback(async (conversationId) => {
    if (!isAuthenticated || !user) return;
    
    try {
      await chatService.markMessagesAsRead(conversationId);
      // Update the messages in state to mark them as read
      setMessages(prev => prev.map(msg => ({
        ...msg,
        read: msg.sender_id !== user.id ? true : msg.read
      })));
    } catch (err) {
      const shouldRetry = await handleApiError(err);
      if (shouldRetry) {
        return markMessagesAsRead(conversationId);
      }
    }
  }, [user, isAuthenticated, refreshToken]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId, force = false) => {
    if (!isAuthenticated || !user || !conversationId || (!force && fetchInProgress.current)) {
      return;
    }

    try {
      const now = Date.now();
      if (!force && now - lastFetchTime.current < MIN_FETCH_INTERVAL) {
        return;
      }

      fetchInProgress.current = true;
      setLoadingMessages(true);
      clearError();
      
      const data = await chatService.fetchMessages(conversationId);
      
      if (Array.isArray(data)) {
        // Avoid unnecessary re-renders: keep previous reference if nothing changed
        setMessages(prev => {
          if (prev.length === data.length && prev.every((msg, idx) => msg.id === data[idx].id && msg.read === data[idx].read)) {
            // No changes – return previous array reference so FlatList doesn't re-render
            return prev;
          }
          return data;
        });
      } else {
        setMessages([]);
      }

      lastFetchTime.current = Date.now();
    } catch (err) {
      console.error('Error fetching messages:', err);
      const shouldRetry = await handleApiError(err);
      if (shouldRetry) {
        return fetchMessages(conversationId, force);
      }
    } finally {
      fetchInProgress.current = false;
      setLoadingMessages(false);
    }
  }, [user, isAuthenticated, refreshToken]);

  // Handle active conversation change
  const handleSetActiveConversation = useCallback((conversation) => {
    if (conversation?.id !== activeConversation?.id) {
      console.log('Setting active conversation:', conversation?.id);
      setActiveConversation(conversation);
      setMessages([]); // Clear messages before loading new ones
      if (conversation) {
        fetchMessages(conversation.id, true); // Force fetch on conversation change
        // Mark messages as read when conversation becomes active
        markMessagesAsRead(conversation.id);
      }
    }
    // Check for new messages even if the conversation hasn't changed
    else if (conversation && conversation.id) {
      fetchMessages(conversation.id, true);
    }
  }, [activeConversation, fetchMessages, markMessagesAsRead]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated || !user || fetchInProgress.current) {
      return;
    }

    try {
      fetchInProgress.current = true;
      setLoadingConversations(true);
      clearError();
      
      const data = await chatService.fetchConversations();
      if (Array.isArray(data)) {
        setConversations(prev => {
          if (prev.length === data.length && prev.every((conv, idx) => conv.id === data[idx].id && conv.updated_at === data[idx].updated_at)) {
            return prev;
          }
          return data;
        });
        // Update active conversation if it exists
        if (activeConversation) {
          const updatedConv = data.find(conv => conv.id === activeConversation.id);
          if (updatedConv) {
            setActiveConversation(updatedConv);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      const shouldRetry = await handleApiError(err);
      if (shouldRetry) {
        return fetchConversations();
      }
    } finally {
      fetchInProgress.current = false;
      setLoadingConversations(false);
    }
  }, [user, isAuthenticated, activeConversation, refreshToken]);

  // Start polling when component mounts
  useEffect(() => {
    let pollTimer = null;
    let conversationsTimer = null;
    let isMounted = true;

    const startPolling = async () => {
      if (!isAuthenticated || !isMounted) return;

      try {
        // Initial fetch
        await fetchConversations();
        if (activeConversation?.id) {
          await fetchMessages(activeConversation.id, true);
        }

        // Clear existing timers before setting up new ones
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        
        if (conversationsTimer) {
          clearInterval(conversationsTimer);
          conversationsTimer = null;
        }

        // Set up polling timers
        if (activeConversation?.id) {
          pollTimer = setInterval(async () => {
            if (!fetchInProgress.current && isMounted) {
              // polling for messages
              await fetchMessages(activeConversation.id, true);
            }
          }, POLLING_INTERVAL);
        }

        // Always set up conversation polling, even if no active conversation
        conversationsTimer = setInterval(async () => {
          if (!fetchInProgress.current && isMounted) {
            // polling for conversations
            await fetchConversations();
            // Check if there are new messages in the active conversation
            if (activeConversation?.id) {
              const conversationData = await chatService.fetchConversationById(activeConversation.id);
              if (conversationData && conversationData.last_message) {
                // If we have a new last_message that isn't in our current messages, force a refresh
                const lastMessageId = conversationData.last_message.id;
                const messageExists = messagesRef.current.some(msg => msg.id === lastMessageId);
                if (!messageExists) {
                  await fetchMessages(activeConversation.id, true);
                }
              }
            }
          }
        }, CONVERSATION_POLLING_INTERVAL);
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    startPolling();

    return () => {
      isMounted = false;
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (conversationsTimer) {
        clearInterval(conversationsTimer);
        conversationsTimer = null;
      }
    };
  }, [isAuthenticated, activeConversation?.id, fetchConversations, fetchMessages]);

  // Delete chat history
  const deleteChatHistory = useCallback(async (conversationId) => {
    if (!isAuthenticated || !user) return;
    
    try {
      await chatService.deleteChatHistory(conversationId);
      // Remove the conversation from the list
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      // If this was the active conversation, clear it
      if (activeConversation?.id === conversationId) {
        handleSetActiveConversation(null);
      }
      showNotification('Chat history deleted successfully', 'success');
    } catch (err) {
      const shouldRetry = await handleApiError(err);
      if (shouldRetry) {
        return deleteChatHistory(conversationId);
      }
    }
  }, [user, isAuthenticated, activeConversation, handleSetActiveConversation, refreshToken]);

  // Handle search
  const handleSearch = useCallback(async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await chatService.searchUsers(query);
      setSearchResults(results);
    } catch (err) {
      const shouldRetry = await handleApiError(err);
      if (shouldRetry) {
        return handleSearch(e);
      }
    }
  }, [refreshToken]);

  // Start new conversation
  const startNewConversation = useCallback(async (otherUser, propertyId = null) => {
    try {
      const newConversation = await chatService.startConversation(otherUser.profiles_id, propertyId);
      if (newConversation) {
        setConversations(prev => {
          // Check if conversation already exists in the list
          const exists = prev.some(conv => conv.id === newConversation.id);
          if (!exists) {
            return [newConversation, ...prev];
          }
          return prev;
        });
        handleSetActiveConversation(newConversation);
        setSearchQuery('');
        setSearchResults([]);
        return newConversation;
      }
    } catch (err) {
      const shouldRetry = await handleApiError(err);
      if (shouldRetry) {
        return startNewConversation(otherUser, propertyId);
      }
      throw err;
    }
  }, [handleSetActiveConversation]);

  // Send message with optimistic update
  const sendMessage = useCallback(async (content, conversationId) => {
    if (!isAuthenticated || !user) {
      showNotification('Please sign in to send messages', 'error');
      return null;
    }
    
    try {
      const optimisticMessage = {
        id: 'temp-' + Date.now(),
        content,
        conversation_id: conversationId,
        sender_id: user.id,
        sender: {
          id: user.id,
          firstname: user.firstname,
          lastname: user.lastname,
          profile_photo: user.profile_photo
        },
        created_at: new Date().toISOString(),
        read: false,
        pending: true
      };

      setMessages(prev => [...prev, optimisticMessage]);

      const newMessage = await chatService.sendMessage(content, conversationId);
      
      if (newMessage) {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === optimisticMessage.id ? newMessage : msg
          )
        );
        
        // Immediate fetch after sending
        await fetchMessages(conversationId, true);
        await fetchConversations();
      }
      return newMessage;
    } catch (err) {
      setMessages(prev => prev.filter(msg => msg.id !== 'temp-' + Date.now()));
      const shouldRetry = await handleApiError(err);
      if (shouldRetry) {
        return sendMessage(content, conversationId);
      }
    }
  }, [user, isAuthenticated, fetchConversations, refreshToken, fetchMessages]);

  return {
    loadingConversations,
    loadingMessages,
    error,
    conversations,
    messages,
    activeConversation,
    searchQuery,
    searchResults,
    hasMoreMessages,
    showChat,
    setShowChat,
    handleSearch,
    startNewConversation,
    sendMessage,
    setActiveConversation: handleSetActiveConversation,
    setSearchQuery,
    setSearchResults,
    setError,
    deleteChatHistory,
    markMessagesAsRead,
    fetchConversations,
    fetchMessages,
    setMessages
  };
};