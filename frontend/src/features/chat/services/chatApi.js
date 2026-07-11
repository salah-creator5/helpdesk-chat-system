import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/chat';

// Create a configured axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Helper to construct headers based on user context
 */
const getHeaders = (user) => {
  const headers = {};
  if (user) {
    if (user.id) headers['X-User-ID'] = user.id;
    if (user.username) headers['X-Username'] = user.username;
    if (user.role) headers['X-User-Role'] = user.role; // 'agent' or 'client'
  }
  return headers;
};

export const chatApi = {
  // --- Demo Users API ---
  getDemoUsers: async () => {
    const response = await api.get('/users/');
    return response.data;
  },

  createDemoUser: async (username, role) => {
    const response = await api.post('/users/', { username, role });
    return response.data;
  },

  // --- Conversations API ---
  getConversations: async (user) => {
    const response = await api.get('/conversations/', {
      headers: getHeaders(user),
    });
    return response.data;
  },

  createConversation: async (user) => {
    const response = await api.post('/conversations/', {}, {
      headers: getHeaders(user),
    });
    return response.data;
  },

  assignAgent: async (conversationId, agentId, user) => {
    const response = await api.patch(
      `/conversations/${conversationId}/assign/`,
      { agent_id: agentId },
      { headers: getHeaders(user) }
    );
    return response.data;
  },

  updateConversationStatus: async (conversationId, status, user) => {
    const response = await api.patch(
      `/conversations/${conversationId}/`,
      { status },
      { headers: getHeaders(user) }
    );
    return response.data;
  },

  markAsRead: async (conversationId, user) => {
    const response = await api.post(
      `/conversations/${conversationId}/read/`,
      {},
      { headers: getHeaders(user) }
    );
    return response.data;
  },

  // --- Messages API ---
  getMessages: async (conversationId, user, afterId = null) => {
    const params = { conversation: conversationId };
    if (afterId) {
      params.after = afterId;
    }
    const response = await api.get('/messages/', {
      params,
      headers: getHeaders(user),
    });
    return response.data;
  },

  sendMessage: async (conversationId, content, user) => {
    const response = await api.post(
      '/messages/',
      { conversation: conversationId, content },
      { headers: getHeaders(user) }
    );
    return response.data;
  },
};
