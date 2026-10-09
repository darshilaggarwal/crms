"""
CMRS - Cash Collection Serializers & Views
Agent-facing endpoints for collecting cash and submitting to branch.
"""

from decimal import Decimal
from rest_framework import serializers, generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from django.utils import timezone

from cash_collections.models import Collection, AgentSubmission
from cash_collections.services import CollectionService
from loans.models import RepaymentSchedule


# ─── Custom Permissions ───────────────────────────────────────────────────────

class IsAgent(permissions.BasePermission):
    """Only collection agents can access this view."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_agent


class IsBranchManagerOrAdmin(permissions.BasePermission):
    """Only branch managers or admins can access this view."""
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            (request.user.is_branch_manager or request.user.is_admin)
        )


# ─── Serializers ──────────────────────────────────────────────────────────────

class CollectionSerializer(serializers.ModelSerializer):
    agent_name = serializers.CharField(source='agent.get_full_name', read_only=True)
    customer_name = serializers.CharField(
        source='schedule.loan.customer.name', read_only=True
    )
    loan_number = serializers.CharField(source='schedule.loan.loan_number', read_only=True)
    installment_number = serializers.IntegerField(
        source='schedule.installment_number', read_only=True
    )

    class Meta:
        model = Collection
        fields = [
            'id', 'receipt_number', 'agent', 'agent_name',
            'customer_name', 'loan_number', 'installment_number',
            'amount_collected', 'status', 'collected_at', 'notes'
        ]
        read_only_fields = ['receipt_number', 'agent', 'status', 'collected_at']


class RecordPaymentSerializer(serializers.Serializer):
    """Input serializer for recording a cash payment."""
    schedule_id = serializers.IntegerField(help_text='ID of the RepaymentSchedule EMI being paid')
    amount = serializers.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='Cash amount collected from customer (must be > 0 and <= balance due)'
    )
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_amount(self, value):
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value


class AgentSubmissionSerializer(serializers.ModelSerializer):
    agent_name = serializers.CharField(source='agent.get_full_name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    collections_count = serializers.IntegerField(source='collections.count', read_only=True)
    discrepancy_label = serializers.SerializerMethodField()

    class Meta:
        model = AgentSubmission
        fields = [
            'id', 'agent', 'agent_name', 'branch', 'branch_name',
            'expected_amount', 'actual_amount', 'discrepancy', 'discrepancy_label',
            'status', 'manager_notes', 'collections_count',
            'submission_date', 'verified_at'
        ]

    def get_discrepancy_label(self, obj):
        if obj.discrepancy is None:
            return None
        if obj.discrepancy < 0:
            return f"SHORTAGE of ₹{abs(obj.discrepancy)}"
        elif obj.discrepancy > 0:
            return f"EXCESS of ₹{obj.discrepancy}"
        return "MATCHED"


class VerifySubmissionSerializer(serializers.Serializer):
    """Input for branch manager to verify an agent's cash submission."""
    actual_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='Physical cash amount counted by branch manager'
    )
    action = serializers.ChoiceField(
        choices=['APPROVE', 'REJECT'],
        help_text='APPROVE to accept the submission, REJECT to send it back'
    )
    manager_notes = serializers.CharField(
        required=False, allow_blank=True,
        help_text='Mandatory notes if there is a discrepancy'
    )

    def validate(self, data):
        actual = data['actual_amount']
        # Calculate expected from context (passed in view)
        return data


# ─── Views ────────────────────────────────────────────────────────────────────

class RecordPaymentView(APIView):
    """
    POST /api/collections/collect/
    Agent records a cash payment from a customer.
    Handles full and partial payments. Generates a unique receipt number.
    """
    permission_classes = [IsAgent]

    def post(self, request):
        serializer = RecordPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        schedule_id = serializer.validated_data['schedule_id']
        amount = serializer.validated_data['amount']
        notes = serializer.validated_data.get('notes', '')

        try:
            schedule = RepaymentSchedule.objects.select_related('loan__customer').get(
                id=schedule_id
            )
        except RepaymentSchedule.DoesNotExist:
            return Response({'error': 'Repayment schedule not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            collection = CollectionService.record_payment(
                agent=request.user,
                schedule=schedule,
                amount=amount,
                notes=notes,
            )
        except (ValidationError, Exception) as e:
            error_msg = e.messages if hasattr(e, 'messages') else str(e)
            return Response({'error': error_msg}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            CollectionSerializer(collection).data,
            status=status.HTTP_201_CREATED
        )


class AgentDailyCollectionsView(generics.ListAPIView):
    """
    GET /api/collections/my-collections/
    Agent views all collections currently in their possession (HELD_BY_AGENT).
    Also shows the total cash currently in their custody.
    """
    serializer_class = CollectionSerializer
    permission_classes = [IsAgent]

    def get_queryset(self):
        return Collection.objects.filter(
            agent=self.request.user,
            status=Collection.Status.HELD_BY_AGENT
        ).select_related('schedule__loan__customer')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        total_cash = sum(c.amount_collected for c in queryset)
        data = self.get_serializer(queryset, many=True).data
        return Response({
            'total_cash_in_hand': str(total_cash),
            'collections_count': len(data),
            'collections': data
        })


class SubmitToBranchView(APIView):
    """
    POST /api/collections/submit-to-branch/
    Agent submits all held cash to their branch, OR
    Branch Manager / Admin receives cash from a specific agent at the branch counter.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        agent_id = request.data.get('agent_id')
        if agent_id:
            # Branch manager or Admin receiving cash from a specific agent
            if not (request.user.is_branch_manager or request.user.is_admin):
                return Response(
                    {'error': 'Only branch managers or admins can receive cash on behalf of agents.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            try:
                from users.models import User
                target_agent = User.objects.get(id=agent_id, role='AGENT')
            except User.DoesNotExist:
                return Response({'error': 'Agent not found.'}, status=status.HTTP_404_NOT_FOUND)

            # If branch manager, ensure agent belongs to manager's branch
            if request.user.is_branch_manager and request.user.branch and target_agent.branch != request.user.branch:
                return Response({'error': 'Agent does not belong to your branch.'}, status=status.HTTP_403_FORBIDDEN)
        else:
            if not request.user.is_agent:
                return Response(
                    {'error': 'Agent ID is required when receiving cash as manager.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            target_agent = request.user

        try:
            submission = CollectionService.submit_to_branch(agent=target_agent)
        except (ValidationError, Exception) as e:
            error_msg = e.messages if hasattr(e, 'messages') else str(e)
            return Response({'error': error_msg}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            AgentSubmissionSerializer(submission).data,
            status=status.HTTP_201_CREATED
        )


class PendingSubmissionsView(generics.ListAPIView):
    """
    GET /api/collections/submissions/
    Branch manager sees all pending agent submissions to verify.
    """
    serializer_class = AgentSubmissionSerializer
    permission_classes = [IsBranchManagerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        qs = AgentSubmission.objects.select_related('agent', 'branch').prefetch_related('collections')
        if user.is_branch_manager and user.branch:
            qs = qs.filter(branch=user.branch)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        return qs


class VerifySubmissionView(APIView):
    """
    POST /api/collections/submissions/<id>/verify/
    Branch manager verifies (approves or rejects) an agent submission.
    Calculates discrepancy between expected and actual physical cash count.
    """
    permission_classes = [IsBranchManagerOrAdmin]

    def post(self, request, pk):
        try:
            submission = AgentSubmission.objects.get(pk=pk)
        except AgentSubmission.DoesNotExist:
            return Response({'error': 'Submission not found.'}, status=status.HTTP_404_NOT_FOUND)

        if submission.status != AgentSubmission.Status.PENDING:
            return Response(
                {'error': f'Submission is already {submission.status}. Cannot re-verify.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = VerifySubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        actual_amount = serializer.validated_data['actual_amount']
        action = serializer.validated_data['action']
        manager_notes = serializer.validated_data.get('manager_notes', '')

        # Calculate discrepancy
        discrepancy = actual_amount - submission.expected_amount

        # Require notes if there's a discrepancy
        if discrepancy != 0 and not manager_notes:
            return Response(
                {'error': 'Manager notes are mandatory when a cash discrepancy exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        submission.actual_amount = actual_amount
        submission.discrepancy = discrepancy
        submission.manager_notes = manager_notes
        submission.verified_by = request.user
        submission.verified_at = timezone.now()

        if action == 'APPROVE':
            submission.status = AgentSubmission.Status.APPROVED
            # Mark all collections in this submission as RECONCILED
            submission.collections.update(status=Collection.Status.RECONCILED)
        else:
            submission.status = AgentSubmission.Status.REJECTED
            # Return collections to HELD_BY_AGENT so agent can resubmit
            submission.collections.update(status=Collection.Status.HELD_BY_AGENT)

        submission.save()

        return Response(AgentSubmissionSerializer(submission).data)


class CollectionHistoryView(generics.ListAPIView):
    """
    GET /api/collections/history/
    View all collections with filtering by date, agent, status.
    """
    serializer_class = CollectionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Collection.objects.select_related(
            'agent', 'schedule__loan__customer'
        ).order_by('-collected_at')

        if user.is_agent:
            qs = qs.filter(agent=user)
        elif user.is_branch_manager and user.branch:
            qs = qs.filter(agent__branch=user.branch)

        # Filters from query params
        date = self.request.query_params.get('date')
        agent_id = self.request.query_params.get('agent_id')
        status_filter = self.request.query_params.get('status')

        if date:
            qs = qs.filter(collected_at__date=date)
        if agent_id:
            qs = qs.filter(agent_id=agent_id)
        if status_filter:
            qs = qs.filter(status=status_filter.upper())

        return qs
