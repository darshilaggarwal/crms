import React from 'react';
import { Building2, User, LogOut, ArrowRightLeft, ShieldCheck, Activity } from 'lucide-react';

export default function Navbar({ currentUser, activeTab, setActiveTab, onSwitchUser, onLogout }) {
  const demoUsers = [
    { username: 'admin', label: '👑 Admin (Ankit Verma)', role: 'ADMIN' },
    { username: 'manager_priya', label: '🏦 Branch Mgr (Priya Sharma)', role: 'BRANCH_MANAGER' },
    { username: 'agent_suresh', label: '🚴 Agent 1 (Suresh Kumar)', role: 'AGENT' },
    { username: 'agent_mohan', label: '🚴 Agent 2 (Mohan Lal)', role: 'AGENT' },
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15">
          
          {/* Logo & System Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-2xs">
              AR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm tracking-tight">ARTH CMRS</span>
                <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Ledger
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block font-medium">Cash Management & Reconciliation</p>
            </div>
          </div>

          {/* Navigation Tab Bar */}
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/80">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/90'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Executive Dashboard
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'admin'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/90'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Admin Master Control
            </button>

            <button
              onClick={() => setActiveTab('agent')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'agent'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/90'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Agent Collections
            </button>

            <button
              onClick={() => setActiveTab('branch')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'branch'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/90'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Branch Reconciliation & Bank
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/90'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Audit Trail
            </button>
          </nav>

          {/* User Controls & Demo Switcher */}
          <div className="flex items-center gap-3">
            {/* Quick Demo Switcher */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 flex items-center gap-1 text-[11px] font-medium">
                <ArrowRightLeft className="w-3 h-3 text-slate-400" /> Switch Role:
              </span>
              <select
                value={currentUser?.username || ''}
                onChange={(e) => onSwitchUser(e.target.value)}
                className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-2xs"
              >
                {demoUsers.map((u) => (
                  <option key={u.username} value={u.username}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Current Active User Profile Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                {currentUser?.first_name ? currentUser.first_name[0] : 'U'}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {currentUser?.full_name || currentUser?.username}
                </div>
                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                  <span className="inline-block w-1 h-1 rounded-full bg-emerald-500"></span>
                  {currentUser?.role} {currentUser?.branch ? `• ${currentUser.branch.city}` : ''}
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
