import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  CheckCircle,
  AlertTriangle,
  Building,
  Landmark,
  Plus,
  ArrowRight,
  ShieldAlert,
  Coins,
  FileCheck2,
  Receipt
} from 'lucide-react';

export default function BranchPortal({ currentUser }) {
  const [submissions, setSubmissions] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reconcile'); // 'reconcile' | 'deposits'

  // Verification modal state
  const [verifyingSubmission, setVerifyingSubmission] = useState(null);
  const [countedAmount, setCountedAmount] = useState('');
  const [managerNotes, setManagerNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // New deposit modal state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositForm, setDepositForm] = useState({
    branch: '',
    bank_name: 'HDFC Bank',
    bank_account_number: '50200088991122',
    ifsc_code: 'HDFC0001234',
    amount: '',
    reference_utr: '',
    deposit_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [subRes, depRes, branchRes] = await Promise.all([
        api.getSubmissions(),
        api.getBankDeposits(),
        api.getBranches(),
      ]);
      setSubmissions(subRes.results || subRes || []);
      setDeposits(depRes.results || depRes || []);
      const bList = branchRes.results || branchRes || [];
      setBranches(bList);
      if (bList.length > 0 && !depositForm.branch) {
        setDepositForm((prev) => ({ ...prev, branch: bList[0].id }));
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load branch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Open verify modal
  const handleOpenVerify = (sub) => {
    setVerifyingSubmission(sub);
    setCountedAmount(sub.expected_amount);
    setManagerNotes('');
    setErrorMsg('');
  };

  // Submit verification (Approve or Reject)
  const handleVerify = async (action) => {
    if (!verifyingSubmission) return;

    const actual = Number(countedAmount);
    const expected = Number(verifyingSubmission.expected_amount);
    const diff = actual - expected;

    if (diff !== 0 && !managerNotes.trim()) {
      setErrorMsg('Manager notes are mandatory when a cash discrepancy exists.');
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg('');
      await api.verifySubmission(
        verifyingSubmission.id,
        countedAmount,
        action,
        managerNotes
      );
      setSuccessMsg(
        `Submission ${action === 'APPROVE' ? 'Approved' : 'Rejected'}! Discrepancy: ₹${diff.toFixed(2)}`
      );
      setVerifyingSubmission(null);
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Create bank deposit
  const handleCreateDeposit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setErrorMsg('');
      await api.createBankDeposit(depositForm);
      setSuccessMsg(`Bank deposit recorded! Reference: ${depositForm.reference_utr}`);
      setShowDepositModal(false);
      setDepositForm({
        ...depositForm,
        amount: '',
        reference_utr: '',
        notes: '',
      });
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to record deposit');
    } finally {
      setActionLoading(false);
    }
  };

  // Mark deposit as settled
  const handleSettleDeposit = async (id) => {
    if (!window.confirm('Confirm that this amount has credited into the company bank account?')) {
      return;
    }
    try {
      setActionLoading(true);
      await api.settleDeposit(id);
      setSuccessMsg('Bank deposit successfully marked as SETTLED!');
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Settlement update failed');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingSubmissions = submissions.filter((s) => s.status === 'PENDING');
  const pastSubmissions = submissions.filter((s) => s.status !== 'PENDING');

  // Compute live discrepancy for the active modal
  const liveDiff = verifyingSubmission
    ? Number(countedAmount || 0) - Number(verifyingSubmission.expected_amount || 0)
    : 0;

  return (
    <div className="space-y-6">

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Branch Operations & Vault Custody
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">
            Physical Cash Verification & Banking Hub
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit agent cash bags against digital receipt totals, flag shortages, and deposit consolidated cash into bank accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-lg border border-slate-200/80 flex">
            <button
              onClick={() => setActiveTab('reconcile')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeTab === 'reconcile'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/90'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Agent Handover Queue ({pendingSubmissions.length})
            </button>
            <button
              onClick={() => setActiveTab('deposits')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeTab === 'deposits'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/90'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bank Deposits & Settlements
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="font-bold">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="font-bold">✕</button>
        </div>
      )}

      {/* TAB 1: RECONCILIATION QUEUE */}
      {activeTab === 'reconcile' && (
        <div className="space-y-6">
          
          {/* Pending Submissions */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Pending Physical Cash Handover Queue
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Field agents waiting at branch counter for physical cash counting and verification approval.
              </p>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading submissions...</div>
            ) : pendingSubmissions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No pending handovers in queue. All field collections have been audited and accepted.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingSubmissions.map((sub) => (
                  <div key={sub.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{sub.agent_name}</span>
                        <span className="text-[11px] text-slate-500">({sub.branch_name})</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          PENDING PHYSICAL COUNT
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Submitted: {sub.submission_date} • Collection Vouchers in Bag: {sub.collections_count}
                      </div>
                    </div>

                    <div className="flex items-center gap-5">
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Digital Expected</div>
                        <div className="text-lg font-bold font-mono text-slate-900">
                          ₹{Number(sub.expected_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenVerify(sub)}
                        className="px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors shadow-2xs"
                      >
                        Count & Verify Cash
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Submissions & Discrepancies */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Historical Verification & Discrepancy Audit Log
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Permanent record of physical handovers and variance reports</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Field Agent</th>
                    <th className="py-3 px-4">Expected</th>
                    <th className="py-3 px-4">Actual Counted</th>
                    <th className="py-3 px-4">Discrepancy (Variance)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Manager Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pastSubmissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{sub.agent_name}</td>
                      <td className="py-3 px-4 font-mono font-medium">₹{Number(sub.expected_amount).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {sub.actual_amount ? `₹${Number(sub.actual_amount).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {sub.discrepancy === null || sub.discrepancy === 0 ? (
                          <span className="text-emerald-700 font-semibold text-[11px]">✓ Exact Match (₹0.00)</span>
                        ) : Number(sub.discrepancy) < 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                            SHORTAGE: ₹{Math.abs(Number(sub.discrepancy)).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                            EXCESS: +₹{Number(sub.discrepancy).toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            sub.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 italic text-[11px] max-w-xs truncate">
                        {sub.manager_notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: BANK DEPOSITS */}
      {activeTab === 'deposits' && (
        <div className="space-y-6">
          
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Bank Deposits & Settlement Ledger
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Consolidated branch cash deposited into company bank account (HDFC / SBI).
              </p>
            </div>

            <button
              onClick={() => setShowDepositModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" /> + Record Bank Deposit
            </button>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Bank & Reference UTR</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Deposit Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Reconciliation Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deposits.map((dep) => (
                  <tr key={dep.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{dep.bank_name}</div>
                      <div className="font-mono text-[11px] text-slate-500 mt-0.5">{dep.reference_utr}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">{dep.branch_name}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">{dep.deposit_date}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-sm">
                      ₹{Number(dep.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          dep.status === 'SETTLED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${dep.status === 'SETTLED' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                        {dep.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {dep.status !== 'SETTLED' ? (
                        <button
                          onClick={() => handleSettleDeposit(dep.id)}
                          className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shadow-2xs"
                        >
                          Mark Settled
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Reconciled ✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* Verify Submission Modal with Discrepancy Calculation */}
      {verifyingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-fadeIn">
            <h3 className="text-base font-bold text-slate-900">
              Verify Physical Cash Handover
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Agent: <span className="font-semibold text-slate-800">{verifyingSubmission.agent_name}</span> • Branch: {verifyingSubmission.branch_name}
            </p>

            {/* Expected vs Actual Math Box */}
            <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Digital System Expected:</span>
                <span className="font-mono text-base font-bold text-slate-900">
                  ₹{Number(verifyingSubmission.expected_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Physical Cash Counted on Counter (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={countedAmount}
                  onChange={(e) => setCountedAmount(e.target.value)}
                  className="w-full px-3 py-2 text-base font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Real-Time Discrepancy Indicator */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-600">Calculated Difference:</span>
                <div>
                  {liveDiff === 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ Exact Match (₹0.00)
                    </span>
                  ) : liveDiff < 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded bg-rose-50 text-rose-700 border border-rose-300 font-mono">
                      ⚠️ SHORTAGE of ₹{Math.abs(liveDiff).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-300 font-mono">
                      + EXCESS of ₹{liveDiff.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Manager Remarks {liveDiff !== 0 && <span className="text-rose-600 font-bold">* (Mandatory for discrepancy)</span>}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    liveDiff !== 0
                      ? 'Explain reason for shortage/excess (e.g. Note was damaged, agent short)'
                      : 'Optional notes'
                  }
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {errorMsg && (
                <div className="p-2 text-xs text-rose-600 bg-rose-50 rounded-lg border border-rose-200">
                  {errorMsg}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setVerifyingSubmission(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleVerify('REJECT')}
                  disabled={actionLoading}
                  className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 disabled:opacity-50"
                >
                  Reject Submission
                </button>
                <button
                  type="button"
                  onClick={() => handleVerify('APPROVE')}
                  disabled={actionLoading}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Approve Handover'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Bank Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-fadeIn">
            <h3 className="text-base font-bold text-slate-900">
              Create Bank Deposit Slip
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Deposit consolidated cash from branch safe into company account.
            </p>

            <form onSubmit={handleCreateDeposit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Branch
                </label>
                <select
                  value={depositForm.branch}
                  onChange={(e) => setDepositForm({ ...depositForm, branch: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={depositForm.bank_name}
                    onChange={(e) => setDepositForm({ ...depositForm, bank_name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Deposit Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={depositForm.deposit_date}
                    onChange={(e) => setDepositForm({ ...depositForm, deposit_date: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deposit Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 50000.00"
                  value={depositForm.amount}
                  onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank Reference / UTR / Challan No. * (Must be Unique)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC-DEP-202610-0099"
                  value={depositForm.reference_utr}
                  onChange={(e) => setDepositForm({ ...depositForm, reference_utr: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Deposited at Cyber Hub CDM"
                  value={depositForm.notes}
                  onChange={(e) => setDepositForm({ ...depositForm, notes: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              {errorMsg && (
                <div className="p-2 text-xs text-rose-600 bg-rose-50 rounded-lg border border-rose-200">
                  {errorMsg}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                >
                  {actionLoading ? 'Recording...' : 'Record Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
