# Cash Management & Reconciliation System (CMRS)

A robust, enterprise-grade cash lifecycle management and reconciliation platform designed for micro-lending institutions (NBFCs & MFIs). CMRS enforces an immutable digital chain of custody for physical currency collections—from borrower doorstep to bank settlement—with automated discrepancy calculation, strict role-based access control, and ACID transactional guarantees.

[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Django 6.x](https://img.shields.io/badge/Django-6.x-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Tests Passing](https://img.shields.io/badge/pytest-14%2F14%20Passing-brightgreen)](tests/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 1. Problem Overview & Domain Context

In microfinance and MSME lending across emerging markets, borrowers (small merchants, artisans, neighborhood retail shops) predominantly repay installment EMIs in **physical currency notes**.

Managing physical cash operations at scale introduces critical operational risks:
1. **Cash-in-Transit Blindspots:** Absence of real-time visibility into funds held by field agents on bikes versus cash secured in branch safes versus bank-deposited balances.
2. **Reconciliation Disputes:** Discrepancies between digital collection logs and physical cash counted at end-of-day branch handovers.
3. **Idling Cash & Liquidity Drag:** Delays in depositing branch vault cash into corporate bank accounts, increasing theft exposure and stalling working capital.
4. **Audit & Regulatory Compliance:** Strict central bank compliance mandates complete traceability and zero unaccounted float across loan recovery operations.

### The 5-Stage Custody Lifecycle

CMRS implements a deterministic, immutable state machine ensuring every rupee is tracked through five verification checkpoints:

```
  ┌────────────┐      ┌───────────┐      ┌─────────────────┐      ┌────────────────┐      ┌───────────┐
  │  EXPECTED  │ ───► │ COLLECTED │ ───► │ BRANCH RECEIVED │ ───► │ BANK DEPOSITED │ ───► │  SETTLED  │
  └────────────┘      └───────────┘      └─────────────────┘      └────────────────┘      └───────────┘
   Repayment Due       Agent issues       Branch Manager           Challan / UTR           Bank confirms
     schedule            receipt            counts cash              generated              credit advice
```

---

## 2. System Architecture

CMRS follows a layered 3-tier architecture separating concerns between identity/presentation, core financial service rules, and atomic database persistence:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. PRESENTATION LAYER                           │
│   React 18 SPA + Tailwind CSS + Lucide Icons (Production Built)        │
│   • Collection Agent: Field schedule, partial payment, digital receipt │
│   • Branch Manager: End-of-day cash counting, discrepancy log, UTR     │
│   • Executive Admin: Portfolio health, branch rollups, master data     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / REST APIs (JWT Authentication)
┌───────────────────────────────────▼────────────────────────────────────┐
│                        2. APPLICATION LAYER                            │
│   Django REST Framework + Financial Service Layer                      │
│   • CollectionService: Receipt generation & atomic schedule decrement  │
│   • ReconciliationService: Expected vs actual math & variance approval │
│   • SettlementService: Bank deposit tracking & unique UTR verification │
│   • RBAC Middleware: Strict role-isolated data boundaries              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Django ORM / ACID Transactions (@atomic)
┌───────────────────────────────────▼────────────────────────────────────┐
│                        3. PERSISTENCE LAYER                            │
│   SQLite (Dev) / PostgreSQL (Prod)                                     │
│   • High-precision DecimalField(12, 2) arithmetic (zero float errors)  │
│   • Unique composite indexes on receipt codes, UTRs, and schedules     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema & Data Models

| Entity | Primary Key | Key Attributes | Relationships |
|---|---|---|---|
| **`Branch`** | `id` | `name`, `code`, `city`, `address` | 1-to-Many with Users, Submissions, Bank Deposits |
| **`User`** | `id` | `username`, `role` (`AGENT`, `BRANCH_MANAGER`, `ADMIN`), `employee_id` | Scoped to a specific `Branch` |
| **`Customer`** | `id` | `name`, `phone`, `business_name`, `business_type` | Assigned to field Agent |
| **`Loan`** | `id` | `loan_number`, `principal_amount`, `interest_rate`, `total_payable`, `outstanding_amount`, `status` | Belongs to `Customer` |
| **`RepaymentSchedule`** | `id` | `installment_number`, `due_date`, `expected_amount`, `paid_amount`, `status` (`PENDING`, `PARTIALLY_PAID`, `PAID`) | Belongs to `Loan` |
| **`Collection`** | `id` | `receipt_number` (`RCP-YYYYMMDD-XXXX`), `amount_collected`, `status` (`HELD_BY_AGENT`, `SUBMITTED`, `RECONCILED`) | Belongs to `RepaymentSchedule` & `User` |
| **`AgentSubmission`** | `id` | `expected_amount`, `actual_amount`, `discrepancy`, `status` (`PENDING`, `APPROVED`, `REJECTED`), `manager_notes` | Belongs to `User` & `Branch` |
| **`BankDeposit`** | `id` | `bank_name`, `amount`, `reference_utr` (Unique Challan), `deposit_date`, `status` (`BANK_DEPOSITED`, `SETTLED`) | Belongs to `Branch` & `User` |

---

## 4. Key Financial Business Rules

1. **Paise Precision (`DecimalField`):** Floating-point representations are strictly forbidden across financial calculation paths. All currency values use Python `Decimal` with 2 decimal places.
2. **Partial Repayments:** Borrowers can repay any amount $\le$ remaining balance. The system updates `paid_amount`, marks the schedule as `PARTIALLY_PAID`, and atomically reduces loan `outstanding_amount`.
3. **Over-Collection Blocking:** Any payment amount exceeding the installment balance or remaining loan principal is rejected at the service boundary with validation errors.
4. **Duplicate Collection Guards:** Payments against installments already marked `PAID` are blocked.
5. **Cash Discrepancy Reconciliation:**
   $$\text{Discrepancy} = \text{Actual Cash Handed Over} - \text{Expected Digital Record}$$
   - **Negative ($\Delta < 0$):** Cash Shortage (e.g., ₹50,000 expected vs ₹48,500 submitted $\rightarrow$ **-₹1,500 Shortage**).
   - **Positive ($\Delta > 0$):** Cash Excess (over-collection / unallocated tender).
   - If discrepancy $\ne 0$, **Manager Remarks are mandatory** before submission verification can be approved.
6. **Unique Bank UTR Enforcement:** Deposit reference numbers (UTR) enforce database-level uniqueness to prevent double-crediting of bank deposits.
7. **ACID Transaction Boundaries:** All collection and reconciliation state transitions execute inside `@transaction.atomic` blocks to maintain database consistency under concurrent execution.

---

## 5. Role-Based Access Control (RBAC)

CMRS enforces strict role isolation at both the frontend interface and backend API layer:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ROLE-BASED CAPABILITIES                          │
├─────────────────────┬───────────────────────────────────────────────────────┤
│ Collection Agent    │ • View assigned borrower repayment schedules          │
│                     │ • Record partial / full field cash collections        │
│                     │ • Generate instant digital collection receipts        │
│                     │ • Initiate daily cash bag handover to branch vault    │
├─────────────────────┼───────────────────────────────────────────────────────┤
│ Branch Manager      │ • Inspect and verify agent cash bag handovers         │
│                     │ • Enter physical cash count and reconcile variance   │
│                     │ • Manage branch safe cash custody                     │
│                     │ • Log bank deposits with bank slip / UTR reference    │
│                     │ • Confirm bank credit and mark deposits as settled    │
├─────────────────────┼───────────────────────────────────────────────────────┤
│ Admin (Head Office) │ • Organization-wide dashboard with 4 real-time KPIs   │
│                     │ • Cash lifecycle progression metrics across branches  │
│                     │ • Master data controls (create branches, managers,    │
│                     │   agents, and customers)                              │
│                     │ • Immutable system audit log inspection               │
└─────────────────────┴───────────────────────────────────────────────────────┘
```

---

## 6. Test Credentials

The system includes pre-seeded accounts representing all operational roles.

All demo accounts share the password: **`pass1234`**

| Role | Username | Branch Scope | Primary Capabilities |
|---|---|---|---|
| **Admin (Head Office)** | `admin` | Enterprise-wide | Global metrics, master data creation, system audit |
| **Branch Manager** | `manager_priya` | Gurugram Main | Cash handover verification, safe custody, bank deposit |
| **Collection Agent 1** | `agent_suresh` | Gurugram Main | Loan collections, receipt issuance, branch submission |
| **Collection Agent 2** | `agent_mohan` | Gurugram Main | Field collections, shortage discrepancy test case |

> **Interactive Demo Switcher:** The application includes a 1-click role switcher in the header navigation bar to test multi-role workflows without manual logout/login cycles.

---

## 7. Quickstart & Installation

### Option A: Standard Local Setup

#### Prerequisites
- Python 3.10+
- Node.js 18+ (only needed if building frontend from source)

#### 1. Clone & Set Up Environment
```bash
git clone https://github.com/darshilaggarwal/crms.git
cd crms

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt
```

#### 2. Run Migrations & Seed Demo Data
```bash
cd backend
python manage.py migrate
python seed.py
```

#### 3. Start the Server
```bash
# From project root, execute the launch script:
./run.sh
```

Or run Django directly:
```bash
cd backend
python manage.py runserver 0.0.0.0:8000
```

- **Application Web Portal:** [http://localhost:8000/](http://localhost:8000/)
- **Interactive Swagger / OpenAPI Docs:** [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)
- **Django Admin Interface:** [http://localhost:8000/admin/](http://localhost:8000/admin/)

---

### Option B: Docker Compose

```bash
docker-compose up --build
```
The application will be accessible at `http://localhost:8000`.

---

## 8. Automated Test Suite

Financial correctness and edge case handling are verified via automated `pytest` test suites:

```bash
cd backend
pytest tests/ -v
```

### Test Results (14/14 Passing)

| Test Module | Test Case | Status |
|---|---|---|
| `TestFullPayment` | `test_full_payment_marks_schedule_as_paid` | PASSED |
| `TestFullPayment` | `test_full_payment_reduces_loan_outstanding` | PASSED |
| `TestPartialPayment` | `test_partial_payment_marks_schedule_partially_paid` | PASSED |
| `TestPartialPayment` | `test_partial_payment_correctly_reduces_outstanding` | PASSED |
| `TestOverCollectionBlocked` | `test_over_collection_raises_validation_error` | PASSED |
| `TestOverCollectionBlocked` | `test_zero_amount_is_blocked` | PASSED |
| `TestOverCollectionBlocked` | `test_negative_amount_is_blocked` | PASSED |
| `TestDuplicatePaymentBlocked` | `test_duplicate_collection_on_paid_schedule_blocked` | PASSED |
| `TestDuplicateBankUTRBlocked` | `test_duplicate_utr_rejected` | PASSED |
| `TestReceiptGeneration` | `test_receipt_format` | PASSED |
| `TestReceiptGeneration` | `test_receipts_are_unique` | PASSED |
| `TestDiscrepancyCalculation` | `test_shortage_discrepancy` | PASSED |
| `TestDiscrepancyCalculation` | `test_excess_discrepancy` | PASSED |
| `TestDiscrepancyCalculation` | `test_matched_no_discrepancy` | PASSED |

---

## 9. API Reference

Interactive Swagger and OpenAPI specifications are available at `/api/docs/`.

### Authentication
- `POST /api/auth/login/` — Authenticate and receive JWT credentials with user role.
- `GET  /api/auth/profile/` — Retrieve active user session and branch profile.

### Loans & Schedules
- `GET  /api/loans/customers/` — List borrowers (filtered by agent/branch scope).
- `GET  /api/loans/` — Active loan accounts with outstanding amounts.
- `GET  /api/loans/{id}/schedule/` — Detailed installment schedule for a loan.

### Field Collections
- `POST /api/collections/collect/` — Record cash receipt, update schedule & loan balance.
- `GET  /api/collections/my-collections/` — Active collections held in agent custody.
- `POST /api/collections/submit-to-branch/` — Submit collected cash bag to branch vault.

### Branch Reconciliation & Banking
- `GET  /api/collections/submissions/` — List pending agent cash bag handovers.
- `POST /api/collections/submissions/{id}/verify/` — Reconcile actual cash, log variance, approve/reject.
- `GET  /api/reconciliation/deposits/` — List branch bank deposits.
- `POST /api/reconciliation/deposits/` — Record bank deposit with unique UTR.
- `POST /api/reconciliation/deposits/{id}/settle/` — Confirm bank credit and mark deposit settled.

### Dashboard & Analytics
- `GET  /api/dashboard/summary/` — Summary KPIs, 5-stage cash lifecycle totals, discrepancy metrics.
- `GET  /api/dashboard/agents/` — Per-agent collection totals and current float in hand.
- `GET  /api/collections/history/` — Complete, immutable system audit trail.

---

## 10. License

This project is open-source and licensed under the [MIT License](LICENSE).
