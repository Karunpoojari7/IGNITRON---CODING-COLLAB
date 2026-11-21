import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompetitionState } from '../hooks/useCompetition';
import { GoldenSnowfall } from '../components/GoldenSnowfall';
import { HeroIllustration } from '../components/HeroIllustration';
import { RulebookModal } from '../components/RulebookModal';
import {
  Terminal,
  ShieldCheck,
  Users,
  Clock,
  Award,
  ArrowRight,
  Radio,
  BookOpen,
  CheckCircle2,
  Code2,
  Cpu,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronsRight,
  Settings,
  Bug,
  Crown,
  Sparkles,
  Trophy,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const { data: compState } = useCompetitionState();
  const location = useLocation();

  const [isRulebookOpen, setIsRulebookOpen] = useState(false);
  const [highlightRules, setHighlightRules] = useState(false);
  const [showFullSpecs, setShowFullSpecs] = useState(false);

  // Smooth scroll to section
  const scrollToSection = (id: string) => {
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        if (id === 'rules') {
          setHighlightRules(true);
          setTimeout(() => setHighlightRules(false), 2500);
        }
      }
    }
  };

  useEffect(() => {
    if (location.hash === '#rules' || window.location.hash === '#rules') {
      const timer = setTimeout(() => {
        scrollToSection('rules');
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [location.hash]);

  const getStatusBadge = () => {
    if (!compState) {
      return (
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider text-amber-300 bg-black/60 border border-amber-400/80 shadow-[0_0_20px_rgba(251,191,36,0.3)] backdrop-blur-md">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>STANDBY — REGISTRATION ACTIVE</span>
        </span>
      );
    }

    const status = compState.status;

    if (status.includes('ACTIVE')) {
      return (
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider text-emerald-300 bg-black/60 border border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.45)] backdrop-blur-md">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>LIVE: {compState.currentRoundName || status}</span>
        </span>
      );
    }
    if (status.includes('EVALUATION')) {
      return (
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider text-amber-300 bg-black/60 border border-amber-400/90 shadow-[0_0_20px_rgba(251,191,36,0.4)] backdrop-blur-md">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>EVALUATION IN PROGRESS</span>
        </span>
      );
    }
    if (status === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider text-sky-300 bg-black/60 border border-sky-400/90 shadow-[0_0_20px_rgba(56,189,248,0.4)] backdrop-blur-md">
          <Award className="w-3.5 h-3.5 text-sky-400" />
          <span>COMPETITION CONCLUDED</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider text-amber-300 bg-black/60 border border-amber-400/80 shadow-[0_0_20px_rgba(251,191,36,0.3)] backdrop-blur-md">
        <Clock className="w-3.5 h-3.5 text-amber-400" />
        <span>STANDBY — REGISTRATION ACTIVE</span>
      </span>
    );
  };

  return (
    <div
      id="top"
      className="relative min-h-screen bg-[#010905] text-slate-100 overflow-x-hidden selection:bg-emerald-500/30 selection:text-emerald-200"
    >
      {/* Dynamic Golden Snowfall Canvas (Particles, Vertical Light Trails & Bokeh Discs) */}
      <GoldenSnowfall />

      {/* Atmospheric Background Lighting & Gradients */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Top Center Golden Ambient Glow */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[350px] opacity-25 blur-3xl pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(245, 158, 11, 0.4) 0%, rgba(217, 119, 6, 0.12) 50%, transparent 80%)',
          }}
        />

        {/* Top Left Emerald Shimmer */}
        <div
          className="absolute -top-16 left-0 w-[450px] h-[400px] opacity-20 blur-3xl pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 15% 10%, rgba(16, 185, 129, 0.35) 0%, transparent 70%)',
          }}
        />

        {/* Top Right Emerald Shimmer */}
        <div
          className="absolute -top-16 right-0 w-[450px] h-[400px] opacity-20 blur-3xl pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 85% 10%, rgba(16, 185, 129, 0.35) 0%, transparent 70%)',
          }}
        />

        {/* Center Emerald Glow (Directly behind Title) */}
        <div
          className="absolute top-36 sm:top-48 left-1/2 -translate-x-1/2 w-[650px] sm:w-[920px] h-[420px] opacity-40 blur-3xl pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.5) 0%, rgba(5, 150, 105, 0.18) 45%, transparent 75%)',
          }}
        />

        {/* Subtle Watermark: Official Coding Collab Emblem */}
        <div className="absolute top-20 sm:top-28 left-1/2 -translate-x-1/2 w-[550px] sm:w-[750px] opacity-[0.045] pointer-events-none select-none flex items-center justify-center">
          <img
            src="/coding-collab-logo.png"
            alt=""
            className="w-full object-contain filter drop-shadow-[0_0_90px_rgba(16,185,129,0.3)]"
          />
        </div>

        {/* Deep Vignette Gradient */}
        <div className="absolute inset-0 bg-radial from-transparent via-[#010a05]/60 to-[#010804] pointer-events-none" />
      </div>

      {/* Main Content Sections */}
      <div className="relative z-20 space-y-20 sm:space-y-28 py-6 sm:py-10">
        {/* ================================================================= */}
        {/* SECTION 1: CENTERED HERO SECTION                                   */}
        {/* ================================================================= */}
        <section className="relative pt-4 sm:pt-8 pb-12 sm:pb-20 text-center max-w-5xl mx-auto px-4 sm:px-6">
          {/* Official Institution & Tournament Co-Branding Banner */}
          <div className="flex items-center justify-center gap-3 sm:gap-6 mb-6">
            <div className="flex items-center gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-1.5 rounded-2xl bg-black/40 border border-amber-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              <img src="/gmu-logo.png" alt="GM University" className="h-6 sm:h-8 w-auto object-contain" />
              <div className="text-left hidden sm:block">
                <div className="text-[10px] font-bold tracking-wider text-amber-300">GM UNIVERSITY</div>
                <div className="text-[8px] font-mono text-slate-400">Davanagere, Karnataka</div>
              </div>
            </div>

            <div className="h-6 w-px bg-emerald-500/20" />

            <div className="flex items-center gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-1.5 rounded-2xl bg-black/40 border border-emerald-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <img src="/ignitron-logo.jpg" alt="IGNITRON 2K26" className="h-6 sm:h-8 w-auto object-contain rounded" />
              <div className="text-left hidden sm:block">
                <div className="text-[10px] font-bold tracking-wider text-emerald-300">IGNITRON 2K26</div>
                <div className="text-[8px] font-mono text-slate-400">National Tech Fest</div>
              </div>
            </div>
          </div>

          {/* Prominent Official Coding Collab Emblem */}
          <div className="flex justify-center mb-5 sm:mb-7 animate-fade-in">
            <img
              src="/coding-collab-logo.png"
              alt="IGNITRON 2K26 Coding Collab"
              className="w-56 sm:w-72 md:w-84 h-auto object-contain drop-shadow-[0_0_35px_rgba(16,185,129,0.5)] hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Top Status Badge */}
          <div className="flex flex-col items-center justify-center gap-3 mb-6 animate-fade-in">
            {getStatusBadge()}
          </div>

          {/* Dominant Hero Title: CODING COLLAB */}
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-5 drop-shadow-[0_0_35px_rgba(16,185,129,0.3)]">
            <span>CODING</span>
            <span className="text-emerald-400 drop-shadow-[0_0_45px_rgba(52,211,153,0.95)]">
              COLLAB
            </span>
          </h1>

          {/* Subtitle: INTER-COLLEGIATE PROGRAMMING CHAMPIONSHIP */}
          <div className="text-emerald-300/90 font-mono tracking-[0.25em] sm:tracking-[0.4em] text-xs sm:text-sm font-bold uppercase mt-3 sm:mt-4">
            INTER-COLLEGIATE PROGRAMMING CHAMPIONSHIP
          </div>

          {/* Description */}
          <p className="mt-6 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            A collaborative coding tournament where two minds, one terminal, and three progressive
            arenas put your problem-solving, logic, and teamwork to the ultimate test.
          </p>

          {/* Functional Centered CTA Buttons (Register, Enter Arena, Rules) */}
          <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {!user && (
              <Link
                to="/register"
                className="px-6 sm:px-8 py-3 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs sm:text-sm transition-all shadow-[0_0_25px_rgba(16,185,129,0.7)] hover:shadow-[0_0_40px_rgba(16,185,129,0.95)] hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <Users className="w-4 h-4 text-slate-950" />
                <span>Register Your Team</span>
              </Link>
            )}

            {user?.type === 'TEAM' ? (
              <Link
                to="/team/dashboard"
                className="px-6 sm:px-8 py-3 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs sm:text-sm transition-all shadow-[0_0_25px_rgba(16,185,129,0.7)] hover:shadow-[0_0_40px_rgba(16,185,129,0.95)] hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <Users className="w-4 h-4 text-slate-950" />
                <span>Go to Team Arena</span>
              </Link>
            ) : user?.type === 'ADMIN' ? (
              <Link
                to="/admin/dashboard"
                className="px-6 sm:px-8 py-3 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs sm:text-sm transition-all shadow-[0_0_25px_rgba(16,185,129,0.7)] hover:shadow-[0_0_40px_rgba(16,185,129,0.95)] hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-slate-950" />
                <span>Admin Dashboard</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-6 sm:px-7 py-3 rounded-full bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200 hover:text-white font-bold text-xs sm:text-sm border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 backdrop-blur-md"
              >
                <span className="font-mono text-emerald-400">&gt;_</span>
                <span>Enter Team Arena</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setIsRulebookOpen(true)}
              className="px-6 py-3 rounded-full bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-200 hover:text-white font-semibold text-xs sm:text-sm border border-emerald-600/40 shadow-xs hover:border-emerald-400 hover:scale-105 transition-all flex items-center gap-2 backdrop-blur-md"
            >
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>Rules</span>
            </button>
          </div>

          {/* Hero Centerpiece: 3D Angled Laptop, Floating Collaboration/Victory Badges & Wireframe Floor Rings */}
          <HeroIllustration />
        </section>

        {/* ================================================================= */}
        {/* SECTION 2: TOURNAMENT FORMAT (#format)                            */}
        {/* ================================================================= */}
        <section id="format" className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-emerald-400 font-bold block">
              ARCHITECTED FOR COLLABORATION
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
              <span className="text-emerald-400 mr-2 font-mono">//</span>
              The Coding Collab Tournament Format
              <span className="text-emerald-400 ml-2 font-mono">//</span>
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200/80 leading-relaxed max-w-2xl mx-auto">
              A structured, team-based programming contest that tests collaboration, problem-solving,
              and real-world coding skills across three unique arenas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Two-Contestant Teams */}
            <div className="p-6 rounded-2xl bg-[#02130a]/80 backdrop-blur-md border border-emerald-500/25 hover:border-emerald-400/60 shadow-xl hover:shadow-[0_0_25px_rgba(16,185,129,0.2)] transition-all space-y-3 group">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="font-bold text-base text-white">Two-Contestant Teams</h3>
              <p className="text-xs text-emerald-200/70 leading-relaxed">
                Each team consists of two participants who collaborate throughout the tournament.
              </p>
            </div>

            {/* Card 2: Sequential Relay Handoff */}
            <div className="p-6 rounded-2xl bg-[#02130a]/80 backdrop-blur-md border border-emerald-500/25 hover:border-emerald-400/60 shadow-xl hover:shadow-[0_0_25px_rgba(16,185,129,0.2)] transition-all space-y-3 group">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="font-bold text-base text-white">Sequential Relay Handoff</h3>
              <p className="text-xs text-emerald-200/70 leading-relaxed">
                Progress through challenges in sequence, with outputs from one arena fueling the next.
              </p>
            </div>

            {/* Card 3: Single-Terminal Concurrency */}
            <div className="p-6 rounded-2xl bg-[#02130a]/80 backdrop-blur-md border border-emerald-500/25 hover:border-emerald-400/60 shadow-xl hover:shadow-[0_0_25px_rgba(16,185,129,0.2)] transition-all space-y-3 group">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform">
                <Terminal className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="font-bold text-base text-white">Single-Terminal Concurrency</h3>
              <p className="text-xs text-emerald-200/70 leading-relaxed">
                Work together in a shared coding environment with real-time collaboration.
              </p>
            </div>

            {/* Card 4: Server-Authoritative Timing */}
            <div className="p-6 rounded-2xl bg-[#02130a]/80 backdrop-blur-md border border-emerald-500/25 hover:border-emerald-400/60 shadow-xl hover:shadow-[0_0_25px_rgba(16,185,129,0.2)] transition-all space-y-3 group">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="font-bold text-base text-white">Server-Authoritative Timing</h3>
              <p className="text-xs text-emerald-200/70 leading-relaxed">
                Strict time limits and automated evaluation ensure a fair and competitive experience.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 3: THE THREE COMPETITION ARENAS (#arenas)                 */}
        {/* ================================================================= */}
        <section id="arenas" className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-emerald-400 font-bold block">
              TOURNAMENT PROGRESSION
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
              The Three Competition Arenas
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200/75 max-w-2xl mx-auto">
              A three-stage journey that progressively increases in complexity, testing a complete
              range of coding skills.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-3">
            {/* Arena 01 Card */}
            <div className="w-full lg:flex-1 p-6 sm:p-7 rounded-2xl bg-[#02130a]/85 backdrop-blur-md border border-emerald-500/30 hover:border-emerald-400/70 shadow-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                  <Layers className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">
                    ARENA 01
                  </span>
                  <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                    MCQ Arena
                  </h3>
                </div>
                <p className="text-xs text-emerald-200/70 leading-relaxed min-h-[3rem]">
                  Rapid-fire, algorithmic, data structure, and system fundamentals assessment.
                </p>

                <div className="flex items-center gap-3 pt-2 text-xs font-mono">
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>30 Minutes</span>
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-amber-300 font-bold">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>30 Points</span>
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-emerald-950/80">
                <span className="inline-block px-3 py-1 rounded-lg text-[11px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Top 50% &rarr; Round 2
                </span>
              </div>
            </div>

            {/* Connecting Chevron Arrow 1 */}
            <div className="hidden lg:flex items-center justify-center text-emerald-400/80 px-1">
              <ChevronsRight className="w-7 h-7 animate-pulse" />
            </div>

            {/* Arena 02 Card */}
            <div className="w-full lg:flex-1 p-6 sm:p-7 rounded-2xl bg-[#02130a]/85 backdrop-blur-md border border-emerald-500/30 hover:border-emerald-400/70 shadow-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                  <Bug className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">
                    ARENA 02
                  </span>
                  <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Bug Hunt Arena
                  </h3>
                </div>
                <p className="text-xs text-emerald-200/70 leading-relaxed min-h-[3rem]">
                  Identify, isolate, and repair critical logical flaws in complex codebases.
                </p>

                <div className="flex items-center gap-3 pt-2 text-xs font-mono">
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>40 Minutes</span>
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-amber-300 font-bold">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>100 Points</span>
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-emerald-950/80">
                <span className="inline-block px-3 py-1 rounded-lg text-[11px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Top 5–8 Teams &rarr; Round 3
                </span>
              </div>
            </div>

            {/* Connecting Chevron Arrow 2 */}
            <div className="hidden lg:flex items-center justify-center text-emerald-400/80 px-1">
              <ChevronsRight className="w-7 h-7 animate-pulse" />
            </div>

            {/* Arena 03 Card — GOLD HIGHLIGHT FOR THE FINALS */}
            <div className="w-full lg:flex-1 p-6 sm:p-7 rounded-2xl bg-gradient-to-b from-[#1a1202]/90 via-[#0a0a03]/90 to-[#02130a]/90 backdrop-blur-md border-2 border-amber-400/70 hover:border-amber-300 shadow-[0_0_35px_rgba(251,191,36,0.25)] hover:shadow-[0_0_50px_rgba(251,191,36,0.4)] transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.3)]">
                  <Crown className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
                    ARENA 03
                  </span>
                  <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                    Final Coding
                  </h3>
                </div>
                <p className="text-xs text-amber-100/75 leading-relaxed min-h-[3rem]">
                  A high-complexity, real-world challenge that tests complete coding mastery.
                </p>

                <div className="flex items-center gap-3 pt-2 text-xs font-mono">
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-500/30 text-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>60 Minutes</span>
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-500/30 text-amber-300 font-bold">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>100 Points</span>
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-amber-950/80">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-mono font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/50 shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>IGNITRON Trophy</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 4: RULES & TECHNICAL SPECIFICATIONS PANELS                */}
        {/* ================================================================= */}
        <section
          id="rules"
          className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT PANEL: Competition Rules & Regulations */}
            <div
              className={`relative p-7 sm:p-8 rounded-3xl transition-all duration-500 flex flex-col justify-between overflow-hidden ${
                highlightRules
                  ? 'border-2 border-emerald-400 ring-2 ring-emerald-400/40 bg-[#02180d]'
                  : 'border border-emerald-500/30 bg-[#02130a]/85 shadow-2xl'
              }`}
            >
              {/* Glowing Watermark in Background */}
              <div className="absolute -bottom-6 -right-6 text-emerald-500/10 font-mono font-black text-8xl sm:text-9xl pointer-events-none select-none">
                &lt;/&gt;
              </div>

              <div className="space-y-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                    <BookOpen className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Competition Rules & Regulations
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-emerald-200/70 leading-relaxed">
                  The governing policies, eligibility, and conduct guidelines for IGNITRON 2K26 — Coding Collab.
                </p>

                <ul className="space-y-3 pt-2 text-xs text-emerald-100/90">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Team composition and registration process</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Single-terminal concurrency and session rules</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Official arena structure and progression criteria</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Timing, evaluation, and fairness policies</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 relative z-10">
                <button
                  type="button"
                  onClick={() => setIsRulebookOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 hover:text-white text-xs font-bold border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:scale-105 transition-all flex items-center gap-2"
                >
                  <span>View Detailed Rules</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </button>
              </div>
            </div>

            {/* RIGHT PANEL: Tournament Technical Specifications (#specifications) */}
            <div
              id="specifications"
              className="scroll-mt-24 relative p-7 sm:p-8 rounded-3xl border border-emerald-500/30 bg-[#02130a]/85 shadow-2xl flex flex-col justify-between overflow-hidden"
            >
              <div className="space-y-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                    <Settings className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Tournament Technical Specifications
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-emerald-200/70 leading-relaxed">
                  Technical guidelines for languages, test harness, and contest setup.
                </p>

                <div className="space-y-3 pt-2 text-xs">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-black/40 border border-emerald-500/20">
                    <Code2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <strong className="text-white block font-mono text-[11px]">
                        Supported Languages
                      </strong>
                      <span className="text-emerald-200/80 text-[11px]">
                        C, C++, Java, Python, JavaScript
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-black/40 border border-emerald-500/20">
                    <Cpu className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <strong className="text-white block font-mono text-[11px]">
                        Automated Test Harness
                      </strong>
                      <span className="text-emerald-200/80 text-[11px]">
                        Sandboxed execution with time &amp; memory limits
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-black/40 border border-emerald-500/20">
                    <Layers className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <strong className="text-white block font-mono text-[11px]">
                        Contest Day Checklist
                      </strong>
                      <span className="text-emerald-200/80 text-[11px]">
                        Pre-event setup, access, and environment readiness
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 relative z-10">
                <button
                  type="button"
                  onClick={() => setShowFullSpecs(!showFullSpecs)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 hover:text-white text-xs font-bold border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:scale-105 transition-all flex items-center gap-2"
                >
                  <span>{showFullSpecs ? 'Hide Specifications' : 'View Specifications'}</span>
                  {showFullSpecs ? (
                    <ChevronDown className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Expandable Full Technical Specifications Drawer */}
          {showFullSpecs && (
            <div className="p-6 sm:p-8 rounded-3xl border border-emerald-500/30 bg-[#02130a]/95 backdrop-blur-xl shadow-2xl space-y-6 animate-fade-in text-xs leading-relaxed">
              <div className="flex items-center justify-between border-b border-emerald-900/60 pb-3">
                <span className="font-mono font-bold uppercase text-emerald-400 tracking-wider">
                  Detailed Technical Specifications & Execution Parameters
                </span>
                <span className="text-emerald-200/50 font-mono">Judge0 CE v1.13.1 Powered</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2 p-4 rounded-xl bg-black/40 border border-emerald-500/20">
                  <span className="font-bold text-white block">Compiler & Runtimes</span>
                  <ul className="space-y-1.5 font-mono text-emerald-200/80 text-[11px]">
                    <li>• C++: GCC 11+ / C++17 Standard</li>
                    <li>• Java: OpenJDK 17/21 (Main.java)</li>
                    <li>• Python: CPython 3.11.x</li>
                    <li>• JavaScript: Node.js 20 LTS</li>
                  </ul>
                </div>

                <div className="space-y-2 p-4 rounded-xl bg-black/40 border border-emerald-500/20">
                  <span className="font-bold text-white block">Sandbox Execution Constraints</span>
                  <ul className="space-y-1.5 text-emerald-200/80 text-[11px]">
                    <li>• CPU Time Limit: 2.0s per test case</li>
                    <li>• Wall Clock Limit: 5.0s maximum</li>
                    <li>• Memory Ceiling: 256 MB per runner</li>
                    <li>• Network Access: Blocked / Isolated</li>
                  </ul>
                </div>

                <div className="space-y-2 p-4 rounded-xl bg-black/40 border border-emerald-500/20">
                  <span className="font-bold text-white block">Evaluation Criteria</span>
                  <ul className="space-y-1.5 text-emerald-200/80 text-[11px]">
                    <li>• Strict stdout / expectedOutput matching</li>
                    <li>• Automatic whitespace normalization</li>
                    <li>• Short-circuit on compilation error</li>
                    <li>• Shielded hidden test vectors</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ================================================================= */}
        {/* SECTION 5: FACULTY & EVALUATOR GUIDE (#guide)                     */}
        {/* ================================================================= */}
        <section id="guide" className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-7 sm:p-9 rounded-3xl bg-[#02130a]/85 backdrop-blur-md border border-emerald-500/30 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-900/60 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <Users className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Faculty & Evaluator Guide</h3>
                  <p className="text-xs text-emerald-200/70 max-w-xl">
                    A comprehensive guide for coordinators and evaluators to conduct and assess the tournament smoothly.
                  </p>
                </div>
              </div>

              <Link
                to="/admin/competition"
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-2 self-start sm:self-auto shadow-md shadow-emerald-500/30 hover:scale-105 active:scale-95 shrink-0"
              >
                <span>Launch Competition Engine</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </Link>
            </div>

            {/* 3 Step Interactive Pathway */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Step 01 */}
              <div className="p-4 rounded-xl bg-black/40 border border-emerald-500/20 space-y-2 relative group hover:border-emerald-400/50 transition-all">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    01
                  </span>
                  <ChevronRight className="w-4 h-4 text-emerald-500/40 hidden md:block" />
                </div>
                <strong className="text-white block font-bold text-sm">Seed Demo Roster</strong>
                <p className="text-emerald-200/70 leading-relaxed">
                  Generate and manage demo teams with populated candidate rosters and credentials.
                </p>
              </div>

              {/* Step 02 */}
              <div className="p-4 rounded-xl bg-black/40 border border-emerald-500/20 space-y-2 relative group hover:border-emerald-400/50 transition-all">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    02
                  </span>
                  <ChevronRight className="w-4 h-4 text-emerald-500/40 hidden md:block" />
                </div>
                <strong className="text-white block font-bold text-sm">Control Progression</strong>
                <p className="text-emerald-200/70 leading-relaxed">
                  Manage arena flow and team advancement with live timers, pause, and shortlisting.
                </p>
              </div>

              {/* Step 03 */}
              <div className="p-4 rounded-xl bg-black/40 border border-emerald-500/20 space-y-2 relative group hover:border-emerald-400/50 transition-all">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    03
                  </span>
                  <Sparkles className="w-4 h-4 text-emerald-400/60" />
                </div>
                <strong className="text-white block font-bold text-sm">Workspace Preview</strong>
                <p className="text-emerald-200/70 leading-relaxed">
                  Explore the collaborative coding interface with CodeMirror editor and test harness.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 6: CONSOLIDATED PUBLIC FOOTER                             */}
        {/* ================================================================= */}
        <footer className="border-t border-emerald-900/60 pt-12 pb-8 bg-[#010804] text-slate-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Brand and Description */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                  <span className="font-mono font-black text-xs text-emerald-400">&lt;/&gt;</span>
                </div>
                <div>
                  <div className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                    <span>IGNITRON</span>
                    <span className="text-emerald-400">2K26</span>
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400/90 font-semibold">
                    CODING COLLAB
                  </div>
                </div>
              </div>

              {/* Navigation Quick Links */}
              <nav className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold font-mono text-emerald-200/80">
                <button
                  type="button"
                  onClick={() => scrollToSection('top')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Home
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('format')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Format
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('arenas')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Arenas
                </button>
                <button
                  type="button"
                  onClick={() => setIsRulebookOpen(true)}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Rules
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('specifications')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Specifications
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('guide')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Guide
                </button>
              </nav>

              {/* Auth Links */}
              <div className="flex items-center gap-3 text-xs font-mono font-bold">
                <Link
                  to="/register"
                  className="px-3 py-1.5 rounded-lg bg-emerald-400 text-slate-950 hover:bg-emerald-300 transition-all"
                >
                  Register Team
                </Link>
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-lg border border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/60 transition-all"
                >
                  Team Login
                </Link>
                <Link
                  to="/admin/login"
                  className="px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400/80 hover:bg-emerald-950/40 transition-all"
                >
                  Admin Login
                </Link>
              </div>
            </div>

            {/* Bottom Copyright and Details */}
            <div className="pt-6 border-t border-emerald-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-200/50">
              <p>
                &copy; 2026 IGNITRON &mdash; Coding Collab. All Rights Reserved.
              </p>
              <p className="font-mono text-[11px]">
                Built for University Competitive Programming.
              </p>
            </div>
          </div>
        </footer>
      </div>

      {/* Official Rule Book Modal (Integrates the 4-page official document) */}
      <RulebookModal isOpen={isRulebookOpen} onClose={() => setIsRulebookOpen(false)} />
    </div>
  );
};
