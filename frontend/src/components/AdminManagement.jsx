import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  Users,
  UserPlus,
  Building,
  UserCheck,
  CreditCard,
  Plus,
  CheckCircle,
  AlertCircle,
  Briefcase,
  Store,
  ShieldAlert
} from 'lucide-react';

export default function AdminManagement({ currentUser }) {
  const [activeSection, setActiveSection] = useState('staff'); // 'staff' | 'customers' | 'branches'
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [userForm, setUserForm] = useState({
    username: '',
    password: 'pass1234',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'AGENT',
    branch_id: '',
    employee_id: '',
  });

  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    alternate_phone: '',
    business_name: '',
    business_type: 'Grocery',
    address: '',
    city: 'Gurugram',
    assigned_agent: '',
  });

  const [loanForm, setLoanForm] = useState({
    customer: '',
    principal_amount: '20000.00',
    interest_rate: '12.00',
    tenure_months: 6,
    disbursement_date: new Date().toISOString().split('T')[0],
  });

  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    city: '',
    address: '',
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [uRes, bRes, cRes, lRes] = await Promise.all([
        api.getUsers(),
        api.getBranches(),
        api.getCustomers(),
        api.getLoans(),
      ]);

      const uList = uRes.results || uRes || [];
      const bList = bRes.results || bRes || [];
      const cList = cRes.results || cRes || [];
      const lList = lRes.results || lRes || [];

      setUsers(uList);
      setBranches(bList);
      setCustomers(cList);
      setLoans(lList);

      // Pre-select defaults for dropdowns
      if (bList.length > 0 && !userForm.branch_id) {
        setUserForm((prev) => ({ ...prev, branch_id: bList[0].id }));
      }
      const agents = uList.filter((u) => u.role === 'AGENT');
      if (agents.length > 0 && !customerForm.assigned_agent) {
        setCustomerForm((prev) => ({ ...prev, assigned_agent: agents[0].id }));
      }
      if (cList.length > 0 && !loanForm.customer) {
        setLoanForm((prev) => ({ ...prev, customer: cList[0].id }));
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load master data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg('');
      await api.createUser(userForm);
      setSuccessMsg(`User ${userForm.username} (${userForm.role}) created successfully!`);
      setShowUserModal(false);
      setUserForm({
        username: '',
        password: 'pass1234',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: 'AGENT',
        branch_id: branches[0]?.id || '',
        employee_id: '',
      });
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg('');
      await api.createCustomer(customerForm);
      setSuccessMsg(`Customer ${customerForm.name} created and assigned to agent!`);
      setShowCustomerModal(false);
      setCustomerForm({
        name: '',
        phone: '',
        alternate_phone: '',
        business_name: '',
        business_type: 'Grocery',
        address: '',
        city: 'Gurugram',
        assigned_agent: users.find((u) => u.role === 'AGENT')?.id || '',
      });
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg('');
      const res = await api.createLoan(loanForm);
      setSuccessMsg(`Loan ${res.loan_number} created with full EMI schedule! Total payable: ₹${res.total_payable}`);
      setShowLoanModal(false);
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create loan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg('');
      await api.createBranch(branchForm);
      setSuccessMsg(`Branch ${branchForm.name} created successfully!`);
      setShowBranchModal(false);
      setBranchForm({ name: '', code: '', city: '', address: '' });
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create branch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Head Office Control Center
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Master Data & Organizational Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin powers to create and provision Branch Managers, Field Agents, Borrowers, and Loans.
          </p>
        </div>

        {/* Section Switcher */}
        <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex">
          <button
            onClick={() => setActiveSection('staff')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeSection === 'staff'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Staff (Managers & Agents)
          </button>
          <button
            onClick={() => setActiveSection('customers')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeSection === 'customers'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Customers & Loans
          </button>
          <button
            onClick={() => setActiveSection('branches')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeSection === 'branches'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Branches ({branches.length})
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="font-bold">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="font-bold">✕</button>
        </div>
      )}

      {/* SECTION 1: STAFF (BRANCH MANAGERS & AGENTS) */}
      {activeSection === 'staff' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Staff Hierarchy (Role-Based Access Control)
              </h3>
              <p className="text-xs text-slate-500">
                Create new Branch Managers and Field Collection Agents.
              </p>
            </div>

            <button
              onClick={() => setShowUserModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-2xs"
            >
              <UserPlus className="w-3.5 h-3.5" /> + Create New Staff Member
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="py-2.5 px-4">Employee</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Branch</th>
                  <th className="py-2.5 px-4">Employee ID</th>
                  <th className="py-2.5 px-4">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{u.full_name || u.username}</div>
                      <div className="text-[11px] text-slate-400 font-mono">@{u.username}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : u.role === 'BRANCH_MANAGER'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {u.branch ? `${u.branch.name} (${u.branch.city})` : 'Head Office'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {u.employee_id || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{u.email || '—'}</div>
                      <div className="text-[11px] text-slate-400">{u.phone}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: CUSTOMERS & LOANS */}
      {activeSection === 'customers' && (
        <div className="space-y-6">
          
          {/* Customers Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Borrowers & Customers Directory
                </h3>
                <p className="text-xs text-slate-500">
                  Register borrowers and map them to dedicated collection agents.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCustomerModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" /> + Add New Customer
                </button>
                <button
                  onClick={() => setShowLoanModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shadow-2xs"
                >
                  <CreditCard className="w-3.5 h-3.5" /> + Issue New Loan
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr>
                    <th className="py-2.5 px-4">Customer Name</th>
                    <th className="py-2.5 px-4">Business / Shop</th>
                    <th className="py-2.5 px-4">Contact</th>
                    <th className="py-2.5 px-4">Location</th>
                    <th className="py-2.5 px-4">Assigned Agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-900">{c.name}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{c.business_name || 'Individual'}</div>
                        <div className="text-[11px] text-slate-400">{c.business_type}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{c.phone}</td>
                      <td className="py-3 px-4 text-slate-600">{c.city}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          🚴 {c.assigned_agent_name || 'Unassigned'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Loans Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Active Loan Contracts
              </h3>
              <p className="text-xs text-slate-500">
                Loans issued with auto-calculated interest and amortization schedules.
              </p>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="py-2.5 px-4">Loan Account</th>
                  <th className="py-2.5 px-4">Borrower</th>
                  <th className="py-2.5 px-4">Principal</th>
                  <th className="py-2.5 px-4">Total Payable</th>
                  <th className="py-2.5 px-4">Remaining Outstanding</th>
                  <th className="py-2.5 px-4">Tenure</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{l.loan_number}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{l.customer_name}</td>
                    <td className="py-3 px-4 font-mono">₹{Number(l.principal_amount).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 font-mono font-medium">₹{Number(l.total_payable).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      ₹{Number(l.outstanding_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{l.tenure_months} months</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* SECTION 3: BRANCHES */}
      {activeSection === 'branches' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Operational Company Branches
              </h3>
              <p className="text-xs text-slate-500">
                Physical branch offices where field agents deposit cash into branch safes.
              </p>
            </div>

            <button
              onClick={() => setShowBranchModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-2xs"
            >
              <Building className="w-3.5 h-3.5" /> + Add New Branch
            </button>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="py-2.5 px-4">Branch Name</th>
                <th className="py-2.5 px-4">Code</th>
                <th className="py-2.5 px-4">City</th>
                <th className="py-2.5 px-4">Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-900">{b.name}</td>
                  <td className="py-3 px-4 font-mono font-medium text-slate-600">{b.code}</td>
                  <td className="py-3 px-4 text-slate-700">{b.city}</td>
                  <td className="py-3 px-4 text-slate-500">{b.address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: CREATE USER (STAFF MEMBER) */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-fadeIn">
            <h3 className="text-base font-semibold text-slate-900">
              Create New Staff Member
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Provision a new Branch Manager or Field Collection Agent.
            </p>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md font-medium"
                >
                  <option value="AGENT">Collection Agent (Field Officer on Bike)</option>
                  <option value="BRANCH_MANAGER">Branch Manager (Vault & Bank Reconciler)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={userForm.first_name}
                    onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={userForm.last_name}
                    onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. agent_karan"
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Branch *</label>
                  <select
                    value={userForm.branch_id}
                    onChange={(e) => setUserForm({ ...userForm, branch_id: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.city})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Employee ID</label>
                  <input
                    type="text"
                    placeholder="e.g. EMP-AGT-010"
                    value={userForm.employee_id}
                    onChange={(e) => setUserForm({ ...userForm, employee_id: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE CUSTOMER */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-fadeIn">
            <h3 className="text-base font-semibold text-slate-900">
              Register New Borrower / Customer
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Add small business owner and map them to a field collection agent.
            </p>

            <form onSubmit={handleCreateCustomer} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jagdish Prasad"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="9876543210"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Alternate Phone</label>
                  <input
                    type="text"
                    value={customerForm.alternate_phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, alternate_phone: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Business Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Prasad Kirana Store"
                    value={customerForm.business_name}
                    onChange={(e) => setCustomerForm({ ...customerForm, business_name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Business Type</label>
                  <input
                    type="text"
                    placeholder="e.g. Grocery, Bakery"
                    value={customerForm.business_type}
                    onChange={(e) => setCustomerForm({ ...customerForm, business_type: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={customerForm.city}
                    onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Agent *</label>
                  <select
                    value={customerForm.assigned_agent}
                    onChange={(e) => setCustomerForm({ ...customerForm, assigned_agent: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md font-medium"
                  >
                    {users.filter((u) => u.role === 'AGENT').map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.full_name || ag.username} ({ag.branch?.city || 'Agent'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Shop No. 5, Sector 18 Market"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ISSUE LOAN */}
      {showLoanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-fadeIn">
            <h3 className="text-base font-semibold text-slate-900">
              Issue Loan Contract & Auto-Generate EMIs
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Creates loan agreement with exact amortization schedule.
            </p>

            <form onSubmit={handleCreateLoan} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Customer *</label>
                <select
                  value={loanForm.customer}
                  onChange={(e) => setLoanForm({ ...loanForm, customer: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md font-medium"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.business_name || c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Principal Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={loanForm.principal_amount}
                    onChange={(e) => setLoanForm({ ...loanForm, principal_amount: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Annual Interest Rate (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={loanForm.interest_rate}
                    onChange={(e) => setLoanForm({ ...loanForm, interest_rate: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tenure (Months) *</label>
                  <select
                    value={loanForm.tenure_months}
                    onChange={(e) => setLoanForm({ ...loanForm, tenure_months: parseInt(e.target.value) })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md font-medium"
                  >
                    <option value={3}>3 Months (3 EMIs)</option>
                    <option value={6}>6 Months (6 EMIs)</option>
                    <option value={9}>9 Months (9 EMIs)</option>
                    <option value={12}>12 Months (12 EMIs)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Disbursement Date *</label>
                  <input
                    type="date"
                    required
                    value={loanForm.disbursement_date}
                    onChange={(e) => setLoanForm({ ...loanForm, disbursement_date: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-1">
                <div>
                  • Total Payable will be: <strong className="font-mono text-slate-900">₹{(Number(loanForm.principal_amount) * (1 + (Number(loanForm.interest_rate) * (loanForm.tenure_months / 12)) / 100)).toFixed(2)}</strong>
                </div>
                <div>
                  • Monthly EMI will be: <strong className="font-mono text-slate-900">₹{((Number(loanForm.principal_amount) * (1 + (Number(loanForm.interest_rate) * (loanForm.tenure_months / 12)) / 100)) / loanForm.tenure_months).toFixed(2)}</strong>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLoanModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? 'Generating...' : 'Issue Loan & Generate Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE BRANCH */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-fadeIn">
            <h3 className="text-base font-semibold text-slate-900">
              Add New Company Branch
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Establish a new physical branch office for cash collections and vault management.
            </p>

            <form onSubmit={handleCreateBranch} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Branch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ARTH - Lucknow Central Branch"
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Branch Code * (Unique)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BR-LKO-01"
                    value={branchForm.code}
                    onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lucknow"
                    value={branchForm.city}
                    onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Address</label>
                <textarea
                  rows={2}
                  placeholder="Street, District, Pincode"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
