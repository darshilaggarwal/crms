import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  TrendingUp,
  Banknote,
  Building,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Filter,
  RefreshCw
} from 'lucide-react';

export default function DashboardView({ currentUser }) {
  const [summary, setSummary] = useState(null);
  const [agents, setAgents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Filters
  const [branchFilter, setBranchFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const queryParams = new URLSearchParams();
      if (branchFilter) queryParams.append('branch_id', branchFilter);
      if (dateFrom) queryParams.append('date_from', dateFrom);
      if (dateTo) queryParams.append('date_to', dateTo);

      const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';

      const [sumRes, agentRes, branchRes] = await Promise.all([
        api.getDashboardSummary(qs),
        api.getAgentSummaries(),
        api.getBranches(),
      ]);

      setSummary(sumRes);
      setAgents(agentRes.agents || []);
      setBranches(branchRes.results || branchRes || []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [branchFilter, dateFrom, dateTo]);

  const s = summary?.summary || {};
  const d = summary?.discrepancies || {};
  const lifecycle = summary?.transaction_lifecycle || {};

  return (
    <div className="space-y-6">

      {/* Header & Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Real-Time Cash Intelligence
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Executive Cash Reconciliation Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Full visibility across loan expectations, field collections, branch safes, and bank settlements.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2 py-1.5 focus:outline-none"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2 py-1.5 focus:outline-none"
          />

          <button
            onClick={loadDashboard}
            title="Refresh metrics"
            className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {errorMsg}
        </div>
      )}

      {/* 4 CORE MANDATORY KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Expected Collections */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">1. Expected Collections</span>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            ₹{Number(s.total_expected_collections || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Total active EMIs scheduled for recovery
          </div>
        </div>

        {/* KPI 2: Total Collected */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">2. Total Collected</span>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">
            ₹{Number(s.total_collected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Cash successfully recovered from customers
          </div>
        </div>

        {/* KPI 3: Cash Held by Agents (In-Transit) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">3. Cash Held by Agents</span>
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600">
            ₹{Number(s.cash_held_by_agents || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            In-transit: collected but not yet at branch safe
          </div>
        </div>

        {/* KPI 4: Cash at Branches vs Settled in Bank */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">4. Settled in Bank</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            ₹{Number(s.total_settled || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            At Branch Safe: ₹{Number(s.cash_at_branches || 0).toLocaleString('en-IN')}
          </div>
        </div>

      </div>

      {/* SECONDARY METRICS: DISCREPANCIES & LOAN OUTSTANDING */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Branch Cash Shortages Flagged
          </div>
          <div className="text-xl font-bold font-mono text-rose-600">
            ₹{Number(d.total_shortage || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Missing cash reported during agent handover</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Total Bank Deposits Registered
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            ₹{Number(s.total_bank_deposited || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Deposited with verified bank Challan / UTR</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Company Total Loan Outstanding
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            ₹{Number(s.total_loan_outstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Remaining borrower debt balance</div>
        </div>

      </div>

      {/* VISUAL TRANSACTION LIFECYCLE PROGRESSION */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-1">
          Complete Transaction Lifecycle Progression
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Tracking the full journey of physical money from customer to final company bank account settlement.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">1. Expected</div>
            <div className="text-base font-bold font-mono text-slate-900 mt-1">
              ₹{Number(lifecycle.expected || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Loan EMI Due Date</div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">2. Collected</div>
            <div className="text-base font-bold font-mono text-emerald-800 mt-1">
              ₹{Number(lifecycle.collected || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-emerald-600 mt-1">Receipt Issued by Agent</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">3. Branch Received</div>
            <div className="text-base font-bold font-mono text-slate-900 mt-1">
              ₹{Number(lifecycle.branch_received || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Verified at Branch Safe</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">4. Bank Deposited</div>
            <div className="text-base font-bold font-mono text-slate-900 mt-1">
              ₹{Number(lifecycle.bank_deposited || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Deposited with UTR Slip</div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">5. Settled</div>
            <div className="text-base font-bold font-mono text-emerald-800 mt-1">
              ₹{Number(lifecycle.settled || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-emerald-600 mt-1">Reconciliation Complete</div>
          </div>

        </div>
      </div>

      {/* AGENT PERFORMANCE BREAKDOWN TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">
            Field Collection Agent Summary
          </h3>
          <p className="text-xs text-slate-500">Live custody tracking per collection officer</p>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
            <tr>
              <th className="py-2.5 px-4">Agent Name</th>
              <th className="py-2.5 px-4">Assigned Branch</th>
              <th className="py-2.5 px-4">Total Collected</th>
              <th className="py-2.5 px-4">Cash Currently in Hand (In-Transit)</th>
              <th className="py-2.5 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {agents.map((ag) => (
              <tr key={ag.agent_id} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-semibold text-slate-900">{ag.agent_name}</td>
                <td className="py-3 px-4 text-slate-600">{ag.branch || '—'}</td>
                <td className="py-3 px-4 font-mono">
                  ₹{Number(ag.total_collected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-4 font-mono font-bold text-amber-700">
                  ₹{Number(ag.cash_in_hand).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-4">
                  {Number(ag.cash_in_hand) > 0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      HOLDING CASH
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ALL CASH SUBMITTED
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
