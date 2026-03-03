'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { toast } from 'sonner';

const fmt = (n) => `₦${Number(n).toLocaleString()}`;
const EMPTY_CHILD = { name: '', age: '', gender: 'male', notes: '' };

const LEVEL_COLORS = {
  beginner: 'bg-slate-200',
  explorer: 'bg-blue-400',
  intermediate: 'bg-teal-400',
  advanced: 'bg-purple-500',
  elite: 'bg-amber-400',
};
const LEVEL_PCT = { beginner: 0, explorer: 50, intermediate: 150, advanced: 300, elite: 600 };

export default function ParentDashboard() {
  const { isAuthenticated, dbUser, loading, authFetch } = useAuth();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [passports, setPassports] = useState({});

  // ── Children state (local copy so UI updates instantly) ──
  const [children, setChildren] = useState([]);
  const [showAddChild, setShowAddChild] = useState(false);
  const [childForm, setChildForm] = useState(EMPTY_CHILD);
  const [savingChild, setSavingChild] = useState(false);

  // Sync children from dbUser on load
  useEffect(() => {
    if (dbUser) setChildren(dbUser.children || []);
  }, [dbUser]);

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

  // Fetch passports for each child
  useEffect(() => {
    if (!isAuthenticated || !dbUser?.children?.length) return;
    (async () => {
      const results = {};
      await Promise.all(
        dbUser.children.map(async (child) => {
          try {
            const res = await authFetch(`/api/passport/${encodeURIComponent(child.name)}`);
            if (res.ok) {
              const data = await res.json();
              results[child.name] = data.passport || null;
            }
          } catch (e) { /* non-blocking */ }
        })
      );
      setPassports(results);
    })();
  }, [isAuthenticated, dbUser, authFetch]);

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

  // ── Add child ──
  const handleAddChild = async () => {
    if (!childForm.name.trim()) { toast.error('Child name is required'); return; }
    const age = Number(childForm.age);
    if (!childForm.age || isNaN(age) || age < 2 || age > 18) {
      toast.error('Age must be between 2 and 18'); return;
    }
    setSavingChild(true);
    const newChild = {
      name: childForm.name.trim(),
      age,
      gender: childForm.gender,
      ...(childForm.notes.trim() && { notes: childForm.notes.trim() }),
    };
    const updated = [...children, newChild];
    const res = await authFetch('/api/users', {
      method: 'PATCH',
      body: JSON.stringify({ children: updated }),
    });
    setSavingChild(false);
    if (res.ok) {
      setChildren(updated);
      setChildForm(EMPTY_CHILD);
      setShowAddChild(false);
      toast.success(`${newChild.name} added!`);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || 'Failed to add child');
    }
  };

  // ── Remove child ──
  const handleRemoveChild = async (index) => {
    if (!confirm(`Remove ${children[index]?.name}?`)) return;
    const updated = children.filter((_, i) => i !== index);
    const res = await authFetch('/api/users', {
      method: 'PATCH',
      body: JSON.stringify({ children: updated }),
    });
    if (res.ok) {
      setChildren(updated);
      toast.success('Child removed');
    } else {
      toast.error('Failed to remove child');
    }
  };

  const setF = (field) => (e) => setChildForm(prev => ({ ...prev, [field]: e.target.value }));

  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <p className="text-slate-400 text-sm">Loading...</p>
    </div>
  );
  if (!isAuthenticated) return null;

  const firstName = dbUser?.name?.split(' ')[0];

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-20 pb-12">
        <h1 className="font-serif text-2xl mb-1">Welcome, {firstName}</h1>
        <p className="text-xs text-slate-500 mb-6">Your dashboard</p>

        {/* ── Membership ── */}
        <div className={`card p-4 mb-4 ${dbUser?.membershipPaid ? 'bg-green-50 border-green-200/60' : 'bg-amber-50 border-amber-200/60'}`}>
          {dbUser?.membershipPaid ? (
            <div className="flex items-center gap-2">
              <span className="badge badge-green">Active Member</span>
              <span className="text-[10px] text-slate-500">
                Since {dbUser.membershipDate ? new Date(dbUser.membershipDate).toLocaleDateString() : 'recently'}
              </span>
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
                    toast.error(data.error || 'Payment failed to initialize');
                  }
                } catch (err) {
                  toast.error('Payment error: ' + err.message);
                }
              }} className="btn-primary btn-sm">Pay {fmt(15000)} →</button>
            </div>
          )}
        </div>

        {/* ── Children: empty CTA ── */}
        {children.length === 0 && !showAddChild && (
          <div className="card p-5 mb-4 border-dashed border-2 border-teal-primary/30 text-center">
            <div className="text-2xl mb-2">👧👦</div>
            <div className="font-bold text-sm text-slate-700 mb-1">Add Your Children</div>
            <p className="text-[11px] text-slate-500 mb-3">
              Add your children to get personalised program recommendations and faster enrollment.
            </p>
            <button onClick={() => setShowAddChild(true)} className="btn-primary btn-sm">
              Add Child +
            </button>
          </div>
        )}

        {/* ── Children: list ── */}
        {children.length > 0 && (
          <div className="card p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                Your Children ({children.length})
              </div>
              <button
                onClick={() => { setShowAddChild(true); setChildForm(EMPTY_CHILD); }}
                className="text-[10px] text-teal-primary font-semibold hover:underline">
                + Add Child
              </button>
            </div>
            <div className="flex gap-2 flex-wrap mb-3">
              {children.map((child, i) => (
                <div key={i} className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-lg bg-slate-50 border border-slate-100 group">
                  <div>
                    <span className="text-xs font-semibold">{child.name}</span>
                    <span className="text-[10px] text-slate-400 ml-1">{child.age} yrs</span>
                    {child.gender && (
                      <span className="text-[10px] text-slate-300 ml-1">· {child.gender}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveChild(i)}
                    className="text-slate-300 hover:text-red-400 text-sm ml-1 leading-none transition-colors"
                    title={`Remove ${child.name}`}>
                    ×
                  </button>
                </div>
              ))}
            </div>
            {enrollments.length === 0 && (
              <div className="flex gap-3 flex-wrap">
                {children.map((child, i) => (
                  <Link key={i} href="/#programs"
                    className="text-[11px] text-teal-primary font-semibold hover:underline">
                    Browse programs for {child.name} →
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Add child inline form ── */}
        {showAddChild && (
          <div className="card p-5 mb-4 border-teal-primary/20 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-sm">Add a Child</div>
              <button
                onClick={() => { setShowAddChild(false); setChildForm(EMPTY_CHILD); }}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none w-6 h-6 flex items-center justify-center">
                ×
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                  Child&apos;s Name <span className="text-red-400">*</span>
                </label>
                <input
                  className="input-field text-sm w-full"
                  placeholder="e.g. Amara"
                  value={childForm.name}
                  onChange={setF('name')}
                  maxLength={60}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                  Age <span className="text-red-400">*</span>
                </label>
                <input
                  className="input-field text-sm w-full"
                  type="number"
                  min={2}
                  max={18}
                  placeholder="e.g. 7"
                  value={childForm.age}
                  onChange={setF('age')}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Gender</label>
                <select className="input-field text-sm w-full" value={childForm.gender} onChange={setF('gender')}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                  Notes <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  className="input-field text-sm w-full"
                  placeholder="e.g. afraid of water, has asthma"
                  value={childForm.notes}
                  onChange={setF('notes')}
                  maxLength={200}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddChild}
                disabled={savingChild}
                className="btn-primary btn-sm disabled:opacity-60 disabled:cursor-not-allowed">
                {savingChild ? 'Saving...' : 'Add Child'}
              </button>
              <button
                onClick={() => { setShowAddChild(false); setChildForm(EMPTY_CHILD); }}
                className="btn-outline btn-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Active Programs ── */}
        <div className="mb-2 flex justify-between items-center">
          <h2 className="font-bold text-sm">Active Programs</h2>
          <Link href="/#programs" className="text-teal-primary text-xs font-semibold hover:underline">
            Browse Programs →
          </Link>
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
                    <span className={`badge ${enr.status === 'active' ? 'badge-green' : enr.status === 'completed' ? 'badge-blue' : 'badge-amber'}`}>
                      {enr.status}
                    </span>
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
                      {enr.milestonesCompleted.map((m, i) => (
                        <span key={i} className="badge badge-green text-[8px]">✓ {m}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Child Passports ── */}
        {children.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm">🏅 Skill Passports</h2>
              <Link href="/leaderboard" className="text-teal-primary text-xs font-semibold hover:underline">
                View Leaderboard →
              </Link>
            </div>
            <div className="space-y-4">
              {children.map((child) => {
                const passport = passports[child.name];
                const stats = passport?.stats || {};
                const skillLevels = passport?.skillLevels || [];
                const achievements = passport?.achievements || [];

                const shareText = encodeURIComponent(
                  `🌟 ${child.name} is building amazing skills on SkillPadi!\n` +
                  `${stats.totalSessions || 0} sessions · ${stats.currentStreak || 0} streak 🔥\n` +
                  `Join us: ${window?.location?.origin || 'https://skillpadi.com'}`
                );
                const waLink = `https://wa.me/?text=${shareText}`;

                return (
                  <div key={child.name} className="card overflow-hidden">
                    {/* Passport header */}
                    <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-5 py-4 text-white">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-serif text-lg leading-tight">{child.name}</div>
                          <div className="text-teal-200 text-[10px] mt-0.5">Age {child.age} · SkillPadi Passport</div>
                        </div>
                        <div className="text-2xl opacity-80">🛂</div>
                      </div>
                      {/* Stats row */}
                      <div className="grid grid-cols-4 gap-2 mt-4">
                        {[
                          { label: 'Sessions', value: stats.totalSessions || 0 },
                          { label: 'Hours', value: stats.totalHours || 0 },
                          { label: 'Streak 🔥', value: stats.currentStreak || 0 },
                          { label: 'Sports', value: stats.sportsCount || 0 },
                        ].map(({ label, value }) => (
                          <div key={label} className="text-center">
                            <div className="text-white font-bold text-base leading-none">{value}</div>
                            <div className="text-teal-200 text-[8px] mt-0.5">{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4">
                      {/* Skill Levels */}
                      {skillLevels.length > 0 && (
                        <div className="mb-4">
                          <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                            Skill Levels
                          </div>
                          <div className="space-y-2">
                            {skillLevels.map((sl) => {
                              const cat = sl.categoryId;
                              const catName = cat?.name || 'Activity';
                              const level = sl.level || 'beginner';
                              const pts = sl.points || 0;
                              const nextLevelPts = { beginner: 50, explorer: 150, intermediate: 300, advanced: 600, elite: 600 };
                              const prevPts = LEVEL_PCT[level] || 0;
                              const next = nextLevelPts[level] || 600;
                              const pct = level === 'elite' ? 100 : Math.min(100, Math.round(((pts - prevPts) / (next - prevPts)) * 100));
                              return (
                                <div key={String(sl.categoryId?._id || sl.categoryId)}>
                                  <div className="flex justify-between text-[10px] mb-1">
                                    <span className="font-medium text-slate-700">
                                      {cat?.icon && <span className="mr-1">{cat.icon}</span>}
                                      {catName}
                                    </span>
                                    <span className="text-slate-400 capitalize">{level} · {pts}pts</span>
                                  </div>
                                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${LEVEL_COLORS[level] || 'bg-slate-300'}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Achievements */}
                      {achievements.length > 0 && (
                        <div className="mb-4">
                          <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                            Badges ({achievements.length})
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {achievements.map((a, i) => {
                              const ach = a.achievementId;
                              if (!ach) return null;
                              return (
                                <div
                                  key={i}
                                  title={`${ach.name}: ${ach.description}`}
                                  className="w-10 h-10 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-lg shadow-sm"
                                  style={{ boxShadow: '0 0 6px rgba(251,191,36,0.4)' }}
                                >
                                  {ach.icon || '🏅'}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* No passport yet */}
                      {!passport && (
                        <p className="text-[11px] text-slate-400 text-center py-2">
                          Passport will appear after {child.name}&apos;s first session is logged.
                        </p>
                      )}

                      {/* Share button */}
                      <div className="flex gap-2 mt-2">
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 text-white text-[11px] font-semibold hover:bg-green-600 transition-colors">
                          📲 Share Progress
                        </a>
                        {passport && (
                          <Link
                            href={`/passport/${dbUser?._id}/${encodeURIComponent(child.name)}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-semibold hover:bg-slate-200 transition-colors">
                            View Full Passport →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
