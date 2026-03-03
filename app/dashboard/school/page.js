'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { toast } from 'sonner';

const fmt = (n) => `₦${Number(n).toLocaleString()}`;

const TABS = [
  { id: 'students', label: 'Students', icon: '🎓' },
  { id: 'invite', label: 'Invite Parents', icon: '🔗' },
  { id: 'programs', label: 'Programs', icon: '📋' },
  { id: 'pricing', label: 'Pricing', icon: '💰' },
];

const EMPTY_STUDENT = { childName: '', childAge: '', programId: '', parentEmail: '' };

export default function SchoolDashboard() {
  const { isAuthenticated, dbUser, loading, authFetch } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState('students');
  const [enrollments, setEnrollments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  // Add student form
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentForm, setStudentForm] = useState(EMPTY_STUDENT);
  const [savingStudent, setSavingStudent] = useState(false);

  // Pricing tab
  const [pricingData, setPricingData] = useState(null); // { pricing[], defaultMarkupPercent, totalEarnings, pendingPayout }
  const [defaultMarkup, setDefaultMarkup] = useState(15);
  const [programMarkups, setProgramMarkups] = useState({}); // { [programId]: markupPercent }
  const [savingMarkup, setSavingMarkup] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);

  // ── Auth guard ──────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/auth/login');
    if (!loading && isAuthenticated && dbUser?.role !== 'school' && dbUser?.role !== 'admin') {
      router.push('/dashboard/parent');
    }
  }, [loading, isAuthenticated, dbUser, router]);

  // ── Load data ───────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingData(true);
    try {
      const schoolId = dbUser?.schoolId;
      const [enrRes, progRes, invRes, priceRes] = await Promise.all([
        authFetch('/api/enrollments'),
        authFetch('/api/programs?limit=100'),
        authFetch('/api/invites?type=school'),
        schoolId ? authFetch(`/api/schools/${schoolId}/pricing`) : Promise.resolve(null),
      ]);
      if (enrRes.ok) {
        const d = await enrRes.json();
        setEnrollments(d.enrollments || []);
      }
      if (progRes.ok) {
        const d = await progRes.json();
        setPrograms(d.programs || []);
      }
      if (invRes.ok) {
        const d = await invRes.json();
        setInvites(d.invites || []);
      }
      if (priceRes?.ok) {
        const d = await priceRes.json();
        setPricingData(d);
        setDefaultMarkup(d.defaultMarkupPercent ?? 15);
        const overrides = {};
        (d.pricing || []).forEach(p => {
          overrides[p.programId] = p.markupPercent ?? d.defaultMarkupPercent ?? 15;
        });
        setProgramMarkups(overrides);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingData(false);
  }, [isAuthenticated, authFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived: program stats from enrollments ──────────────────────
  const programStats = enrollments.reduce((acc, enr) => {
    const pid = enr.programId?._id || String(enr.programId);
    if (!pid) return acc;
    if (!acc[pid]) {
      acc[pid] = {
        _id: pid,
        name: enr.programId?.name || 'Unknown Program',
        schedule: enr.programId?.schedule,
        sessions: enr.programId?.sessions,
        students: 0,
        totalProgress: 0,
        active: 0,
      };
    }
    acc[pid].students += 1;
    acc[pid].totalProgress += enr.sessionsCompleted || 0;
    if (enr.status === 'active') acc[pid].active += 1;
    return acc;
  }, {});

  const programList = Object.values(programStats);

  // ── Active invite (first active one, or null) ─────────────────
  const activeInvite = invites.find((inv) => inv.isActive) || null;

  // ── Copy invite link ──────────────────────────────────────────
  const copyLink = (code) => {
    const link = `${window.location.origin}/join?invite=${code}`;
    navigator.clipboard.writeText(link).then(() => toast.success('Link copied!')).catch(() => toast.error('Copy failed'));
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => toast.success('Code copied!')).catch(() => toast.error('Copy failed'));
  };

  const shareWhatsApp = (code) => {
    const school = dbUser?.name || 'our school';
    const link = `${window.location.origin}/join?invite=${code}`;
    const msg = encodeURIComponent(`Hi! Sign up for SkillPadi programs at ${school} using invite code *${code}*: ${link}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  // ── Generate new invite ───────────────────────────────────────
  const handleGenerateInvite = async () => {
    if (!dbUser?.schoolId) { toast.error('No school linked to your account'); return; }
    setGeneratingInvite(true);
    try {
      const res = await authFetch('/api/invites', {
        method: 'POST',
        body: JSON.stringify({
          type: 'school',
          entityId: dbUser.schoolId,
          entityName: dbUser.name || 'School',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('New invite code generated!');
        await loadData();
      } else {
        toast.error(data.error || 'Failed to generate invite');
      }
    } catch (e) {
      toast.error('Error generating invite');
    }
    setGeneratingInvite(false);
  };

  // ── Add student ───────────────────────────────────────────────
  const handleAddStudent = async () => {
    if (!studentForm.childName.trim()) { toast.error('Child name is required'); return; }
    if (!studentForm.programId) { toast.error('Please select a program'); return; }
    setSavingStudent(true);
    try {
      const res = await authFetch('/api/enrollments', {
        method: 'POST',
        body: JSON.stringify({
          programId: studentForm.programId,
          childName: studentForm.childName.trim(),
          childAge: studentForm.childAge ? Number(studentForm.childAge) : undefined,
          schoolId: dbUser?.schoolId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${studentForm.childName.trim()} enrolled!`);
        setStudentForm(EMPTY_STUDENT);
        setShowAddStudent(false);
        await loadData();
      } else {
        toast.error(data.error || 'Enrollment failed');
      }
    } catch (e) {
      toast.error('Error enrolling student');
    }
    setSavingStudent(false);
  };

  const setF = (field) => (e) => setStudentForm((prev) => ({ ...prev, [field]: e.target.value }));

  const saveMarkupSettings = async () => {
    const schoolId = dbUser?.schoolId;
    if (!schoolId) return;
    setSavingMarkup(true);
    const programMarkupArray = Object.entries(programMarkups).map(([programId, markupPercent]) => ({
      programId,
      markupPercent: Number(markupPercent),
    }));
    const res = await authFetch(`/api/schools/${schoolId}/pricing`, {
      method: 'PATCH',
      body: JSON.stringify({ defaultMarkupPercent: defaultMarkup, programMarkups: programMarkupArray }),
    });
    if (res.ok) {
      toast.success('Pricing settings saved!');
      await loadData();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || 'Failed to save pricing');
    }
    setSavingMarkup(false);
  };

  const requestPayout = async () => {
    const schoolId = dbUser?.schoolId;
    if (!schoolId) return;
    setRequestingPayout(true);
    const pending = pricingData?.pendingPayout || 0;
    const msg = encodeURIComponent(
      `Hi SkillPadi! ${schoolName} is requesting a payout of ₦${pending.toLocaleString()} in school markup earnings. Please process at your earliest convenience.`
    );
    window.open(`https://wa.me/${process.env.NEXT_PUBLIC_WA_BUSINESS || ''}?text=${msg}`, '_blank');
    setRequestingPayout(false);
  };

  // ── Stats ─────────────────────────────────────────────────────
  const activeCount = enrollments.filter((e) => e.status === 'active').length;
  const avgPct = enrollments.length
    ? Math.round(enrollments.reduce((s, e) => s + (e.sessionsCompleted / (e.programId?.sessions || 1)), 0) / enrollments.length * 100)
    : 0;

  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <p className="text-slate-400 text-sm">Loading...</p>
    </div>
  );
  if (!isAuthenticated) return null;

  const schoolName = dbUser?.name || 'School';

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-20 pb-12">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-serif text-2xl mb-0.5">{schoolName}</h1>
          <p className="text-xs text-slate-500">School dashboard</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Students', value: enrollments.length },
            { label: 'Active Now', value: activeCount },
            { label: 'Avg. Progress', value: `${avgPct}%` },
          ].map((s) => (
            <div key={s.label} className="card p-3 text-center">
              <div className="font-serif text-xl text-teal-primary">{s.value}</div>
              <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors ${
                tab === t.id
                  ? 'bg-white border border-b-white border-slate-200 text-teal-primary -mb-px'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── STUDENTS TAB ─────────────────────────────────────── */}
        {tab === 'students' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm">Student Enrollments</h2>
              <button
                onClick={() => { setShowAddStudent(true); setStudentForm(EMPTY_STUDENT); }}
                className="btn-primary btn-sm"
              >
                + Add Student
              </button>
            </div>

            {/* Add student form */}
            {showAddStudent && (
              <div className="card p-5 mb-4 border-teal-primary/20 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-bold text-sm">Enroll a Student</div>
                  <button
                    onClick={() => setShowAddStudent(false)}
                    className="text-slate-400 hover:text-slate-600 text-xl leading-none w-6 h-6 flex items-center justify-center"
                  >
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
                      value={studentForm.childName}
                      onChange={setF('childName')}
                      maxLength={60}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Age</label>
                    <input
                      className="input-field text-sm w-full"
                      type="number"
                      min={2}
                      max={18}
                      placeholder="e.g. 8"
                      value={studentForm.childAge}
                      onChange={setF('childAge')}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Program <span className="text-red-400">*</span>
                    </label>
                    <select className="input-field text-sm w-full" value={studentForm.programId} onChange={setF('programId')}>
                      <option value="">Select a program…</option>
                      {programs.filter((p) => p.isActive !== false).map((p) => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddStudent}
                    disabled={savingStudent}
                    className="btn-primary btn-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingStudent ? 'Enrolling…' : 'Enroll Student'}
                  </button>
                  <button onClick={() => setShowAddStudent(false)} className="btn-outline btn-sm">Cancel</button>
                </div>
              </div>
            )}

            {loadingData ? (
              <div className="card p-8 text-center text-slate-400 text-sm">Loading students…</div>
            ) : enrollments.length === 0 ? (
              <div className="card p-10 text-center">
                <div className="text-3xl mb-2">🎓</div>
                <p className="text-slate-400 text-sm mb-3">No students enrolled yet.</p>
                <button onClick={() => setShowAddStudent(true)} className="btn-primary btn-sm">
                  Enroll First Student
                </button>
              </div>
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
                        <tr key={enr._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                          <td className="p-3 font-semibold">{enr.childName}</td>
                          <td className="p-3 text-slate-600">{prog.name || '—'}</td>
                          <td className="p-3">
                            <div className="progress-bar w-20 mb-1">
                              <div className="progress-fill bg-teal-primary" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[9px] text-slate-400">{enr.sessionsCompleted}/{prog.sessions || '?'}</span>
                          </td>
                          <td className="p-3">
                            <span className={`badge ${enr.status === 'active' ? 'badge-green' : enr.status === 'completed' ? 'badge-blue' : 'badge-amber'}`}>
                              {enr.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── INVITE PARENTS TAB ───────────────────────────────── */}
        {tab === 'invite' && (
          <div>
            <h2 className="font-bold text-sm mb-3">Invite Parents to SkillPadi</h2>

            {loadingData ? (
              <div className="card p-8 text-center text-slate-400 text-sm">Loading…</div>
            ) : activeInvite ? (
              <>
                {/* Invite code card */}
                <div className="card p-6 mb-4 bg-teal-primary/5 border-teal-primary/20">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Your Invite Code</div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="font-mono text-2xl font-bold text-teal-primary tracking-widest">
                      {activeInvite.code}
                    </span>
                    <button
                      onClick={() => copyCode(activeInvite.code)}
                      className="text-[10px] text-teal-primary font-semibold border border-teal-primary/30 rounded-lg px-2 py-1 hover:bg-teal-primary/10 transition-colors"
                    >
                      Copy Code
                    </button>
                  </div>

                  {/* Shareable link */}
                  <div className="mb-4">
                    <div className="text-[10px] text-slate-500 mb-1">Shareable sign-up link</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-[10px] text-slate-500 truncate font-mono">
                        {typeof window !== 'undefined' ? `${window.location.origin}/join?invite=${activeInvite.code}` : `…/join?invite=${activeInvite.code}`}
                      </div>
                      <button
                        onClick={() => copyLink(activeInvite.code)}
                        className="btn-primary btn-sm shrink-0"
                      >
                        Copy Link
                      </button>
                    </div>
                  </div>

                  {/* Share buttons */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => shareWhatsApp(activeInvite.code)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-500 text-white text-[11px] font-semibold rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      Share on WhatsApp
                    </button>
                  </div>

                  {/* Usage stats */}
                  <div className="flex gap-4 text-[10px] text-slate-500">
                    <span>Used: <strong className="text-slate-700">{activeInvite.usedCount}</strong>{activeInvite.maxUses > 0 ? ` / ${activeInvite.maxUses}` : ' times'}</span>
                    {activeInvite.discount > 0 && <span>Discount: <strong className="text-teal-primary">{activeInvite.discount}% off</strong></span>}
                    {activeInvite.expiresAt && <span>Expires: <strong>{new Date(activeInvite.expiresAt).toLocaleDateString()}</strong></span>}
                  </div>
                </div>

                {/* Who's used it */}
                {activeInvite.usedBy?.length > 0 && (
                  <div className="card p-4 mb-4">
                    <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-3">
                      Parents who joined ({activeInvite.usedBy.length})
                    </div>
                    <div className="space-y-1">
                      {activeInvite.usedBy.map((u, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-slate-600 font-mono text-[10px]">{String(u.userId).slice(-8)}</span>
                          <span className="text-slate-400 text-[10px]">{new Date(u.usedAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleGenerateInvite}
                  disabled={generatingInvite}
                  className="btn-outline btn-sm"
                >
                  {generatingInvite ? 'Generating…' : '+ Generate New Code'}
                </button>
              </>
            ) : (
              <div className="card p-10 text-center">
                <div className="text-3xl mb-2">🔗</div>
                <p className="text-slate-400 text-sm mb-4">No active invite code yet. Generate one to start inviting parents.</p>
                <button
                  onClick={handleGenerateInvite}
                  disabled={generatingInvite}
                  className="btn-primary btn-sm disabled:opacity-60"
                >
                  {generatingInvite ? 'Generating…' : 'Generate Invite Code'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── PRICING TAB ──────────────────────────────────────── */}
        {tab === 'pricing' && (
          <div>
            {/* Earnings summary */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="card p-4">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">Total Earned</div>
                <div className="font-serif text-xl text-teal-primary">{fmt(pricingData?.totalEarnings || 0)}</div>
                <div className="text-[9px] text-slate-400 mt-0.5">cumulative markup earnings</div>
              </div>
              <div className="card p-4">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">Pending Payout</div>
                <div className="font-serif text-xl text-amber-600">{fmt(pricingData?.pendingPayout || 0)}</div>
                <button
                  onClick={requestPayout}
                  disabled={requestingPayout || !pricingData?.pendingPayout}
                  className="mt-2 text-[9px] font-semibold text-teal-primary border border-teal-primary/30 rounded-lg px-2 py-1 hover:bg-teal-primary/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Request Payout via WhatsApp
                </button>
              </div>
            </div>

            {/* Default markup stepper */}
            <div className="card p-5 mb-4">
              <div className="font-bold text-sm mb-0.5">Default Markup</div>
              <div className="text-[10px] text-slate-400 mb-4">
                This percentage is added to SkillPadi&apos;s base price for all programmes.
                You can override per programme below.
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setDefaultMarkup(m => Math.max(0, m - 5))}
                  className="w-9 h-9 rounded-full border border-slate-200 text-slate-600 font-bold text-lg hover:bg-slate-50 flex items-center justify-center"
                >−</button>
                <div className="text-center">
                  <div className="font-serif text-3xl text-teal-primary">{defaultMarkup}%</div>
                  <div className="text-[9px] text-slate-400">markup on base price</div>
                </div>
                <button
                  onClick={() => setDefaultMarkup(m => Math.min(50, m + 5))}
                  className="w-9 h-9 rounded-full border border-slate-200 text-slate-600 font-bold text-lg hover:bg-slate-50 flex items-center justify-center"
                >+</button>
              </div>
            </div>

            {/* Per-programme pricing table */}
            {pricingData?.pricing?.length > 0 && (
              <div className="card overflow-hidden mb-4">
                <div className="p-4 border-b border-slate-100">
                  <div className="font-bold text-sm">Per-Programme Pricing</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Set custom markup per programme, or leave at default</div>
                </div>
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Programme</th>
                        <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">SkillPadi Base</th>
                        <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Your Markup</th>
                        <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Parent Pays</th>
                        <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">You Earn/Child</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pricingData.pricing.map(p => {
                        const markup = programMarkups[p.programId] ?? defaultMarkup;
                        const parentPerSession = Math.round(p.basePricePerSession * (1 + markup / 100));
                        const parentTotal = parentPerSession * p.sessions;
                        const earnPerChild = (parentPerSession - p.basePricePerSession) * p.sessions;
                        return (
                          <tr key={p.programId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                            <td className="p-3">
                              <div className="font-semibold">{p.categoryIcon} {p.programName}</div>
                              <div className="text-[9px] text-slate-400">{p.sessions} sessions</div>
                            </td>
                            <td className="p-3 text-slate-600">{fmt(p.baseTotalPrice)}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={50}
                                  value={markup}
                                  onChange={e => setProgramMarkups(prev => ({ ...prev, [p.programId]: Math.min(50, Math.max(0, Number(e.target.value))) }))}
                                  className="w-14 border border-slate-200 rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-teal-primary/30"
                                />
                                <span className="text-slate-400">%</span>
                              </div>
                            </td>
                            <td className="p-3 font-semibold text-slate-700">{fmt(parentTotal)}</td>
                            <td className="p-3 text-teal-primary font-semibold">{fmt(earnPerChild)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <button
              onClick={saveMarkupSettings}
              disabled={savingMarkup}
              className="btn-primary btn-sm disabled:opacity-60"
            >
              {savingMarkup ? 'Saving…' : 'Save Pricing Settings'}
            </button>
          </div>
        )}

        {/* ── PROGRAMS TAB ─────────────────────────────────────── */}
        {tab === 'programs' && (
          <div>
            <h2 className="font-bold text-sm mb-3">Programs at {schoolName}</h2>
            {loadingData ? (
              <div className="card p-8 text-center text-slate-400 text-sm">Loading…</div>
            ) : programList.length === 0 ? (
              <div className="card p-10 text-center">
                <div className="text-3xl mb-2">📋</div>
                <p className="text-slate-400 text-sm">No programs yet. Enroll students in the Students tab to see them here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {programList.map((p) => {
                  const avg = p.students > 0 && p.sessions
                    ? Math.round((p.totalProgress / p.students / p.sessions) * 100)
                    : 0;
                  return (
                    <div key={p._id} className="card p-4">
                      <div className="font-bold text-sm mb-0.5">{p.name}</div>
                      {p.schedule && <div className="text-[10px] text-slate-400 mb-3">{p.schedule}</div>}
                      <div className="flex gap-4 text-[10px] text-slate-500 mb-3">
                        <span>👥 <strong className="text-slate-700">{p.students}</strong> students</span>
                        <span>✅ <strong className="text-slate-700">{p.active}</strong> active</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mb-1">Avg. progress</div>
                      <div className="progress-bar">
                        <div className="progress-fill bg-teal-primary" style={{ width: `${avg}%` }} />
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1">{avg}%</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
