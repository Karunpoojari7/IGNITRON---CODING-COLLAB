import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, Award, Sparkles, CheckCircle2, X } from 'lucide-react';
import { triggerGoogleCelebrationConfetti, triggerGrandChampionConfetti } from '../../utils/confetti';

export interface GoogleCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtext?: string;
  mode?: 'STANDARD' | 'ROUND_QUALIFIED' | 'WINNER' | 'RUNNER_UP' | 'SHORTLIST';
  teamName?: string;
  roundName?: string;
  nextRoundName?: string;
  winnerTeamName?: string | null;
  winnerScore?: number;
  winnerInstitution?: string | null;
  runnerUpTeamName?: string | null;
  runnerUpScore?: number;
  runnerUpInstitution?: string | null;
  buttonLabel?: string;
}

export const GoogleCelebrationModal: React.FC<GoogleCelebrationModalProps> = ({
  isOpen,
  onClose,
  title = 'Congratulations!',
  subtext = "You nailed it! You've successfully completed the challenge.",
  mode = 'STANDARD',
  teamName,
  roundName,
  nextRoundName,
  winnerTeamName,
  winnerScore,
  winnerInstitution,
  runnerUpTeamName,
  runnerUpScore,
  runnerUpInstitution,
  buttonLabel = 'Awesome',
}) => {
  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'WINNER') {
      triggerGrandChampionConfetti(1000);
    } else {
      triggerGoogleCelebrationConfetti(1000);
    }
  }, [isOpen, mode]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[950] flex items-center justify-center p-4 sm:p-6 bg-[rgba(32,33,36,0.6)] backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
    >
      {/* Background click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Compact, Beautiful Celebration Card (Constrained Max-Width approx 600px) */}
      <div className="relative z-[960] w-full max-w-[560px] sm:max-w-[600px] mx-auto my-auto bg-white rounded-[24px] shadow-2xl border border-slate-100 p-6 sm:p-8 text-center font-sans animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Signature Emerald Green Accent Header Line */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-500" />

        {/* Close Button (Top Right) */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close celebration"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. Icon Section with Vibrant Aura & Larger Scale */}
        <div className="pt-2 pb-2 flex flex-col items-center justify-center">
          {mode === 'WINNER' ? (
            /* Grand Champion Winner (Extra Grand Trophy Showcase) */
            <div className="relative flex items-center justify-center my-3">
              <div className="absolute -inset-6 bg-amber-400/25 rounded-full blur-2xl animate-pulse" />
              <div className="relative flex items-center gap-3">
                <span className="text-4xl sm:text-5xl select-none animate-pulse">✨</span>
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-500 flex items-center justify-center shadow-xl shadow-amber-400/40 text-amber-950 animate-bounce">
                  <Trophy className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-md text-amber-950" />
                </div>
                <span className="text-4xl sm:text-5xl select-none animate-pulse">👑</span>
              </div>
            </div>
          ) : mode === 'RUNNER_UP' ? (
            /* Runner-Up (2nd Place Silver Showcase) */
            <div className="relative flex items-center justify-center my-3">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-slate-200 via-slate-100 to-blue-100 flex items-center justify-center shadow-lg border border-slate-300 text-slate-700 animate-bounce">
                <Trophy className="w-12 h-12 text-slate-600" />
              </div>
            </div>
          ) : (
            /* Standard Large Bouncing Trophy Emoji */
            <div className="relative flex items-center justify-center my-2">
              <div className="text-7xl sm:text-8xl select-none animate-bounce" role="img" aria-label="Trophy">
                🏆
              </div>
            </div>
          )}

          {/* Badge Sub-pill */}
          {mode === 'WINNER' && (
            <span className="mt-2.5 inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Official 1st Place Champion</span>
            </span>
          )}
          {mode === 'RUNNER_UP' && (
            <span className="mt-2.5 inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase bg-slate-100 text-slate-800 border border-slate-300 shadow-xs">
              <Award className="w-4 h-4 text-slate-600" />
              <span>Official Runner-Up Finalist</span>
            </span>
          )}
          {mode === 'ROUND_QUALIFIED' && (
            <span className="mt-2.5 inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Stage Qualified</span>
            </span>
          )}
        </div>

        {/* 2. Heading (Significantly Larger) */}
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#202124] tracking-tight mt-3 font-['Roboto',sans-serif]">
          {title}
        </h2>

        {/* 3. Subtext (Readable & Clear) */}
        <p className="text-sm sm:text-base text-[#5f6368] leading-relaxed mt-2.5 max-w-md mx-auto font-['Roboto',sans-serif]">
          {subtext}
        </p>

        {/* 4. Round 3 Final Winner & Runner-Up Grand Showcase */}
        {mode === 'WINNER' && (winnerTeamName || runnerUpTeamName) && (
          <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200 text-left space-y-3 font-sans">
            {winnerTeamName && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/90 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <span className="text-2xl select-none">🥇</span>
                  <div>
                    <div className="text-sm sm:text-base font-bold text-amber-950">{winnerTeamName}</div>
                    <div className="text-xs text-amber-800/80 font-mono">
                      {winnerInstitution || '1st Place Champion'}
                    </div>
                  </div>
                </div>
                {winnerScore !== undefined && (
                  <div className="text-sm font-mono font-black text-amber-900 bg-amber-100/90 px-3 py-1 rounded-lg border border-amber-200">
                    {winnerScore} pts
                  </div>
                )}
              </div>
            )}

            {runnerUpTeamName && (
              <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <span className="text-2xl select-none">🥈</span>
                  <div>
                    <div className="text-sm sm:text-base font-bold text-slate-800">{runnerUpTeamName}</div>
                    <div className="text-xs text-slate-500 font-mono">
                      {runnerUpInstitution || '2nd Place Runner-Up'}
                    </div>
                  </div>
                </div>
                {runnerUpScore !== undefined && (
                  <div className="text-sm font-mono font-black text-slate-700 bg-slate-200 px-3 py-1 rounded-lg border border-slate-300">
                    {runnerUpScore} pts
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Round Progression Details Box */}
        {(mode === 'ROUND_QUALIFIED' || mode === 'SHORTLIST') && (teamName || nextRoundName) && (
          <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200 text-left text-xs sm:text-sm space-y-2 font-sans">
            {teamName && (
              <div className="flex justify-between items-center py-1 border-b border-slate-200 font-mono">
                <span className="text-slate-500 font-medium">Qualified Team</span>
                <span className="font-bold text-slate-900 text-sm">{teamName}</span>
              </div>
            )}
            {roundName && (
              <div className="flex justify-between items-center py-1 border-b border-slate-200 font-mono">
                <span className="text-slate-500 font-medium">Completed Arena</span>
                <span className="font-semibold text-slate-800">{roundName}</span>
              </div>
            )}
            {nextRoundName && (
              <div className="flex justify-between items-center py-1 border-b border-slate-200 font-mono">
                <span className="text-slate-500 font-medium">Target Arena</span>
                <span className="font-bold text-emerald-700">{nextRoundName}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-1 font-mono">
              <span className="text-slate-500 font-medium">Progression Status</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Eligible to Compete</span>
              </span>
            </div>
          </div>
        )}

        {/* 5. Plain text "Awesome" – not a button, just styled text */}
        <div className="mt-8 flex justify-center">
          <span
            onClick={onClose}
            className="text-[#1a73e8] font-bold text-lg cursor-pointer hover:underline select-none font-['Roboto',sans-serif]"
          >
            {buttonLabel}
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
};
