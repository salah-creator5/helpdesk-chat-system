import React, { useState, useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import { ChatWindow } from './ChatWindow';
import { chatApi } from '../services/chatApi';
import styles from '../styles/chat.module.css';

/**
 * ChatWidget - Widget flottant pour l'intégration côté Client.
 * 
 * @param {object} user - L'objet utilisateur Client connecté.
 */
export function ChatWidget({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    activeConversation, 
    messages, 
    isLoading, 
    startConversation, 
    sendMessage, 
    handleIncomingMessages,
    fetchConversations
  } = useChat(user, { isWidgetOpen: isOpen });

  // Marquer les messages comme lus à l'ouverture du widget
  useEffect(() => {
    if (isOpen && activeConversation?.id) {
      chatApi.markAsRead(activeConversation.id, user)
        .then(() => fetchConversations())
        .catch((err) => console.error('Failed to mark read on open:', err));
    }
  }, [isOpen, activeConversation?.id, user, fetchConversations]);

  // Déterminer s'il y a des messages non lus lorsque le widget est fermé
  const hasUnread = isOpen 
    ? false 
    : messages.some(m => !m.is_read && m.sender !== user?.id);

  return (
    <div className={styles.widgetContainer}>
      {isOpen && (
        <div className={styles.widgetWindow}>
          {activeConversation ? (
            <ChatWindow
              conversation={activeConversation}
              messages={messages}
              currentUser={user}
              onSendMessage={sendMessage}
              onClose={() => setIsOpen(false)}
            />
          ) : (
            <div className={styles.emptyState} style={{ padding: '30px' }}>
              <div className={styles.emptyIcon}>👋</div>
              <h3 style={{ fontSize: '18px', color: 'var(--neutral-800)', marginTop: '8px' }}>
                Besoin d'aide ?
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--neutral-500)', marginTop: '4px' }}>
                Discutez en direct avec un agent pour résoudre votre incident.
              </p>
              <button 
                className={styles.actionButton}
                style={{ 
                  backgroundColor: 'var(--primary)', 
                  color: 'white', 
                  marginTop: '20px', 
                  padding: '12px 20px',
                  borderRadius: 'var(--radius-lg)'
                }}
                onClick={startConversation}
                disabled={isLoading}
              >
                {isLoading ? 'Ouverture...' : 'Nouvelle conversation'}
              </button>
            </div>
          )}
        </div>
      )}

      <button 
        className={styles.widgetButton} 
        onClick={() => setIsOpen(!isOpen)}
        title="Ouvrir le chat support"
      >
        {isOpen ? '✕' : '💬'}
        {hasUnread && <span className={styles.widgetBadge}>!</span>}
      </button>
    </div>
  );
}
