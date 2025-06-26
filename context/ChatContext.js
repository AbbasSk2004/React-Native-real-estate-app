import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useChat } from '../hooks/useChat';
import { useAuth } from './AuthContext';

const ChatContext = createContext({
  conversations: [],
  messages: [],
  loadingConversations: false,
  loadingMessages: false,
  error: null,
  activeConversationId: null,
  setActiveConversationId: () => {},
  fetchConversations: () => Promise.resolve([]),
  sendMessage: () => Promise.resolve({}),
  markMessagesAsRead: () => Promise.resolve(),
  setMessages: () => {}
});

export const useGlobalChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    console.warn('useGlobalChat must be used within a ChatProvider');
    // Return a fallback object to prevent crashes
    return {
      conversations: [],
      messages: [],
      loadingConversations: false,
      loadingMessages: false,
      error: null,
      activeConversationId: null,
      setActiveConversationId: () => {},
      fetchConversations: () => Promise.resolve([]),
      sendMessage: () => Promise.resolve({}),
      markMessagesAsRead: () => Promise.resolve(),
      setMessages: () => {}
    };
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const chatState = useChat();
  const { isAuthenticated } = useAuth();
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [error, setError] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Load initial conversations only once when authenticated
  useEffect(() => {
    if (isAuthenticated && !initialLoadComplete) {
      chatState.fetchConversations().then(() => {
        setInitialLoadComplete(true);
      }).catch(err => {
        console.error('Error fetching initial conversations:', err);
        setError(err.message || 'Failed to load conversations');
      });
    }
  }, [isAuthenticated, chatState]);

  // Load messages once when the active conversation changes.
  // Real-time updates are already handled inside useChat, so no interval is needed here.
  useEffect(() => {
    let isMounted = true;

    const loadMessages = async () => {
      if (!activeConversationId || !isAuthenticated) return;

      // Show the large spinner only if we have no messages yet.
      const showSpinner = chatState.messages.length === 0;
      if (showSpinner) setLoadingMessages(true);

      try {
        // useChat already sets messages and updates cache
        await chatState.fetchMessages(activeConversationId, true);
      } catch (error) {
        console.error('Error loading messages:', error);
        if (isMounted) {
          setError(error.message || 'Failed to load messages');
        }
      } finally {
        if (isMounted && showSpinner) {
          setLoadingMessages(false);
        }
      }
    };

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [activeConversationId, isAuthenticated]);

  // Handle active conversation change
  const handleSetActiveConversationId = useCallback((conversationId) => {
    setActiveConversationId(conversationId);
    setError(null);
    chatState.setMessages([]);
    
    // Use a more reliable approach with sequential fetching
    const updateConversation = async () => {
      try {
        await chatState.fetchConversations();
        await chatState.fetchMessages(conversationId, true);
        
        // Mark messages as read
        await chatState.markMessagesAsRead(conversationId);
      } catch (error) {
        console.error('Error updating conversation:', error);
        setError('Failed to load conversation');
      }
    };
    
    updateConversation();
  }, [chatState]);

  // Helper to start a new conversation safely
  const startNewConversation = useCallback(async (participant, propertyId = null) => {
    try {
      if (!isAuthenticated) {
        throw new Error('You must be signed in to start a conversation');
      }
      
      if (!participant || !participant.profiles_id) {
        throw new Error('Invalid participant information');
      }
      
      return await chatState.startNewConversation(participant, propertyId);
    } catch (error) {
      console.error('Error starting conversation:', error);
      setError(error.message || 'Failed to start conversation');
      throw error; // Re-throw to allow components to handle the error
    }
  }, [isAuthenticated, chatState]);

  const value = {
    ...chatState,
    isAuthenticated,
    initialLoadComplete,
    activeConversationId,
    error,
    setError,
    startNewConversation,
    setActiveConversationId: handleSetActiveConversationId,
    loadingMessages
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

ChatProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default ChatContext;
