"""
CMRS - Loan Serializers & Views
Customer and Loan management endpoints.
"""

from decimal import Decimal
from rest_framework import serializers, generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import transaction

from loans.models import Customer, Loan, RepaymentSchedule
from users.models import User
from users.serializers import UserSerializer


# ─── Serializers ──────────────────────────────────────────────────────────────

class CustomerSerializer(serializers.ModelSerializer):
    assigned_agent_name = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'phone', 'alternate_phone', 'business_name',
            'business_type', 'address', 'city',
            'assigned_agent', 'assigned_agent_name', 'created_at'
        ]

    def get_assigned_agent_name(self, obj):
        return obj.assigned_agent.get_full_name() if obj.assigned_agent else None


class RepaymentScheduleSerializer(serializers.ModelSerializer):
    balance_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = RepaymentSchedule
        fields = [
            'id', 'installment_number', 'due_date',
            'expected_amount', 'paid_amount', 'balance_due', 'status'
        ]


class LoanSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    repayment_schedules = RepaymentScheduleSerializer(many=True, read_only=True)

    class Meta:
        model = Loan
        fields = [
            'id', 'loan_number', 'customer', 'customer_name',
            'principal_amount', 'interest_rate', 'total_payable',
            'outstanding_amount', 'tenure_months', 'disbursement_date',
            'status', 'repayment_schedules', 'created_at'
        ]
        read_only_fields = ['loan_number', 'outstanding_amount', 'total_payable']


class CreateLoanSerializer(serializers.ModelSerializer):
    """Serializer for creating a new loan with auto-generated repayment schedule."""

    class Meta:
        model = Loan
        fields = [
            'customer', 'principal_amount', 'interest_rate',
            'tenure_months', 'disbursement_date'
        ]

    def create(self, validated_data):
        """
        Creates a Loan and auto-generates the full EMI repayment schedule.
        Uses @transaction.atomic to ensure loan and all EMI rows are created together.
        If any step fails, the entire operation is rolled back.
        """
        from dateutil.relativedelta import relativedelta
        from django.utils import timezone
        import uuid

        with transaction.atomic():
            # Calculate total payable using simple interest formula
            principal = validated_data['principal_amount']
            rate = validated_data['interest_rate']
            months = validated_data['tenure_months']

            # Simple interest: I = P * R * T / 100
            total_interest = (principal * rate * Decimal(str(months / 12))) / Decimal('100')
            total_payable = principal + total_interest
            emi_amount = (total_payable / Decimal(str(months))).quantize(Decimal('0.01'))

            # Generate unique loan number
            loan_number = f"LN-{timezone.localdate().year}-{str(uuid.uuid4().int)[:4]}"

            loan = Loan.objects.create(
                **validated_data,
                loan_number=loan_number,
                total_payable=total_payable,
                outstanding_amount=total_payable,
                created_by=self.context['request'].user,
            )

            # Auto-generate EMI schedule
            disburse_date = validated_data['disbursement_date']
            schedules = []
            for i in range(1, months + 1):
                due_date = disburse_date + relativedelta(months=i)
                # Last EMI collects any remaining balance due to rounding
                amount = emi_amount if i < months else (total_payable - emi_amount * (months - 1))
                schedules.append(RepaymentSchedule(
                    loan=loan,
                    installment_number=i,
                    due_date=due_date,
                    expected_amount=amount,
                ))
            RepaymentSchedule.objects.bulk_create(schedules)

        return loan


# ─── Views ────────────────────────────────────────────────────────────────────

class CustomerListCreateView(generics.ListCreateAPIView):
    """List all customers or create a new customer."""
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_agent:
            # Agents only see their own assigned customers
            return Customer.objects.filter(assigned_agent=user, is_active=True)
        elif user.is_branch_manager and user.branch:
            # Branch managers see customers assigned to agents in their branch
            return Customer.objects.filter(
                assigned_agent__branch=user.branch, is_active=True
            )
        # Admins see all
        return Customer.objects.filter(is_active=True)


class CustomerDetailView(generics.RetrieveUpdateAPIView):
    """View or update a single customer's details."""
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Customer.objects.all()


class LoanListCreateView(generics.ListCreateAPIView):
    """List loans or create a new loan (with auto-generated EMI schedule)."""
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CreateLoanSerializer
        return LoanSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Loan.objects.select_related('customer').prefetch_related('repayment_schedules')
        if user.is_agent:
            return qs.filter(customer__assigned_agent=user)
        elif user.is_branch_manager and user.branch:
            return qs.filter(customer__assigned_agent__branch=user.branch)
        return qs


class LoanDetailView(generics.RetrieveAPIView):
    """Get full loan details including repayment schedule."""
    serializer_class = LoanSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Loan.objects.prefetch_related('repayment_schedules').all()


class RepaymentScheduleListView(generics.ListAPIView):
    """Get all EMI installments for a specific loan."""
    serializer_class = RepaymentScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        loan_id = self.kwargs['loan_id']
        return RepaymentSchedule.objects.filter(loan_id=loan_id).order_by('installment_number')
