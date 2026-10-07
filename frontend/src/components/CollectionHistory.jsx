import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Search, Download, ShieldCheck, Filter } from 'lucide-react';

export default function CollectionHistory({ currentUser }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const loadHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (dateFilter) params.append('date', dateFilter);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await api.getCollectionHistory(qs);
      setHistory(res.results || res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [statusFilter, dateFilter]);

  const filtered = history.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.receipt_number?.toLowerCase().includes(q) ||
      item.customer_name?.toLowerCase().includes(q) ||
      item.loan_number?.toLowerCase().includes(q) ||
      item.agent_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      
      {/* Header and Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Immutable Collection Audit Trail
          </h2>
          <p className="text-xs text-slate-500">
            Cryptographically tracked cash receipts across all branches and agents.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search receipt, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="HELD_BY_AGENT">Held by Agent (In Transit)</option>
            <option value="SUBMITTED_TO_BRANCH">Submitted to Branch</option>
            <option value="RECONCILED">Reconciled</option>
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2 py-1.5 focus:outline-none"
          />
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading audit records...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No collection records found.</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="py-2.5 px-4">Receipt Number</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Loan Account</th>
                <th className="py-2.5 px-4">Collected By</th>
                <th className="py-2.5 px-4">Amount</th>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Custody Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                    {item.receipt_number}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">
                    {item.customer_name || 'Borrower'}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {item.loan_number} (EMI #{item.installment_number})
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {item.agent_name}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    ₹{Number(item.amount_collected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px]">
                    {new Date(item.collected_at).toLocaleString('en-IN', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                        item.status === 'RECONCILED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : item.status === 'SUBMITTED_TO_BRANCH'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
