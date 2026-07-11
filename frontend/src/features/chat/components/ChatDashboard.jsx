import React, { useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import { ChatWindow } from './ChatWindow';
import styles from '../styles/chat.module.css';

/**
 * ChatDashboard - Back Office Helpdesk Chat management workspace for Agents.
 * 
 * @param {object} user - The logged-in Agent user object.
 */
export function ChatDashboard({ user }) {
  const {
    conversations,
    activeConversation,
    messages,
    fetchConversations,
    sendMessage,
    handleIncomingMessages,
    assignAgent,
    selectConversation,
    updateStatus,
  } = useChat(user, { isWidgetOpen: true });

  // Poll conversation list periodically to capture incoming user chats
  useEffect(() => {
    fetchConversations(); // Initial fetch
    
    const interval = setInterval(() => {
      fetchConversations();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [user?.id, fetchConversations]);

  return (
    <div className={styles.dashboardContainer}>
      {/* Sidebar: Conversation List */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h3 className={styles.sidebarTitle}>Demandes Client</h3>
        </div>
        <div className={styles.conversationList}>
          {conversations.length === 0 ? (
            <div className={styles.emptyState} style={{ padding: '20px' }}>
              <p style={{ fontSize: '13px' }}>Aucun chat en attente.</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = activeConversation?.id === conv.id;
              // Check for unread indicators
              const hasUnread = conv.last_message && 
                                !conv.last_message.is_read && 
                                conv.last_message.sender !== user?.id;

              const getStatusLabel = (status) => {
                switch (status) {
                  case 'OPEN': return 'En attente';
                  case 'PENDING': return 'En cours';
                  case 'RESOLVED': return 'Résolu';
                  case 'CLOSED': return 'Fermé';
                  default: return status;
                }
              };

              const formatMsgTime = (ts) => {
                if (!ts) return '';
                return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              };

              return (
                <button
                  key={conv.id}
                  className={`${styles.conversationItem} ${isSelected ? styles.active : ''}`}
                  onClick={() => selectConversation(conv)}
                >
                  <div className={styles.convHeader}>
                    <span className={styles.convClient}>{conv.client_username}</span>
                    <span className={styles.convTime}>
                      {conv.last_message ? formatMsgTime(conv.last_message.created_at) : ''}
                    </span>
                  </div>
                  <div className={styles.convPreview}>
                    {conv.last_message ? conv.last_message.content : 'Pas de message'}
                  </div>
                  <div className={styles.convBadges}>
                    <span className={`${styles.statusBadge} ${styles[conv.status.toLowerCase()]}`}>
                      {getStatusLabel(conv.status)}
                    </span>
                    {hasUnread && <span className={styles.unreadDot} title="Nouveau message"></span>}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Detail Panel: Chat Window */}
      <div style={{ flex: 1, height: '100%' }}>
        {activeConversation ? (
          <ChatWindow
            conversation={activeConversation}
            messages={messages}
            currentUser={user}
            onSendMessage={sendMessage}
            headerActions={
              <div className={styles.agentActions}>
                {/* Self assign button */}
                {(!activeConversation.agent || activeConversation.agent !== user?.id) && (
                  <button
                    className={`${styles.actionButton} ${styles.primary}`}
                    onClick={() => assignAgent(activeConversation.id)}
                  >
                    S'assigner
                  </button>
                )}
                {/* Resolve button */}
                {activeConversation.status !== 'RESOLVED' && activeConversation.status !== 'CLOSED' && (
                  <button
                    className={`${styles.actionButton} ${styles.outline}`}
                    onClick={() => updateStatus(activeConversation.id, 'RESOLVED')}
                  >
                    Résoudre
                  </button>
                )}
                {/* Reopen / Close button */}
                {activeConversation.status === 'RESOLVED' && (
                  <button
                    className={`${styles.actionButton} ${styles.outline}`}
                    onClick={() => updateStatus(activeConversation.id, 'CLOSED')}
                  >
                    Fermer
                  </button>
                )}
              </div>
            }
          />
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>👤</div>
            <h3>Aucune sélection</h3>
            <p>Choisissez une demande d'assistance dans la barre latérale.</p>
          </div>
        )}
      </div>
    </div>
  );
}
