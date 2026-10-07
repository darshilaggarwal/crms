"""
CMRS - Loan Models

Entities:
  - Customer:           A borrower (small shopkeeper/MSME) who has taken a loan.
  - Loan:               The loan contract with principal, interest, and outstanding balance.
  - RepaymentSchedule:  The EMI calendar - each row = one installment due on a specific date.

Financial Safety:
  All monetary fields use DecimalField(max_digits=12, decimal_places=2).
  NEVER use FloatField for money - it causes rounding errors with paise.

Lifecycle:
  RepaymentSchedule.status:
    PENDING        → EMI is due but not yet paid.
    PARTIALLY_PAID → Customer paid some but not the full EMI amount.
    PAID           → Full EMI collected.
    OVERDUE        → Due date has passed without payment.
"""

import logging
from decimal import Decimal
from django.db import models
from users.models import User

audit_logger = logging.getLogger('cmrs.audit')


class Customer(models.Model):
    """
    Represents a borrower - typically a small business owner or MSME.
    Each customer is assigned to one field collection agent.
    """
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=15, unique=True)
    alternate_phone = models.CharField(max_length=15, blank=True)
    business_name = models.CharField(max_length=200, blank=True)
    business_type = models.CharField(max_length=100, blank=True)  # e.g. 'Grocery Store'
    address = models.TextField()
    city = models.CharField(max_length=100)

    # The specific agent responsible for collecting EMIs from this customer
    assigned_agent = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_customers',
        limit_choices_to={'role': 'AGENT'},
    )

    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.phone})"


class Loan(models.Model):
    """
    Represents a loan contract between the company and a customer.
    Tracks the outstanding balance that reduces as payments come in.
    """

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        CLOSED = 'CLOSED', 'Closed'
        DEFAULTED = 'DEFAULTED', 'Defaulted'
        RESTRUCTURED = 'RESTRUCTURED', 'Restructured'

    loan_number = models.CharField(max_length=20, unique=True)  # e.g. 'LN-2026-0001'
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='loans')

    # ── Financial Fields (All Decimal - NEVER float) ──────────────────────
    principal_amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='Original loan amount disbursed (e.g. 50000.00)'
    )
    interest_rate = models.DecimalField(
        max_digits=5, decimal_places=2,
        help_text='Annual interest rate in % (e.g. 12.00)'
    )
    total_payable = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='Principal + Total Interest to be repaid'
    )
    outstanding_amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='Remaining balance to be collected. Reduces on every payment.'
    )

    tenure_months = models.PositiveIntegerField(help_text='Loan duration in months')
    disbursement_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='loans_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Loan {self.loan_number} - {self.customer.name} (Outstanding: ₹{self.outstanding_amount})"

    def reduce_outstanding(self, amount: Decimal):
        """
        Atomically reduce the outstanding loan balance after a payment.
        Uses Decimal arithmetic to avoid floating-point rounding errors.
        """
        self.outstanding_amount = max(Decimal('0.00'), self.outstanding_amount - amount)
        if self.outstanding_amount == Decimal('0.00'):
            self.status = self.Status.CLOSED
        self.save(update_fields=['outstanding_amount', 'status', 'updated_at'])
        audit_logger.info(
            f"Loan {self.loan_number}: Outstanding reduced by ₹{amount}. "
            f"Remaining: ₹{self.outstanding_amount}. Status: {self.status}"
        )


class RepaymentSchedule(models.Model):
    """
    The EMI calendar for a loan.
    Each row represents one monthly installment.

    This is the 'EXPECTED' stage in our transaction lifecycle:
    EXPECTED → COLLECTED → BRANCH_RECEIVED → BANK_DEPOSITED → SETTLED
    """

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PARTIALLY_PAID = 'PARTIALLY_PAID', 'Partially Paid'
        PAID = 'PAID', 'Paid'
        OVERDUE = 'OVERDUE', 'Overdue'

    loan = models.ForeignKey(Loan, on_delete=models.CASCADE, related_name='repayment_schedules')
    installment_number = models.PositiveIntegerField()
    due_date = models.DateField()

    # ── Financial Fields (Decimal) ─────────────────────────────────────────
    expected_amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='The EMI amount the customer is expected to pay'
    )
    paid_amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        default=Decimal('0.00'),
        help_text='Total amount paid so far for this installment (supports partial payments)'
    )

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['due_date']
        unique_together = ['loan', 'installment_number']

    def __str__(self):
        return (
            f"EMI #{self.installment_number} for {self.loan.loan_number} "
            f"| Due: {self.due_date} | Expected: ₹{self.expected_amount} | Status: {self.status}"
        )

    @property
    def balance_due(self) -> Decimal:
        """Remaining amount not yet collected for this EMI."""
        return self.expected_amount - self.paid_amount

    def apply_payment(self, amount: Decimal) -> Decimal:
        """
        Apply a payment amount to this installment.
        Handles partial payments cleanly.
        Returns the amount actually applied (cannot exceed balance due).
        """
        applicable = min(amount, self.balance_due)
        self.paid_amount += applicable

        if self.paid_amount >= self.expected_amount:
            self.status = self.Status.PAID
        elif self.paid_amount > Decimal('0.00'):
            self.status = self.Status.PARTIALLY_PAID

        self.save(update_fields=['paid_amount', 'status', 'updated_at'])
        return applicable
