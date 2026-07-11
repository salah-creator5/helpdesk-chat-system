import React from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import styles from '../styles/chat.module.css';

export function ChatWindow({ 
  conversation, 
  messages, 
  currentUser, 
  onSendMessage, 
  onClose,
  headerActions 
}) {

  if (!conversation) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>💬</div>
        <h3>Aucune conversation active</h3>
        <p>Sélectionnez un ticket ou lancez un chat pour commencer.</p>
      </div>
    );
  }

  const isAgent = currentUser.role === 'agent';
  const partnerName = isAgent 
    ? conversation.client_username 
    : (conversation.agent_username || 'Support Helpdesk');

  const getStatusLabel = (status) => {
    switch (status) {
      case 'OPEN': return 'En attente';
      case 'PENDING': return 'En cours';
      case 'RESOLVED': return 'Résolu';
      case 'CLOSED': return 'Fermé';
      default: return status;
    }
  };

  return (
    <div className={styles.detailArea} style={{ height: '100%' }}>
      {/* Chat Header */}
      <div className={styles.chatHeader}>
        <div className={styles.headerInfo}>
          <div className={styles.avatar}>
            {partnerName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h4 className={styles.headerTitle}>{partnerName}</h4>
            <div className={styles.headerStatus}>
              <span className={`${styles.statusIndicator} ${styles.online}`}></span>
              <span>{isAgent ? 'Client en ligne' : 'Support disponible'} ({getStatusLabel(conversation.status)})</span>
            </div>
          </div>
        </div>
        
        <div className={styles.headerActions}>
          {headerActions}
          {onClose && (
            <button className={styles.closeButton} onClick={onClose} title="Fermer le chat">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <MessageList messages={messages} currentUser={currentUser} />

      {/* Input */}
      <MessageInput onSendMessage={onSendMessage} />
    </div>
  );
}
