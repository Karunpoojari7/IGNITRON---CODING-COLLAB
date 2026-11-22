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
      className="fixed inset-0 z-[950] flex items-center justify-center p-4 bg-[rgba(32,33,36,0.4)] backdrop-blur-xs animate-in fade-in duration-200"
    >
      {/* Background click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Google Material Congratulations Card */}
      <div className="relative z-[960] w-full max-w-[360px] sm:max-w-[400px] bg-white rounded-[16px] shadow-2xl border border-slate-100 p-6 sm:p-7 text-center font-sans animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Subtle Google Top Color Strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 flex">
          <div className="w-1/4 bg-[#4285F4]" />
          <div className="w-1/4 bg-[#EA4335]" />
          <div className="w-1/4 bg-[#FBBC05]" />
          <div className="w-1/4 bg-[#34A853]" />
        </div>

        {/* Close Icon (Top Right) */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-3 right-3 p-1.5 rounded-full text-[#5f6368] hover:text-[#202124] hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close celebration"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 1. Icon Section */}
        <div className="pt-2 pb-1 flex flex-col items-center justify-center">
          {mode === 'WINNER' ? (
            /* Grand Champion Winner (Extra Unique Trophy Showcase) */
            <div className="relative flex items-center justify-center my-1">
              <div className="absolute -inset-3 bg-amber-400/20 rounded-full blur-xl animate-pulse" />
              <div className="relative flex items-center gap-1.5">
                <span className="text-3xl select-none animate-pulse">✨</span>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-400/30 text-white animate-bounce">
                  <Trophy className="w-9 h-9 drop-shadow-md text-amber-950" />
                </div>
                <span className="text-3xl select-none animate-pulse">👑</span>
              </div>
            </div>
          ) : mode === 'RUNNER_UP' ? (
            /* Runner-Up (2nd Place Silver Showcase) */
            <div className="relative flex items-center justify-center my-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-200 via-slate-100 to-blue-100 flex items-center justify-center shadow-md border border-slate-300 text-slate-700 animate-bounce">
                <Trophy className="w-8 h-8 text-slate-600" />
              </div>
            </div>
          ) : mode === 'ROUND_QUALIFIED' || mode === 'SHORTLIST' ? (
            /* Round Progression (Bouncing Trophy Emoji + Badge) */
            <div className="relative flex items-center justify-center my-1">
              <div className="text-5xl select-none animate-bounce" role="img" aria-label="Trophy">
                🏆
              </div>
            </div>
          ) : (
            /* Standard Google-Style Trophy */
            <div className="text-5xl select-none animate-bounce my-1" role="img" aria-label="Trophy">
              🏆
            </div>
          )}

          {/* Round / Championship Sub-badge */}
          {mode === 'WINNER' && (
            <span className="mt-2 inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Official 1st Place Champion</span>
            </span>
          )}
          {mode === 'RUNNER_UP' && (
            <span className="mt-2 inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs">
              <Award className="w-3 h-3 text-slate-600" />
              <span>Official Runner-Up Finalist</span>
            </span>
          )}
          {mode === 'ROUND_QUALIFIED' && (
            <span className="mt-2 inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Stage Qualified</span>
            </span>
          )}
        </div>

        {/* 2. Heading */}
        <h2 className="text-2xl font-medium text-[#202124] tracking-tight mt-2 font-['Roboto',sans-serif]">
          {title}
        </h2>

        {/* 3. Subtext */}
        <p className="text-xs sm:text-sm text-[#5f6368] leading-relaxed mt-1.5 font-['Roboto',sans-serif]">
          {subtext}
        </p>

        {/* 4. Round 3 Final Winner & Runner-Up Grand Showcase */}
        {mode === 'WINNER' && (winnerTeamName || runnerUpTeamName) && (
          <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-left space-y-2.5 font-sans">
            {winnerTeamName && (
              <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/90 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl select-none">🥇</span>
                  <div>
                    <div className="text-xs font-bold text-amber-950">{winnerTeamName}</div>
                    <div className="text-[10px] text-amber-800/80 font-mono">
                      {winnerInstitution || '1st Place Champion'}
                    </div>
                  </div>
                </div>
                {winnerScore !== undefined && (
                  <div className="text-xs font-mono font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                    {winnerScore} pts
                  </div>
                )}
              </div>
            )}

            {runnerUpTeamName && (
              <div className="p-2.5 rounded-lg bg-slate-100/80 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl select-none">🥈</span>
                  <div>
                    <div className="text-xs font-bold text-slate-800">{runnerUpTeamName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {runnerUpInstitution || '2nd Place Runner-Up'}
                    </div>
                  </div>
                </div>
                {runnerUpScore !== undefined && (
                  <div className="text-xs font-mono font-black text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                    {runnerUpScore} pts
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Round Progression Details Box */}
        {(mode === 'ROUND_QUALIFIED' || mode === 'SHORTLIST') && (teamName || nextRoundName) && (
          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-left text-xs space-y-1.5 font-sans">
            {teamName && (
              <div className="flex justify-between items-center text-[11px] py-0.5 border-b border-slate-200/60 font-mono">
                <span className="text-slate-500">Team</span>
                <span className="font-bold text-slate-900">{teamName}</span>
              </div>
            )}
            {roundName && (
              <div className="flex justify-between items-center text-[11px] py-0.5 border-b border-slate-200/60 font-mono">
                <span className="text-slate-500">Cleared Arena</span>
                <span className="font-semibold text-slate-800">{roundName}</span>
              </div>
            )}
            {nextRoundName && (
              <div className="flex justify-between items-center text-[11px] py-0.5 border-b border-slate-200/60 font-mono">
                <span className="text-slate-500">Next Arena</span>
                <span className="font-bold text-emerald-700">{nextRoundName}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-[11px] py-0.5 font-mono">
              <span className="text-slate-500">Status</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Eligible to Compete</span>
              </span>
            </div>
          </div>
        )}

        {/* 5. Google Blue Pill Button */}
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-w-[130px] px-8 py-2.5 rounded-[24px] bg-[#1a73e8] hover:bg-[#1557b0] active:scale-95 text-white font-medium text-sm transition-all shadow-sm hover:shadow-md cursor-pointer select-none font-['Roboto',sans-serif]"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
