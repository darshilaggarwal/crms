"""
CMRS - Cash Collection Service Layer

This is the CORE FINANCIAL BRAIN of the system.
All business logic for recording payments is centralized here.

Business Rules Enforced:
  1. Partial payments allowed: can pay less than the full EMI.
  2. Over-collection blocked: cannot collect more than remaining outstanding balance.
  3. Duplicate collection blocked: same schedule cannot be paid twice in the same transaction.
  4. All money operations use Decimal arithmetic - zero floating-point errors.
  5. Collection + Loan balance update happen in a single atomic transaction.
     If either fails, both are rolled back. No partial state corruption.
"""

import logging
from decimal import Decimal
from django.db import transaction
from django.core.exceptions import ValidationError

from loans.models import RepaymentSchedule, Loan
from cash_collections.models import Collection
from users.models import User

audit_logger = logging.getLogger('cmrs.audit')


class CollectionService:
    """
    Service class for recording cash collections.
    All methods are static - no instance needed.
    """

    @staticmethod
    @transaction.atomic
    def record_payment(
        agent: User,
        schedule: RepaymentSchedule,
        amount: Decimal,
        notes: str = ''
    ) -> Collection:
        """
        Records a cash payment by an agent for a loan EMI installment.

        Steps (all in one atomic transaction):
        1. Validate the amount (must be positive, cannot exceed outstanding)
        2. Check for duplicate active collection on the same schedule
        3. Create the Collection record (receipt auto-generated)
        4. Update RepaymentSchedule paid_amount and status
        5. Reduce the Loan outstanding balance
        6. Log the audit trail

        Args:
            agent:    The User (role=AGENT) collecting the cash.
            schedule: The RepaymentSchedule installment being paid.
            amount:   Decimal amount collected from the customer.
            notes:    Optional agent notes.

        Returns:
            Collection: The created collection record with receipt number.

        Raises:
            ValidationError: If payment is invalid (negative, over-collected, duplicate).
        """

        # ── Validation: Amount must be positive ───────────────────────────
        if amount <= Decimal('0.00'):
            raise ValidationError("Collection amount must be greater than zero.")

        # ── Validation: Cannot over-collect beyond outstanding loan balance ─
        loan = schedule.loan
        if amount > loan.outstanding_amount:
            raise ValidationError(
                f"Collection amount ₹{amount} exceeds loan outstanding balance "
                f"₹{loan.outstanding_amount}. Over-collection is not allowed."
            )

        # ── Validation: Cannot collect more than what's due for this EMI ──
        if amount > schedule.balance_due:
            raise ValidationError(
                f"Collection amount ₹{amount} exceeds the balance due "
                f"₹{schedule.balance_due} for EMI #{schedule.installment_number}."
            )

        # ── Validation: Block duplicate collection on a fully PAID schedule ─
        if schedule.status == RepaymentSchedule.Status.PAID:
            raise ValidationError(
                f"EMI #{schedule.installment_number} for Loan {loan.loan_number} "
                f"is already fully paid. Duplicate collection blocked."
            )

        # ── All checks passed. Create the Collection record. ──────────────
        collection = Collection.objects.create(
            schedule=schedule,
            agent=agent,
            amount_collected=amount,
            notes=notes,
        )

        # ── Update EMI installment status (handles partial payments) ──────
        actually_applied = schedule.apply_payment(amount)

        # ── Reduce loan outstanding balance ────────────────────────────────
        loan.reduce_outstanding(actually_applied)

        audit_logger.info(
            f"[PAYMENT RECORDED] "
            f"Agent: {agent.username} | "
            f"Loan: {loan.loan_number} | "
            f"EMI: #{schedule.installment_number} | "
            f"Collected: ₹{amount} | "
            f"Receipt: {collection.receipt_number} | "
            f"Loan Outstanding After: ₹{loan.outstanding_amount}"
        )

        return collection

    @staticmethod
    @transaction.atomic
    def submit_to_branch(agent: User) -> 'AgentSubmission':
        """
        Submits all of an agent's HELD_BY_AGENT collections to their branch.
        Creates an AgentSubmission record representing the physical cash handover.

        Args:
            agent: The agent submitting their daily cash collection.

        Returns:
            AgentSubmission: The pending submission record for the branch manager.

        Raises:
            ValidationError: If agent has no cash to submit or no branch assigned.
        """
        from cash_collections.models import AgentSubmission

        if not agent.branch:
            raise ValidationError("Agent is not assigned to any branch.")

        # Get all collections currently held by this agent (not yet submitted)
        pending_collections = Collection.objects.filter(
            agent=agent,
            status=Collection.Status.HELD_BY_AGENT
        )

        if not pending_collections.exists():
            raise ValidationError("No pending collections to submit. Collect cash first.")

        # Calculate total expected amount from all collections
        total_expected = sum(c.amount_collected for c in pending_collections)

        # Create the submission record
        submission = AgentSubmission.objects.create(
            agent=agent,
            branch=agent.branch,
            expected_amount=total_expected,
        )
        submission.collections.set(pending_collections)

        # Mark all included collections as submitted
        pending_collections.update(status=Collection.Status.SUBMITTED_TO_BRANCH)

        audit_logger.info(
            f"[AGENT SUBMISSION] "
            f"Agent: {agent.username} | "
            f"Branch: {agent.branch.name} | "
            f"Collections: {pending_collections.count()} | "
            f"Total Expected: ₹{total_expected} | "
            f"Submission ID: {submission.id}"
        )

        return submission
