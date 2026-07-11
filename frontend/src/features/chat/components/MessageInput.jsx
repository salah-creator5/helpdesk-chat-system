import React, { useState } from 'react';
import styles from '../styles/chat.module.css';

export function MessageInput({ onSendMessage, isLoading }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || isLoading) return;
    
    onSendMessage(text.trim());
    setText('');
  };

  return (
    <div className={styles.inputContainer}>
      <form onSubmit={handleSubmit} className={styles.inputForm}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tapez votre message ici..."
          className={styles.textInput}
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className={styles.sendButton}
          disabled={!text.trim() || isLoading}
        >
          {isLoading ? '...' : '➔'}
        </button>
      </form>
    </div>
  );
}
