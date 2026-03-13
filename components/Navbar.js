'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useRef, useEffect } from 'react';

export default function Navbar() {
  const { isAuthenticated, dbUser, signOut, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const dropRef = useRef(null);
  const partnerRef = useRef(null);

  const dashLink = isAdmin ? '/admin' : dbUser?.role === 'coach' ? '/dashboard/coach' : dbUser?.role === 'school' ? '/dashboard/school' : dbUser?.role === 'community' ? '/dashboard/community' : '/dashboard/parent';

  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropdownOpen(false);
      if (partnerRef.current && !partnerRef.current.contains(e.target)) setPartnerOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white">
      {/* Gold accent line */}
      <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #0F766E, #14B8A6, #CA8A04)' }} />

      <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4">
        {/* Logo + tagline */}
        <Link href="/" className="flex items-center gap-2">
          <img src="/logomark.svg" alt="SkillPadi" className="w-7 h-7" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div className="leading-none">
            <span className="font-serif text-base text-teal-primary font-bold block" style={{ lineHeight: 1 }}>SkillPadi</span>
            <span className="text-[6.5px] text-slate-300 font-semibold tracking-[0.2em] uppercase">Skills for life</span>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-5">
          <Link href="/#programs" className="text-[11.5px] font-semibold text-slate-500 hover:text-slate-800 transition-colors">Programs</Link>
          <Link href="/#coaches" className="text-[11.5px] font-semibold text-slate-500 hover:text-slate-800 transition-colors">Coaches</Link>
          <Link href="/shop" className="text-[11.5px] font-semibold text-slate-500 hover:text-slate-800 transition-colors">Shop</Link>
          <Link href="/impact" className="text-[11.5px] font-semibold text-slate-500 hover:text-slate-800 transition-colors">Impact</Link>

          {/* Partner dropdown */}
          <div className="relative" ref={partnerRef}>
            <button
              onClick={() => setPartnerOpen(v => !v)}
              className="text-[11.5px] font-semibold text-teal-primary hover:text-teal-700 transition-colors flex items-center gap-1"
            >
              Partner
              <svg className={`w-3 h-3 transition-transform ${partnerOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
            </button>
            {partnerOpen && (
              <div className="absolute top-8 left-0 w-56 bg-white rounded-xl shadow-xl border border-slate-200/80 py-2 z-50">
                <Link href="/partners" onClick={() => setPartnerOpen(false)} className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50 border-b border-slate-50">
                  <span className="text-base mt-0.5">🤝</span>
                  <div>
                    <div className="text-[11px] font-bold text-slate-800">How It Works</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">Learn about the partnership model.</div>
                  </div>
                </Link>
                <Link href="/schools/join" onClick={() => setPartnerOpen(false)} className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50">
                  <span className="text-base mt-0.5">🏫</span>
                  <div>
                    <div className="text-[11px] font-bold text-slate-800">For Schools</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">Structured P.E. programmes. Set your margins.</div>
                  </div>
                </Link>
                <Link href="/communities/join" onClick={() => setPartnerOpen(false)} className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50">
                  <span className="text-base mt-0.5">🏘️</span>
                  <div>
                    <div className="text-[11px] font-bold text-slate-800">For Estates</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">Activate your facilities. Resident discounts.</div>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="relative flex items-center gap-2" ref={dropRef}>
              <Link href={dashLink} className="hidden sm:inline-flex text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-all">
                Dashboard
              </Link>
              <button
                onClick={() => setDropdownOpen(v => !v)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #0F766E, #14B8A6)' }}
              >
                {dbUser?.name?.[0]?.toUpperCase() || '?'}
              </button>

              {dropdownOpen && (
                <div className="absolute top-11 right-0 w-52 bg-white rounded-xl shadow-xl border border-slate-200/80 py-1 z-50">
                  <div className="px-3 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{dbUser?.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{dbUser?.email}</p>
                  </div>
                  <Link href={dashLink} onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-3 py-2 text-[11px] text-slate-600 hover:bg-slate-50 font-medium">
                    <span className="text-sm">📊</span> Dashboard
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-3 py-2 text-[11px] text-slate-600 hover:bg-slate-50 font-medium">
                      <span className="text-sm">⚙️</span> Admin Panel
                    </Link>
                  )}
                  <Link href="/" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-3 py-2 text-[11px] text-slate-600 hover:bg-slate-50 font-medium">
                    <span className="text-sm">🏠</span> Home
                  </Link>
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button onClick={() => { signOut(); setDropdownOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-[11px] text-red-500 hover:bg-red-50 font-medium">
                      <span className="text-sm">↪</span> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login" className="text-[11.5px] font-semibold text-slate-500 hover:text-slate-800">Sign In</Link>
              <Link href="/auth/signup" className="text-[11.5px] font-bold text-white px-4 py-2 rounded-lg hover:-translate-y-0.5 transition-all" style={{ background: 'linear-gradient(135deg, #0F766E, #14B8A6)' }}>
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(v => !v)} className="md:hidden ml-1 p-1.5 rounded-lg hover:bg-slate-50">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen
                ? <path strokeLinecap="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-5 py-3 space-y-1 shadow-lg">
          <Link href="/#programs" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-slate-600 py-2 border-b border-slate-50">Programs</Link>
          <Link href="/#coaches" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-slate-600 py-2 border-b border-slate-50">Coaches</Link>
          <Link href="/shop" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-slate-600 py-2 border-b border-slate-50">Shop</Link>
          <Link href="/about" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-slate-600 py-2 border-b border-slate-50">About</Link>
          <Link href="/#how" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-slate-600 py-2 border-b border-slate-50">How It Works</Link>
          <div className="pt-2 space-y-1">
            <Link href="/partners" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-sm font-medium text-slate-600 py-2 border-b border-slate-50">🤝 Partner With Us</Link>
            <Link href="/schools/join" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-sm font-semibold text-teal-primary py-2">🏫 For Schools →</Link>
            <Link href="/communities/join" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-sm font-semibold text-teal-primary py-2">🏘️ For Estates →</Link>
          </div>
        </div>
      )}
    </nav>
  );
}