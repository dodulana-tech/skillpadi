'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function SignupPage() {
  const { signInWithGoogle, signUpWithEmail } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignUp = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      router.push('/dashboard/parent');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const user = await signUpWithEmail(email, password);

      // Update profile in DB with name and phone
      const token = await user.getIdToken();
      await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, phone }),
      });

      router.push('/dashboard/parent');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError('Email already registered');
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-primary to-teal-light flex items-center justify-center text-white text-sm font-extrabold">SP</div>
            <span className="font-serif text-xl text-teal-primary">SkillPadi</span>
          </Link>
          <h1 className="font-serif text-2xl mt-4">Create your account</h1>
          <p className="text-sm text-slate-500 mt-1">Join SkillPadi to enroll your child</p>
        </div>

        <button onClick={handleGoogleSignUp} disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-[1.5px] border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:-translate-y-0.5 transition-all disabled:opacity-50">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Sign up with Google
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400">or create with email</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <form onSubmit={handleEmailSignUp} className="space-y-3">
          <div>
            <label className="label">Full Name</label>
            <input type="text" className="input" placeholder="Mrs. Ngozi Adebayo" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">WhatsApp Number</label>
            <input type="tel" className="input" placeholder="0812-345-6789" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 disabled:opacity-50">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-5">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-teal-primary font-semibold hover:underline">Sign in</Link>
        </p>

        <p className="text-center text-[10px] text-slate-400 mt-3">
          One-time membership fee of ₦15,000 applies after sign-up.
        </p>
      </div>
    </div>
  );
}
