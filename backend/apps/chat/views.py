from rest_framework import viewsets, status, serializers
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.authentication import BaseAuthentication, SessionAuthentication
from rest_framework.permissions import AllowAny
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer, UserSerializer

User = get_user_model()

class DemoAuthentication(BaseAuthentication):
    """
    Authentification personnalisée pour le développement et la démo.
    Permet de s'authentifier via les en-têtes X-User-ID ou X-Username,
    ou par les paramètres de requête en repli.
    """
    def authenticate(self, request):
        user_id = request.headers.get('X-User-ID') or request.query_params.get('user_id')
        if user_id:
            try:
                user = User.objects.get(id=user_id)
                return (user, None)
            except (User.DoesNotExist, ValueError):
                pass

        username = request.headers.get('X-Username') or request.query_params.get('username')
        if username:
            email = f"{username}@example.com"
            is_staff = username.lower().startswith('agent')
            user, _ = User.objects.get_or_create(
                username=username,
                defaults={'email': email, 'is_staff': is_staff}
            )
            return (user, None)
            
        return None


class ConversationViewSet(viewsets.ModelViewSet):
    queryset = Conversation.objects.all()
    serializer_class = ConversationSerializer
    authentication_classes = [DemoAuthentication, SessionAuthentication]
    permission_classes = [AllowAny]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Conversation.objects.none()

        role = self.request.headers.get('X-User-Role') or self.request.query_params.get('role')
        # Si l'utilisateur fait partie de l'équipe ou si le rôle est explicitement 'agent', il voit toutes les conversations
        if role == 'agent' or user.is_staff:
            return Conversation.objects.all()
        else:
            # Un client normal ne voit que ses propres conversations
            return Conversation.objects.filter(client=user)

    def create(self, request, *args, **kwargs):
        user = request.user
        if not user.is_authenticated:
            return Response({"detail": "Authentication required. Provide X-User-ID or X-Username header."}, status=status.HTTP_401_UNAUTHORIZED)

        # Réutiliser la conversation active si elle existe déjà pour ce client
        active_conv = Conversation.objects.filter(
            client=user, 
            status__in=['OPEN', 'PENDING']
        ).first()
        
        if active_conv:
            serializer = self.get_serializer(active_conv)
            return Response(serializer.data, status=status.HTTP_200_OK)

        # Sinon, en créer une nouvelle
        conversation = Conversation.objects.create(client=user, status='OPEN')
        serializer = self.get_serializer(conversation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], url_path='assign')
    def assign_agent(self, request, pk=None):
        conversation = self.get_object()
        agent_id = request.data.get('agent_id') or request.user.id
        
        if not agent_id:
            return Response({"detail": "agent_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            agent = User.objects.get(id=agent_id)
        except User.DoesNotExist:
            return Response({"detail": "Agent user not found"}, status=status.HTTP_404_NOT_FOUND)

        conversation.agent = agent
        conversation.status = 'PENDING'
        conversation.save()
        
        serializer = self.get_serializer(conversation)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='read')
    def mark_as_read(self, request, pk=None):
        conversation = self.get_object()
        user = request.user
        if not user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        # Marquer tous les messages envoyés par d'AUTRES utilisateurs comme lus
        unread_messages = conversation.messages.filter(is_read=False).exclude(sender=user)
        count = unread_messages.count()
        unread_messages.update(is_read=True)
        
        return Response({"marked_read_count": count}, status=status.HTTP_200_OK)


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    authentication_classes = [DemoAuthentication, SessionAuthentication]
    permission_classes = [AllowAny]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Message.objects.none()

        conversation_id = self.request.query_params.get('conversation')
        if not conversation_id:
            return Message.objects.none()

        try:
            conversation = Conversation.objects.get(id=conversation_id)
        except (Conversation.DoesNotExist, ValueError):
            return Message.objects.none()

        # Vérifier les autorisations d'accès
        role = self.request.headers.get('X-User-Role') or self.request.query_params.get('role')
        is_agent = (role == 'agent' or user.is_staff)
        
        if not is_agent and conversation.client != user:
            return Message.objects.none()

        queryset = Message.objects.filter(conversation=conversation)

        # Filtre pour le Short Polling : obtenir les messages créés après l'ID d'un message spécifique
        after_id = self.request.query_params.get('after')
        if after_id:
            try:
                ref_msg = Message.objects.get(id=after_id, conversation=conversation)
                queryset = queryset.filter(created_at__gt=ref_msg.created_at)
            except (Message.DoesNotExist, ValueError):
                pass

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        conversation_id = self.request.data.get('conversation')
        
        try:
            conversation = Conversation.objects.get(id=conversation_id)
        except (Conversation.DoesNotExist, ValueError):
            raise serializers.ValidationError({"conversation": "Invalid or missing conversation ID"})

        # Sauvegarder le message avec l'expéditeur authentifié
        serializer.save(sender=user)

        # Mettre à jour le statut de la conversation et l'horodatage updated_at
        role = self.request.headers.get('X-User-Role') or self.request.query_params.get('role')
        is_agent = (role == 'agent' or user.is_staff)
        
        if is_agent:
            conversation.status = 'PENDING'
            # Si la conversation n'a pas d'agent assigné, l'assigner automatiquement
            if not conversation.agent:
                conversation.agent = user
        else:
            # Si le client envoie un message, définir le statut sur OPEN
            conversation.status = 'OPEN'

        conversation.save()  # Auto updates updated_at


class DemoUserViewSet(viewsets.ViewSet):
    """
    Points de terminaison d'aide pour gérer et lister les utilisateurs de démo (agents et clients).
    """
    permission_classes = [AllowAny]

    def list(self, request):
        users = User.objects.all().order_by('username')
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def create(self, request):
        username = request.data.get('username')
        role = request.data.get('role', 'client')
        
        if not username:
            return Response({"detail": "username is required"}, status=status.HTTP_400_BAD_REQUEST)

        is_staff = (role == 'agent')
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': f"{username}@example.com",
                'is_staff': is_staff
            }
        )
        
        if not created and user.is_staff != is_staff:
            user.is_staff = is_staff
            user.save()
            
        serializer = UserSerializer(user)
        return Response({
            "user": serializer.data,
            "created": created
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
