import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ADMIN_NAV_ITEMS } from './AdminNav';
import {
  ShieldAlert,
  LogOut,
  Terminal,
  UserCheck,
  UserPlus,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [adminMoreOpen, setAdminMoreOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAdminMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setAdminMoreOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const isLanding = location.pathname === '/';
  const isActive = (path: string) => location.pathname === path;

  // Primary admin items (first 5) and secondary items for "More" dropdown (last 3)
  const primaryAdminItems = ADMIN_NAV_ITEMS.slice(0, 5);
  const secondaryAdminItems = ADMIN_NAV_ITEMS.slice(5);
  const isSecondaryActive = secondaryAdminItems.some(
    (item) => location.pathname === item.path,
  );

  const scrollToSection = (id: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isLanding) {
      if (id === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } else {
      navigate(`/#${id}`);
    }
    setMobileMenuOpen(false);
  };

  // ---------------------------------------------------------------------------
  // 1. Landing Page Navbar (Centered Reference Design with Full Access)
  // ---------------------------------------------------------------------------
  if (isLanding) {
    return (
      <header className="sticky top-0 z-50 pt-3 sm:pt-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pointer-events-auto">
        <div className="w-full bg-[#02130a]/85 backdrop-blur-xl border border-emerald-500/30 rounded-2xl px-4 sm:px-6 h-16 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.65)]">
          {/* Brand — clicking on / scrolls smoothly to top */}
          <Link
            to="/"
            onClick={(e) => scrollToSection('top', e)}
            className="flex items-center gap-2.5 sm:gap-3 group shrink-0 mr-2 sm:mr-4"
          >
            <img
              src="/gmu-logo.png"
              alt="GM University"
              className="h-8 sm:h-9 w-auto object-contain drop-shadow-[0_0_10px_rgba(245,158,11,0.35)] group-hover:scale-105 transition-transform"
            />
            <div className="h-5 w-px bg-emerald-500/30" />
            <img
              src="/coding-collab-logo.png"
              alt="IGNITRON 2K26 Coding Collab"
              className="h-7 sm:h-8 w-auto object-contain drop-shadow-[0_0_12px_rgba(16,185,129,0.5)] group-hover:scale-105 transition-transform"
            />
          </Link>

          {/* Center Navigation Links (Home, Format, Arenas, Rules, Specifications, Guide) */}
          <nav className="hidden lg:flex items-center gap-3.5 xl:gap-6 text-xs font-semibold text-emerald-100/80 font-mono px-2">
            <button
              type="button"
              onClick={(e) => scrollToSection('top', e)}
              className="hover:text-emerald-300 transition-colors cursor-pointer py-1 border-b-2 border-emerald-400 text-emerald-400 font-bold"
            >
              Home
            </button>
            <button
              type="button"
              onClick={(e) => scrollToSection('format', e)}
              className="hover:text-emerald-300 transition-colors cursor-pointer py-1 border-b-2 border-transparent hover:border-emerald-500/50"
            >
              Format
            </button>
            <button
              type="button"
              onClick={(e) => scrollToSection('arenas', e)}
              className="hover:text-emerald-300 transition-colors cursor-pointer py-1 border-b-2 border-transparent hover:border-emerald-500/50"
            >
              Arenas
            </button>
            <button
              type="button"
              onClick={(e) => scrollToSection('rules', e)}
              className="hover:text-emerald-300 transition-colors cursor-pointer py-1 border-b-2 border-transparent hover:border-emerald-500/50"
            >
              Rules
            </button>
            <button
              type="button"
              onClick={(e) => scrollToSection('specifications', e)}
              className="hover:text-emerald-300 transition-colors cursor-pointer py-1 border-b-2 border-transparent hover:border-emerald-500/50"
            >
              Specifications
            </button>
            <button
              type="button"
              onClick={(e) => scrollToSection('guide', e)}
              className="hover:text-emerald-300 transition-colors cursor-pointer py-1 border-b-2 border-transparent hover:border-emerald-500/50"
            >
              Guide
            </button>
          </nav>

          {/* User Session / Public Auth CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <div className="flex items-center gap-2.5">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-white">
                    {user.type === 'ADMIN' ? user.fullName : user.teamName}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400/80 flex items-center justify-end gap-1">
                    {user.type === 'ADMIN' ? (
                      <span className="text-amber-400 font-bold tracking-wider">
                        [{user.role}]
                      </span>
                    ) : (
                      <>
                        <UserCheck className="w-3 h-3 text-emerald-400" />
                        <span>{user.activeParticipant.fullName}</span>
                        <span className="text-emerald-300 font-bold font-mono">
                          ({user.teamCode})
                        </span>
                      </>
                    )}
                  </span>
                </div>

                <Link
                  to={user.type === 'ADMIN' ? '/admin/dashboard' : '/team/dashboard'}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                >
                  Dashboard
                </Link>

                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 hover:bg-rose-950/50 hover:border-rose-500/50 text-emerald-300 hover:text-rose-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2.5">
                {/* Admin Login Button */}
                <Link
                  to="/admin/login"
                  className="px-3 py-1.5 rounded-xl text-xs font-medium border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 hover:text-white transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin Login</span>
                </Link>

                {/* Team Login Button */}
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-emerald-500/40 bg-emerald-950/50 text-emerald-200 hover:bg-emerald-900/60 hover:text-white transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                >
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Team Login</span>
                </Link>

                {/* Register Team Button */}
                <Link
                  to="/register"
                  className="px-4 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-400 hover:bg-emerald-300 text-slate-950 transition-all shadow-[0_0_20px_rgba(16,185,129,0.6)] hover:shadow-[0_0_30px_rgba(16,185,129,0.9)] hover:scale-105 active:scale-95 flex items-center gap-1.5"
                >
                  <span>Register Team</span>
                </Link>
              </div>
            )}

            {/* Mobile Menu Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl border border-emerald-500/30 bg-emerald-950/50 text-emerald-300 hover:text-white transition-all"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-2 p-4 rounded-2xl bg-[#02130a]/95 backdrop-blur-2xl border border-emerald-500/40 shadow-2xl space-y-3 animate-fade-in text-xs font-mono">
            <div className="grid grid-cols-2 gap-2 pb-3 border-b border-emerald-900/60">
              <button
                type="button"
                onClick={(e) => scrollToSection('top', e)}
                className="p-2 rounded-lg bg-emerald-950/40 text-emerald-200 text-left hover:text-white"
              >
                Home
              </button>
              <button
                type="button"
                onClick={(e) => scrollToSection('format', e)}
                className="p-2 rounded-lg bg-emerald-950/40 text-emerald-200 text-left hover:text-white"
              >
                Format
              </button>
              <button
                type="button"
                onClick={(e) => scrollToSection('arenas', e)}
                className="p-2 rounded-lg bg-emerald-950/40 text-emerald-200 text-left hover:text-white"
              >
                Arenas
              </button>
              <button
                type="button"
                onClick={(e) => scrollToSection('rules', e)}
                className="p-2 rounded-lg bg-emerald-950/40 text-emerald-200 text-left hover:text-white"
              >
                Rules
              </button>
              <button
                type="button"
                onClick={(e) => scrollToSection('specifications', e)}
                className="p-2 rounded-lg bg-emerald-950/40 text-emerald-200 text-left hover:text-white"
              >
                Specifications
              </button>
              <button
                type="button"
                onClick={(e) => scrollToSection('guide', e)}
                className="p-2 rounded-lg bg-emerald-950/40 text-emerald-200 text-left hover:text-white"
              >
                Guide
              </button>
            </div>

            {!user && (
              <div className="space-y-2 pt-1">
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-xl text-center font-bold bg-emerald-400 text-slate-950 flex items-center justify-center gap-1.5 shadow-md"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register Team</span>
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 rounded-xl text-center border border-emerald-500/40 bg-emerald-950/60 text-emerald-200 flex items-center justify-center gap-1.5"
                  >
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Team Login</span>
                  </Link>
                  <Link
                    to="/admin/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 rounded-xl text-center border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 flex items-center justify-center gap-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>Admin Login</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </header>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Admin Header (Consolidated Single Header with No Horizontal Scrollbar)
  // ---------------------------------------------------------------------------
  if (user?.type === 'ADMIN') {
    return (
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-3">
            {/* Left: Brand + Admin Badge */}
            <Link to="/admin/dashboard" className="flex items-center gap-2.5 sm:gap-3 shrink-0 group">
              <img
                src="/gmu-logo.png"
                alt="GM University"
                className="h-8 w-auto object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
              />
              <div className="h-6 w-px bg-slate-300" />
              <img
                src="/coding-collab-logo.png"
                alt="Coding Collab"
                className="h-7 w-auto object-contain bg-slate-900 px-1.5 py-0.5 rounded-md drop-shadow-sm group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col leading-tight">
                <div className="text-xs sm:text-sm font-extrabold tracking-tight text-emerald-950 flex items-center gap-1">
                  <span>IGNITRON</span>
                  <span className="text-emerald-600">2K26</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Admin
                  </span>
                </div>
                <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-800 font-bold">
                  CODING COLLAB
                </span>
              </div>
            </Link>

            {/* Center: Desktop Clean Navigation without scrollbar */}
            <nav className="hidden md:flex items-center gap-1">
              {primaryAdminItems.map((item) => {
                const Icon = item.icon;
                const isItemActive =
                  location.pathname === item.path ||
                  (item.path === '/admin/competition' && location.pathname === '/admin/control');

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      isItemActive
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-300/80 shadow-2xs'
                        : 'text-slate-600 hover:text-emerald-950 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isItemActive ? 'text-emerald-700' : 'text-emerald-600'
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* Clean 'More' Dropdown for remaining destinations */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setAdminMoreOpen((prev) => !prev)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSecondaryActive || adminMoreOpen
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-300/80 shadow-2xs'
                      : 'text-slate-600 hover:text-emerald-950 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <span>More</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      adminMoreOpen ? 'rotate-180 text-emerald-700' : 'text-slate-400'
                    }`}
                  />
                </button>

                {adminMoreOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {secondaryAdminItems.map((item) => {
                      const Icon = item.icon;
                      const isItemActive = location.pathname === item.path;

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setAdminMoreOpen(false)}
                          className={`flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold transition-colors ${
                            isItemActive
                              ? 'bg-emerald-50 text-emerald-900 font-bold'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-950'
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isItemActive ? 'text-emerald-700' : 'text-slate-400'
                            }`}
                          />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>

            {/* Right: Admin User + Role Badge + Logout + Mobile Menu Toggle */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800 truncate max-w-[130px]">
                  {user.fullName}
                </span>
                <span className="text-[10px] font-mono text-amber-700 font-bold uppercase tracking-wider">
                  [{user.role}]
                </span>
              </div>

              <button
                onClick={handleLogout}
                title="Log out"
                className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Mobile Menu Button for Admin */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
                aria-label="Toggle Navigation"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Mobile Admin Navigation Drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-200 py-3 grid grid-cols-2 gap-1.5 animate-in fade-in duration-150">
              {ADMIN_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isItemActive =
                  location.pathname === item.path ||
                  (item.path === '/admin/competition' && location.pathname === '/admin/control');

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold ${
                      isItemActive
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </header>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. Default App Navbar (Team & Public Light Competition Theme)
  // ---------------------------------------------------------------------------
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group">
          <img
            src="/gmu-logo.png"
            alt="GM University"
            className="h-8 w-auto object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
          />
          <div className="h-6 w-px bg-slate-300" />
          <img
            src="/coding-collab-logo.png"
            alt="Coding Collab"
            className="h-7 w-auto object-contain bg-slate-900 px-1.5 py-0.5 rounded-md drop-shadow-sm group-hover:scale-105 transition-transform"
          />
          <div className="flex flex-col leading-tight">
            <div className="text-sm font-extrabold tracking-tight text-emerald-950 flex items-center gap-1.5">
              <span>IGNITRON</span>
              <span className="text-emerald-600">2K26</span>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-800 font-bold">
              CODING COLLAB
            </div>
          </div>
        </Link>

        {/* Navigation / Role Context */}
        {user ? (
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Team Identity & Active Participant */}
            <div className="hidden sm:flex flex-col text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-xs font-extrabold text-emerald-950">{user.teamName}</span>
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                  {user.teamCode}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1.5">
                <UserCheck className="w-3 h-3 text-emerald-600" />
                <span className="font-semibold text-slate-700">{user.activeParticipant.fullName}</span>
                {user.institution && (
                  <span className="text-slate-400 hidden lg:inline">
                    &bull; {user.institution}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex items-center gap-2">
              <Link
                to="/team/dashboard"
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive('/team/dashboard')
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/team/workspace"
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive('/team/workspace')
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                Workspace
              </Link>

              <button
                onClick={handleLogout}
                title="Log out"
                className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/#rules"
              className="text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors px-2 py-1"
            >
              Rules
            </Link>
            <Link
              to="/register"
              className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-colors shadow-sm"
            >
              Register Team
            </Link>
            <Link
              to="/login"
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
            >
              Team Login
            </Link>
            <Link
              to="/admin/login"
              className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-amber-700 text-xs font-medium transition-colors"
            >
              Admin
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
