import { useEffect, useRef } from 'react';
import { chatApi } from '../services/chatApi';

/**
 * Hook to periodically poll for new messages in a conversation.
 * 
 * @param {string} conversationId - Active conversation ID.
 * @param {object} user - Current user object { id, username, role }.
 * @param {function} onNewMessages - Callback when new messages are fetched.
 * @param {number} intervalMs - Polling interval in ms.
 * @param {boolean} enabled - Toggle polling.
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

  // Reset reference if conversation changes
  useEffect(() => {
    lastMessageIdRef.current = null;
  }, [conversationId]);

  const fetchNewMessages = async (isInitial = false) => {
    if (!conversationId || !user || isFetchingRef.current) return;

    isFetchingRef.current = true;
    try {
      // If we don't have a last message ID yet, we fetch the whole history (afterId is null)
      const afterId = isInitial ? null : lastMessageIdRef.current;
      const messages = await chatApi.getMessages(conversationId, user, afterId);
      
      if (messages.length > 0) {
        // Track the last message ID to query deltas next time
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

    // Fetch initial chat history immediately
    fetchNewMessages(true);

    // Set up polling loop
    const interval = setInterval(() => {
      fetchNewMessages(false);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [conversationId, user?.id, enabled, intervalMs]);

  return { refetch: () => fetchNewMessages(false) };
}
