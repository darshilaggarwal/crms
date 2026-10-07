"""
CMRS - Reconciliation Views (Bank Deposit & Settlement)
Branch manager creates and manages bank deposits against reconciled cash.
"""

from decimal import Decimal
from rest_framework import serializers, generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from drf_spectacular.utils import extend_schema

from reconciliation.models import BankDeposit
from users.models import Branch


class IsBranchManagerOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            (request.user.is_branch_manager or request.user.is_admin)
        )


# ─── Serializers ──────────────────────────────────────────────────────────────

class BankDepositSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    deposited_by_name = serializers.CharField(
        source='deposited_by.get_full_name', read_only=True
    )

    class Meta:
        model = BankDeposit
        fields = [
            'id', 'branch', 'branch_name',
            'deposited_by', 'deposited_by_name',
            'bank_name', 'bank_account_number', 'ifsc_code',
            'amount', 'reference_utr', 'deposit_date',
            'status', 'settlement_date', 'notes', 'created_at'
        ]
        read_only_fields = ['deposited_by', 'status', 'created_at']


class CreateBankDepositSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankDeposit
        fields = [
            'branch', 'bank_name', 'bank_account_number',
            'ifsc_code', 'amount', 'reference_utr', 'deposit_date', 'notes'
        ]

    def validate_reference_utr(self, value):
        """Ensure the bank reference/UTR is unique - prevents duplicate deposits."""
        if BankDeposit.objects.filter(reference_utr=value).exists():
            raise serializers.ValidationError(
                f"A deposit with reference '{value}' already exists. "
                f"Duplicate bank references are not allowed."
            )
        return value

    def validate_amount(self, value):
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("Deposit amount must be greater than zero.")
        return value

    def create(self, validated_data):
        return BankDeposit.objects.create(
            **validated_data,
            deposited_by=self.context['request'].user,
            status=BankDeposit.Status.BANK_DEPOSITED,
        )


class SettleDepositSerializer(serializers.Serializer):
    settlement_date = serializers.DateField(required=False)


# ─── Views ────────────────────────────────────────────────────────────────────

class BankDepositListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/reconciliation/deposits/ - List all bank deposits
    POST /api/reconciliation/deposits/ - Create a new bank deposit
    """
    permission_classes = [IsBranchManagerOrAdmin]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CreateBankDepositSerializer
        return BankDepositSerializer

    def get_queryset(self):
        user = self.request.user
        qs = BankDeposit.objects.select_related('branch', 'deposited_by').order_by('-deposit_date')

        # Branch managers only see their branch's deposits
        if user.is_branch_manager and user.branch:
            qs = qs.filter(branch=user.branch)

        # Filtering by query params
        status_filter = self.request.query_params.get('status')
        branch_id = self.request.query_params.get('branch_id')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        if date_from:
            qs = qs.filter(deposit_date__gte=date_from)
        if date_to:
            qs = qs.filter(deposit_date__lte=date_to)

        return qs


class BankDepositDetailView(generics.RetrieveAPIView):
    """GET /api/reconciliation/deposits/<id>/ - Get a single deposit detail"""
    serializer_class = BankDepositSerializer
    permission_classes = [IsBranchManagerOrAdmin]
    queryset = BankDeposit.objects.all()


class SettleDepositView(APIView):
    """
    POST /api/reconciliation/deposits/<id>/settle/
    Mark a bank deposit as SETTLED once confirmed by the company's bank account statement.
    This is the final stage: BANK_DEPOSITED → SETTLED.
    Note: SETTLED records cannot be modified (immutability enforced).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            deposit = BankDeposit.objects.get(pk=pk)
        except BankDeposit.DoesNotExist:
            return Response({'error': 'Bank deposit not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Prevent modification of already-settled records (immutability)
        if deposit.status == BankDeposit.Status.SETTLED:
            return Response(
                {'error': 'This deposit is already SETTLED and cannot be modified.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = SettleDepositSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        settlement_date = serializer.validated_data.get('settlement_date') or timezone.localdate()
        deposit.mark_settled(settlement_date=settlement_date)

        return Response(BankDepositSerializer(deposit).data)
