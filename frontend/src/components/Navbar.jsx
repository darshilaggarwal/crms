import React from 'react';
import { Building2, User, LogOut, ArrowRightLeft, ShieldCheck } from 'lucide-react';

export default function Navbar({ currentUser, activeTab, setActiveTab, onSwitchUser, onLogout }) {
  const demoUsers = [
    { username: 'admin', label: 'Admin (Ankit Verma)', role: 'ADMIN' },
    { username: 'manager_priya', label: 'Branch Mgr (Priya Sharma)', role: 'BRANCH_MANAGER' },
    { username: 'agent_suresh', label: 'Agent 1 (Suresh Kumar)', role: 'AGENT' },
    { username: 'agent_mohan', label: 'Agent 2 (Mohan Lal)', role: 'AGENT' },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & System Name */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-base tracking-wider">
              AR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 text-sm tracking-tight">ARTH CMRS</span>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  Fintech Ledger
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Cash Management & Reconciliation System</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Executive Dashboard
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'admin'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Admin Master Control
            </button>

            <button
              onClick={() => setActiveTab('agent')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'agent'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Agent Collections
            </button>

            <button
              onClick={() => setActiveTab('branch')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'branch'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Branch Reconciliation & Bank
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Audit Trail
            </button>
          </nav>

          {/* User profile & Quick Switcher */}
          <div className="flex items-center gap-3">
            {/* Quick Demo Switcher */}
            <div className="hidden lg:flex items-center gap-1 text-xs">
              <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                <ArrowRightLeft className="w-3 h-3" /> Demo Switch:
              </span>
              <select
                value={currentUser?.username || ''}
                onChange={(e) => onSwitchUser(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-medium text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                {demoUsers.map((u) => (
                  <option key={u.username} value={u.username}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Current Active User Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700">
                {currentUser?.first_name ? currentUser.first_name[0] : 'U'}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-medium text-slate-900">
                  {currentUser?.full_name || currentUser?.username}
                </div>
                <div className="text-[10px] text-slate-500 font-mono tracking-tight flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {currentUser?.role} {currentUser?.branch ? `• ${currentUser.branch.city}` : ''}
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Log out"
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
