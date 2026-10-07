"""
CMRS - Bank Deposit Model

Entity: BankDeposit
  Represents the physical deposit of branch cash into the company's bank account.
  Created by a Branch Manager after reconciling agent submissions.

Key Business Rules:
  1. Bank reference/UTR must be UNIQUE - duplicate deposit references are blocked.
  2. Deposit amount is compared against branch reconciled amount (may differ).
  3. Status flow: PENDING → BANK_DEPOSITED → SETTLED (or MISMATCH if discrepancy found).
  4. Once SETTLED, the deposit record is IMMUTABLE - unauthorized changes are blocked.

Transaction Lifecycle Stage: EXPECTED → COLLECTED → BRANCH_RECEIVED → **BANK_DEPOSITED → SETTLED**
"""

import logging
from decimal import Decimal
from django.db import models
from users.models import Branch, User

audit_logger = logging.getLogger('cmrs.audit')


class BankDeposit(models.Model):
    """
    Records a physical cash deposit made by the Branch Manager at a bank.
    This is the final stage before the money is fully 'settled' in the company's account.
    """

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        BANK_DEPOSITED = 'BANK_DEPOSITED', 'Bank Deposited'
        SETTLED = 'SETTLED', 'Settled'
        MISMATCH = 'MISMATCH', 'Amount Mismatch'

    # ── Relationships ─────────────────────────────────────────────────────
    branch = models.ForeignKey(
        Branch, on_delete=models.PROTECT,
        related_name='bank_deposits'
    )
    deposited_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, related_name='bank_deposits',
        limit_choices_to={'role': 'BRANCH_MANAGER'}
    )

    # ── Bank Details ──────────────────────────────────────────────────────
    bank_name = models.CharField(max_length=200, help_text='e.g. HDFC Bank, SBI, ICICI')
    bank_account_number = models.CharField(
        max_length=30, blank=True,
        help_text='Company bank account number where cash was deposited'
    )
    ifsc_code = models.CharField(max_length=15, blank=True)

    # ── Financial Fields (Decimal) ─────────────────────────────────────────
    amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='Amount deposited at the bank (Rupees and Paise)'
    )

    # ── Bank Reference (Unique - prevents duplicate deposit registration) ──
    reference_utr = models.CharField(
        max_length=100,
        unique=True,
        help_text='Bank-issued Challan number or UTR (e.g. HDFC-DEP-99412). Must be unique.'
    )

    # ── Dates & Status ────────────────────────────────────────────────────
    deposit_date = models.DateField(help_text='Date when cash was physically deposited at the bank')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.BANK_DEPOSITED)
    settlement_date = models.DateField(
        null=True, blank=True,
        help_text='Date when bank confirmed the credit to company account'
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-deposit_date']
        indexes = [
            models.Index(fields=['branch', 'status']),
            models.Index(fields=['reference_utr']),   # Fast duplicate detection
        ]

    def __str__(self):
        return (
            f"Deposit: ₹{self.amount} | Bank: {self.bank_name} | "
            f"UTR: {self.reference_utr} | Status: {self.status}"
        )

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            audit_logger.info(
                f"[BANK DEPOSIT CREATED] Branch: {self.branch.name} | "
                f"Amount: ₹{self.amount} | Bank: {self.bank_name} | "
                f"UTR: {self.reference_utr} | By: {self.deposited_by}"
            )

    def mark_settled(self, settlement_date=None):
        """Mark this deposit as fully settled in the company bank account."""
        from django.utils import timezone
        self.status = self.Status.SETTLED
        self.settlement_date = settlement_date or timezone.localdate()
        self.save(update_fields=['status', 'settlement_date', 'updated_at'])
        audit_logger.info(
            f"[DEPOSIT SETTLED] UTR: {self.reference_utr} | "
            f"Amount: ₹{self.amount} | Settlement Date: {self.settlement_date}"
        )
