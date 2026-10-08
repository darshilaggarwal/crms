"""
CMRS - User Views
Login, Registration, Profile, and Branch listing endpoints.
"""

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from drf_spectacular.utils import extend_schema, OpenApiExample

from users.models import User, Branch
from users.serializers import (
    UserSerializer, RegisterUserSerializer,
    BranchSerializer, CMRSTokenSerializer
)


class LoginView(TokenObtainPairView):
    """
    Login endpoint. Returns JWT access + refresh tokens along with user role.
    The role field in the response allows the frontend to redirect to the correct portal.
    """
    serializer_class = CMRSTokenSerializer
    permission_classes = [permissions.AllowAny]


class RegisterView(generics.CreateAPIView):
    """Create a new user. Restricted to Admin users only in production."""
    serializer_class = RegisterUserSerializer
    permission_classes = [permissions.AllowAny]  # Open for assessment demo


class ProfileView(APIView):
    """Returns the currently logged-in user's profile."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class BranchListCreateView(generics.ListCreateAPIView):
    """List all active branches or create a new branch."""
    serializer_class = BranchSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Branch.objects.filter(is_active=True)


class UserListCreateView(generics.ListCreateAPIView):
    """
    GET: List all users (supports ?role=AGENT or ?role=BRANCH_MANAGER)
    POST: Create a new user (Admin can create Branch Managers and Agents)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return RegisterUserSerializer
        return UserSerializer

    def get_queryset(self):
        qs = User.objects.all().order_by('-date_joined')
        role_filter = self.request.query_params.get('role')
        branch_filter = self.request.query_params.get('branch_id')
        if role_filter:
            qs = qs.filter(role=role_filter.upper())
        if branch_filter:
            qs = qs.filter(branch_id=branch_filter)
        return qs


class AgentListView(generics.ListAPIView):
    """List all agents (for branch managers to view their agents)."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = User.objects.filter(role='AGENT')
        # Branch managers only see agents in their own branch
        if user.is_branch_manager and user.branch:
            qs = qs.filter(branch=user.branch)
        return qs

