# Cash Management & Reconciliation System (CMRS)
### Built for ARTH (Arthimpact Digital Loans) – Campus Technical Assessment

[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Django 6.x](https://img.shields.io/badge/Django-6.x-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Tests Passing](https://img.shields.io/badge/pytest-14%2F14%20Passing-brightgreen)](tests/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 1. Executive Summary & Problem Understanding

In micro-MSME lending across semi-urban and rural India, borrowers (neighborhood *kirana* stores, artisans, tailors) repay their loan EMIs primarily in **physical currency notes**.

Physical cash introduces four critical operational and financial challenges:
1. **Cash in Transit Blindspot:** The head office cannot see how much cash is held by agents on bikes vs. branch safes vs. settled in bank accounts.
2. **Discrepancy Disputes:** Agent submits ₹48,500 claiming ₹50,000 was collected. Without a digital audit trail, cash leakages cannot be attributed.
3. **Delayed Banking:** Cash idling in branch safes risks theft and delays liquidity.
4. **Regulatory & Audit Risk:** RBI compliance mandates zero unaccounted floating cash across NBFC custody.

**CMRS** solves this by establishing a strict digital chain of custody with an immutable 5-stage state machine:

$$\mathbf{EXPECTED} \longrightarrow \mathbf{COLLECTED} \longrightarrow \mathbf{BRANCH\_RECEIVED} \longrightarrow \mathbf{BANK\_DEPOSITED} \longrightarrow \mathbf{SETTLED}$$

---

## 2. System Architecture

CMRS is built as a **3-tier layered system** prioritizing financial consistency, ACID atomicity, and clean separation of concerns:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. CLIENT LAYER (React 18)                      │
│      Minimalist, non-AI aesthetic fintech portal with RBAC views:      │
│      • Executive Dashboard (4 KPI cards, lifecycle progression)        │
│      • Collection Agent Portal (EMI schedule, partial payments, receipt)│
│      • Branch Reconciliation Hub (Counting, discrepancy math, UTR)     │
│      • Immutable Audit Log (Cryptographic receipt search)              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST APIs (JWT Auth)
┌───────────────────────────────────▼────────────────────────────────────┐
│              2. APPLICATION LAYER (Django REST Framework)              │
│  ┌───────────────────────┐  ┌───────────────────────────────────────┐  │
│  │   REST API Routers    │  │   RBAC & JWT Auth Middleware          │  │
│  └───────────┬───────────┘  └───────────────────┬───────────────────┘  │
│              ▼                                  ▼                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    CORE FINANCIAL SERVICE LAYER                  │  │
│  │  • CollectionService (Receipt Gen, Partial EMI Allocation)       │  │
│  │  • ReconciliationService (Expected vs Actual, Discrepancies)     │  │
│  │  • SettlementService (Bank Deposits, Challan/UTR Matching)       │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │ ORM / ACID Transactions (@atomic)
┌─────────────────────────────────────▼──────────────────────────────────┐
│                   3. DATA LAYER (PostgreSQL / SQLite)                  │
│     All monetary values use DecimalField(max_digits=12, decimal_places=2)│
│     Zero floating-point arithmetic. Foreign key constraints & indexes.  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema & Entities

| Entity | Primary Key | Key Attributes | Relationships |
|---|---|---|---|
| **`Branch`** | `id` | `name`, `code`, `city`, `address` | 1-to-Many `User`, `AgentSubmission`, `BankDeposit` |
| **`User`** | `id` | `username`, `role` (`AGENT`, `BRANCH_MANAGER`, `ADMIN`), `employee_id` | Belongs to `Branch` |
| **`Customer`** | `id` | `name`, `phone`, `business_name`, `business_type` | Assigned to `User` (Agent) |
| **`Loan`** | `id` | `loan_number`, `principal_amount`, `interest_rate`, `total_payable`, `outstanding_amount`, `status` | Belongs to `Customer` |
| **`RepaymentSchedule`** | `id` | `installment_number`, `due_date`, `expected_amount`, `paid_amount`, `status` (`PENDING`, `PARTIALLY_PAID`, `PAID`) | Belongs to `Loan` |
| **`Collection`** | `id` | `receipt_number` (Unique: `RCP-YYYYMMDD-XXXX`), `amount_collected`, `status` (`HELD_BY_AGENT`, `SUBMITTED`, `RECONCILED`) | Belongs to `RepaymentSchedule` & `User` |
| **`AgentSubmission`** | `id` | `expected_amount`, `actual_amount`, `discrepancy` (`actual - expected`), `status` (`PENDING`, `APPROVED`, `REJECTED`), `manager_notes` | Belongs to `User` & `Branch` |
| **`BankDeposit`** | `id` | `bank_name`, `amount`, `reference_utr` (Unique Challan), `deposit_date`, `status` (`BANK_DEPOSITED`, `SETTLED`) | Belongs to `Branch` & `User` |

---

## 4. Key Business Logic & Edge Cases Handled

1. **Partial Repayments:** Borrowers can repay any amount $\le$ balance due. System updates `paid_amount`, transitions status to `PARTIALLY_PAID`, and atomically decrements loan `outstanding_amount`.
2. **Over-Collection Blocking:** Any payment exceeding the schedule due amount or loan balance is rejected at the API and service layer with a descriptive error.
3. **Duplicate Collection Prevention:** Payments against already `PAID` installments or duplicate collections are blocked.
4. **Cash Discrepancy Math:**
   $$\text{Discrepancy} = \text{Actual Cash Counted} - \text{Expected Digital Record}$$
   * Negative result = **Shortage** (e.g. ₹50,000 expected vs ₹48,500 received $\rightarrow$ **-₹1,500 Shortage**).
   * If discrepancy $\ne 0$, **Manager Remarks are strictly mandatory**.
5. **Bank UTR Uniqueness:** The bank reference/UTR number is indexed with a `UNIQUE` constraint preventing double-counting of deposits.
6. **Immutability of Settled Records:** Once a bank deposit is marked `SETTLED`, it cannot be altered or modified.
7. **Paise Precision:** All currency arithmetic is strictly performed using Python `Decimal` and Django `DecimalField(max_digits=12, decimal_places=2)`—no floating-point rounding errors.

---

## 5. Test Credentials

All accounts use the password: **`pass1234`**

| Role | Username | Assigned Branch | Purpose / Test Scope |
|---|---|---|---|
| **Admin (Head Office)** | `admin` | All Branches | Executive Dashboard, company-wide metrics, system oversight |
| **Branch Manager** | `manager_priya` | Gurugram Main | Count cash, approve/reject submissions, record bank deposits, mark settlements |
| **Collection Agent 1** | `agent_suresh` | Gurugram Main | View assigned loans, collect cash, generate receipts, submit to branch |
| **Collection Agent 2** | `agent_mohan` | Gurugram Main | Field collections, test discrepancy workflows |

> **Pro-Tip for Evaluators:** Use the **1-Click Demo Switcher** dropdown in the top navigation bar to seamlessly switch roles and test the complete lifecycle without re-logging in.

---

## 6. Setup & Installation (Under 2 Minutes)

### Option A: Standard Local Setup

#### Prerequisites
* Python 3.10+
* Node.js 18+

#### 1. Clone & Setup Virtual Environment
```bash
git clone https://github.com/your-username/cmrs-system.git
cd cmrs-system

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt
```

#### 2. Run Database Migrations & Seed Demo Data
```bash
cd backend
python manage.py migrate
python seed.py
```

#### 3. Start Application
```bash
# From project root, run 1-click startup script:
./run.sh
```

Or run manually:
```bash
# Terminal 1: Django Backend (Port 8000)
cd backend
python manage.py runserver 8000

# Terminal 2: React Frontend (Port 3000)
cd frontend
npm install
npm run dev
```

* **Frontend Dashboard:** [http://localhost:8000/](http://localhost:8000/) (or `http://localhost:3000/` during dev)
* **Interactive Swagger API Docs:** [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)
* **Django Admin Panel:** [http://localhost:8000/admin/](http://localhost:8000/admin/)

---

### Option B: Docker Compose (1 Command)
```bash
docker-compose up --build
```
Access at `http://localhost:8000`.

---

## 7. Automated Testing Suite

The project includes an automated **`pytest`** test suite proving financial correctness:

```bash
cd backend
pytest tests/ -v
```

### Test Coverage Results (14/14 Passed):
```
tests/test_collections.py::TestFullPayment::test_full_payment_marks_schedule_as_paid PASSED
tests/test_collections.py::TestFullPayment::test_full_payment_reduces_loan_outstanding PASSED
tests/test_collections.py::TestPartialPayment::test_partial_payment_marks_schedule_partially_paid PASSED
tests/test_collections.py::TestPartialPayment::test_partial_payment_correctly_reduces_outstanding PASSED
tests/test_collections.py::TestOverCollectionBlocked::test_over_collection_raises_validation_error PASSED
tests/test_collections.py::TestOverCollectionBlocked::test_zero_amount_is_blocked PASSED
tests/test_collections.py::TestOverCollectionBlocked::test_negative_amount_is_blocked PASSED
tests/test_collections.py::TestDuplicatePaymentBlocked::test_duplicate_collection_on_paid_schedule_blocked PASSED
tests/test_collections.py::TestDuplicateBankUTRBlocked::test_duplicate_utr_rejected PASSED
tests/test_collections.py::TestReceiptGeneration::test_receipt_format PASSED
tests/test_collections.py::TestReceiptGeneration::test_receipts_are_unique PASSED
tests/test_collections.py::TestDiscrepancyCalculation::test_shortage_discrepancy PASSED
tests/test_collections.py::TestDiscrepancyCalculation::test_excess_discrepancy PASSED
tests/test_collections.py::TestDiscrepancyCalculation::test_matched_no_discrepancy PASSED

============================== 14 passed in 6.80s ==============================
```

---

## 8. API Documentation (REST Endpoints)

Interactive Swagger / OpenAPI docs are available at `/api/docs/`.

### Authentication
* `POST /api/auth/login/` – JWT login (returns token with embedded role)
* `GET  /api/auth/profile/` – Current user details & branch

### Loans & Schedules
* `GET  /api/loans/customers/` – Customer list (scoped by RBAC role)
* `GET  /api/loans/` – Active loans and EMI schedules
* `GET  /api/loans/{id}/schedule/` – Specific loan installment breakdown

### Collections (Agent)
* `POST /api/collections/collect/` – Record cash payment, issue receipt
* `GET  /api/collections/my-collections/` – Agent daily custody in hand
* `POST /api/collections/submit-to-branch/` – Submit daily cash bag to branch

### Reconciliation (Branch Manager)
* `GET  /api/collections/submissions/` – Pending agent handovers
* `POST /api/collections/submissions/{id}/verify/` – Verify cash, calculate discrepancy, approve/reject
* `GET  /api/reconciliation/deposits/` – Bank deposits list
* `POST /api/reconciliation/deposits/` – Record new bank deposit with UTR
* `POST /api/reconciliation/deposits/{id}/settle/` – Mark deposit as settled

### Dashboard & Audit
* `GET  /api/dashboard/summary/` – 4 KPI cards + lifecycle totals + discrepancy metrics (supports date & branch filters)
* `GET  /api/dashboard/agents/` – Per-agent collection totals & cash in hand
* `GET  /api/collections/history/` – Complete immutable audit trail

---

## 9. 5-Minute Video Walkthrough Script

Use this structured outline for your 5-minute Loom/recording:

* **0:00 - 1:00 (Problem & Domain Context):**
  * Introduce ARTH's microfinance model: field agents collecting cash from MSME shopkeepers.
  * Explain the cash custody problem: physical cash has no digital trail unless tracked through state transitions (`Expected → Collected → Branch Received → Bank Deposited → Settled`).
* **1:00 - 2:00 (Architecture & Data Model):**
  * 3-tier architecture: React + Django REST + PostgreSQL/SQLite.
  * Highlight the use of `DecimalField` (never float for financial data) and `@transaction.atomic` for atomic loan balance updates.
* **2:00 - 3:30 (Live Demonstration):**
  * Switch to **Agent Suresh**: Show assigned customers, collect ₹1,500 (partial payment), view generated receipt `RCP-XXXX`.
  * Click **"Submit Cash to Branch"**.
  * Switch to **Branch Manager Priya**: View pending submission. Count cash as ₹48,500 vs ₹50,000 expected $\rightarrow$ Show **-₹1,500 Shortage** calculation. Input mandatory remarks and approve.
  * Create a **Bank Deposit** with UTR `HDFC-DEP-XXXX` and mark as **Settled**.
  * Switch to **Executive Dashboard**: Show live updates to the 4 KPI cards.
* **3:30 - 4:30 (Edge Cases & Engineering Trade-Offs):**
  * How the system handles partial repayments, over-collections, duplicate collections, and unique bank UTRs.
  * Mention automated `pytest` test suite (14/14 tests passing).
* **4:30 - 5:00 (Future Scope):**
  * At scale (10,000+ agents): Celery + Redis for asynchronous night-end reconciliation batches, offline-first mobile sync with SQLite and cryptographic receipt verification.

---

## 10. License
This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.
