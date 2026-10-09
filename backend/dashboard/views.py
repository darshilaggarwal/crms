"""
CMRS - Executive Dashboard View

Provides the Head Office / Admin with a real-time summary of:
  1. Total Expected Collections   (All pending EMIs)
  2. Total Collected              (All cash collected from customers)
  3. Cash Held by Agents          (In-transit: collected but not yet at branch)
  4. Cash at Branches             (Reconciled but not yet deposited in bank)
  5. Bank Deposited               (Cash deposited into bank account)
  6. Total Settled                (Fully reconciled in company bank account)
  7. Total Discrepancies          (All cash shortages / excess flagged)
  8. Outstanding Loan Balance     (Company's total receivables)

Supports filtering by: date range, branch, agent, status.
"""

from decimal import Decimal
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Sum, Count, Q
from django.utils import timezone

from loans.models import RepaymentSchedule, Loan
from cash_collections.models import Collection, AgentSubmission
from reconciliation.models import BankDeposit


class DashboardSummaryView(APIView):
    """
    GET /api/dashboard/summary/
    Returns the complete financial summary for the executive dashboard.
    Supports filtering by branch_id, agent_id, date_from, date_to.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Read optional query filters
        branch_id = request.query_params.get('branch_id')
        agent_id = request.query_params.get('agent_id')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        # ── 1. EXPECTED COLLECTIONS ───────────────────────────────────────
        schedule_qs = RepaymentSchedule.objects.exclude(
            status=RepaymentSchedule.Status.PAID
        )
        if branch_id:
            schedule_qs = schedule_qs.filter(loan__customer__assigned_agent__branch_id=branch_id)
        if agent_id:
            schedule_qs = schedule_qs.filter(loan__customer__assigned_agent_id=agent_id)

        total_expected = schedule_qs.aggregate(
            total=Sum('expected_amount')
        )['total'] or Decimal('0.00')

        # Outstanding balance per EMI
        outstanding_per_emi = schedule_qs.aggregate(
            total=Sum('expected_amount')
        )['total'] or Decimal('0.00')

        # ── 2. TOTAL COLLECTED ────────────────────────────────────────────
        collection_qs = Collection.objects.all()
        if branch_id:
            collection_qs = collection_qs.filter(agent__branch_id=branch_id)
        if agent_id:
            collection_qs = collection_qs.filter(agent_id=agent_id)
        if date_from:
            collection_qs = collection_qs.filter(collected_at__date__gte=date_from)
        if date_to:
            collection_qs = collection_qs.filter(collected_at__date__lte=date_to)

        total_collected = collection_qs.aggregate(
            total=Sum('amount_collected')
        )['total'] or Decimal('0.00')

        # ── 3. CASH HELD BY AGENTS (In-Transit) ───────────────────────────
        cash_held_by_agents = collection_qs.filter(
            status=Collection.Status.HELD_BY_AGENT
        ).aggregate(total=Sum('amount_collected'))['total'] or Decimal('0.00')

        # ── 4. CASH AT BRANCHES (Reconciled but not yet in bank) ──────────
        submission_qs = AgentSubmission.objects.filter(status=AgentSubmission.Status.APPROVED)
        if branch_id:
            submission_qs = submission_qs.filter(branch_id=branch_id)

        cash_at_branches = submission_qs.aggregate(
            total=Sum('actual_amount')
        )['total'] or Decimal('0.00')

        # Subtract amounts that have already been deposited into bank
        deposit_qs = BankDeposit.objects.all()
        if branch_id:
            deposit_qs = deposit_qs.filter(branch_id=branch_id)

        total_bank_deposited = deposit_qs.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')

        cash_at_branches = max(Decimal('0.00'), cash_at_branches - total_bank_deposited)

        # ── 5. SETTLED ────────────────────────────────────────────────────
        total_settled = deposit_qs.filter(
            status=BankDeposit.Status.SETTLED
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # ── 6. TOTAL DISCREPANCIES ────────────────────────────────────────
        discrepancy_data = AgentSubmission.objects.filter(
            status=AgentSubmission.Status.APPROVED
        ).exclude(discrepancy=0).exclude(discrepancy__isnull=True)

        if branch_id:
            discrepancy_data = discrepancy_data.filter(branch_id=branch_id)

        total_shortage = discrepancy_data.filter(discrepancy__lt=0).aggregate(
            total=Sum('discrepancy')
        )['total'] or Decimal('0.00')

        total_excess = discrepancy_data.filter(discrepancy__gt=0).aggregate(
            total=Sum('discrepancy')
        )['total'] or Decimal('0.00')

        # ── 7. LOAN OUTSTANDING BALANCE ───────────────────────────────────
        loan_qs = Loan.objects.filter(status=Loan.Status.ACTIVE)
        if branch_id:
            loan_qs = loan_qs.filter(customer__assigned_agent__branch_id=branch_id)
        if agent_id:
            loan_qs = loan_qs.filter(customer__assigned_agent_id=agent_id)

        total_loan_outstanding = loan_qs.aggregate(
            total=Sum('outstanding_amount')
        )['total'] or Decimal('0.00')

        return Response({
            'summary': {
                'total_expected_collections': str(total_expected),
                'total_collected': str(total_collected),
                'cash_held_by_agents': str(cash_held_by_agents),
                'cash_at_branches': str(cash_at_branches),
                'total_bank_deposited': str(total_bank_deposited),
                'total_settled': str(total_settled),
                'total_loan_outstanding': str(total_loan_outstanding),
            },
            'discrepancies': {
                'total_shortage': str(abs(total_shortage)),
                'total_excess': str(total_excess),
                'net_discrepancy': str(total_shortage + total_excess),
            },
            'transaction_lifecycle': {
                'expected': str(total_expected),
                'collected': str(total_collected),
                'branch_received': str(cash_at_branches + total_bank_deposited),
                'bank_deposited': str(total_bank_deposited),
                'settled': str(total_settled),
            },
            'filters_applied': {
                'branch_id': branch_id,
                'agent_id': agent_id,
                'date_from': date_from,
                'date_to': date_to,
            },
            'generated_at': timezone.now().isoformat(),
        })


class AgentSummaryView(APIView):
    """
    GET /api/dashboard/agents/
    Per-agent collection summary for branch managers.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from users.models import User
        agents = User.objects.filter(role='AGENT')

        if request.user.is_branch_manager and request.user.branch:
            agents = agents.filter(branch=request.user.branch)

        result = []
        for agent in agents:
            collected = Collection.objects.filter(agent=agent).aggregate(
                total=Sum('amount_collected')
            )['total'] or Decimal('0.00')

            in_hand = Collection.objects.filter(
                agent=agent, status=Collection.Status.HELD_BY_AGENT
            ).aggregate(total=Sum('amount_collected'))['total'] or Decimal('0.00')

            unsubmitted_count = Collection.objects.filter(
                agent=agent, status=Collection.Status.HELD_BY_AGENT
            ).count()

            result.append({
                'agent_id': agent.id,
                'agent_name': agent.get_full_name() or agent.username,
                'username': agent.username,
                'employee_id': agent.employee_id,
                'branch': agent.branch.name if agent.branch else None,
                'total_collected': str(collected),
                'cash_in_hand': str(in_hand),
                'unsubmitted_count': unsubmitted_count,
            })

        return Response({'agents': result})
