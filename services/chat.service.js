import api from './api';
import authStorage from '../utils/authStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;
const BATCH_SIZE = 20; // Number of messages to fetch per request
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const handleError = (error, retryCount = 0) => {
  console.error('Chat service error:', error);
  const shouldRetry = error.message?.includes('token expired') || 
                     error.message?.includes('network error');
  return {
    shouldRetry,
    retryCount: retryCount + 1
  };
};

// Add a safe JSON parsing function
const safeJSONParse = (jsonString) => {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('JSON parse error:', e);
    return null;
  }
};

const messageCache = new Map();
const conversationCache = new Map();

export const chatService = {
  async checkAuth() {
    // Try synchronous token first (web / memory)
    let accessToken = authStorage.getToken('access_token');

    // Fallback to AsyncStorage on React Native if not found
    if (!accessToken) {
      try {
        accessToken = await authStorage.getAccessToken();
      } catch (e) {
        // ignore – will be handled below
      }
    }

    if (!accessToken) {
      throw new Error('No access token available');
    }

    // Try synchronous user data
    let userData = authStorage.getUserData();

    // Fallback to AsyncStorage for user data if not found
    if (!userData) {
      try {
        const raw = await AsyncStorage.getItem('auth_user');
        if (raw) {
          userData = JSON.parse(raw);
        }
      } catch (e) {
        // ignore – handled below
      }
    }

    if (!userData) {
      throw new Error('Invalid user data');
    }

    return { user: userData, provider: 'backend' };
  },

  async fetchConversations(retryCount = 0) {
    try {
      const { user } = await this.checkAuth();
      if (!user) return [];

      // Check cache first
      const cachedData = conversationCache.get('conversations');
      if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
        return cachedData.conversations;
      }

      // Fetch fresh conversations from backend
      const response = await api.get('/chat/conversations');
      const conversations = response.data?.data || [];

      // Ensure all conversations have the required properties
      const sanitizedConversations = conversations.map(conv => ({
        ...conv,
        participant1: conv.participant1 || {},
        participant2: conv.participant2 || {},
        messages: conv.messages || [],
        property: conv.property || null
      }));

      // Cache the conversations
      conversationCache.set('conversations', {
        conversations: sanitizedConversations,
        timestamp: Date.now()
      });

      return sanitizedConversations;
    } catch (error) {
      const { shouldRetry, retryCount: newRetryCount } = handleError(error, retryCount);
      if (shouldRetry && newRetryCount <= MAX_RETRIES) {
        await sleep(RETRY_DELAY * newRetryCount);
        return this.fetchConversations(newRetryCount);
      }
      throw error;
    }
  },

  async fetchConversationById(conversationId, retryCount = 0) {
    try {
      const { user } = await this.checkAuth();
      if (!user || !conversationId) return null;

      // Try to get from cached conversations first
      const cachedData = conversationCache.get('conversations');
      if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
        const cachedConversation = cachedData.conversations.find(c => c.id === conversationId);
        if (cachedConversation) {
          return cachedConversation;
        }
      }

      // Fetch directly from API if not in cache
      const response = await api.get(`/chat/conversations/${conversationId}`);
      const conversation = response.data?.data;

      if (conversation) {
        // Update cache
        if (cachedData?.conversations) {
          const updatedConversations = cachedData.conversations.map(c => 
            c.id === conversation.id ? conversation : c
          );
          conversationCache.set('conversations', {
            conversations: updatedConversations,
            timestamp: Date.now()
          });
        }
        return conversation;
      }
      
      return null;
    } catch (error) {
      const { shouldRetry, retryCount: newRetryCount } = handleError(error, retryCount);
      if (shouldRetry && newRetryCount <= MAX_RETRIES) {
        await sleep(RETRY_DELAY * newRetryCount);
        return this.fetchConversationById(conversationId, newRetryCount);
      }
      throw error;
    }
  },

  async fetchMessages(conversationId, retryCount = 0) {
    try {
      const { user } = await this.checkAuth();
      if (!user) return [];

      // Use backend API
      const response = await api.get(`/chat/messages/${conversationId}`);
      const messages = response.data?.data || [];

      // Ensure all messages have required properties
      const sanitizedMessages = messages.map(msg => ({
        ...msg,
        sender: msg.sender || { profiles_id: msg.sender_id },
        content: msg.content || '',
        created_at: msg.created_at || new Date().toISOString(),
        read: !!msg.read
      }));

      // Update cache with fresh messages
      messageCache.set(conversationId, {
        messages: sanitizedMessages,
        timestamp: Date.now()
      });

      return sanitizedMessages;
    } catch (error) {
      const { shouldRetry, retryCount: newRetryCount } = handleError(error, retryCount);
      if (shouldRetry && newRetryCount <= MAX_RETRIES) {
        await sleep(RETRY_DELAY * newRetryCount);
        return this.fetchMessages(conversationId, newRetryCount);
      }
      throw error;
    }
  },

  async sendMessage(content, conversationId, retryCount = 0) {
    try {
      const { user } = await this.checkAuth();
      if (!user) return null;

      // Use backend API
      const response = await api.post('/chat/messages', {
        conversationId,
        content
      });
      const newMessage = response.data?.data;

      if (newMessage) {
        // Update message cache
        const cachedData = messageCache.get(conversationId);
        if (cachedData?.messages) {
          messageCache.set(conversationId, {
            messages: [...cachedData.messages, newMessage],
            timestamp: Date.now()
          });
        }

        // Update conversation cache
        const conversationsData = conversationCache.get('conversations');
        if (conversationsData?.conversations) {
          const updatedConversations = conversationsData.conversations.map(conv => {
            if (conv.id === conversationId) {
              return {
                ...conv,
                messages: [...(conv.messages || []), newMessage],
                updated_at: new Date().toISOString()
              };
            }
            return conv;
          });

          conversationCache.set('conversations', {
            conversations: updatedConversations,
            timestamp: Date.now()
          });
        }
      }

      return newMessage;
    } catch (error) {
      const { shouldRetry, retryCount: newRetryCount } = handleError(error, retryCount);
      if (shouldRetry && newRetryCount <= MAX_RETRIES) {
        await sleep(RETRY_DELAY * newRetryCount);
        return this.sendMessage(content, conversationId, newRetryCount);
      }
      throw error;
    }
  },

  async searchUsers(query, retryCount = 0) {
    try {
      const { user } = await this.checkAuth();
      if (!user) return [];

      const response = await api.get(`/chat/users/search?query=${encodeURIComponent(query)}`);
      return response.data?.data || [];
    } catch (error) {
      const { shouldRetry, retryCount: newRetryCount } = handleError(error, retryCount);
      if (shouldRetry && newRetryCount <= MAX_RETRIES) {
        await sleep(RETRY_DELAY * newRetryCount);
        return this.searchUsers(query, newRetryCount);
      }
      throw error;
    }
  },

  async startConversation(participant_id, property_id = null, retryCount = 0) {
    try {
      const { user } = await this.checkAuth();
      if (!user) {
        throw new Error('Authentication required');
      }

      if (!participant_id) {
        throw new Error('Participant ID is required');
      }

      // Prevent starting conversation with yourself
      if (participant_id === user.id) {
        throw new Error('Cannot create conversation with yourself');
      }

      // Use backend API
      const response = await api.post('/chat/conversations', {
        participant_id: participant_id,
        property_id: property_id || null
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to create conversation');
      }

      const newConversation = response.data?.data;

      if (!newConversation) {
        throw new Error('No conversation data received');
      }

      // Update conversation cache
      const cachedData = conversationCache.get('conversations');
      if (cachedData?.conversations) {
        // Check if conversation already exists in cache
        const exists = cachedData.conversations.some(conv => conv.id === newConversation.id);
        if (!exists) {
          conversationCache.set('conversations', {
            conversations: [newConversation, ...cachedData.conversations],
            timestamp: Date.now()
          });
        }
      }

      return newConversation;
    } catch (error) {
      console.error('Chat service error:', error);
      const { shouldRetry, retryCount: newRetryCount } = handleError(error, retryCount);
      if (shouldRetry && newRetryCount <= MAX_RETRIES) {
        await sleep(RETRY_DELAY * newRetryCount);
        return this.startConversation(participant_id, property_id, newRetryCount);
      }
      throw error;
    }
  },

  async markMessagesAsRead(conversationId, retryCount = 0) {
    try {
      const { user } = await this.checkAuth();
      if (!user) return;

      // Use backend API
      await api.put(`/chat/messages/read/${conversationId}`);
    } catch (error) {
      const { shouldRetry, retryCount: newRetryCount } = handleError(error, retryCount);
      if (shouldRetry && newRetryCount <= MAX_RETRIES) {
        await sleep(RETRY_DELAY * newRetryCount);
        return this.markMessagesAsRead(conversationId, newRetryCount);
      }
      throw error;
    }
  },

  async getUnreadCount(retryCount = 0) {
    try {
      const { user } = await this.checkAuth();
      if (!user) return 0;

      const response = await api.get('/chat/messages/unread/count');
      return response.data?.count || 0;
    } catch (error) {
      const { shouldRetry, retryCount: newRetryCount } = handleError(error, retryCount);
      if (shouldRetry && newRetryCount <= MAX_RETRIES) {
        await sleep(RETRY_DELAY * newRetryCount);
        return this.getUnreadCount(newRetryCount);
      }
      return 0;
    }
  },

  async deleteChatHistory(conversationId, retryCount = 0) {
    try {
      const { user } = await this.checkAuth();
      if (!user) return false;

      await api.delete(`/chat/conversations/${conversationId}`);
      this.clearConversationCache(conversationId);
      return true;
    } catch (error) {
      const { shouldRetry, retryCount: newRetryCount } = handleError(error, retryCount);
      if (shouldRetry && newRetryCount <= MAX_RETRIES) {
        await sleep(RETRY_DELAY * newRetryCount);
        return this.deleteChatHistory(conversationId, newRetryCount);
      }
      throw error;
    }
  },

  clearConversationCache(conversationId) {
    messageCache.delete(conversationId);
    conversationCache.delete('conversations');
  },

  clearAllCache() {
    messageCache.clear();
    conversationCache.clear();
  }
}; 