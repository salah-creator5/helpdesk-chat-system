from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Conversation, Message

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'sender_username', 'content', 'is_read', 'created_at']
        read_only_fields = ['id', 'sender', 'is_read', 'created_at']


class ConversationSerializer(serializers.ModelSerializer):
    client_username = serializers.CharField(source='client.username', read_only=True)
    agent_username = serializers.CharField(source='agent.username', read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 
            'client', 
            'client_username', 
            'agent', 
            'agent_username', 
            'status', 
            'created_at', 
            'updated_at', 
            'last_message'
        ]
        read_only_fields = ['id', 'client', 'created_at', 'updated_at']

    def get_last_message(self, obj):
        last_msg = obj.messages.order_by('created_at').last()
        if last_msg:
            return MessageSerializer(last_msg).data
        return None
