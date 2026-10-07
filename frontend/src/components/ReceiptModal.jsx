import React from 'react';
import { CheckCircle2, Printer, X, ShieldCheck } from 'lucide-react';

export default function ReceiptModal({ receipt, onClose }) {
  if (!receipt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
        
        {/* Receipt Header */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-300">
              Official Repayment Receipt
            </span>
          </div>

          <div className="text-3xl font-bold tracking-tight text-white font-mono">
            ₹{Number(receipt.amount_collected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-300 mt-1">Payment Successfully Recorded</div>
        </div>

        {/* Receipt Body */}
        <div className="p-6 space-y-4 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-slate-500 text-xs">Receipt Number</span>
            <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
              {receipt.receipt_number}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-slate-500 text-xs">Customer</span>
            <span className="font-medium text-slate-900">{receipt.customer_name || 'Borrower'}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-slate-500 text-xs">Loan Account</span>
            <span className="font-mono text-slate-700">{receipt.loan_number}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-slate-500 text-xs">Installment</span>
            <span className="text-slate-700">EMI #{receipt.installment_number}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-slate-500 text-xs">Collected By</span>
            <span className="text-slate-700">{receipt.agent_name || 'Field Agent'}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-slate-500 text-xs">Timestamp</span>
            <span className="text-slate-700 text-xs">
              {new Date(receipt.collected_at).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-slate-500 text-xs">Status in Custody</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              HELD_BY_AGENT (In Transit)
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg text-[11px] text-slate-500 leading-relaxed border border-slate-200">
            This digital receipt confirms cash handover from customer to authorized collection agent. Funds will be deposited at the branch custody safe today.
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Print Receipt
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
