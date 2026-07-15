from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from apps.chat.models import Conversation, Message

User = get_user_model()

class ChatBackendTests(APITestCase):
    def setUp(self):
        # Créer des utilisateurs de test
        self.client_user = User.objects.create_user(username='client1', password='password123')
        self.agent_user = User.objects.create_user(username='agent1', password='password123', is_staff=True)
        self.other_client = User.objects.create_user(username='client2', password='password123')

    def test_create_conversation(self):
        # S'authentifier en tant que client1
        self.client.force_authenticate(user=self.client_user)
        response = self.client.post('/api/chat/conversations/')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['client_username'], 'client1')
        self.assertEqual(response.data['status'], 'OPEN')
        
        # Créer à nouveau devrait renvoyer la même conversation active (200 OK)
        response2 = self.client.post('/api/chat/conversations/')
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertEqual(response2.data['id'], response.data['id'])

    def test_send_message(self):
        # Créer une conversation active
        conv = Conversation.objects.create(client=self.client_user, status='OPEN')
        
        # Envoyer un message en tant que client
        self.client.force_authenticate(user=self.client_user)
        response = self.client.post('/api/chat/messages/', {
            'conversation': str(conv.id),
            'content': 'Hello, I have an issue.'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['sender_username'], 'client1')
        
        # Vérifier que le statut de la conversation reste OPEN
        conv.refresh_from_db()
        self.assertEqual(conv.status, 'OPEN')

        # Envoyer un message en tant qu'agent
        self.client.force_authenticate(user=self.agent_user)
        response = self.client.post('/api/chat/messages/', {
            'conversation': str(conv.id),
            'content': 'Hello, how can I help you today?'
        }, HTTP_X_USER_ROLE='agent')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Vérifier que la conversation est maintenant PENDING et que l'agent est automatiquement assigné
        conv.refresh_from_db()
        self.assertEqual(conv.status, 'PENDING')
        self.assertEqual(conv.agent, self.agent_user)

    def test_conversation_visibility(self):
        conv1 = Conversation.objects.create(client=self.client_user)
        conv2 = Conversation.objects.create(client=self.other_client)

        # Le client 1 ne devrait voir que conv1
        self.client.force_authenticate(user=self.client_user)
        response = self.client.get('/api/chat/conversations/')
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], str(conv1.id))

        # L'agent devrait voir les deux (en passant l'en-tête X-User-Role ou en étant staff)
        self.client.force_authenticate(user=self.agent_user)
        response = self.client.get('/api/chat/conversations/', HTTP_X_USER_ROLE='agent')
        self.assertEqual(len(response.data), 2)
