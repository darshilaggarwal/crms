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
  RefreshCw,
  ShieldCheck,
  Vault,
  Landmark,
  ArrowUpRight
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Real-Time Financial Intelligence
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">
            Executive Cash Reconciliation & Custody Overview
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time multi-branch visibility across expected recovery, field collections, branch safes, and bank settlements.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-2xs transition-colors"
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
            className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-2xs transition-colors"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-2xs transition-colors"
          />

          <button
            onClick={loadDashboard}
            title="Refresh metrics"
            className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {errorMsg}
        </div>
      )}

      {/* 4 CORE MANDATORY KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Expected Collections */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">1. Expected Recovery</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 tracking-tight">
            ₹{Number(s.total_expected_collections || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            Active EMI schedule receivables
          </div>
        </div>

        {/* KPI 2: Total Collected */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">2. Field Collected</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-600 tracking-tight">
            ₹{Number(s.total_collected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            Recovered via official receipt vouchers
          </div>
        </div>

        {/* KPI 3: Cash Held by Agents (In-Transit) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">3. In Transit (Agents)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-600 tracking-tight">
            ₹{Number(s.cash_held_by_agents || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            Awaiting physical vault handover
          </div>
        </div>

        {/* KPI 4: Cash at Branches vs Settled in Bank */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">4. Bank Settled</span>
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 tracking-tight">
            ₹{Number(s.total_settled || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            At Branch Safe: <span className="font-mono text-slate-700 font-bold">₹{Number(s.cash_at_branches || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

      </div>

      {/* SECONDARY METRICS: DISCREPANCIES & LOAN OUTSTANDING */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Handover Cash Shortages Flagged
          </div>
          <div className="text-xl font-extrabold font-mono text-rose-600">
            ₹{Number(d.total_shortage || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Physical discrepancies reported during handover</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Total Bank Deposits Registered
          </div>
          <div className="text-xl font-extrabold font-mono text-slate-900">
            ₹{Number(s.total_bank_deposited || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Deposited with verified bank Challan / UTR</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Company Total Loan Outstanding
          </div>
          <div className="text-xl font-extrabold font-mono text-slate-900">
            ₹{Number(s.total_loan_outstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Unrecovered principal and interest balance</div>
        </div>

      </div>

      {/* VISUAL TRANSACTION LIFECYCLE PROGRESSION */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              5-Stage Financial Lifecycle Pipeline
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Strict digital chain of custody from customer hand to final company bank account settlement.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">01. EXPECTED</div>
            <div className="text-base font-extrabold font-mono text-slate-900 mt-1">
              ₹{Number(lifecycle.expected || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Scheduled EMI Repayments</div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/90">
            <div className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">02. COLLECTED</div>
            <div className="text-base font-extrabold font-mono text-emerald-800 mt-1">
              ₹{Number(lifecycle.collected || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-emerald-600 mt-1">Receipts Issued in Field</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">03. BRANCH VAULT</div>
            <div className="text-base font-extrabold font-mono text-slate-900 mt-1">
              ₹{Number(lifecycle.branch_received || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Verified at Branch Counter</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">04. BANK DEPOSITED</div>
            <div className="text-base font-extrabold font-mono text-slate-900 mt-1">
              ₹{Number(lifecycle.bank_deposited || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Bank Challan UTR Recorded</div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/90">
            <div className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">05. SETTLED</div>
            <div className="text-base font-extrabold font-mono text-emerald-800 mt-1">
              ₹{Number(lifecycle.settled || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-emerald-600 mt-1">Reconciliation Complete</div>
          </div>

        </div>
      </div>

      {/* AGENT PERFORMANCE BREAKDOWN TABLE */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Field Collection Agent Custody Breakdown
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Real-time custody tracking per active field recovery officer</p>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-4">Agent Name</th>
              <th className="py-3 px-4">Assigned Branch</th>
              <th className="py-3 px-4">Total Collected</th>
              <th className="py-3 px-4">Cash Currently In Hand</th>
              <th className="py-3 px-4">Custody Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {agents.map((ag) => (
              <tr key={ag.agent_id} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-900">{ag.agent_name}</td>
                <td className="py-3.5 px-4 text-slate-600">{ag.branch || '—'}</td>
                <td className="py-3.5 px-4 font-mono font-medium">
                  ₹{Number(ag.total_collected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-amber-700">
                  ₹{Number(ag.cash_in_hand).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3.5 px-4">
                  {Number(ag.cash_in_hand) > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      HOLDING PHYSICAL CASH
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      ALL CASH RECONCILED
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
