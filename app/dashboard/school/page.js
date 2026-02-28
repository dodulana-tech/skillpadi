'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';

const fmt = (n) => `₦${Number(n).toLocaleString()}`;

export default function SchoolDashboard() {
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

  if (loading) return <div className="min-h-screen bg-cream flex items-center justify-center"><p className="text-slate-400 text-sm">Loading...</p></div>;
  if (!isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-20 pb-12">
        <h1 className="font-serif text-2xl mb-1">School Dashboard</h1>
        <p className="text-xs text-slate-500 mb-6">Manage your students&apos; activities</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Students', value: enrollments.length },
            { label: 'Active Programs', value: [...new Set(enrollments.map((e) => e.programId?._id))].length },
            { label: 'Completion', value: enrollments.length ? Math.round(enrollments.reduce((s, e) => s + (e.sessionsCompleted / (e.programId?.sessions || 1)), 0) / enrollments.length * 100) + '%' : '0%' },
          ].map((s) => (
            <div key={s.label} className="card p-3 text-center">
              <div className="font-serif text-xl text-teal-primary">{s.value}</div>
              <div className="text-[9px] text-slate-400 uppercase font-bold">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Student enrollments */}
        <h2 className="font-bold text-sm mb-2">Students</h2>
        {loadingData ? (
          <div className="card p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : enrollments.length === 0 ? (
          <div className="card p-8 text-center text-slate-400 text-sm">No student enrollments yet.</div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left p-3 font-bold text-[9px] uppercase text-slate-400">Student</th>
                  <th className="text-left p-3 font-bold text-[9px] uppercase text-slate-400">Program</th>
                  <th className="text-left p-3 font-bold text-[9px] uppercase text-slate-400">Progress</th>
                  <th className="text-left p-3 font-bold text-[9px] uppercase text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enr) => {
                  const prog = enr.programId || {};
                  const pct = prog.sessions ? Math.round((enr.sessionsCompleted / prog.sessions) * 100) : 0;
                  return (
                    <tr key={enr._id} className="border-b border-slate-50">
                      <td className="p-3 font-semibold">{enr.childName}</td>
                      <td className="p-3">{prog.name}</td>
                      <td className="p-3">
                        <div className="progress-bar w-20">
                          <div className="progress-fill bg-teal-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[9px] text-slate-400">{enr.sessionsCompleted}/{prog.sessions}</span>
                      </td>
                      <td className="p-3"><span className={`badge ${enr.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{enr.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
