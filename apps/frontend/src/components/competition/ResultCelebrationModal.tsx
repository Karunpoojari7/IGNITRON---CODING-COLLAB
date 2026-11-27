import React from 'react';
import { createPortal } from 'react-dom';
import { Info, X } from 'lucide-react';
import { GoogleCelebrationModal } from './GoogleCelebrationModal';
import { ResultCelebrationType } from '@ignitron/shared';

export interface ResultCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ResultCelebrationType;
  title: string;
  message: string;
  teamName: string;
  roundName?: string;
  nextRoundName?: string;
  winnerTeamName?: string | null;
  winnerScore?: number;
  winnerInstitution?: string | null;
  runnerUpTeamName?: string | null;
  runnerUpScore?: number;
  runnerUpInstitution?: string | null;
}

export const ResultCelebrationModal: React.FC<ResultCelebrationModalProps> = ({
  isOpen,
  onClose,
  type,
  title,
  message,
  teamName,
  roundName,
  nextRoundName,
  winnerTeamName,
  winnerScore,
  winnerInstitution,
  runnerUpTeamName,
  runnerUpScore,
  runnerUpInstitution,
}) => {
  if (!isOpen) return null;

  const isNotShortlisted =
    type === 'ELIMINATED' || title?.toLowerCase().includes('not shortlisted');

  // Non-shortlisted teams must NEVER see confetti, trophy animations, or celebratory wording
  if (isNotShortlisted) {
    if (typeof document === 'undefined') return null;

    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[950] flex items-center justify-center p-4 sm:p-6 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      >
        <div className="absolute inset-0" onClick={onClose} />
        <div className="relative z-[960] w-full max-w-[480px] mx-auto my-auto bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-7 text-center font-sans animate-in zoom-in-95 duration-200 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-600" />
          <button
            onClick={onClose}
            type="button"
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close result notice"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center pt-1">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 mb-3">
              <Info className="w-6 h-6" />
            </div>
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase bg-slate-100 text-slate-700 border border-slate-200">
              Official Stage Result
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-3">
            {title || 'ROUND 1 RESULTS: NOT SHORTLISTED'}
          </h2>

          <p className="text-sm text-slate-600 leading-relaxed mt-2.5">
            {message ||
              'One result does not define your potential. Learn from this challenge, keep building your skills and come back stronger.'}
          </p>

          <p className="text-xs text-slate-500 mt-2">
            One result does not define your potential. Learn from this challenge, keep building your skills and come back stronger.
          </p>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold tracking-wide transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  // Determine positive celebration mode
  const mode =
    type === 'GRAND_WINNER'
      ? 'WINNER'
      : type === 'QUALIFIED'
      ? 'ROUND_QUALIFIED'
      : 'STANDARD';

  return (
    <GoogleCelebrationModal
      isOpen={isOpen}
      onClose={onClose}
      mode={mode}
      title={type === 'GRAND_WINNER' ? '🎉 Grand Champions!' : title || 'Congratulations!'}
      subtext={message || "You nailed it! You've successfully completed the challenge."}
      teamName={teamName}
      roundName={roundName}
      nextRoundName={nextRoundName}
      winnerTeamName={winnerTeamName}
      winnerScore={winnerScore}
      winnerInstitution={winnerInstitution}
      runnerUpTeamName={runnerUpTeamName}
      runnerUpScore={runnerUpScore}
      runnerUpInstitution={runnerUpInstitution}
      buttonLabel="Awesome"
    />
  );
};
