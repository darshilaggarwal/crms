import React from 'react';
import { CheckCircle2, Printer, X, ShieldCheck, Download, ArrowDownRight } from 'lucide-react';

export default function ReceiptModal({ receipt, onClose }) {
  if (!receipt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden transition-all">
        
        {/* Receipt Top Header - Institutional / Bank Voucher Style */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-300">
                Official Collection Voucher
              </span>
            </div>
            <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              ORIGINAL RECEIPT
            </span>
          </div>

          <div className="text-3xl font-bold tracking-tight text-white font-mono">
            ₹{Number(receipt.amount_collected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Cash received & recorded in digital ledger
          </p>
        </div>

        {/* Voucher Body Details */}
        <div className="p-6 space-y-3.5 text-xs">
          
          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Receipt Reference</span>
            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
              {receipt.receipt_number}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Borrower / Shop</span>
            <span className="font-semibold text-slate-900 text-right">{receipt.customer_name || 'Borrower'}</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Loan Account</span>
            <span className="font-mono font-medium text-slate-800">{receipt.loan_number}</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Installment Applied</span>
            <span className="font-medium text-slate-800">
              EMI #{receipt.installment_number}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Collected By</span>
            <span className="font-medium text-slate-800">{receipt.agent_name || 'Field Agent'}</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Date & Time</span>
            <span className="text-slate-700 font-mono text-[11px]">
              {new Date(receipt.collected_at).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Chain of Custody</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              HELD_BY_AGENT (In Transit)
            </span>
          </div>

          {/* Verification Barcode / Security Stamp Placeholder */}
          <div className="mt-4 pt-3 border-t border-dashed border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
            <div className="space-y-0.5">
              <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-500">Arthimpact Digital Loans</div>
              <div className="font-mono text-[10px]">AUTH_HASH: {receipt.receipt_number?.replace(/[^0-9]/g, '').slice(-8) || '48291048'}</div>
            </div>
            <div className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px] font-mono text-slate-600">
              DIGITALLY SECURED
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" /> Print Voucher
          </button>
          
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-2xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
