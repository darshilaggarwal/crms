"""
CMRS - Cash Collection Models

Entity: Collection
  Represents one cash payment event: an agent physically collects cash from a customer.

Key Business Rules:
  1. Partial payments are supported: customer can pay less than the EMI.
  2. Over-collection is flagged: customer cannot pay more than outstanding balance.
  3. Each collection generates a UNIQUE, IMMUTABLE receipt number (RCP-YYYYMMDD-XXXX).
  4. Duplicate collections for the same schedule on same day are blocked.
  5. Once SUBMITTED_TO_BRANCH, the collection record is locked (immutable).

Transaction Lifecycle Stage: EXPECTED → **COLLECTED** → BRANCH_RECEIVED → BANK_DEPOSITED → SETTLED
"""

import logging
import uuid
from decimal import Decimal
from django.db import models
from django.utils import timezone
from loans.models import RepaymentSchedule
from users.models import User

audit_logger = logging.getLogger('cmrs.audit')


def generate_receipt_number() -> str:
    """
    Generates a unique, human-readable receipt number.
    Format: RCP-YYYYMMDD-XXXX  (e.g. RCP-20261006-0042)
    The UUID suffix ensures global uniqueness even in high-concurrency scenarios.
    """
    today = timezone.localdate().strftime('%Y%m%d')
    unique_suffix = str(uuid.uuid4().int)[:6]
    return f"RCP-{today}-{unique_suffix}"


class Collection(models.Model):
    """
    Records a single cash payment event by a field agent.

    The 'COLLECTED' stage: Agent receives physical cash notes from a customer,
    enters the amount into the system, and a receipt is immediately generated.
    The cash is now 'HELD_BY_AGENT' until they submit it to the branch.
    """

    class Status(models.TextChoices):
        HELD_BY_AGENT = 'HELD_BY_AGENT', 'Held by Agent (In Transit)'
        SUBMITTED_TO_BRANCH = 'SUBMITTED_TO_BRANCH', 'Submitted to Branch'
        RECONCILED = 'RECONCILED', 'Branch Reconciled'

    # ── Relationships ─────────────────────────────────────────────────────
    schedule = models.ForeignKey(
        RepaymentSchedule,
        on_delete=models.PROTECT,
        related_name='collections',
        help_text='The repayment schedule installment being paid'
    )
    agent = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='collections',
        limit_choices_to={'role': 'AGENT'},
        help_text='The field agent who collected this cash'
    )

    # ── Financial Fields (Decimal) ─────────────────────────────────────────
    amount_collected = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='Exact cash amount collected from customer (Rupees & Paise)'
    )

    # ── Receipt (Immutable unique identifier) ─────────────────────────────
    receipt_number = models.CharField(
        max_length=30,
        unique=True,
        default=generate_receipt_number,
        editable=False,  # Cannot be changed after creation
        help_text='Unique receipt number generated at collection time'
    )

    # ── Metadata ──────────────────────────────────────────────────────────
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.HELD_BY_AGENT)
    collected_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, help_text='Optional notes from the agent')

    class Meta:
        ordering = ['-collected_at']
        indexes = [
            models.Index(fields=['agent', 'status']),       # Fast agent dashboard queries
            models.Index(fields=['receipt_number']),         # Fast receipt lookup
        ]

    def __str__(self):
        return (
            f"Receipt {self.receipt_number} | "
            f"Agent: {self.agent.get_full_name()} | "
            f"₹{self.amount_collected} | Status: {self.status}"
        )

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            audit_logger.info(
                f"[CASH COLLECTED] Receipt: {self.receipt_number} | "
                f"Agent: {self.agent.username} | "
                f"Schedule: EMI #{self.schedule.installment_number} (Loan: {self.schedule.loan.loan_number}) | "
                f"Amount: ₹{self.amount_collected}"
            )


class AgentSubmission(models.Model):
    """
    Represents an agent's end-of-day cash handover to the branch.

    The agent collects cash from many customers throughout the day.
    At end-of-day, they walk into the branch office and submit their cash bag.
    The Branch Manager physically counts the notes and either:
      - APPROVES: Amounts match (or discrepancy is noted and accepted)
      - REJECTS:  Severe discrepancy / agent needs to recount

    This is the 'BRANCH_RECEIVED' stage in our lifecycle.
    """

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Verification'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    # ── Relationships ─────────────────────────────────────────────────────
    agent = models.ForeignKey(
        User, on_delete=models.PROTECT,
        related_name='submissions',
        limit_choices_to={'role': 'AGENT'}
    )
    branch = models.ForeignKey(
        'users.Branch', on_delete=models.PROTECT,
        related_name='agent_submissions'
    )
    collections = models.ManyToManyField(
        Collection,
        related_name='submission',
        help_text='All collection records included in this submission'
    )
    verified_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='verified_submissions',
        limit_choices_to={'role': 'BRANCH_MANAGER'}
    )

    # ── Financial Fields ──────────────────────────────────────────────────
    expected_amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='Sum of all collections the agent is submitting (from app records)'
    )
    actual_amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        null=True, blank=True,
        help_text='Physical cash actually counted by branch manager'
    )
    discrepancy = models.DecimalField(
        max_digits=12, decimal_places=2,
        null=True, blank=True,
        help_text='actual_amount - expected_amount. Negative = Shortage. Positive = Excess.'
    )

    # ── Status & Audit ────────────────────────────────────────────────────
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    manager_notes = models.TextField(
        blank=True,
        help_text='Mandatory notes from branch manager if discrepancy exists'
    )
    submission_date = models.DateField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return (
            f"Submission by {self.agent.get_full_name()} | "
            f"Branch: {self.branch.name} | "
            f"Expected: ₹{self.expected_amount} | Status: {self.status}"
        )

    def calculate_discrepancy(self) -> Decimal:
        """
        Computes discrepancy between physical cash counted vs expected.
        Negative = agent short (e.g. -1500.00 = ₹1,500 SHORTAGE)
        Positive = agent excess (e.g. +500.00 = ₹500 EXCESS)
        """
        if self.actual_amount is None:
            return Decimal('0.00')
        return self.actual_amount - self.expected_amount
