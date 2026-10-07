import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Banknote, Send, CheckCircle, Clock, AlertCircle, Search, Receipt } from 'lucide-react';
import ReceiptModal from './ReceiptModal';

export default function AgentPortal({ currentUser }) {
  const [customers, setCustomers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [dailyData, setDailyData] = useState({ total_cash_in_hand: '0.00', collections_count: 0, collections: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeModalSchedule, setActiveModalSchedule] = useState(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectNotes, setCollectNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [submittingToBranch, setSubmittingToBranch] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [custRes, loansRes, dailyRes] = await Promise.all([
        api.getCustomers(),
        api.getLoans(),
        api.getAgentDailyCollections().catch(() => ({ total_cash_in_hand: '0.00', collections_count: 0, collections: [] })),
      ]);
      setCustomers(custRes.results || custRes || []);
      setLoans(loansRes.results || loansRes || []);
      setDailyData(dailyRes);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load agent data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Open collection modal for a specific EMI schedule
  const handleOpenCollectModal = (loan, schedule) => {
    setActiveModalSchedule({ loan, schedule });
    setCollectAmount(schedule.balance_due || schedule.expected_amount);
    setCollectNotes('');
    setErrorMsg('');
  };

  // Submit cash collection
  const handleConfirmCollection = async (e) => {
    e.preventDefault();
    if (!activeModalSchedule) return;

    try {
      setSubmittingPayment(true);
      setErrorMsg('');
      const res = await api.recordPayment(
        activeModalSchedule.schedule.id,
        collectAmount,
        collectNotes
      );
      setLastReceipt(res);
      setActiveModalSchedule(null);
      setSuccessMsg(`Payment recorded! Receipt: ${res.receipt_number}`);
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Payment recording failed');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Submit all collected cash to branch
  const handleSubmitToBranch = async () => {
    if (!window.confirm(`Submit ₹${dailyData.total_cash_in_hand} in cash to your branch manager for physical verification?`)) {
      return;
    }

    try {
      setSubmittingToBranch(true);
      setErrorMsg('');
      const res = await api.submitToBranch();
      setSuccessMsg(`Cash handover submitted to branch! Expected amount: ₹${res.expected_amount}. Status: Pending Verification.`);
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit cash to branch');
    } finally {
      setSubmittingToBranch(false);
    }
  };

  const filteredLoans = loans.filter((loan) => {
    const q = search.toLowerCase();
    return (
      loan.customer_name?.toLowerCase().includes(q) ||
      loan.loan_number?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">

      {currentUser?.role !== 'AGENT' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center justify-between">
          <span>
            ℹ️ You are viewing this screen as <strong>{currentUser?.role}</strong>. To test recording customer payments and issuing receipts, switch to <strong>Agent Suresh</strong> or <strong>Agent Mohan</strong> using the Demo Switcher in the top navbar.
          </span>
        </div>
      )}

      {/* Agent Summary Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Agent Cash Custody
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold tracking-tight font-mono text-slate-900">
                ₹{Number(dailyData.total_cash_in_hand).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-slate-500">
                held across {dailyData.collections_count} collection{dailyData.collections_count === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Physical cash collected on field that must be deposited at your branch office today.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmitToBranch}
              disabled={submittingToBranch || Number(dailyData.total_cash_in_hand) <= 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              {submittingToBranch ? 'Submitting...' : 'Submit Cash to Branch'}
            </button>
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-800 font-bold text-xs">✕</button>
          </div>
        )}
      </div>

      {/* Assigned Loans & Customer EMIs */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Assigned Customers & Due EMIs</h2>
            <p className="text-xs text-slate-500">Field repayments scheduled for recovery</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer or loan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading loan schedules...</div>
        ) : filteredLoans.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No active loans found matching query.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Loan Account</th>
                  <th className="py-2.5 px-4">Outstanding</th>
                  <th className="py-2.5 px-4">Current Due Installment</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLoans.map((loan) => {
                  // Find earliest pending/partially paid schedule
                  const pendingSchedule = (loan.repayment_schedules || []).find(
                    (s) => s.status === 'PENDING' || s.status === 'PARTIALLY_PAID'
                  );

                  return (
                    <tr key={loan.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {loan.customer_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {loan.loan_number}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">
                        ₹{Number(loan.outstanding_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        {pendingSchedule ? (
                          <div>
                            <span className="font-semibold text-slate-900 font-mono">
                              ₹{Number(pendingSchedule.balance_due || pendingSchedule.expected_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[11px] text-slate-500 ml-1.5">
                              (EMI #{pendingSchedule.installment_number} due {pendingSchedule.due_date})
                            </span>
                          </div>
                        ) : (
                          <span className="text-emerald-600 font-medium">All EMIs Cleared</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {pendingSchedule ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                              pendingSchedule.status === 'PARTIALLY_PAID'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {pendingSchedule.status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            COMPLETED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {pendingSchedule ? (
                          <button
                            onClick={() => handleOpenCollectModal(loan, pendingSchedule)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded hover:bg-slate-100 transition-colors shadow-2xs"
                          >
                            <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Collect Cash
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cash Currently in Hand (Collection Log) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-1">
          Today's Collected Cash in Hand (Not Yet Submitted)
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Receipts issued today that are currently in your custody.
        </p>

        {dailyData.collections?.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
            No cash collections in transit. Record a payment above to issue a receipt.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {dailyData.collections.map((col) => (
              <div key={col.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
                    ₹
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">
                      {col.customer_name} • <span className="font-mono text-slate-600">{col.loan_number}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {col.receipt_number} • {new Date(col.collected_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-sm text-slate-900">
                    ₹{Number(col.amount_collected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    HELD_BY_AGENT
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {activeModalSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5 animate-fadeIn">
            <h3 className="text-base font-semibold text-slate-900">Record Cash Payment</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Customer: <span className="font-medium text-slate-800">{activeModalSchedule.loan.customer_name}</span>
            </p>

            <div className="my-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">EMI Installment:</span>
                <span className="font-semibold text-slate-800">#{activeModalSchedule.schedule.installment_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">EMI Expected Amount:</span>
                <span className="font-mono text-slate-800">₹{activeModalSchedule.schedule.expected_amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Already Paid:</span>
                <span className="font-mono text-slate-800">₹{activeModalSchedule.schedule.paid_amount || '0.00'}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-semibold">
                <span className="text-slate-700">Balance Due:</span>
                <span className="font-mono text-emerald-700">₹{activeModalSchedule.schedule.balance_due || activeModalSchedule.schedule.expected_amount}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmCollection} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Cash Amount Collected (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={activeModalSchedule.schedule.balance_due || activeModalSchedule.schedule.expected_amount}
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Partial payment is fully supported (enter any amount up to due balance).
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Agent Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Received ₹2000 in notes of ₹500"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {errorMsg && (
                <div className="p-2 text-xs text-rose-600 bg-rose-50 rounded border border-rose-200">
                  {errorMsg}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModalSchedule(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50"
                >
                  {submittingPayment ? 'Issuing...' : 'Generate Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Render Receipt Modal */}
      {lastReceipt && (
        <ReceiptModal
          receipt={lastReceipt}
          onClose={() => setLastReceipt(null)}
        />
      )}

    </div>
  );
}
