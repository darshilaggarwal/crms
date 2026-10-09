import React from 'react';
import { Building2, User, LogOut, ArrowRightLeft, ShieldCheck, Activity } from 'lucide-react';

export default function Navbar({ currentUser, activeTab, setActiveTab, onSwitchUser, onLogout }) {
  const demoUsers = [
    { username: 'admin', label: '👑 Admin (Ankit Verma)', role: 'ADMIN' },
    { username: 'manager_priya', label: '🏦 Branch Mgr (Priya Sharma)', role: 'BRANCH_MANAGER' },
    { username: 'agent_suresh', label: '🚴 Agent 1 (Suresh Kumar)', role: 'AGENT' },
    { username: 'agent_mohan', label: '🚴 Agent 2 (Mohan Lal)', role: 'AGENT' },
  ];

  // STRICT ROLE-BASED ACCESS CONTROL (RBAC) NAVIGATION
  // Only tabs authorized for the user's specific role are rendered.
  const getAuthorizedTabs = (role) => {
    switch (role) {
      case 'AGENT':
        return [
          { id: 'agent', label: 'Field Collections & EMIs' },
          { id: 'history', label: 'My Receipt History' },
        ];
      case 'BRANCH_MANAGER':
        return [
          { id: 'branch', label: 'Branch Vault & Bank Reconciliation' },
          { id: 'history', label: 'Branch Audit Trail' },
        ];
      case 'ADMIN':
      default:
        return [
          { id: 'dashboard', label: 'Executive Dashboard' },
          { id: 'admin', label: 'Master Data & Staff Control' },
          { id: 'history', label: 'System Audit Trail' },
        ];
    }
  };

  const navTabs = getAuthorizedTabs(currentUser?.role);

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15">
          
          {/* Brand */}
          <div className="flex items-center">
            <span className="font-extrabold text-slate-900 text-lg tracking-tight font-mono">CMRS</span>
          </div>

          {/* Strict Role-Based Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/80">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/90'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* User Controls & Evaluator Quick Switcher */}
          <div className="flex items-center gap-3">
            {/* Quick Demo Switcher for Evaluation */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 flex items-center gap-1 text-[11px] font-medium">
                <ArrowRightLeft className="w-3 h-3 text-slate-400" /> Switch View:
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
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                  {currentUser?.role === 'AGENT' && 'Field Agent'}
                  {currentUser?.role === 'BRANCH_MANAGER' && 'Branch Manager'}
                  {currentUser?.role === 'ADMIN' && 'Head Office Admin'}
                  {currentUser?.branch ? ` • ${currentUser.branch.city}` : ''}
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
