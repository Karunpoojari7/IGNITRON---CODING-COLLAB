import React, { useState } from 'react';
import { ShieldAlert, Lock, RefreshCw, LogOut } from 'lucide-react';
import { ProctoringLockStatus } from '@ignitron/shared';

export interface ExamLockOverlayProps {
  isOpen: boolean;
  lockStatus: ProctoringLockStatus;
  isDisqualified?: boolean;
  lockReason?: string | null;
  warningCount?: number;
  onRefreshStatus: () => Promise<any>;
  onReturnToDashboard?: () => void;
}

export const ExamLockOverlay: React.FC<ExamLockOverlayProps> = ({
  isOpen,
  lockStatus,
  isDisqualified = false,
  lockReason,
  warningCount = 0,
  onRefreshStatus,
  onReturnToDashboard,
}) => {
  const [checking, setChecking] = useState(false);

  if (!isOpen) return null;

  const isPermanentBlock = lockStatus === 'BLOCKED' || isDisqualified;

  const handleCheckUnlock = async () => {
    try {
      setChecking(true);
      await onRefreshStatus();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-[990] flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-md select-none"
    >
      <div className="w-full max-w-lg rounded-3xl bg-[#04110a] border-2 border-rose-500/60 shadow-[0_0_60px_rgba(244,63,94,0.3)] p-6 sm:p-8 text-center space-y-5">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400">
          {isPermanentBlock ? <Lock className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
            {isDisqualified
              ? 'ROUND DISQUALIFICATION'
              : isPermanentBlock
              ? 'ACCESS BLOCKED BY ADMINISTRATOR'
              : 'LOCKED_PENDING_REVIEW'}
          </span>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {isDisqualified
              ? 'TEAM DISQUALIFIED FROM ACTIVE ROUND'
              : 'COMPETITION ACCESS TEMPORARILY LOCKED'}
          </h2>
        </div>

        <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
          <p>
            An activity-monitoring incident was detected during your active competition round.
          </p>
          <p>
            {isPermanentBlock
              ? 'Your workspace access has been restricted by an administrator. All previously saved drafts and submitted answers remain preserved.'
              : 'Your workspace has been temporarily locked pending administrator review. Please contact the competition administrator.'}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-black/50 border border-rose-500/25 text-left text-xs font-mono space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span>Review Status:</span>
            <span className="text-rose-300 font-bold">
              {isDisqualified ? 'DISQUALIFIED' : lockStatus}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Recorded Incidents:</span>
            <span className="text-amber-300 font-bold">{warningCount}</span>
          </div>
          {lockReason && (
            <div className="pt-1 border-t border-slate-800 text-slate-300">
              <span className="text-slate-500 block text-[10px] uppercase">Details:</span>
              <span>{lockReason}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {!isDisqualified && (
            <button
              type="button"
              onClick={handleCheckUnlock}
              disabled={checking}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking Status...' : 'Check Review Status'}</span>
            </button>
          )}

          {onReturnToDashboard && (
            <button
              type="button"
              onClick={onReturnToDashboard}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer border border-slate-700"
            >
              <LogOut className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
