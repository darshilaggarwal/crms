from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from users.views import (
    LoginView, RegisterView, ProfileView,
    BranchListCreateView, AgentListView, UserListCreateView
)

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('branches/', BranchListCreateView.as_view(), name='branch-list'),
    path('users/', UserListCreateView.as_view(), name='user-list-create'),
    path('agents/', AgentListView.as_view(), name='agent-list'),
]
