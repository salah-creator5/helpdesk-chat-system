import { useState, useCallback, useEffect } from 'react';
import { chatApi } from '../services/chatApi';
import { useChatPolling } from './useChatPolling';

/**
 * Hook personnalisé pour gérer toutes les interactions du chat, les états de conversation et les opérations.
 * 
 * @param {object} user - Utilisateur authentifié { id, username, role }.
 */
export function useChat(user, options = {}) {
  const { isWidgetOpen = false } = options;
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Récupérer la liste des conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await chatApi.getConversations(user);
      setConversations(data);
      
      // Sélectionner automatiquement la conversation active pour le client s'il en a une en cours
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

  // Charger les conversations lorsque l'état de l'utilisateur change
  useEffect(() => {
    fetchConversations();
    if (!user) {
      setActiveConversation(null);
      setMessages([]);
    }
  }, [user?.id, user?.role, fetchConversations]);

  // Créer ou charger la conversation du client
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

  // Envoyer un message dans la conversation actuelle
  const sendMessage = useCallback(async (content) => {
    if (!activeConversation || !user) return;
    try {
      const newMsg = await chatApi.sendMessage(activeConversation.id, content, user);
      
      // Ajout optimiste du nouveau message s'il n'existe pas déjà
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // Mettre à jour l'aperçu de la liste des conversations
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [activeConversation?.id, user, fetchConversations]);

  // Fusionner les nouveaux messages récupérés par polling
  const handleIncomingMessages = useCallback((newMsgs, isInitial) => {
    setMessages((prev) => {
      if (isInitial) {
        return newMsgs;
      }
      
      // Dédupliquer les messages
      const existingIds = new Set(prev.map((m) => m.id));
      const filtered = newMsgs.filter((m) => !existingIds.has(m.id));
      return [...prev, ...filtered];
    });

    // Marquer automatiquement comme lu si la conversation active est visible et que les nouveaux messages proviennent d'autres utilisateurs
    const isChatVisible = user?.role === 'agent' ? true : isWidgetOpen;

    if (activeConversation && isChatVisible && newMsgs.some((m) => m.sender !== user.id)) {
      chatApi.markAsRead(activeConversation.id, user)
        .then(() => fetchConversations()) // Rafraîchir la liste des conversations pour supprimer l'état non lu
        .catch((err) => console.error('Failed to mark read:', err));
    }
  }, [activeConversation?.id, user?.id, isWidgetOpen, fetchConversations]);

  // Configurer le polling pour la conversation active
  useChatPolling(
    activeConversation?.id,
    user,
    handleIncomingMessages,
    3000,
    !!activeConversation?.id
  );

  // S'assigner la conversation (pour l'agent)
  const assignAgent = useCallback(async (conversationId, agentId = null) => {
    if (!user) return;
    const targetAgentId = agentId || user.id;
    try {
      const updatedConv = await chatApi.assignAgent(conversationId, targetAgentId, user);
      
      // Synchroniser l'état de la conversation active si elle correspond
      if (activeConversation && activeConversation.id === conversationId) {
        setActiveConversation(updatedConv);
      }
      fetchConversations();
    } catch (error) {
      console.error('Error assigning agent:', error);
    }
  }, [activeConversation?.id, user, fetchConversations]);

  // Sélectionner la conversation active (spécifiquement pour les agents)
  const selectConversation = useCallback((conv) => {
    setActiveConversation(conv);
    setMessages([]); // Effacer les messages pour permettre au polling de faire sa récupération initiale
    
    if (conv && user) {
      chatApi.markAsRead(conv.id, user)
        .then(() => fetchConversations())
        .catch((err) => console.error('Failed to mark read:', err));
    }
  }, [user, fetchConversations]);

  // Mettre à jour le statut de la conversation (ex. RESOLVED ou CLOSED)
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
