import React, { useEffect, useRef } from 'react';
import { MessageItem } from './MessageItem';
import styles from '../styles/chat.module.css';

export function MessageList({ messages, currentUser }) {
  const containerRef = useRef(null);

  // Auto scroll to bottom when messages list updates
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  if (!messages || messages.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>💬</div>
        <h3>Pas de messages</h3>
        <p>Commencez la conversation en envoyant un message ci-dessous.</p>
      </div>
    );
  }

  return (
    <div className={styles.messagesContainer} ref={containerRef}>
      {messages.map((message) => (
        <MessageItem 
          key={message.id || Math.random()} 
          message={message} 
          currentUser={currentUser} 
        />
      ))}
    </div>
  );
}
