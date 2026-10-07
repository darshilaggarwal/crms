"""
CMRS - Automated Financial Unit Tests (pytest)

Tests the core financial business logic:
1. Full payment clears installment
2. Partial payment correctly updates balances
3. Over-collection is blocked
4. Duplicate payment on fully paid EMI is blocked
5. Discrepancy calculation works correctly
6. Duplicate bank UTR is rejected

Run with: pytest tests/ -v
"""

import pytest
from decimal import Decimal
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient


# ─── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def branch(db):
    from users.models import Branch
    return Branch.objects.create(name='Gurugram Main', code='BR-GGN-01', city='Gurugram')


@pytest.fixture
def agent(db, branch):
    from users.models import User
    user = User.objects.create_user(
        username='agent_suresh',
        password='pass1234',
        first_name='Suresh',
        last_name='Kumar',
        role='AGENT',
        branch=branch,
        employee_id='EMP-001'
    )
    return user


@pytest.fixture
def branch_manager(db, branch):
    from users.models import User
    return User.objects.create_user(
        username='manager_priya',
        password='pass1234',
        first_name='Priya',
        last_name='Sharma',
        role='BRANCH_MANAGER',
        branch=branch,
        employee_id='EMP-002'
    )


@pytest.fixture
def customer(db, agent):
    from loans.models import Customer
    return Customer.objects.create(
        name='Ramesh Kirana',
        phone='9876543210',
        business_name='Ramesh General Store',
        business_type='Grocery',
        address='Shop No. 12, Sector 14',
        city='Gurugram',
        assigned_agent=agent,
    )


@pytest.fixture
def loan(db, customer, agent):
    from loans.models import Loan, RepaymentSchedule
    from datetime import date

    loan = Loan.objects.create(
        loan_number='LN-2026-0001',
        customer=customer,
        principal_amount=Decimal('12000.00'),
        interest_rate=Decimal('12.00'),
        total_payable=Decimal('13440.00'),
        outstanding_amount=Decimal('13440.00'),
        tenure_months=6,
        disbursement_date=date(2026, 4, 1),
        status='ACTIVE',
        created_by=agent,
    )

    # Create 6 EMI installments (₹2,240 each)
    for i in range(1, 7):
        RepaymentSchedule.objects.create(
            loan=loan,
            installment_number=i,
            due_date=date(2026, 4 + i, 1),
            expected_amount=Decimal('2240.00'),
        )
    return loan


@pytest.fixture
def schedule(db, loan):
    """Returns the first (earliest) EMI schedule."""
    return loan.repayment_schedules.first()


# ─── Test Cases ────────────────────────────────────────────────────────────────

class TestFullPayment:
    """Test that a full EMI payment is correctly processed."""

    def test_full_payment_marks_schedule_as_paid(self, db, agent, schedule):
        from cash_collections.services import CollectionService

        collection = CollectionService.record_payment(
            agent=agent,
            schedule=schedule,
            amount=Decimal('2240.00'),
        )

        schedule.refresh_from_db()
        assert schedule.status == 'PAID', "Schedule should be PAID after full payment"
        assert schedule.paid_amount == Decimal('2240.00')
        assert collection.receipt_number.startswith('RCP-'), "Receipt must start with RCP-"

    def test_full_payment_reduces_loan_outstanding(self, db, agent, schedule, loan):
        from cash_collections.services import CollectionService

        original_outstanding = loan.outstanding_amount
        CollectionService.record_payment(agent=agent, schedule=schedule, amount=Decimal('2240.00'))

        loan.refresh_from_db()
        expected = original_outstanding - Decimal('2240.00')
        assert loan.outstanding_amount == expected, (
            f"Outstanding should be {expected}, got {loan.outstanding_amount}"
        )


class TestPartialPayment:
    """Test that partial payments are handled correctly."""

    def test_partial_payment_marks_schedule_partially_paid(self, db, agent, schedule):
        from cash_collections.services import CollectionService

        CollectionService.record_payment(
            agent=agent,
            schedule=schedule,
            amount=Decimal('1500.00'),  # Less than the ₹2,240 EMI
        )

        schedule.refresh_from_db()
        assert schedule.status == 'PARTIALLY_PAID'
        assert schedule.paid_amount == Decimal('1500.00')
        assert schedule.balance_due == Decimal('740.00')  # 2240 - 1500

    def test_partial_payment_correctly_reduces_outstanding(self, db, agent, schedule, loan):
        from cash_collections.services import CollectionService

        original_outstanding = loan.outstanding_amount
        CollectionService.record_payment(agent=agent, schedule=schedule, amount=Decimal('1000.00'))

        loan.refresh_from_db()
        assert loan.outstanding_amount == original_outstanding - Decimal('1000.00')


class TestOverCollectionBlocked:
    """Test that collecting more than the outstanding balance is blocked."""

    def test_over_collection_raises_validation_error(self, db, agent, schedule, loan):
        from cash_collections.services import CollectionService

        # Try to collect more than the entire loan outstanding
        over_amount = loan.outstanding_amount + Decimal('1.00')

        with pytest.raises((ValidationError, Exception)) as exc_info:
            CollectionService.record_payment(
                agent=agent,
                schedule=schedule,
                amount=over_amount,
            )
        assert 'over' in str(exc_info.value).lower() or 'exceed' in str(exc_info.value).lower()

    def test_zero_amount_is_blocked(self, db, agent, schedule):
        from cash_collections.services import CollectionService

        with pytest.raises((ValidationError, Exception)):
            CollectionService.record_payment(
                agent=agent,
                schedule=schedule,
                amount=Decimal('0.00'),
            )

    def test_negative_amount_is_blocked(self, db, agent, schedule):
        from cash_collections.services import CollectionService

        with pytest.raises((ValidationError, Exception)):
            CollectionService.record_payment(
                agent=agent,
                schedule=schedule,
                amount=Decimal('-500.00'),
            )


class TestDuplicatePaymentBlocked:
    """Test that a fully paid EMI cannot be collected again."""

    def test_duplicate_collection_on_paid_schedule_blocked(self, db, agent, schedule):
        from cash_collections.services import CollectionService

        # Pay the full EMI first
        CollectionService.record_payment(
            agent=agent, schedule=schedule, amount=Decimal('2240.00')
        )

        # Attempt a second collection - must fail
        with pytest.raises((ValidationError, Exception)) as exc_info:
            CollectionService.record_payment(
                agent=agent, schedule=schedule, amount=Decimal('100.00')
            )
        error_text = str(exc_info.value).lower()
        # System blocks re-payment by detecting balance_due == 0 OR explicit PAID check
        assert (
            'paid' in error_text or
            'duplicate' in error_text or
            'balance due' in error_text or
            'exceed' in error_text
        ), f"Expected a blocking error, got: {error_text}"


class TestDiscrepancyCalculation:
    """Test that cash discrepancies are calculated correctly."""

    def test_shortage_discrepancy(self):
        """Expected ₹50,000 but received ₹48,500 → discrepancy = -₹1,500"""
        from cash_collections.models import AgentSubmission
        submission = AgentSubmission()
        submission.expected_amount = Decimal('50000.00')
        submission.actual_amount = Decimal('48500.00')
        discrepancy = submission.calculate_discrepancy()
        assert discrepancy == Decimal('-1500.00'), f"Expected -1500.00, got {discrepancy}"

    def test_excess_discrepancy(self):
        """Expected ₹50,000 but received ₹51,000 → discrepancy = +₹1,000"""
        from cash_collections.models import AgentSubmission
        submission = AgentSubmission()
        submission.expected_amount = Decimal('50000.00')
        submission.actual_amount = Decimal('51000.00')
        discrepancy = submission.calculate_discrepancy()
        assert discrepancy == Decimal('1000.00')

    def test_matched_no_discrepancy(self):
        """Expected ₹50,000 and received ₹50,000 → discrepancy = ₹0"""
        from cash_collections.models import AgentSubmission
        submission = AgentSubmission()
        submission.expected_amount = Decimal('50000.00')
        submission.actual_amount = Decimal('50000.00')
        discrepancy = submission.calculate_discrepancy()
        assert discrepancy == Decimal('0.00')


class TestDuplicateBankUTRBlocked:
    """Test that duplicate bank deposit UTR references are rejected."""

    def test_duplicate_utr_rejected(self, db, branch, branch_manager):
        from reconciliation.models import BankDeposit
        from datetime import date

        # Create first deposit with UTR
        BankDeposit.objects.create(
            branch=branch,
            deposited_by=branch_manager,
            bank_name='HDFC Bank',
            amount=Decimal('100000.00'),
            reference_utr='HDFC-DEP-99999',
            deposit_date=date.today(),
        )

        # Attempt to create second deposit with SAME UTR - must fail
        with pytest.raises(Exception):  # IntegrityError from unique constraint
            BankDeposit.objects.create(
                branch=branch,
                deposited_by=branch_manager,
                bank_name='HDFC Bank',
                amount=Decimal('50000.00'),
                reference_utr='HDFC-DEP-99999',  # DUPLICATE!
                deposit_date=date.today(),
            )


class TestReceiptGeneration:
    """Test that unique receipts are generated correctly."""

    def test_receipt_format(self, db, agent, schedule):
        from cash_collections.services import CollectionService

        collection = CollectionService.record_payment(
            agent=agent, schedule=schedule, amount=Decimal('1000.00')
        )
        # Receipt format: RCP-YYYYMMDD-XXXXXX
        parts = collection.receipt_number.split('-')
        assert parts[0] == 'RCP'
        assert len(parts[1]) == 8   # YYYYMMDD

    def test_receipts_are_unique(self, db, agent, loan):
        from cash_collections.services import CollectionService

        schedules = list(loan.repayment_schedules.all())
        receipts = set()

        # Collect from multiple schedules - all receipts must be unique
        for schedule in schedules[:3]:
            collection = CollectionService.record_payment(
                agent=agent, schedule=schedule, amount=Decimal('1000.00')
            )
            receipts.add(collection.receipt_number)

        assert len(receipts) == 3, "All receipts must be unique"
