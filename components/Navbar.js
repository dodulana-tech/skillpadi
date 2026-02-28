'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useRef, useEffect } from 'react';

export default function Navbar() {
  const { isAuthenticated, dbUser, signOut, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropRef = useRef(null);

  const dashLink = isAdmin ? '/admin' : dbUser?.role === 'school' ? '/dashboard/school' : '/dashboard/parent';

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-cream/92 backdrop-blur-xl border-b border-black/5">
      <div className="page-container flex items-center justify-between h-14">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-primary to-teal-light flex items-center justify-center text-white text-[10px] font-extrabold">SP</div>
          <span className="font-serif text-lg text-teal-primary">SkillPadi</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-5 text-xs font-medium text-slate-500">
          <Link href="/#programs" className="hover:text-slate-900 transition-colors">Programs</Link>
          <Link href="/#coaches" className="hover:text-slate-900 transition-colors">Coaches</Link>
          <Link href="/shop" className="hover:text-slate-900 transition-colors">Shop</Link>
          <Link href="/#how" className="hover:text-slate-900 transition-colors">How It Works</Link>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <div className="relative" ref={dropRef}>
              <Link href={dashLink} className="btn-outline btn-sm hidden sm:inline-flex mr-1">
                Dashboard
              </Link>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="w-8 h-8 rounded-full bg-teal-primary text-white text-xs font-bold flex items-center justify-center"
              >
                {dbUser?.name?.[0]?.toUpperCase() || '?'}
              </button>
              {dropdownOpen && (
                <div className="absolute top-10 right-0 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900">{dbUser?.name}</p>
                    <p className="text-[10px] text-slate-500">{dbUser?.email}</p>
                    <span className="badge badge-green mt-1">{dbUser?.role}</span>
                  </div>
                  <Link href={dashLink} onClick={() => setDropdownOpen(false)} className="block px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">Dashboard</Link>
                  {isAdmin && <Link href="/admin" onClick={() => setDropdownOpen(false)} className="block px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">Admin Panel</Link>}
                  <button onClick={() => { signOut(); setDropdownOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50">Sign Out</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/auth/login" className="btn-outline btn-sm">Sign In</Link>
              <Link href="/auth/signup" className="btn-primary btn-sm">Get Started</Link>
            </>
          )}

          {/* Mobile menu toggle */}
          <button onClick={() => setMobileOpen((v) => !v)} className="md:hidden ml-1 p-1.5 rounded-lg hover:bg-slate-100">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen
                ? <path strokeLinecap="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-4 py-3 space-y-2 shadow-lg">
          <Link href="/#programs" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-slate-600 py-1.5">Programs</Link>
          <Link href="/#coaches" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-slate-600 py-1.5">Coaches</Link>
          <Link href="/shop" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-slate-600 py-1.5">Shop</Link>
          <Link href="/#how" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-slate-600 py-1.5">How It Works</Link>
        </div>
      )}
    </nav>
  );
}
