'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

const fmt = (n) => `₦${Number(n).toLocaleString()}`;

export default function ParentDashboard() {
  const { isAuthenticated, dbUser, loading, authFetch } = useAuth();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/auth/login');
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const res = await authFetch('/api/enrollments');
        if (res.ok) {
          const data = await res.json();
          setEnrollments(data.enrollments || []);
        }
      } catch (e) { console.error(e); }
      setLoadingData(false);
    })();
  }, [isAuthenticated, authFetch]);

  // Verify payment on redirect from Paystack
  useEffect(() => {
    if (!isAuthenticated) return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('reference') || params.get('trxref');
    if (!ref) return;

    (async () => {
      try {
        const res = await authFetch(`/api/payments/verify?reference=${ref}`);
        if (res.ok) {
          window.history.replaceState({}, '', '/dashboard/parent');
          window.location.reload();
        }
      } catch (e) { console.error('Payment verification failed:', e); }
    })();
  }, [isAuthenticated, authFetch]);

  if (loading) return <div className="min-h-screen bg-cream flex items-center justify-center"><p className="text-slate-400 text-sm">Loading...</p></div>;
  if (!isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-20 pb-12">
        <h1 className="font-serif text-2xl mb-1">Welcome, {dbUser?.name?.split(' ')[0]}</h1>
        <p className="text-xs text-slate-500 mb-6">Your dashboard</p>

        {/* Membership */}
        <div className={`card p-4 mb-4 ${dbUser?.membershipPaid ? 'bg-green-50 border-green-200/60' : 'bg-amber-50 border-amber-200/60'}`}>
          {dbUser?.membershipPaid ? (
            <div className="flex items-center gap-2">
              <span className="badge badge-green">Active Member</span>
              <span className="text-[10px] text-slate-500">Since {dbUser.membershipDate ? new Date(dbUser.membershipDate).toLocaleDateString() : 'recently'}</span>
            </div>
          ) : (
            <div>
              <div className="font-bold text-sm text-amber-900 mb-1">Complete Your Membership</div>
              <p className="text-[11px] text-amber-800 mb-2">One-time {fmt(15000)} membership fee to access all programs.</p>
              <button onClick={async () => {
                try {
                  const res = await authFetch('/api/payments/initialize', {
                    method: 'POST',
                    body: JSON.stringify({ type: 'membership', amount: 15000, description: 'SkillPadi Membership' }),
                  });
                  const data = await res.json();
                  if (data.authorization_url) {
                    window.location.href = data.authorization_url;
                  } else {
                    alert(data.error || 'Payment failed to initialize');
                  }
                } catch (err) {
                  alert('Payment error: ' + err.message);
                }
              }} className="btn-primary btn-sm">Pay {fmt(15000)} →</button>
            </div>
          )}
        </div>

        {/* Children */}
        {dbUser?.children?.length > 0 && (
          <div className="card p-4 mb-4">
            <div className="text-[9px] uppercase font-bold text-slate-400 mb-2">Your Children</div>
            <div className="flex gap-2 flex-wrap">
              {dbUser.children.map((child, i) => (
                <div key={i} className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <span className="font-semibold">{child.name}</span> <span className="text-slate-400">({child.age} yrs)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enrollments */}
        <div className="mb-2 flex justify-between items-center">
          <h2 className="font-bold text-sm">Active Programs</h2>
          <Link href="/#programs" className="text-teal-primary text-xs font-semibold hover:underline">Browse Programs →</Link>
        </div>
        {loadingData ? (
          <div className="card p-8 text-center text-slate-400 text-sm">Loading enrollments...</div>
        ) : enrollments.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-slate-400 text-sm mb-3">No active enrollments yet.</p>
            <Link href="/#programs" className="btn-primary btn-sm">Browse Programs</Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {enrollments.map((enr) => {
              const prog = enr.programId || {};
              const pctDone = prog.sessions ? Math.round((enr.sessionsCompleted / prog.sessions) * 100) : 0;
              return (
                <div key={enr._id} className="card p-4 animate-fade-in">
                  <div className="flex justify-between mb-1.5">
                    <div>
                      <div className="font-serif text-sm">{prog.name || 'Program'}</div>
                      <div className="text-[10px] text-slate-500">{enr.childName} · {prog.schedule}</div>
                    </div>
                    <span className={`badge ${enr.status === 'active' ? 'badge-green' : enr.status === 'completed' ? 'badge-blue' : 'badge-amber'}`}>{enr.status}</span>
                  </div>
                  <div className="progress-bar mt-2">
                    <div className="progress-fill bg-teal-primary" style={{ width: `${pctDone}%` }} />
                  </div>
                  <div className="flex justify-between mt-1 text-[9px] text-slate-400">
                    <span>{enr.sessionsCompleted}/{prog.sessions} sessions</span>
                    <span>{pctDone}%</span>
                  </div>
                  {enr.milestonesCompleted?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {enr.milestonesCompleted.map((m, i) => <span key={i} className="badge badge-green text-[8px]">✓ {m}</span>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}