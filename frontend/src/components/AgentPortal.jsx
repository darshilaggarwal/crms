import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  Banknote,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Receipt,
  Calendar,
  ChevronDown,
  ChevronUp,
  Store,
  Phone
} from 'lucide-react';
import ReceiptModal from './ReceiptModal';

export default function AgentPortal({ currentUser }) {
  const [customers, setCustomers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [dailyData, setDailyData] = useState({ total_cash_in_hand: '0.00', collections_count: 0, collections: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals & Drawers
  const [activeModalSchedule, setActiveModalSchedule] = useState(null);
  const [expandedLoanId, setExpandedLoanId] = useState(null);
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

  // Open collection modal
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

  // Submit collected cash to branch
  const handleSubmitToBranch = async () => {
    if (!window.confirm(`Submit ₹${dailyData.total_cash_in_hand} in cash to your branch manager for physical verification?`)) {
      return;
    }

    try {
      setSubmittingToBranch(true);
      setErrorMsg('');
      const res = await api.submitToBranch();
      setSuccessMsg(`Cash handover submitted to branch! Expected: ₹${res.expected_amount}. Status: Pending Verification.`);
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

      {/* Agent Summary Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Agent Cash In Custody
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </div>
            
            <div className="flex items-baseline gap-3 mt-1.5">
              <span className="text-3xl font-extrabold tracking-tight font-mono text-slate-900">
                ₹{Number(dailyData.total_cash_in_hand).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                across {dailyData.collections_count} collection voucher{dailyData.collections_count === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Physical cash collected on field that must be deposited into the branch vault today.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmitToBranch}
              disabled={submittingToBranch || Number(dailyData.total_cash_in_hand) <= 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              {submittingToBranch ? 'Submitting Handover...' : 'Submit Cash to Branch'}
            </button>
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-800 font-bold text-xs">✕</button>
          </div>
        )}
      </div>

      {/* Assigned Loans & Customer EMIs */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Assigned Borrowers & Repayment Schedules</h2>
            <p className="text-xs text-slate-500 mt-0.5">Track monthly installments, collect cash, and inspect amortization status</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search borrower or loan account..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading repayment schedules...</div>
        ) : filteredLoans.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No active loans found matching search.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Borrower</th>
                  <th className="py-3 px-4">Loan Account</th>
                  <th className="py-3 px-4">Repayment Progress</th>
                  <th className="py-3 px-4">Current Due Installment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLoans.map((loan) => {
                  const schedules = loan.repayment_schedules || [];
                  const paidCount = schedules.filter((s) => s.status === 'PAID').length;
                  const totalCount = schedules.length;
                  const progressPct = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

                  // Earliest pending or partially paid schedule
                  const pendingSchedule = schedules.find(
                    (s) => s.status === 'PENDING' || s.status === 'PARTIALLY_PAID'
                  );

                  const isExpanded = expandedLoanId === loan.id;

                  return (
                    <React.Fragment key={loan.id}>
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{loan.customer_name}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-medium text-slate-600">
                          {loan.loan_number}
                        </td>

                        {/* Progress Bar Column */}
                        <td className="py-3.5 px-4">
                          <div className="w-36">
                            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                              <span className="font-semibold text-slate-700">{paidCount}/{totalCount} EMIs</span>
                              <span>{progressPct}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${progressPct}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* Current Due Column */}
                        <td className="py-3.5 px-4">
                          {pendingSchedule ? (
                            <div>
                              <div className="font-mono font-bold text-slate-900">
                                ₹{Number(pendingSchedule.balance_due || pendingSchedule.expected_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                EMI #{pendingSchedule.installment_number} • Due {pendingSchedule.due_date}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                              ✓ All EMIs Settled
                            </span>
                          )}
                        </td>

                        {/* Status Column */}
                        <td className="py-3.5 px-4">
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
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              CLOSED
                            </span>
                          )}
                        </td>

                        {/* Action Column */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {pendingSchedule && (
                              <button
                                onClick={() => handleOpenCollectModal(loan, pendingSchedule)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-2xs"
                              >
                                <Banknote className="w-3.5 h-3.5 text-emerald-400" /> Collect Cash
                              </button>
                            )}

                            <button
                              onClick={() => setExpandedLoanId(isExpanded ? null : loan.id)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Toggle full 12-month schedule"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Schedule Drawer */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="bg-slate-50/90 p-4 border-b border-slate-200">
                            <div className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
                              <span>Full Amortization Calendar ({loan.loan_number})</span>
                              <span className="text-[11px] font-mono text-slate-500">
                                Outstanding: ₹{Number(loan.outstanding_amount).toLocaleString('en-IN')}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                              {schedules.map((sch) => (
                                <div
                                  key={sch.id}
                                  className={`p-2.5 rounded-xl border text-[11px] ${
                                    sch.status === 'PAID'
                                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                      : sch.status === 'PARTIALLY_PAID'
                                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                                      : 'bg-white border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center justify-between font-bold">
                                    <span>EMI #{sch.installment_number}</span>
                                    <span className="text-[9px] uppercase font-mono">
                                      {sch.status === 'PAID' ? '✓ PAID' : sch.status}
                                    </span>
                                  </div>
                                  <div className="font-mono font-bold mt-1">₹{Number(sch.expected_amount).toLocaleString('en-IN')}</div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">{sch.due_date}</div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cash Currently in Hand (Collection Log) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-0.5">
          Today's Field Receipts In Custody
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          All vouchers issued during today's field run that are awaiting branch safe handover.
        </p>

        {dailyData.collections?.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No cash collections in custody bag right now.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden">
            {dailyData.collections.map((col) => (
              <div key={col.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    ₹
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">
                      {col.customer_name} • <span className="font-mono text-slate-600 font-normal">{col.loan_number}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-5 animate-fadeIn">
            <h3 className="text-base font-bold text-slate-900">Record Cash Payment</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Borrower: <span className="font-semibold text-slate-800">{activeModalSchedule.loan.customer_name}</span>
            </p>

            <div className="my-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">EMI Installment:</span>
                <span className="font-bold text-slate-800">#{activeModalSchedule.schedule.installment_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Scheduled Amount:</span>
                <span className="font-mono text-slate-800">₹{activeModalSchedule.schedule.expected_amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Already Paid:</span>
                <span className="font-mono text-slate-800">₹{activeModalSchedule.schedule.paid_amount || '0.00'}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-200 font-bold">
                <span className="text-slate-700">Remaining Due:</span>
                <span className="font-mono text-emerald-700">₹{activeModalSchedule.schedule.balance_due || activeModalSchedule.schedule.expected_amount}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmCollection} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                  className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Partial payment is fully supported (enter any amount up to due balance).
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Agent Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Received in ₹500 currency notes"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
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
                  onClick={() => setActiveModalSchedule(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
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
