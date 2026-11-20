import React from 'react';
import { Users, Trophy, Code2 } from 'lucide-react';

export const HeroIllustration: React.FC = () => {
  return (
    <div className="relative w-full max-w-2xl mx-auto mt-8 sm:mt-12 select-none pointer-events-auto">
      {/* Outer ambient glow behind the entire illustration */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] sm:w-[600px] h-[260px] sm:h-[350px] opacity-60 blur-3xl pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.45) 0%, rgba(5, 150, 105, 0.2) 40%, transparent 75%)',
        }}
      />

      {/* Floating Left Badge: Collaboration / Users */}
      <div className="absolute left-2 sm:left-12 top-4 sm:top-10 z-20 animate-bounce duration-[4000ms] hover:scale-110 transition-transform">
        <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-[#02180d]/80 backdrop-blur-xl border border-emerald-400/50 shadow-[0_0_25px_rgba(16,185,129,0.5)]">
          <Users className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
        </div>
      </div>

      {/* Floating Right Badge: Championship / Trophy */}
      <div className="absolute right-2 sm:right-12 top-6 sm:top-14 z-20 animate-bounce duration-[4500ms] hover:scale-110 transition-transform">
        <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-[#02180d]/80 backdrop-blur-xl border border-emerald-400/50 shadow-[0_0_25px_rgba(16,185,129,0.5)]">
          <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
        </div>
      </div>

      {/* Central 3D Perspective Laptop Canvas */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Laptop Display (Tilted backward with perspective) */}
        <div
          className="relative w-[280px] sm:w-[420px] md:w-[480px] h-[175px] sm:h-[260px] md:h-[300px] rounded-t-2xl p-2.5 sm:p-3.5 bg-gradient-to-b from-slate-900 via-[#031d10] to-[#01140a] border-2 border-emerald-400/60 shadow-[0_0_40px_rgba(16,185,129,0.4)]"
          style={{
            transform: 'perspective(1000px) rotateX(16deg)',
            transformOrigin: 'bottom center',
          }}
        >
          {/* Top Bezel Webcam */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500/80 shadow-[0_0_4px_#10b981]" />

          {/* Screen Content: Dark IDE with Glowing Code and </> Symbol */}
          <div className="w-full h-full rounded-xl bg-[#010c06] border border-emerald-500/30 p-3 sm:p-5 flex flex-col justify-between overflow-hidden relative">
            {/* Ambient Screen Glow */}
            <div className="absolute inset-0 bg-radial from-emerald-500/15 via-transparent to-transparent pointer-events-none" />

            {/* Editor Tab Bar */}
            <div className="flex items-center justify-between border-b border-emerald-900/50 pb-2 relative z-10">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="font-mono text-[9px] sm:text-[11px] text-emerald-400/70 tracking-wider">
                relay_main.cpp
              </span>
            </div>

            {/* Glowing Center Logo on Screen */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 my-1">
              <div className="flex items-center justify-center p-3 rounded-2xl bg-emerald-950/60 border border-emerald-400/40 shadow-[0_0_30px_rgba(16,185,129,0.45)]">
                <Code2 className="w-10 h-10 sm:w-16 sm:h-16 text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,1)]" />
              </div>
              <div className="mt-2 text-[10px] sm:text-xs font-mono font-bold text-emerald-300/90 tracking-widest uppercase">
                TWO MINDS • ONE TERMINAL
              </div>
            </div>

            {/* Simulated Code Lines */}
            <div className="space-y-1 relative z-10 opacity-70">
              <div className="h-1 sm:h-1.5 w-3/4 rounded bg-emerald-500/30" />
              <div className="h-1 sm:h-1.5 w-1/2 rounded bg-emerald-400/40" />
            </div>
          </div>
        </div>

        {/* Laptop Keyboard Base & Trackpad (Perspective angled flat) */}
        <div
          className="relative w-[340px] sm:w-[520px] md:w-[590px] h-[36px] sm:h-[50px] md:h-[58px] -mt-1 rounded-b-2xl bg-gradient-to-b from-emerald-950/90 via-[#01140a] to-[#010905] border-t border-emerald-400/80 border-b border-emerald-500/40 shadow-[0_15px_35px_rgba(0,0,0,0.9)]"
          style={{
            transform: 'perspective(1000px) rotateX(45deg)',
            transformOrigin: 'top center',
          }}
        >
          {/* Glowing Keyboard Plate */}
          <div className="w-[88%] h-[60%] mx-auto mt-1 rounded bg-[#010804] border border-emerald-500/30 flex items-center justify-center">
            <div className="w-12 sm:w-20 h-2 sm:h-3 rounded bg-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
          {/* Front Notch */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 sm:w-20 h-1 rounded-t bg-emerald-400/60" />
        </div>

        {/* Glowing Concentric Ellipses / Perspective Floor Wireframe Rings */}
        <div className="relative w-full max-w-xl h-24 -mt-6 sm:-mt-8 flex items-center justify-center pointer-events-none overflow-visible">
          {/* Ellipse 1 (Inner intense glow) */}
          <div
            className="absolute w-[280px] sm:w-[460px] h-[70px] sm:h-[110px] rounded-[100%] border border-emerald-400/70 shadow-[0_0_30px_rgba(16,185,129,0.6)]"
            style={{ transform: 'rotateX(75deg)' }}
          />
          {/* Ellipse 2 (Middle wider ring) */}
          <div
            className="absolute w-[360px] sm:w-[580px] h-[100px] sm:h-[150px] rounded-[100%] border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            style={{ transform: 'rotateX(75deg)' }}
          />
          {/* Ellipse 3 (Outer subtle wireframe perimeter) */}
          <div
            className="absolute w-[440px] sm:w-[700px] h-[130px] sm:h-[190px] rounded-[100%] border border-emerald-500/20"
            style={{ transform: 'rotateX(75deg)' }}
          />
          {/* Floor Reflection Gradient */}
          <div
            className="absolute w-[320px] sm:w-[520px] h-12 rounded-full opacity-70 blur-md pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.7) 0%, rgba(5, 150, 105, 0.25) 50%, transparent 80%)',
            }}
          />
        </div>
      </div>
    </div>
  );
};
