"""
CMRS - User Serializers & Views
Handles login (JWT), registration, and user profile endpoints.
"""

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from users.models import User, Branch


# ─── Serializers ──────────────────────────────────────────────────────────────

class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ['id', 'name', 'code', 'city', 'address']


class UserSerializer(serializers.ModelSerializer):
    branch = BranchSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'full_name', 'role', 'branch', 'phone', 'employee_id']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class RegisterUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    branch_id = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(), source='branch', required=False, allow_null=True
    )

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name',
                  'role', 'branch_id', 'phone', 'employee_id']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class CMRSTokenSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer that includes user role and name in the response.
    This allows the React frontend to immediately know the user's role and
    render the correct portal (Agent / Branch Manager / Admin).
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Embed user info directly in the JWT payload
        token['role'] = user.role
        token['full_name'] = user.get_full_name() or user.username
        token['branch_id'] = user.branch_id
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Also include user details in the login response body
        data['user'] = UserSerializer(self.user).data
        return data
