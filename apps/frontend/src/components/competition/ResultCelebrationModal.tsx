import React, { useEffect, useRef } from 'react';
import { Trophy, Award, Heart, Sparkles, X, ChevronRight, CheckCircle2 } from 'lucide-react';
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
  winnerTeamName?: string;
  winnerScore?: number;
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
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvasRef.current) return;
      width = canvasRef.current.width = window.innerWidth;
      height = canvasRef.current.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle colors based on experience type
    let colors = ['#10b981', '#34d399', '#f59e0b', '#fbbf24', '#ffffff']; // QUALIFIED: Green & Gold
    let particleCount = 75;
    let gravity = 0.4;
    let speedMultiplier = 1;

    if (type === 'ELIMINATED') {
      // Gentle calm blue/purple petals
      colors = ['#818cf8', '#a78bfa', '#c084fc', '#93c5fd', '#e0e7ff'];
      particleCount = 45;
      gravity = 0.12;
      speedMultiplier = 0.6;
    } else if (type === 'GRAND_WINNER') {
      // Intense Gold Fireworks & Confetti
      colors = ['#fbbf24', '#f59e0b', '#d97706', '#fef08a', '#ffffff', '#10b981'];
      particleCount = 120;
      gravity = 0.35;
      speedMultiplier = 1.3;
    }

    interface Particle {
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
      opacity: number;
    }

    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * -height * 0.5,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: (Math.random() - 0.5) * 4 * speedMultiplier,
        speedY: (Math.random() * 3 + 2) * speedMultiplier,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 4,
        opacity: Math.random() * 0.8 + 0.2,
      });
    }

    let frame = 0;
    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY + gravity;
        p.rotation += p.rotationSpeed;

        if (p.y > height) {
          p.y = -10;
          p.x = Math.random() * width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;

        if (type === 'ELIMINATED') {
          // Petal/Circle shape
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Confetti rectangle
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        }

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isOpen, type]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Particle Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-10"
      />

      {/* Main Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-20 w-full max-w-lg rounded-3xl p-6 sm:p-8 border shadow-2xl transition-all duration-300 transform scale-100 ${
          type === 'GRAND_WINNER'
            ? 'bg-gradient-to-b from-amber-950 via-[#181102] to-black border-amber-400/80 shadow-amber-500/25 text-amber-50'
            : type === 'QUALIFIED'
            ? 'bg-gradient-to-b from-[#062418] via-[#041910] to-[#020d08] border-emerald-500/60 shadow-emerald-500/20 text-emerald-50'
            : type === 'ELIMINATED'
            ? 'bg-gradient-to-b from-[#14122b] via-[#0d0c1c] to-[#07060f] border-indigo-500/40 shadow-indigo-500/15 text-indigo-50'
            : 'bg-gradient-to-b from-slate-900 via-slate-950 to-black border-slate-700 shadow-slate-900/40 text-slate-100'
        }`}
      >
        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors cursor-pointer"
          aria-label="Close announcement"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Trophy Animation */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            {/* Glowing Ring */}
            <div
              className={`absolute -inset-4 rounded-full blur-xl opacity-60 animate-pulse ${
                type === 'GRAND_WINNER'
                  ? 'bg-amber-400'
                  : type === 'QUALIFIED'
                  ? 'bg-emerald-400'
                  : type === 'ELIMINATED'
                  ? 'bg-indigo-400'
                  : 'bg-emerald-500'
              }`}
            />

            <div
              className={`relative flex items-center justify-center w-20 h-20 rounded-2xl border ${
                type === 'GRAND_WINNER'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : type === 'QUALIFIED'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : type === 'ELIMINATED'
                  ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300'
                  : 'bg-slate-800 border-slate-600 text-emerald-400'
              }`}
            >
              {type === 'GRAND_WINNER' ? (
                <Trophy className="w-10 h-10 animate-bounce" />
              ) : type === 'QUALIFIED' ? (
                <Award className="w-10 h-10" />
              ) : type === 'ELIMINATED' ? (
                <Heart className="w-9 h-9" />
              ) : (
                <Sparkles className="w-9 h-9" />
              )}
            </div>
          </div>

          {/* Badge */}
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-widest uppercase border ${
              type === 'GRAND_WINNER'
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                : type === 'QUALIFIED'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                : type === 'ELIMINATED'
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40'
                : 'bg-slate-800 text-slate-300 border-slate-600'
            }`}
          >
            {type === 'GRAND_WINNER'
              ? '★ OFFICIAL GRAND CHAMPION ★'
              : type === 'QUALIFIED'
              ? 'QUALIFIED FOR NEXT STAGE'
              : type === 'ELIMINATED'
              ? 'HONORABLE PARTICIPATION'
              : 'COMPETITION CONCLUDED'}
          </span>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
            {title}
          </h2>

          {/* Message */}
          <p className="text-xs sm:text-sm opacity-90 leading-relaxed max-w-md">
            {message}
          </p>

          {/* Details Card */}
          <div
            className={`w-full p-4 rounded-2xl border text-xs text-left space-y-2 ${
              type === 'GRAND_WINNER'
                ? 'bg-amber-950/40 border-amber-500/30 text-amber-100'
                : type === 'QUALIFIED'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-100'
                : type === 'ELIMINATED'
                ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-100'
                : 'bg-slate-900/60 border-slate-700 text-slate-200'
            }`}
          >
            <div className="flex justify-between items-center py-0.5 border-b border-white/10 font-mono text-[11px]">
              <span className="opacity-60">Team Name</span>
              <span className="font-bold">{teamName}</span>
            </div>

            {roundName && (
              <div className="flex justify-between items-center py-0.5 border-b border-white/10 font-mono text-[11px]">
                <span className="opacity-60">Completed Arena</span>
                <span className="font-bold">{roundName}</span>
              </div>
            )}

            {nextRoundName && (
              <div className="flex justify-between items-center py-0.5 border-b border-white/10 font-mono text-[11px]">
                <span className="opacity-60">Next Arena</span>
                <span className="font-bold text-emerald-400">{nextRoundName}</span>
              </div>
            )}

            {winnerTeamName && (
              <div className="flex justify-between items-center py-0.5 border-b border-white/10 font-mono text-[11px]">
                <span className="opacity-60">Grand Winner</span>
                <span className="font-bold text-amber-300">
                  {winnerTeamName} ({winnerScore} pts)
                </span>
              </div>
            )}

            <div className="flex justify-between items-center py-0.5 font-mono text-[11px]">
              <span className="opacity-60">Result Status</span>
              <span className="font-bold flex items-center gap-1">
                {type === 'QUALIFIED' || type === 'GRAND_WINNER' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : null}
                <span>
                  {type === 'QUALIFIED'
                    ? 'Eligible to Compete'
                    : type === 'GRAND_WINNER'
                    ? 'First Place Champion'
                    : type === 'ELIMINATED'
                    ? 'Round Concluded'
                    : 'Completed'}
                </span>
              </span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={onClose}
            className={`w-full py-3 px-5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
              type === 'GRAND_WINNER'
                ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 shadow-amber-400/20'
                : type === 'QUALIFIED'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950 shadow-emerald-500/20'
                : type === 'ELIMINATED'
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <span>Continue to Dashboard</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
