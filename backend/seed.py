"""
CMRS - Database Seed Script
===============================
Populates the database with realistic Indian fintech demo data.

Run with: python seed.py

Creates:
  - 1 Branch (Gurugram Main)
  - 1 Admin user
  - 1 Branch Manager
  - 2 Collection Agents
  - 5 Customers (small shopkeepers)
  - 5 Active Loans with full EMI schedules
  - Sample collections, submissions, and bank deposits for demo

Test Credentials (all passwords: 'pass1234'):
  Admin:          admin / admin@cmrs.in
  Branch Manager: manager_priya / manager@cmrs.in
  Agent 1:        agent_suresh / agent1@cmrs.in
  Agent 2:        agent_mohan / agent2@cmrs.in
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date, timedelta

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cmrs.settings')
django.setup()

# Now import models
from users.models import Branch, User
from loans.models import Customer, Loan, RepaymentSchedule
from cash_collections.models import Collection, AgentSubmission
from reconciliation.models import BankDeposit
from django.db import transaction


def clear_data():
    """Clear all existing data for a fresh demo environment."""
    print("🗑️  Clearing existing data...")
    BankDeposit.objects.all().delete()
    AgentSubmission.objects.all().delete()
    Collection.objects.all().delete()
    RepaymentSchedule.objects.all().delete()
    Loan.objects.all().delete()
    Customer.objects.all().delete()
    User.objects.filter(is_superuser=False).delete()
    Branch.objects.all().delete()
    print("✅ Data cleared.\n")


@transaction.atomic
def seed():
    clear_data()
    print("🌱 Seeding CMRS demo data...\n")

    # ── 1. CREATE BRANCH ────────────────────────────────────────────────────
    branch = Branch.objects.create(
        name='ARTH - Gurugram Main Branch',
        code='BR-GGN-01',
        city='Gurugram',
        address='Plot 42, Udyog Vihar Phase 1, Gurugram, Haryana 122016',
    )
    print(f"🏢 Branch created: {branch.name}")

    # ── 2. CREATE USERS ─────────────────────────────────────────────────────
    admin = User.objects.create_superuser(
        username='admin',
        email='admin@cmrs.in',
        password='pass1234',
        first_name='Ankit',
        last_name='Verma',
        role='ADMIN',
    )
    print(f"👑 Admin created: {admin.username}")

    manager = User.objects.create_user(
        username='manager_priya',
        email='manager@cmrs.in',
        password='pass1234',
        first_name='Priya',
        last_name='Sharma',
        role='BRANCH_MANAGER',
        branch=branch,
        employee_id='EMP-MGR-001',
        phone='9876500001',
    )
    print(f"🏦 Branch Manager created: {manager.username}")

    agent1 = User.objects.create_user(
        username='agent_suresh',
        email='agent1@cmrs.in',
        password='pass1234',
        first_name='Suresh',
        last_name='Kumar',
        role='AGENT',
        branch=branch,
        employee_id='EMP-AGT-001',
        phone='9876500002',
    )
    agent2 = User.objects.create_user(
        username='agent_mohan',
        email='agent2@cmrs.in',
        password='pass1234',
        first_name='Mohan',
        last_name='Lal',
        role='AGENT',
        branch=branch,
        employee_id='EMP-AGT-002',
        phone='9876500003',
    )
    print(f"🚴 Agents created: {agent1.username}, {agent2.username}\n")

    # ── 3. CREATE CUSTOMERS & LOANS ─────────────────────────────────────────
    customer_data = [
        {'name': 'Ramesh Gupta', 'phone': '9811100001', 'business': 'Ramesh General Store', 'type': 'Grocery', 'city': 'Gurugram', 'agent': agent1},
        {'name': 'Sunita Devi', 'phone': '9811100002', 'business': 'Sunita Tailoring Shop', 'type': 'Tailoring', 'city': 'Gurugram', 'agent': agent1},
        {'name': 'Vikram Yadav', 'phone': '9811100003', 'business': 'Vikram Mobile Repair', 'type': 'Electronics', 'city': 'Gurugram', 'agent': agent1},
        {'name': 'Meena Joshi', 'phone': '9811100004', 'business': 'Meena Beauty Parlour', 'type': 'Beauty Services', 'city': 'Gurugram', 'agent': agent2},
        {'name': 'Rakesh Pandey', 'phone': '9811100005', 'business': 'Pandey Tea Stall', 'type': 'Food & Beverage', 'city': 'Gurugram', 'agent': agent2},
    ]

    loan_configs = [
        {'principal': Decimal('24000.00'), 'rate': Decimal('12.00'), 'months': 12},
        {'principal': Decimal('18000.00'), 'rate': Decimal('14.00'), 'months': 9},
        {'principal': Decimal('30000.00'), 'rate': Decimal('12.00'), 'months': 12},
        {'principal': Decimal('15000.00'), 'rate': Decimal('15.00'), 'months': 6},
        {'principal': Decimal('10000.00'), 'rate': Decimal('14.00'), 'months': 6},
    ]

    today = date.today()
    disburse_date = today - timedelta(days=90)  # Disbursed 3 months ago

    for i, (cdata, lconfig) in enumerate(zip(customer_data, loan_configs), start=1):
        customer = Customer.objects.create(
            name=cdata['name'],
            phone=cdata['phone'],
            business_name=cdata['business'],
            business_type=cdata['type'],
            address=f'Shop No. {i*10}, Sector {14+i}, {cdata["city"]}',
            city=cdata['city'],
            assigned_agent=cdata['agent'],
        )

        # Calculate loan financials
        principal = lconfig['principal']
        rate = lconfig['rate']
        months = lconfig['months']
        total_interest = (principal * rate * Decimal(str(months / 12))) / Decimal('100')
        total_payable = principal + total_interest
        emi = (total_payable / Decimal(str(months))).quantize(Decimal('0.01'))

        loan = Loan.objects.create(
            loan_number=f'LN-2026-{i:04d}',
            customer=customer,
            principal_amount=principal,
            interest_rate=rate,
            total_payable=total_payable,
            outstanding_amount=total_payable,
            tenure_months=months,
            disbursement_date=disburse_date,
            status='ACTIVE',
            created_by=admin,
        )

        # Create EMI schedule
        from dateutil.relativedelta import relativedelta
        for j in range(1, months + 1):
            due = disburse_date + relativedelta(months=j)
            amt = emi if j < months else (total_payable - emi * (months - 1))
            RepaymentSchedule.objects.create(
                loan=loan,
                installment_number=j,
                due_date=due,
                expected_amount=amt,
            )

        print(f"  💰 Loan {loan.loan_number} created for {customer.name} | ₹{principal} @ {rate}% x {months}mo")

    # ── 4. SIMULATE SOME COLLECTIONS (Demo State) ────────────────────────────
    print("\n📋 Simulating collections...")

    # Agent Suresh collects from his 3 customers (first 3 loans)
    loans = list(Loan.objects.all())

    def collect(agent, loan, amount_pct=1.0):
        schedule = loan.repayment_schedules.filter(status='PENDING').first()
        if not schedule:
            return None
        emi = schedule.expected_amount
        amount = (emi * Decimal(str(amount_pct))).quantize(Decimal('0.01'))
        amount = min(amount, loan.outstanding_amount)
        if amount <= 0:
            return None
        collection = Collection.objects.create(
            schedule=schedule,
            agent=agent,
            amount_collected=amount,
        )
        schedule.apply_payment(amount)
        loan.reduce_outstanding(amount)
        return collection

    # Collections held by agents (in-transit state)
    c1 = collect(agent1, loans[0], 1.0)   # Full EMI
    c2 = collect(agent1, loans[1], 0.75)  # 75% partial payment
    c3 = collect(agent2, loans[3], 1.0)   # Full EMI

    if c1: print(f"  ✅ {c1.receipt_number} - ₹{c1.amount_collected} (Agent: {agent1.first_name})")
    if c2: print(f"  ⚡ {c2.receipt_number} - ₹{c2.amount_collected} PARTIAL (Agent: {agent1.first_name})")
    if c3: print(f"  ✅ {c3.receipt_number} - ₹{c3.amount_collected} (Agent: {agent2.first_name})")

    # ── 5. SIMULATE AN APPROVED SUBMISSION WITH DISCREPANCY ─────────────────
    print("\n🏦 Simulating a completed branch submission (with discrepancy)...")
    c4 = collect(agent2, loans[4], 1.0)
    if c4:
        sub = AgentSubmission.objects.create(
            agent=agent2,
            branch=branch,
            expected_amount=c4.amount_collected,
            actual_amount=c4.amount_collected - Decimal('150.00'),
            discrepancy=Decimal('-150.00'),
            status='APPROVED',
            verified_by=manager,
            manager_notes='Agent Mohan was short by ₹150 - customer paid with torn note that was rejected at branch.',
        )
        sub.collections.add(c4)
        c4.status = 'RECONCILED'
        c4.save()
        print(f"  ⚠️  Submission approved with discrepancy: ₹{sub.discrepancy} shortage")

    # ── 6. SIMULATE A SETTLED BANK DEPOSIT ─────────────────────────────────
    print("\n🏛️  Simulating a settled bank deposit...")
    deposit = BankDeposit.objects.create(
        branch=branch,
        deposited_by=manager,
        bank_name='HDFC Bank',
        bank_account_number='1234567890',
        ifsc_code='HDFC0001234',
        amount=Decimal('25000.00'),
        reference_utr='HDFC-DEP-2026100601',
        deposit_date=today - timedelta(days=2),
        status='SETTLED',
        settlement_date=today - timedelta(days=1),
        notes='October first week collection deposited',
    )
    print(f"  🏦 Bank Deposit: ₹{deposit.amount} | UTR: {deposit.reference_utr} | Status: SETTLED")

    print("\n" + "="*60)
    print("✅ CMRS DEMO DATA SEEDED SUCCESSFULLY!")
    print("="*60)
    print("\n🔑 LOGIN CREDENTIALS (password: pass1234)")
    print("   Admin:          admin")
    print("   Branch Manager: manager_priya")
    print("   Agent 1:        agent_suresh")
    print("   Agent 2:        agent_mohan")
    print("\n🌐 API Docs: http://localhost:8000/api/docs/")
    print("🔗 Admin:    http://localhost:8000/admin/\n")


if __name__ == '__main__':
    seed()
