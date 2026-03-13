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
const REFERRAL_MILESTONES = [
  { count: 1, reward: 'Priority booking unlocked', icon: '📅' },
  { count: 3, reward: '1 free session earned!', icon: '🎁' },
  { count: 5, reward: 'Free month unlocked!', icon: '🌟' },
];

export default function ParentDashboard() {
  const { isAuthenticated, dbUser, loading, authFetch } = useAuth();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [passports, setPassports] = useState({});
  const [bundles, setBundles] = useState({});
  const [impactCount, setImpactCount] = useState(0);
  const [dismissedNudges, setDismissedNudges] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sp_dismissed_nudges') || '{}'); }
    catch { return {}; }
  });

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

  // Fetch bundle suggestions for each child
  useEffect(() => {
    if (!isAuthenticated || !dbUser?.children?.length) return;
    (async () => {
      const results = {};
      await Promise.all(
        dbUser.children.map(async (child) => {
          try {
            const res = await authFetch(`/api/bundles/suggest?childName=${encodeURIComponent(child.name)}`);
            if (res.ok) {
              const data = await res.json();
              results[child.name] = data.bundles || [];
            }
          } catch (e) { /* non-blocking */ }
        })
      );
      setBundles(results);
    })();
  }, [isAuthenticated, dbUser, authFetch]);

  // Fetch impact donation count
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const res = await authFetch('/api/donations/my');
        if (res.ok) {
          const data = await res.json();
          setImpactCount(data.childrenSupported || 0);
        }
      } catch (e) { /* non-blocking */ }
    })();
  }, [isAuthenticated, authFetch]);

  const dismissNudge = (key) => {
    const updated = { ...dismissedNudges, [key]: true };
    setDismissedNudges(updated);
    try { localStorage.setItem('sp_dismissed_nudges', JSON.stringify(updated)); } catch (e) { /* noop */ }
  };

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

        {/* ── Sibling Detection Nudge ── */}
        {(() => {
          if (children.length < 2) return null;
          const enrolledNames = new Set(enrollments.map(e => e.childName));
          const unenrolled = children.filter(c => !enrolledNames.has(c.name));
          if (unenrolled.length === 0) return null;
          const nudgeKey = `siblings_${dbUser?._id}`;
          if (dismissedNudges[nudgeKey]) return null;
          const enrolled = children.filter(c => enrolledNames.has(c.name));
          return (
            <div className="card p-4 mb-4 border-teal-primary/25 bg-teal-primary/4 animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-bold text-sm mb-1 text-teal-primary">Family Advantage</div>
                  <p className="text-[11px] text-slate-600 mb-3">
                    You&apos;ve enrolled <strong>{enrolled.length}</strong> of <strong>{children.length}</strong> children.
                    Enroll {unenrolled.map(c => c.name).join(' and ')} to unlock:
                  </p>
                  <div className="space-y-1 mb-3">
                    {unenrolled.map(child => (
                      <div key={child.name} className="text-[10px] text-slate-500">
                        🎯 Free skill assessment for <strong>{child.name}</strong> · Priority booking for next term
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {unenrolled.map(child => (
                      <Link key={child.name} href="/#programs"
                        className="px-3 py-1.5 bg-teal-primary text-white text-[11px] font-semibold rounded-lg hover:bg-teal-600 transition-colors">
                        Browse programs for {child.name} →
                      </Link>
                    ))}
                  </div>
                </div>
                <button onClick={() => dismissNudge(nudgeKey)} className="text-slate-300 hover:text-slate-500 text-lg leading-none shrink-0">×</button>
              </div>
            </div>
          );
        })()}

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
              const passportLink = `${typeof window !== 'undefined' ? window.location.origin : 'https://skillpadi.com'}/passport/${dbUser?._id}/${encodeURIComponent(enr.childName)}`;
              const shareProgressMsg = encodeURIComponent(
                `Check out ${enr.childName}'s progress on SkillPadi!\n${passportLink}`
              );
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

                  {/* Share progress WhatsApp button */}
                  <div className="mt-3">
                    <a
                      href={`https://wa.me/?text=${shareProgressMsg}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 text-white text-[10px] font-semibold hover:bg-green-600 transition-colors"
                    >
                      <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      Share {enr.childName}&apos;s Progress
                    </a>
                  </div>

                  {/* Term report inline (if published) */}
                  {enr.termReport?.published && (
                    <div className="mt-3 p-3 rounded-xl border border-blue-100 bg-blue-50/50">
                      <div className="text-[9px] uppercase font-bold text-blue-400 tracking-wider mb-1">Term Report</div>
                      {enr.termReport.summary && (
                        <p className="text-[11px] text-slate-600 mb-2">{enr.termReport.summary}</p>
                      )}
                      {enr.termReport.coachNote && (
                        <p className="text-[10px] text-slate-500 italic mb-2">&ldquo;{enr.termReport.coachNote}&rdquo; — Coach</p>
                      )}
                      {enr.termReport.grade && (
                        <span className="badge badge-blue text-[9px]">Grade: {enr.termReport.grade}</span>
                      )}
                    </div>
                  )}

                  {/* Re-enrollment card for completed enrollments */}
                  {enr.status === 'completed' && (
                    <div className="mt-3 p-3 rounded-xl border border-amber-100 bg-amber-50/50">
                      <div className="font-semibold text-xs text-amber-900 mb-1">What&apos;s next for {enr.childName}?</div>
                      <p className="text-[10px] text-amber-800 mb-2">
                        {enr.childName} completed {prog.name}! Keep the momentum going.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {prog.nextTermProgramId ? (
                          <Link href={`/programs/${prog.slug || prog._id}`}
                            className="px-3 py-1.5 bg-teal-primary text-white text-[10px] font-semibold rounded-lg hover:bg-teal-600 transition-colors">
                            Continue Next Term
                          </Link>
                        ) : (
                          <Link href="/#programs"
                            className="px-3 py-1.5 bg-teal-primary text-white text-[10px] font-semibold rounded-lg hover:bg-teal-600 transition-colors">
                            Browse Programs
                          </Link>
                        )}
                        <Link href={`/passport/${dbUser?._id}/${encodeURIComponent(enr.childName)}`}
                          className="px-3 py-1.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-lg hover:bg-slate-200 transition-colors">
                          View Passport
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Impact Donation Counter ── */}
        {impactCount > 0 && (
          <div className="card p-4 mb-4 mt-6 bg-purple-50/50 border-purple-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-lg">
                💜
              </div>
              <div>
                <div className="font-bold text-sm text-purple-900">
                  You&apos;ve supported {impactCount} Impact {impactCount === 1 ? 'child' : 'children'}
                </div>
                <p className="text-[10px] text-purple-700">
                  Your donations are helping underserved children access quality coaching.
                </p>
              </div>
              <Link href="/impact" className="ml-auto shrink-0 text-[10px] text-purple-600 font-semibold hover:underline">
                Learn More
              </Link>
            </div>
          </div>
        )}

        {/* ── Referral Engine ── */}
        {dbUser && (() => {
          const refCount = dbUser.referralCount || 0;
          const refLink = `${typeof window !== 'undefined' ? window.location.origin : 'https://skillpadi.com'}/auth/signup?ref=${dbUser._id}`;
          const enrolled = enrollments.find(e => e.status === 'active');
          const progName = enrolled?.programId?.name || 'SkillPadi';
          const waMsg = encodeURIComponent(
            `My child is loving ${progName} at SkillPadi! Vetted coaches, real progress tracking. Sign up here: ${refLink}`
          );
          const nextMilestone = REFERRAL_MILESTONES.find(m => m.count > refCount);
          return (
            <div className="card p-5 mb-4 mt-6">
              <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-3">Refer Friends · Earn Rewards</div>
              <p className="text-[11px] text-slate-500 mb-4">Share SkillPadi with friends. Earn rewards when they join.</p>

              {/* Progress circles */}
              <div className="flex items-center gap-2 mb-4">
                {[1,2,3,4,5].map(n => (
                  <div key={n} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    n <= refCount
                      ? 'bg-teal-primary text-white shadow-sm'
                      : 'bg-slate-100 text-slate-300 border border-slate-200'
                  }`}>{n <= refCount ? '✓' : n}</div>
                ))}
                <div className="ml-2 text-[11px] text-slate-500">
                  <strong className="text-slate-700">{refCount}</strong> of 5
                </div>
              </div>

              {/* Current milestone */}
              {nextMilestone && (
                <div className="flex items-center gap-2 mb-4 p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                  <span className="text-base">{nextMilestone.icon}</span>
                  <div className="text-[10px] text-amber-800">
                    <strong>{nextMilestone.count - refCount} more</strong> referral{nextMilestone.count - refCount !== 1 ? 's' : ''} → <strong>{nextMilestone.reward}</strong>
                  </div>
                </div>
              )}

              {/* Referral link */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] text-slate-500 truncate font-mono">
                  {refLink}
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(refLink); toast.success('Link copied!'); }}
                  className="btn-outline btn-sm shrink-0">Copy</button>
              </div>

              <a href={`https://wa.me/?text=${waMsg}`} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-500 text-white text-xs font-semibold rounded-xl hover:bg-green-600 transition-colors">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Share on WhatsApp
              </a>
            </div>
          );
        })()}

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

                      {/* Bundle suggestions */}
                      {(bundles[child.name] || []).map((bundle) => {
                        const savings = bundle.individualPrice - bundle.price;
                        const savingsPct = bundle.individualPrice > 0 ? Math.round((savings / bundle.individualPrice) * 100) : 0;
                        return (
                          <div key={bundle._id} className="mt-3 p-3 rounded-xl border border-indigo-100 bg-indigo-50/50">
                            <div className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider mb-1">Suggested for {child.name}</div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-semibold text-xs text-slate-800">{bundle.name}</div>
                                {bundle.description && <div className="text-[10px] text-slate-500 mt-0.5">{bundle.description}</div>}
                              </div>
                              {savingsPct > 0 && (
                                <span className="badge badge-green text-[9px] shrink-0">Save {savingsPct}%</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              <div>
                                <span className="text-sm font-bold text-slate-800">{fmt(bundle.price)}</span>
                                {savings > 0 && (
                                  <span className="text-[10px] text-slate-400 line-through ml-1.5">{fmt(bundle.individualPrice)}</span>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  toast.info(`${bundle.name} — speak with us to enroll!`);
                                }}
                                className="ml-auto px-3 py-1 bg-indigo-600 text-white text-[10px] font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                                Learn More →
                              </button>
                            </div>
                          </div>
                        );
                      })}
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
