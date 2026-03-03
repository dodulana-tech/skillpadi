'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

function LoginForm() {
  const { signInWithGoogle, signInWithEmail, isAuthenticated, dbUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirect = searchParams.get('redirect');
  const isAdminRoute = redirect === '/admin' || searchParams.get('admin') === 'true';

  useEffect(() => {
    if (!authLoading && isAuthenticated && dbUser) {
      if (redirect) { router.push(redirect); return; }
      if (dbUser.role === 'admin') router.push('/admin');
      else if (dbUser.role === 'school') router.push('/dashboard/school');
      else router.push('/dashboard/parent');
    }
  }, [authLoading, isAuthenticated, dbUser, redirect, router]);

  const handleGoogleSignIn = async () => {
    try { setLoading(true); setError(''); await signInWithGoogle(); }
    catch (err) { setError(err.message || 'Google sign-in failed'); setLoading(false); }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    try { setLoading(true); setError(''); await signInWithEmail(email, password); }
    catch (err) {
      if (err.code === 'auth/user-not-found') setError('No account found with this email');
      else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') setError('Invalid email or password');
      else setError(err.message || 'Sign-in failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <img src="/logomark.svg" alt="SkillPadi" className="w-10 h-10" />
            <span className={`font-serif text-xl ${isAdminRoute ? 'text-slate-800' : 'text-teal-primary'}`}>SkillPadi</span>
          </Link>
          <h1 className="font-serif text-2xl mt-4">{isAdminRoute ? 'Admin Login' : 'Welcome back'}</h1>
          <p className="text-sm text-slate-500 mt-1">{isAdminRoute ? 'Sign in to access the admin panel' : 'Sign in to manage your child\u0027s activities'}</p>
        </div>

        <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-[1.5px] border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:-translate-y-0.5 transition-all disabled:opacity-50">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-5"><div className="flex-1 h-px bg-slate-200" /><span className="text-xs text-slate-400">or sign in with email</span><div className="flex-1 h-px bg-slate-200" /></div>

        <form onSubmit={handleEmailSignIn} className="space-y-3">
          <div><label className="label">Email</label><input type="email" className="input" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><label className="label">Password</label><input type="password" className="input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <button type="submit" disabled={loading} className={`w-full justify-center py-3 disabled:opacity-50 rounded-xl font-semibold text-sm transition-all hover:-translate-y-0.5 ${isAdminRoute ? 'bg-slate-800 text-white hover:bg-slate-700' : 'btn-primary'}`}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-5">
          {isAdminRoute ? (
            <Link href="/auth/login" className="text-teal-primary font-semibold hover:underline">← Parent login</Link>
          ) : (
            <>New to SkillPadi?{' '}<Link href="/auth/signup" className="text-teal-primary font-semibold hover:underline">Create an account</Link></>
          )}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="min-h-screen bg-cream" />}><LoginForm /></Suspense>;
}