from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from apps.chat.models import Conversation, Message

User = get_user_model()

class ChatBackendTests(APITestCase):
    def setUp(self):
        # Create test users
        self.client_user = User.objects.create_user(username='client1', password='password123')
        self.agent_user = User.objects.create_user(username='agent1', password='password123', is_staff=True)
        self.other_client = User.objects.create_user(username='client2', password='password123')

    def test_create_conversation(self):
        # Authenticate as client1
        self.client.force_authenticate(user=self.client_user)
        response = self.client.post('/api/chat/conversations/')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['client_username'], 'client1')
        self.assertEqual(response.data['status'], 'OPEN')
        
        # Creating again should return the same active conversation (200 OK)
        response2 = self.client.post('/api/chat/conversations/')
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertEqual(response2.data['id'], response.data['id'])

    def test_send_message(self):
        # Create an active conversation
        conv = Conversation.objects.create(client=self.client_user, status='OPEN')
        
        # Send message as client
        self.client.force_authenticate(user=self.client_user)
        response = self.client.post('/api/chat/messages/', {
            'conversation': str(conv.id),
            'content': 'Hello, I have an issue.'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['sender_username'], 'client1')
        
        # Check that conversation status remains OPEN
        conv.refresh_from_db()
        self.assertEqual(conv.status, 'OPEN')

        # Send message as agent
        self.client.force_authenticate(user=self.agent_user)
        response = self.client.post('/api/chat/messages/', {
            'conversation': str(conv.id),
            'content': 'Hello, how can I help you today?'
        }, HTTP_X_USER_ROLE='agent')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that conversation is now PENDING and agent is automatically assigned
        conv.refresh_from_db()
        self.assertEqual(conv.status, 'PENDING')
        self.assertEqual(conv.agent, self.agent_user)

    def test_conversation_visibility(self):
        conv1 = Conversation.objects.create(client=self.client_user)
        conv2 = Conversation.objects.create(client=self.other_client)

        # Client 1 should only see conv1
        self.client.force_authenticate(user=self.client_user)
        response = self.client.get('/api/chat/conversations/')
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], str(conv1.id))

        # Agent should see both (passing X-User-Role header or being staff)
        self.client.force_authenticate(user=self.agent_user)
        response = self.client.get('/api/chat/conversations/', HTTP_X_USER_ROLE='agent')
        self.assertEqual(len(response.data), 2)
