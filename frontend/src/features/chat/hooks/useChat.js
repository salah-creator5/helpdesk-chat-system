import { useState, useCallback, useEffect } from 'react';
import { chatApi } from '../services/chatApi';
import { useChatPolling } from './useChatPolling';

/**
 * Custom hook to manage all chat interactions, conversation states, and operations.
 * 
 * @param {object} user - Authenticated user { id, username, role }.
 */
export function useChat(user, options = {}) {
  const { isWidgetOpen = false } = options;
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch list of conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await chatApi.getConversations(user);
      setConversations(data);
      
      // Auto-set active conversation for client if they have an ongoing one
      if (user.role === 'client') {
        const active = data.find(c => c.status === 'OPEN' || c.status === 'PENDING');
        if (active) {
          setActiveConversation(active);
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, [user?.id, user?.role]);

  // Load conversations when user state changes
  useEffect(() => {
    fetchConversations();
    if (!user) {
      setActiveConversation(null);
      setMessages([]);
    }
  }, [user?.id, user?.role, fetchConversations]);

  // Create or load client conversation
  const startConversation = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const conv = await chatApi.createConversation(user);
      setActiveConversation(conv);
      fetchConversations();
      return conv;
    } catch (error) {
      console.error('Error starting conversation:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchConversations]);

  // Send message in current conversation
  const sendMessage = useCallback(async (content) => {
    if (!activeConversation || !user) return;
    try {
      const newMsg = await chatApi.sendMessage(activeConversation.id, content, user);
      
      // Optimistically append new message if it doesn't already exist
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // Update conversation list preview
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [activeConversation?.id, user, fetchConversations]);

  // Merge newly polled messages
  const handleIncomingMessages = useCallback((newMsgs, isInitial) => {
    setMessages((prev) => {
      if (isInitial) {
        return newMsgs;
      }
      
      // Deduplicate messages
      const existingIds = new Set(prev.map((m) => m.id));
      const filtered = newMsgs.filter((m) => !existingIds.has(m.id));
      return [...prev, ...filtered];
    });

    // Auto-mark as read if active conversation is visible and new messages are from others
    const isChatVisible = user?.role === 'agent' ? true : isWidgetOpen;

    if (activeConversation && isChatVisible && newMsgs.some((m) => m.sender !== user.id)) {
      chatApi.markAsRead(activeConversation.id, user)
        .then(() => fetchConversations()) // Refresh conversation list to remove unread state
        .catch((err) => console.error('Failed to mark read:', err));
    }
  }, [activeConversation?.id, user?.id, isWidgetOpen, fetchConversations]);

  // Set up polling for the active conversation
  useChatPolling(
    activeConversation?.id,
    user,
    handleIncomingMessages,
    3000,
    !!activeConversation?.id
  );

  // Self-assign conversation to agent
  const assignAgent = useCallback(async (conversationId, agentId = null) => {
    if (!user) return;
    const targetAgentId = agentId || user.id;
    try {
      const updatedConv = await chatApi.assignAgent(conversationId, targetAgentId, user);
      
      // Sync active conversation state if current
      if (activeConversation && activeConversation.id === conversationId) {
        setActiveConversation(updatedConv);
      }
      fetchConversations();
    } catch (error) {
      console.error('Error assigning agent:', error);
    }
  }, [activeConversation?.id, user, fetchConversations]);

  // Select active conversation (specifically for Agents)
  const selectConversation = useCallback((conv) => {
    setActiveConversation(conv);
    setMessages([]); // Clear messages to let useChatPolling run initial fetch
    
    if (conv && user) {
      chatApi.markAsRead(conv.id, user)
        .then(() => fetchConversations())
        .catch((err) => console.error('Failed to mark read:', err));
    }
  }, [user, fetchConversations]);

  // Update status of conversation (e.g. to RESOLVED or CLOSED)
  const updateStatus = useCallback(async (conversationId, newStatus) => {
    if (!user) return;
    try {
      const updatedConv = await chatApi.updateConversationStatus(conversationId, newStatus, user);
      if (activeConversation && activeConversation.id === conversationId) {
        setActiveConversation(updatedConv);
      }
      fetchConversations();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }, [activeConversation?.id, user, fetchConversations]);

  return {
    conversations,
    activeConversation,
    messages,
    isLoading,
    fetchConversations,
    startConversation,
    sendMessage,
    handleIncomingMessages,
    assignAgent,
    selectConversation,
    updateStatus,
  };
}
