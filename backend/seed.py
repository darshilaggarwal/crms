"""
CMRS - Database Seed Script
===============================
Populates the database with realistic micro-lending demo data.

State:
  - Active Branches & Staff (Admin, Branch Manager, Collection Agents)
  - 5 Borrowers (MSME / shopkeepers) with disbursed loans ("Money Given")
  - Clean slate for money collected: 0 collections, 0 submissions, 0 bank deposits
  - All EMIs are PENDING and ready for live collection & reconciliation testing

Run with: python seed.py

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
from dateutil.relativedelta import relativedelta

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cmrs.settings')
django.setup()

# Models
from users.models import Branch, User
from loans.models import Customer, Loan, RepaymentSchedule
from cash_collections.models import Collection, AgentSubmission
from reconciliation.models import BankDeposit
from django.db import transaction


def clear_data():
    """Clear all existing data for a fresh clean slate."""
    print("🗑️  Clearing all existing transactional and master data...")
    BankDeposit.objects.all().delete()
    AgentSubmission.objects.all().delete()
    Collection.objects.all().delete()
    RepaymentSchedule.objects.all().delete()
    Loan.objects.all().delete()
    Customer.objects.all().delete()
    User.objects.all().delete()
    Branch.objects.all().delete()
    print("✅ All data wiped successfully.\n")


@transaction.atomic
def seed():
    clear_data()
    print("🌱 Initializing clean CMRS lending environment (0 Money Collected)...\n")

    # ── 1. CREATE BRANCH ────────────────────────────────────────────────────
    branch = Branch.objects.create(
        name='Gurugram Main Branch',
        code='BR-GGN-01',
        city='Gurugram',
        address='Plot 42, Udyog Vihar Phase 1, Gurugram, Haryana 122016',
    )
    print(f"🏢 Branch created: {branch.name} ({branch.code})")

    # ── 2. CREATE USERS ─────────────────────────────────────────────────────
    admin = User.objects.create_superuser(
        username='admin',
        email='admin@cmrs.in',
        password='pass1234',
        first_name='Ankit',
        last_name='Verma',
        role='ADMIN',
    )
    print(f"👑 Admin created: {admin.username} ({admin.email})")

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
    print(f"🏦 Branch Manager created: {manager.username} ({branch.name})")

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
    print(f"🚴 Field Agents created: {agent1.username}, {agent2.username}\n")

    # ── 3. CREATE CUSTOMERS & DISBURSE LOANS (MONEY GIVEN) ──────────────────
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
    # Disbursed 1 month ago so installment #1 is due today, ready for immediate field collection
    disburse_date = today - relativedelta(months=1)

    total_principal_disbursed = Decimal('0.00')
    total_expected_receivables = Decimal('0.00')

    print("💼 Disbursing MSME loans to borrowers (Money Given)...")
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
            outstanding_amount=total_payable,  # Zero collected yet, full amount outstanding
            tenure_months=months,
            disbursement_date=disburse_date,
            status='ACTIVE',
            created_by=admin,
        )

        total_principal_disbursed += principal
        total_expected_receivables += total_payable

        # Generate full EMI repayment schedule
        for j in range(1, months + 1):
            due = disburse_date + relativedelta(months=j)
            amt = emi if j < months else (total_payable - emi * (months - 1))
            RepaymentSchedule.objects.create(
                loan=loan,
                installment_number=j,
                due_date=due,
                expected_amount=amt,
                paid_amount=Decimal('0.00'),
                status='PENDING',
            )

        print(f"  ✓ {loan.loan_number} | {customer.name} ({customer.business_name}) | Principal Disbursed: ₹{principal:,.2f} | 1st EMI Due: {today.strftime('%d %b %Y')}")

    # Note: ZERO collections, ZERO submissions, and ZERO bank deposits are created.
    # Money Dashboard is strictly 0 collections, ready for a clean live demo.

    print("\n" + "="*65)
    print("✨ CMRS FINANCIAL DATABASE INITIALIZED SUCCESSFULLY")
    print("="*65)
    print(f"• Total Principal Disbursed (Money Given): ₹{total_principal_disbursed:,.2f}")
    print(f"• Total Expected Receivables:             ₹{total_expected_receivables:,.2f}")
    print(f"• Total Collections to Date:              ₹0.00 (CLEAN)")
    print(f"• Cash Held by Agents:                    ₹0.00 (CLEAN)")
    print(f"• Cash in Branch Vault:                   ₹0.00 (CLEAN)")
    print(f"• Bank Settled:                           ₹0.00 (CLEAN)")
    print(f"• Total Discrepancies:                    ₹0.00 (CLEAN)")
    print("="*65)
    print("\n🔑 LOGIN CREDENTIALS (password: pass1234)")
    print("   Admin (Head Office):   admin")
    print("   Branch Manager:        manager_priya")
    print("   Collection Agent 1:    agent_suresh")
    print("   Collection Agent 2:    agent_mohan")
    print("\n🌐 Web Portal: http://localhost:8000/")
    print("🔗 API Docs:   http://localhost:8000/api/docs/\n")


if __name__ == '__main__':
    seed()
