'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

const WA_BIZ = process.env.NEXT_PUBLIC_WA_BUSINESS || '234XXXXXXXXXX';

export default function SchoolPortalPage() {
  const { signInWithGoogle, signInWithEmail, isAuthenticated, dbUser, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState('login'); // 'login' | 'not-school'

  // If already logged in, smart-redirect
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) return;
    if (dbUser?.role === 'school' || dbUser?.role === 'admin') {
      router.replace('/dashboard/school');
    } else if (dbUser) {
      // Logged in but not a school account
      setView('not-school');
    }
  }, [loading, isAuthenticated, dbUser, router]);

  const afterSignIn = (role) => {
    if (role === 'school' || role === 'admin') {
      router.replace('/dashboard/school');
    } else {
      setView('not-school');
    }
  };

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setError('');
    try {
      await signInWithGoogle();
      // Role check happens in the useEffect above after dbUser loads
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
      setSubmitting(false);
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await signInWithEmail(email, password);
      // Role check happens in the useEffect above after dbUser loads
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('No account found with these credentials');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else {
        setError(err.message || 'Sign-in failed');
      }
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  // Wrong-account state
  if (view === 'not-school') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-4">🏫</div>
          <h2 className="text-white font-bold text-lg mb-2">Not a school account</h2>
          <p className="text-slate-400 text-sm mb-6">
            Your account is not linked to a school profile. Please contact SkillPadi to set up your school access.
          </p>
          <a
            href={`https://wa.me/${WA_BIZ}?text=${encodeURIComponent('Hi! I need school portal access for my school on SkillPadi.')}`}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white text-sm font-semibold rounded-full hover:bg-green-600 transition-colors mb-4">
            💬 Request Access via WhatsApp
          </a>
          <div className="mt-4">
            <Link href="/" className="text-slate-500 text-xs hover:text-slate-300 transition-colors">
              ← Back to SkillPadi
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Top bar */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <img src="/logomark.svg" alt="SkillPadi" className="w-7 h-7" />
          <div>
            <div className="text-white text-xs font-bold leading-tight">School Portal</div>
            <div className="text-slate-500 text-[9px] leading-tight">Powered by SkillPadi</div>
          </div>
        </div>
        <Link href="/" className="text-slate-500 text-[10px] hover:text-slate-300 transition-colors">
          Parent site →
        </Link>
      </div>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl mx-auto mb-4 shadow-lg shadow-indigo-900/50">
              🏫
            </div>
            <h1 className="text-white font-bold text-2xl mb-1">School Portal</h1>
            <p className="text-slate-400 text-sm">
              Manage enrollments, track students, invite parents
            </p>
          </div>

          {/* Features summary */}
          <div className="grid grid-cols-3 gap-2 mb-8">
            {[
              { icon: '📊', label: 'Track progress' },
              { icon: '📩', label: 'Invite parents' },
              { icon: '📋', label: 'View programs' },
            ].map(f => (
              <div key={f.label} className="bg-slate-800/60 rounded-xl p-2.5 text-center border border-slate-700/50">
                <div className="text-lg mb-1">{f.icon}</div>
                <div className="text-slate-400 text-[9px] font-medium">{f.label}</div>
              </div>
            ))}
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-700 bg-slate-800 text-sm font-semibold text-white hover:bg-slate-700 transition-colors disabled:opacity-50 mb-4"
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-[10px] text-slate-500">or email</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailSignIn} className="space-y-3">
            <input
              type="email"
              placeholder="School email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-3.5 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {error && (
              <p className="text-xs text-red-400 bg-red-950/50 border border-red-900/50 px-3 py-2 rounded-lg">{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Signing in...' : 'Sign In to School Portal'}
            </button>
          </form>

          {/* No account CTA */}
          <div className="mt-6 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 text-center">
            <p className="text-slate-400 text-xs mb-2">No school account yet?</p>
            <a
              href={`https://wa.me/${WA_BIZ}?text=${encodeURIComponent('Hi! I would like to set up SkillPadi for my school.')}`}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400 hover:text-green-300 transition-colors">
              💬 Contact us to get started
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-800 text-center">
        <p className="text-slate-600 text-[9px]">
          © 2025 SkillPadi · Secure school portal · Data protected
        </p>
      </div>
    </div>
  );
}
