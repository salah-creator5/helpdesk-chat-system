import React from 'react';
import styles from '../styles/chat.module.css';

export function MessageItem({ message, currentUser }) {
  const isOutgoing = message.sender === currentUser.id || message.sender_username === currentUser.username;
  
  // Formater l'horodatage ISO dans un format d'heure lisible
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`${styles.messageWrapper} ${isOutgoing ? styles.outgoing : styles.incoming}`}>
      {!isOutgoing && (
        <span className={styles.messageSender}>
          {message.sender_username || 'User'}
        </span>
      )}
      <div className={styles.messageBubble}>
        {message.content}
      </div>
      <div className={styles.messageMeta}>
        <span className={styles.convTime}>{formatTime(message.created_at)}</span>
        {isOutgoing && (
          <span style={{ fontSize: '12px' }}>
            {message.is_read ? '✓✓' : '✓'}
          </span>
        )}
      </div>
    </div>
  );
}
