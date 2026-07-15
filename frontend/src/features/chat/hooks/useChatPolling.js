import { useEffect, useRef } from 'react';
import { chatApi } from '../services/chatApi';

/**
 * Hook pour interroger périodiquement (polling) les nouveaux messages d'une conversation.
 * 
 * @param {string} conversationId - ID de la conversation active.
 * @param {object} user - Objet utilisateur actuel { id, username, role }.
 * @param {function} onNewMessages - Callback appelé lors de la réception de nouveaux messages.
 * @param {number} intervalMs - Intervalle de polling en ms.
 * @param {boolean} enabled - Activer/Désactiver le polling.
 */
export function useChatPolling(
  conversationId, 
  user, 
  onNewMessages, 
  intervalMs = 3000, 
  enabled = true
) {
  const lastMessageIdRef = useRef(null);
  const isFetchingRef = useRef(false);

  // Réinitialiser la référence si la conversation change
  useEffect(() => {
    lastMessageIdRef.current = null;
  }, [conversationId]);

  const fetchNewMessages = async (isInitial = false) => {
    if (!conversationId || !user || isFetchingRef.current) return;

    isFetchingRef.current = true;
    try {
      // Si nous n'avons pas encore d'ID du dernier message, nous récupérons tout l'historique (afterId est null)
      const afterId = isInitial ? null : lastMessageIdRef.current;
      const messages = await chatApi.getMessages(conversationId, user, afterId);
      
      if (messages.length > 0) {
        // Suivre l'ID du dernier message pour interroger uniquement les deltas (nouveautés) la prochaine fois
        lastMessageIdRef.current = messages[messages.length - 1].id;
        onNewMessages(messages, isInitial || !afterId);
      }
    } catch (error) {
      console.error('Error polling messages:', error);
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (!enabled || !conversationId || !user) return;

    // Récupérer l'historique initial du chat immédiatement
    fetchNewMessages(true);

    // Configurer la boucle de polling
    const interval = setInterval(() => {
      fetchNewMessages(false);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [conversationId, user?.id, enabled, intervalMs]);

  return { refetch: () => fetchNewMessages(false) };
}
