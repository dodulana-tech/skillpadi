'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

const fmt = (n) => `\u20A6${Number(n).toLocaleString()}`;
const WA_BIZ = process.env.NEXT_PUBLIC_WA_BUSINESS || '234XXXXXXXXXX';

const TABS = [
  { id: 'earnings', label: 'Earnings', icon: '\uD83D\uDCB0' },
  { id: 'schedule', label: 'Schedule', icon: '\uD83D\uDCC5' },
  { id: 'kids', label: 'My Kids', icon: '\uD83D\uDC67' },
  { id: 'profile', label: 'Profile', icon: '\uD83D\uDC64' },
  { id: 'programs', label: 'Programs', icon: '\uD83D\uDCCB' },
  { id: 'giveback', label: 'Give Back', icon: '\uD83D\uDC9A' },
];

const TIER_COLORS = {
  partner: 'bg-slate-100 text-slate-700',
  independent: 'bg-blue-100 text-blue-700',
  master: 'bg-amber-100 text-amber-800',
};

const TIER_LABELS = {
  partner: 'Partner Coach',
  independent: 'Independent Coach',
  master: 'Master Coach',
};

const GIVE_BACK_STEPS = ['Community', 'Programme', 'Budget', 'Review'];

export default function CoachDashboard() {
  const { isAuthenticated, dbUser, loading, authFetch } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState('earnings');
  const [coach, setCoach] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [payments, setPayments] = useState([]);
  const [impactPrograms, setImpactPrograms] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Profile form
  const [bankForm, setBankForm] = useState({ bankName: '', accountNumber: '', accountName: '' });
  const [savingBank, setSavingBank] = useState(false);

  // Program creation form
  const [showCreateProgram, setShowCreateProgram] = useState(false);
  const [programForm, setProgramForm] = useState({
    name: '', categoryId: '', ageRange: '', schedule: '', location: '', capacity: '', description: '',
  });
  const [creatingProgram, setCreatingProgram] = useState(false);

  // Session logging
  const [logEnrollmentId, setLogEnrollmentId] = useState(null);
  const [sessionNote, setSessionNote] = useState('');
  const [loggingSession, setLoggingSession] = useState(false);

  // Schedule expanded
  const [expandedProgram, setExpandedProgram] = useState(null);

  // Give Back form
  const [gbStep, setGbStep] = useState(0);
  const [gbForm, setGbForm] = useState({
    name: '', community: '', city: 'abuja', whyCommunity: '',
    categoryId: '', venue: '', venueType: '', schedule: '', ageRange: '', capacity: 30, termWeeks: 12,
    coachDonatesTime: true, equipment: 0, transport: 0, food: 500, stipend: 0, other: 0,
  });
  const [submittingGb, setSubmittingGb] = useState(false);

  // Visible tabs based on tier
  const visibleTabs = TABS.filter(t => {
    if (t.id === 'programs') {
      return coach && (coach.coachTier === 'independent' || coach.coachTier === 'master');
    }
    return true;
  });

  // Auth guard
  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/auth/login');
    if (!loading && dbUser && dbUser.role !== 'coach') router.push('/dashboard/parent');
  }, [loading, isAuthenticated, dbUser, router]);

  // Load data
  const loadData = useCallback(async () => {
    if (!isAuthenticated || !dbUser) return;
    setLoadingData(true);
    try {
      const [coachRes, enrollRes, catRes] = await Promise.all([
        authFetch('/api/coaches'),
        authFetch('/api/enrollments'),
        authFetch('/api/categories'),
      ]);

      if (coachRes.ok) {
        const data = await coachRes.json();
        const myCoach = (data.coaches || []).find(c =>
          String(c._id) === String(dbUser.coachId) || String(c.userId) === String(dbUser._id)
        );
        if (myCoach) {
          setCoach(myCoach);
          setBankForm({
            bankName: myCoach.bankDetails?.bankName || '',
            accountNumber: myCoach.bankDetails?.accountNumber || '',
            accountName: myCoach.bankDetails?.accountName || '',
          });
          // Load programs for this coach
          const progRes = await authFetch(`/api/programs?coachId=${myCoach._id}`);
          if (progRes.ok) {
            const pd = await progRes.json();
            setPrograms(pd.programs || []);
          }
          // Load payments for this coach
          try {
            const payRes = await authFetch(`/api/payments?coachId=${myCoach._id}`);
            if (payRes.ok) {
              const payData = await payRes.json();
              setPayments(payData.payments || []);
            }
          } catch { /* non-blocking */ }
          // Load impact programs
          try {
            const ipRes = await fetch('/api/impact/programs');
            if (ipRes.ok) {
              const ipData = await ipRes.json();
              setImpactPrograms((ipData.programs || []).filter(p =>
                String(p.coachId?._id || p.coachId) === String(myCoach._id) ||
                String(p.proposedByCoachId) === String(myCoach._id)
              ));
            }
          } catch { /* non-blocking */ }
        }
      }

      if (enrollRes.ok) {
        const data = await enrollRes.json();
        setEnrollments(data.enrollments || []);
      }

      if (catRes.ok) {
        const data = await catRes.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Failed to load coach data:', err);
    }
    setLoadingData(false);
  }, [isAuthenticated, dbUser, authFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  // Get enrollments for coach's programs
  const coachProgramIds = programs.map(p => String(p._id));
  const coachEnrollments = enrollments.filter(e =>
    coachProgramIds.includes(String(e.programId?._id || e.programId))
  );

  // All kids across programs
  const allKids = coachEnrollments.map(e => ({
    ...e,
    programName: e.programId?.name || 'Program',
    totalSessions: e.programId?.sessions || 0,
  }));

  // Earnings from payments
  const totalEarned = coach?.totalEarnings || 0;
  const pendingPayout = coach?.pendingPayout || 0;
  const tier = coach?.coachTier || 'partner';

  // ── Handlers ──

  const handleSaveBank = async () => {
    if (!bankForm.bankName || !bankForm.accountNumber || !bankForm.accountName) {
      toast.error('All bank fields are required');
      return;
    }
    setSavingBank(true);
    try {
      const res = await authFetch(`/api/coaches/${coach._id}`, {
        method: 'PUT',
        body: JSON.stringify({ bankDetails: bankForm }),
      });
      if (res.ok) {
        toast.success('Bank details saved');
        const updated = await res.json();
        setCoach(prev => ({ ...prev, bankDetails: bankForm }));
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to save');
      }
    } catch (err) {
      toast.error('Error saving bank details');
    }
    setSavingBank(false);
  };

  const handleLogSession = async (enrollmentId) => {
    setLoggingSession(true);
    try {
      const res = await authFetch(`/api/enrollments/${enrollmentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          $inc: { sessionsCompleted: 1 },
          notes: sessionNote || undefined,
        }),
      });
      if (res.ok) {
        toast.success('Session logged');
        setLogEnrollmentId(null);
        setSessionNote('');
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to log session');
      }
    } catch {
      toast.error('Error logging session');
    }
    setLoggingSession(false);
  };

  const handleCreateProgram = async () => {
    if (!programForm.name || !programForm.categoryId) {
      toast.error('Name and category are required');
      return;
    }
    setCreatingProgram(true);
    try {
      const slug = programForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString(36);
      const res = await authFetch('/api/programs', {
        method: 'POST',
        body: JSON.stringify({
          ...programForm,
          slug,
          coachId: coach._id,
          capacity: Number(programForm.capacity) || 10,
          spotsTotal: Number(programForm.capacity) || 10,
          pricePerSession: coach?.personalRate || 5000,
          supervision: 'drop-off',
          sessions: 12,
          isActive: false,
          createdBy: 'coach',
        }),
      });
      if (res.ok) {
        toast.success('Programme submitted for approval');
        setShowCreateProgram(false);
        setProgramForm({ name: '', categoryId: '', ageRange: '', schedule: '', location: '', capacity: '', description: '' });
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to create programme');
      }
    } catch {
      toast.error('Error creating programme');
    }
    setCreatingProgram(false);
  };

  const handleSubmitGiveBack = async () => {
    if (!gbForm.name || !gbForm.community || !gbForm.categoryId) {
      toast.error('Name, community, and category are required');
      return;
    }
    setSubmittingGb(true);
    try {
      const budget = {
        equipment: Number(gbForm.equipment) || 0,
        transport: Number(gbForm.transport) || 0,
        food: Number(gbForm.food) || 0,
        stipend: Number(gbForm.stipend) || 0,
        other: Number(gbForm.other) || 0,
      };
      const res = await authFetch('/api/impact/propose', {
        method: 'POST',
        body: JSON.stringify({
          name: gbForm.name,
          community: gbForm.community,
          city: gbForm.city,
          whyCommunity: gbForm.whyCommunity,
          categoryId: gbForm.categoryId,
          venue: gbForm.venue,
          venueType: gbForm.venueType,
          schedule: gbForm.schedule,
          ageRange: gbForm.ageRange,
          capacity: Number(gbForm.capacity) || 30,
          termWeeks: Number(gbForm.termWeeks) || 12,
          coachDonatesTime: gbForm.coachDonatesTime,
          budget,
        }),
      });
      if (res.ok) {
        toast.success('Impact programme proposed! We will review and get back to you.');
        setGbStep(0);
        setGbForm({
          name: '', community: '', city: 'abuja', whyCommunity: '',
          categoryId: '', venue: '', venueType: '', schedule: '', ageRange: '', capacity: 30, termWeeks: 12,
          coachDonatesTime: true, equipment: 0, transport: 0, food: 500, stipend: 0, other: 0,
        });
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to submit');
      }
    } catch {
      toast.error('Error submitting programme');
    }
    setSubmittingGb(false);
  };

  const requestPayout = () => {
    const msg = encodeURIComponent(
      `Hi SkillPadi Admin, I'd like to request a payout.\n\nCoach: ${coach?.name}\nPending: ${fmt(pendingPayout)}\nBank: ${bankForm.bankName} - ${bankForm.accountNumber} (${bankForm.accountName})`
    );
    window.open(`https://wa.me/${WA_BIZ}?text=${msg}`, '_blank');
  };

  const shareProfile = () => {
    const url = `${window.location.origin}/coaches/${coach?.slug}`;
    const msg = encodeURIComponent(
      `Check out my coaching profile on SkillPadi!\n${url}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  // ── Loading / guard ──

  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <p className="text-slate-400 text-sm">Loading...</p>
    </div>
  );
  if (!isAuthenticated || !dbUser || dbUser.role !== 'coach') return null;

  const firstName = dbUser?.name?.split(' ')[0] || 'Coach';
  const gbBudgetTotal = (Number(gbForm.equipment) || 0) + (Number(gbForm.transport) || 0) + (Number(gbForm.food) || 0) + (Number(gbForm.stipend) || 0) + (Number(gbForm.other) || 0);
  const gbCostPerChild = gbForm.capacity ? Math.ceil(gbBudgetTotal / Number(gbForm.capacity)) : 0;

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-20 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-serif text-2xl">Welcome, {firstName}</h1>
          {coach && (
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${TIER_COLORS[tier]}`}>
              {TIER_LABELS[tier]}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-5">Coach Dashboard</p>

        {loadingData && !coach ? (
          <div className="card p-8 text-center text-slate-400 text-sm">Loading your data...</div>
        ) : !coach ? (
          <div className="card p-8 text-center">
            <p className="text-slate-500 text-sm mb-2">Coach profile not found.</p>
            <p className="text-xs text-slate-400">Contact admin to link your account.</p>
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <div className="flex gap-1 overflow-x-auto mb-5 pb-1 -mx-1 px-1">
              {visibleTabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    tab === t.id
                      ? 'bg-teal-primary text-white shadow-sm'
                      : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
                  }`}
                >
                  <span>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ═══════════ EARNINGS TAB ═══════════ */}
            {tab === 'earnings' && (
              <div className="space-y-4">
                {/* Big number */}
                <div className="card p-6 text-center bg-gradient-to-br from-teal-50 to-white">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Total Earned This Term</div>
                  <div className="font-serif text-3xl text-teal-primary">{fmt(totalEarned)}</div>
                </div>

                {/* Pending payout */}
                <div className="card p-4 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pending Payout</div>
                    <div className="font-bold text-lg">{fmt(pendingPayout)}</div>
                  </div>
                  <button
                    onClick={requestPayout}
                    disabled={pendingPayout <= 0}
                    className="btn-primary btn-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Request Payout
                  </button>
                </div>

                {/* Earnings list */}
                <div className="card p-4">
                  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-3">Recent Earnings</div>
                  {coachEnrollments.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No earnings yet</p>
                  ) : (
                    <div className="space-y-2">
                      {coachEnrollments.slice(0, 20).map(e => {
                        const prog = e.programId || {};
                        const perSession = prog.coachEarningsPerSession || prog.pricePerSession || 0;
                        const earned = perSession * (e.sessionsCompleted || 0);
                        return (
                          <div key={e._id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                            <div>
                              <div className="text-xs font-semibold">{e.childName}</div>
                              <div className="text-[10px] text-slate-400">{prog.name}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-bold text-teal-primary">{fmt(earned)}</div>
                              <div className="text-[9px] text-slate-400">{e.sessionsCompleted || 0} sessions</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Platform fee info */}
                <div className="card p-3 bg-slate-50">
                  <div className="text-[10px] text-slate-500 text-center">
                    Platform fee: <strong>{coach.platformFeePercent || 15}%</strong> per session
                    {coach.referralEarnings > 0 && (
                      <span className="ml-2">| Referral earnings: <strong>{fmt(coach.referralEarnings)}</strong></span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════ SCHEDULE TAB ═══════════ */}
            {tab === 'schedule' && (
              <div className="space-y-3">
                {programs.length === 0 ? (
                  <div className="card p-8 text-center text-slate-400 text-sm">No programmes assigned yet.</div>
                ) : (
                  programs.map(prog => {
                    const progEnrollments = coachEnrollments.filter(e =>
                      String(e.programId?._id || e.programId) === String(prog._id)
                    );
                    const isExpanded = expandedProgram === String(prog._id);
                    return (
                      <div key={prog._id} className="card overflow-hidden">
                        <button
                          onClick={() => setExpandedProgram(isExpanded ? null : String(prog._id))}
                          className="w-full p-4 text-left hover:bg-slate-50/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-serif text-sm">{prog.name}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {prog.schedule} | {prog.location}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="badge badge-blue text-[9px]">
                                {prog.spotsTaken || 0}/{prog.spotsTotal} enrolled
                              </span>
                              <span className="text-slate-300 text-xs">{isExpanded ? '\u25B2' : '\u25BC'}</span>
                            </div>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/30">
                            <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                              Enrolled Children ({progEnrollments.length})
                            </div>
                            {progEnrollments.length === 0 ? (
                              <p className="text-[11px] text-slate-400">No children enrolled yet.</p>
                            ) : (
                              <div className="space-y-1.5">
                                {progEnrollments.map(e => (
                                  <div key={e._id} className="flex items-center justify-between text-xs">
                                    <span className="font-medium">{e.childName}</span>
                                    <span className="text-slate-400">
                                      {e.sessionsCompleted || 0}/{prog.sessions || 0} sessions
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ═══════════ MY KIDS TAB ═══════════ */}
            {tab === 'kids' && (
              <div className="space-y-3">
                {allKids.length === 0 ? (
                  <div className="card p-8 text-center text-slate-400 text-sm">No children in your programmes yet.</div>
                ) : (
                  allKids.map(kid => {
                    const pct = kid.totalSessions > 0 ? Math.round((kid.sessionsCompleted / kid.totalSessions) * 100) : 0;
                    const isLogging = logEnrollmentId === String(kid._id);
                    return (
                      <div key={kid._id} className="card p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-semibold text-sm">{kid.childName}</div>
                            <div className="text-[10px] text-slate-400">{kid.programName}</div>
                          </div>
                          <span className={`badge text-[9px] ${kid.status === 'active' ? 'badge-green' : kid.status === 'completed' ? 'badge-blue' : 'badge-amber'}`}>
                            {kid.status}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-teal-primary rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium w-14 text-right">
                            {kid.sessionsCompleted}/{kid.totalSessions}
                          </span>
                        </div>

                        {/* Log Session */}
                        {kid.status === 'active' && (
                          <>
                            {!isLogging ? (
                              <button
                                onClick={() => setLogEnrollmentId(String(kid._id))}
                                className="text-[11px] text-teal-primary font-semibold hover:underline"
                              >
                                + Log Session
                              </button>
                            ) : (
                              <div className="mt-2 p-3 bg-slate-50 rounded-lg space-y-2">
                                <textarea
                                  className="input-field text-xs w-full"
                                  rows={2}
                                  placeholder="Session note (optional)"
                                  value={sessionNote}
                                  onChange={e => setSessionNote(e.target.value)}
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleLogSession(kid._id)}
                                    disabled={loggingSession}
                                    className="btn-primary btn-sm disabled:opacity-60"
                                  >
                                    {loggingSession ? 'Logging...' : 'Confirm'}
                                  </button>
                                  <button
                                    onClick={() => { setLogEnrollmentId(null); setSessionNote(''); }}
                                    className="btn-outline btn-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Coach notes */}
                        {kid.notes && (
                          <div className="mt-2 text-[10px] text-slate-400 italic">Note: {kid.notes}</div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ═══════════ PROFILE TAB ═══════════ */}
            {tab === 'profile' && (
              <div className="space-y-4">
                {/* Coach info */}
                <div className="card p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-teal-primary text-white flex items-center justify-center font-bold text-lg shrink-0">
                      {coach.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-serif text-lg">{coach.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {coach.categoryId?.icon} {coach.categoryId?.name} Coach
                      </div>
                      {coach.bio && (
                        <p className="text-xs text-slate-600 mt-2 leading-relaxed">{coach.bio}</p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="text-center p-2 bg-slate-50 rounded-lg">
                      <div className="font-bold text-sm">{coach.rating ? coach.rating.toFixed(1) : '-'}</div>
                      <div className="text-[9px] text-slate-400">Rating</div>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded-lg">
                      <div className="font-bold text-sm">{coach.reviewCount || 0}</div>
                      <div className="text-[9px] text-slate-400">Reviews</div>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded-lg">
                      <div className="font-bold text-sm">{coach.yearsExperience || '-'}</div>
                      <div className="text-[9px] text-slate-400">Yrs Exp.</div>
                    </div>
                  </div>

                  {/* Shield level */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`badge text-[9px] ${
                      coach.shieldLevel === 'certified' ? 'badge-green' :
                      coach.shieldLevel === 'verified' ? 'badge-blue' : 'badge-amber'
                    }`}>
                      {coach.shieldLevel === 'certified' ? '\uD83D\uDEE1\uFE0F Certified' :
                       coach.shieldLevel === 'verified' ? '\u2705 Verified' : '\u23F3 In Progress'}
                    </span>
                    <span className="text-[9px] text-slate-400">Trust Score: {coach.trustScore}/100</span>
                  </div>

                  {/* Certifications / Trainings */}
                  {coach.trainingsCompleted?.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">Certifications</div>
                      <div className="flex flex-wrap gap-1">
                        {coach.trainingsCompleted.map((t, i) => (
                          <span key={i} className="badge badge-green text-[8px]">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Testimonials */}
                  {coach.testimonials?.filter(t => t.approved).length > 0 && (
                    <div className="mt-4">
                      <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-2">Reviews</div>
                      <div className="space-y-2">
                        {coach.testimonials.filter(t => t.approved).slice(0, 3).map((t, i) => (
                          <div key={i} className="p-3 bg-slate-50 rounded-lg">
                            <div className="text-xs text-slate-600 italic">&quot;{t.text}&quot;</div>
                            <div className="text-[10px] text-slate-400 mt-1">
                              {t.parent} {t.rating ? `${'*'.repeat(t.rating)}` : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bank details form */}
                <div className="card p-5">
                  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-3">Bank Details</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Bank Name</label>
                      <input
                        className="input-field text-sm w-full"
                        placeholder="e.g. GTBank"
                        value={bankForm.bankName}
                        onChange={e => setBankForm(f => ({ ...f, bankName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Account Number</label>
                      <input
                        className="input-field text-sm w-full"
                        placeholder="0123456789"
                        value={bankForm.accountNumber}
                        onChange={e => setBankForm(f => ({ ...f, accountNumber: e.target.value }))}
                        maxLength={10}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Account Name</label>
                      <input
                        className="input-field text-sm w-full"
                        placeholder="e.g. John Doe"
                        value={bankForm.accountName}
                        onChange={e => setBankForm(f => ({ ...f, accountName: e.target.value }))}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSaveBank}
                    disabled={savingBank}
                    className="btn-primary btn-sm disabled:opacity-60"
                  >
                    {savingBank ? 'Saving...' : 'Save Bank Details'}
                  </button>
                </div>

                {/* Share profile */}
                <button
                  onClick={shareProfile}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-green-500 text-white text-xs font-semibold rounded-xl hover:bg-green-600 transition-colors"
                >
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Share My Profile on WhatsApp
                </button>
              </div>
            )}

            {/* ═══════════ PROGRAMS TAB ═══════════ */}
            {tab === 'programs' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">My Programmes</div>
                  <button
                    onClick={() => setShowCreateProgram(true)}
                    className="btn-primary btn-sm"
                  >
                    + Create Programme
                  </button>
                </div>

                {programs.length === 0 && !showCreateProgram ? (
                  <div className="card p-8 text-center text-slate-400 text-sm">No programmes yet. Create your first!</div>
                ) : (
                  <div className="space-y-2">
                    {programs.map(prog => (
                      <div key={prog._id} className="card p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-serif text-sm">{prog.name}</div>
                            <div className="text-[10px] text-slate-400">
                              {prog.schedule} | {prog.location} | {prog.ageRange || 'All ages'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`badge text-[9px] ${prog.isActive ? 'badge-green' : 'badge-amber'}`}>
                              {prog.isActive ? 'Active' : 'Pending'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {fmt(prog.pricePerSession)}/session
                            </span>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {prog.spotsTaken || 0}/{prog.spotsTotal} spots filled
                          {prog.createdBy === 'coach' && !prog.isActive && (
                            <span className="ml-2 text-amber-500">Awaiting admin approval</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Create program form */}
                {showCreateProgram && (
                  <div className="card p-5 border-teal-primary/20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-bold text-sm">New Programme</div>
                      <button onClick={() => setShowCreateProgram(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Programme Name *</label>
                        <input
                          className="input-field text-sm w-full"
                          placeholder="e.g. Kids Football Academy"
                          value={programForm.name}
                          onChange={e => setProgramForm(f => ({ ...f, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Category *</label>
                        <select
                          className="input-field text-sm w-full"
                          value={programForm.categoryId}
                          onChange={e => setProgramForm(f => ({ ...f, categoryId: e.target.value }))}
                        >
                          <option value="">Select category</option>
                          {categories.map(c => (
                            <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Age Range</label>
                        <input
                          className="input-field text-sm w-full"
                          placeholder="e.g. 5-10"
                          value={programForm.ageRange}
                          onChange={e => setProgramForm(f => ({ ...f, ageRange: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Schedule</label>
                        <input
                          className="input-field text-sm w-full"
                          placeholder="e.g. Mon & Wed, 9:00 AM"
                          value={programForm.schedule}
                          onChange={e => setProgramForm(f => ({ ...f, schedule: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Venue / Location</label>
                        <input
                          className="input-field text-sm w-full"
                          placeholder="e.g. Jabi Recreation Centre"
                          value={programForm.location}
                          onChange={e => setProgramForm(f => ({ ...f, location: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Capacity</label>
                        <input
                          className="input-field text-sm w-full"
                          type="number"
                          min={1}
                          placeholder="e.g. 10"
                          value={programForm.capacity}
                          onChange={e => setProgramForm(f => ({ ...f, capacity: e.target.value }))}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Description</label>
                        <textarea
                          className="input-field text-sm w-full"
                          rows={3}
                          placeholder="Describe your programme..."
                          value={programForm.description}
                          onChange={e => setProgramForm(f => ({ ...f, description: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Pricing info */}
                    <div className="p-3 bg-slate-50 rounded-lg mb-4 text-xs text-slate-500">
                      <div>Price per session: <strong>{fmt(coach.personalRate || 5000)}</strong> (from your rate)</div>
                      <div>Platform fee: <strong>{coach.platformFeePercent || 15}%</strong></div>
                      <div>Your earnings per session: <strong>{fmt(Math.round((coach.personalRate || 5000) * (1 - (coach.platformFeePercent || 15) / 100)))}</strong></div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateProgram}
                        disabled={creatingProgram}
                        className="btn-primary btn-sm disabled:opacity-60"
                      >
                        {creatingProgram ? 'Submitting...' : 'Submit for Approval'}
                      </button>
                      <button onClick={() => setShowCreateProgram(false)} className="btn-outline btn-sm">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════ GIVE BACK TAB ═══════════ */}
            {tab === 'giveback' && (
              <div className="space-y-4">
                <div className="card p-5 bg-gradient-to-br from-green-50 to-white text-center">
                  <div className="text-2xl mb-2">{'\uD83D\uDC9A'}</div>
                  <h2 className="font-serif text-xl mb-1">Give Back to Your Community</h2>
                  <p className="text-xs text-slate-500">
                    Donate your coaching skills. We will fund the rest.
                  </p>
                </div>

                {/* Existing impact programs */}
                {impactPrograms.length > 0 && (
                  <div className="space-y-3">
                    {impactPrograms.map(ip => {
                      const fundPct = ip.totalBudget > 0 ? Math.min(100, Math.round((ip.fundedAmount / ip.totalBudget) * 100)) : 0;
                      return (
                        <div key={ip._id} className="card p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-serif text-sm">{ip.name}</div>
                              <div className="text-[10px] text-slate-400">{ip.community} | {ip.city}</div>
                            </div>
                            <span className={`badge text-[9px] ${
                              ip.status === 'active' ? 'badge-green' :
                              ip.status === 'funding' ? 'badge-blue' :
                              ip.status === 'completed' ? 'badge-green' : 'badge-amber'
                            }`}>
                              {ip.status}
                            </span>
                          </div>

                          {/* Funding bar */}
                          <div className="mb-2">
                            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                              <span>{fmt(ip.fundedAmount || 0)} raised</span>
                              <span>{fmt(ip.totalBudget)} goal</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full transition-all"
                                style={{ width: `${fundPct}%` }}
                              />
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5 text-right">{fundPct}% funded</div>
                          </div>

                          <div className="flex gap-2">
                            <Link
                              href={`/impact/${ip.slug}`}
                              className="btn-outline btn-sm text-[10px]"
                            >
                              View Page
                            </Link>
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/impact/${ip.slug}`;
                                const msg = encodeURIComponent(`Help fund ${ip.name} for kids in ${ip.community}!\n\n${url}`);
                                window.open(`https://wa.me/?text=${msg}`, '_blank');
                              }}
                              className="btn-sm text-[10px] bg-green-500 text-white rounded-lg px-3 py-1.5 font-semibold hover:bg-green-600"
                            >
                              Share
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Start a Programme form */}
                {impactPrograms.length === 0 && (
                  <div className="card p-5">
                    <div className="font-bold text-sm mb-4">Start a Programme</div>

                    {/* Step indicators */}
                    <div className="flex items-center gap-1 mb-5">
                      {GIVE_BACK_STEPS.map((s, i) => (
                        <div key={s} className="flex items-center gap-1 flex-1">
                          <button
                            onClick={() => setGbStep(i)}
                            className={`w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
                              i <= gbStep ? 'bg-teal-primary text-white' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {i + 1}
                          </button>
                          <span className="text-[9px] text-slate-400 hidden sm:inline">{s}</span>
                          {i < GIVE_BACK_STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < gbStep ? 'bg-teal-primary' : 'bg-slate-100'}`} />}
                        </div>
                      ))}
                    </div>

                    {/* Step 1: Community */}
                    {gbStep === 0 && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">Programme Name *</label>
                          <input
                            className="input-field text-sm w-full"
                            placeholder="e.g. Free Football for Lugbe Kids"
                            value={gbForm.name}
                            onChange={e => setGbForm(f => ({ ...f, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">Community Name *</label>
                          <input
                            className="input-field text-sm w-full"
                            placeholder="e.g. Lugbe, Karu, Dutse"
                            value={gbForm.community}
                            onChange={e => setGbForm(f => ({ ...f, community: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">City</label>
                          <select
                            className="input-field text-sm w-full"
                            value={gbForm.city}
                            onChange={e => setGbForm(f => ({ ...f, city: e.target.value }))}
                          >
                            <option value="abuja">Abuja</option>
                            <option value="lagos">Lagos</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">Why this community? *</label>
                          <textarea
                            className="input-field text-sm w-full"
                            rows={3}
                            placeholder="Tell us why you want to coach here..."
                            value={gbForm.whyCommunity}
                            onChange={e => setGbForm(f => ({ ...f, whyCommunity: e.target.value }))}
                          />
                        </div>
                        <button onClick={() => setGbStep(1)} className="btn-primary btn-sm">Next</button>
                      </div>
                    )}

                    {/* Step 2: Programme details */}
                    {gbStep === 1 && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">Category *</label>
                          <select
                            className="input-field text-sm w-full"
                            value={gbForm.categoryId}
                            onChange={e => setGbForm(f => ({ ...f, categoryId: e.target.value }))}
                          >
                            <option value="">Select activity</option>
                            {categories.map(c => (
                              <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">Venue</label>
                          <input
                            className="input-field text-sm w-full"
                            placeholder="e.g. Community field, school compound"
                            value={gbForm.venue}
                            onChange={e => setGbForm(f => ({ ...f, venue: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">Venue Type</label>
                          <select
                            className="input-field text-sm w-full"
                            value={gbForm.venueType}
                            onChange={e => setGbForm(f => ({ ...f, venueType: e.target.value }))}
                          >
                            <option value="">Select type</option>
                            <option value="free">Free / Community space</option>
                            <option value="rented">Rented</option>
                            <option value="school">School compound</option>
                            <option value="church">Church / Mosque</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">Schedule</label>
                          <input
                            className="input-field text-sm w-full"
                            placeholder="e.g. Saturday, 8:00 AM - 10:00 AM"
                            value={gbForm.schedule}
                            onChange={e => setGbForm(f => ({ ...f, schedule: e.target.value }))}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">Age Range</label>
                            <input
                              className="input-field text-sm w-full"
                              placeholder="e.g. 6-14"
                              value={gbForm.ageRange}
                              onChange={e => setGbForm(f => ({ ...f, ageRange: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">Capacity</label>
                            <input
                              className="input-field text-sm w-full"
                              type="number"
                              value={gbForm.capacity}
                              onChange={e => setGbForm(f => ({ ...f, capacity: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">Term Length (weeks)</label>
                          <input
                            className="input-field text-sm w-full"
                            type="number"
                            value={gbForm.termWeeks}
                            onChange={e => setGbForm(f => ({ ...f, termWeeks: e.target.value }))}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setGbStep(0)} className="btn-outline btn-sm">Back</button>
                          <button onClick={() => setGbStep(2)} className="btn-primary btn-sm">Next</button>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Budget */}
                    {gbStep === 2 && (
                      <div className="space-y-3">
                        {/* Coach donates time toggle */}
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div>
                            <div className="text-xs font-semibold">I will coach for free</div>
                            <div className="text-[10px] text-slate-500">Donate your time and expertise</div>
                          </div>
                          <button
                            onClick={() => setGbForm(f => ({ ...f, coachDonatesTime: !f.coachDonatesTime }))}
                            className={`w-11 h-6 rounded-full transition-colors relative ${gbForm.coachDonatesTime ? 'bg-green-500' : 'bg-slate-200'}`}
                          >
                            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${gbForm.coachDonatesTime ? 'left-[22px]' : 'left-0.5'}`} />
                          </button>
                        </div>

                        <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mt-3">Budget Breakdown</div>

                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { key: 'equipment', label: 'Equipment (balls, cones, etc.)' },
                            { key: 'transport', label: 'Transport' },
                            { key: 'food', label: 'Food (min \u20A6500/child/session)' },
                            { key: 'stipend', label: 'Assistant stipend' },
                            { key: 'other', label: 'Other costs' },
                          ].map(item => (
                            <div key={item.key}>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-1">{item.label}</label>
                              <input
                                className="input-field text-sm w-full"
                                type="number"
                                min={0}
                                value={gbForm[item.key]}
                                onChange={e => setGbForm(f => ({ ...f, [item.key]: e.target.value }))}
                              />
                            </div>
                          ))}
                        </div>

                        <div className="p-3 bg-teal-50 rounded-lg">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-600">Total budget</span>
                            <span className="font-bold text-teal-primary">{fmt(gbBudgetTotal)}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                            <span>Cost per child</span>
                            <span>{fmt(gbCostPerChild)}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button onClick={() => setGbStep(1)} className="btn-outline btn-sm">Back</button>
                          <button onClick={() => setGbStep(3)} className="btn-primary btn-sm">Review</button>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Review */}
                    {gbStep === 3 && (
                      <div className="space-y-3">
                        <div className="p-4 bg-slate-50 rounded-lg space-y-2 text-xs">
                          <div className="font-bold text-sm mb-2">Review Your Programme</div>
                          <div><span className="text-slate-400 w-24 inline-block">Name:</span> <strong>{gbForm.name}</strong></div>
                          <div><span className="text-slate-400 w-24 inline-block">Community:</span> {gbForm.community}, {gbForm.city}</div>
                          <div><span className="text-slate-400 w-24 inline-block">Category:</span> {categories.find(c => String(c._id) === gbForm.categoryId)?.name || '-'}</div>
                          <div><span className="text-slate-400 w-24 inline-block">Venue:</span> {gbForm.venue || '-'}</div>
                          <div><span className="text-slate-400 w-24 inline-block">Schedule:</span> {gbForm.schedule || '-'}</div>
                          <div><span className="text-slate-400 w-24 inline-block">Age range:</span> {gbForm.ageRange || '-'}</div>
                          <div><span className="text-slate-400 w-24 inline-block">Capacity:</span> {gbForm.capacity} kids</div>
                          <div><span className="text-slate-400 w-24 inline-block">Term:</span> {gbForm.termWeeks} weeks</div>
                          <div><span className="text-slate-400 w-24 inline-block">Coach fee:</span> {gbForm.coachDonatesTime ? 'FREE (donated)' : 'Stipend requested'}</div>
                          <div className="border-t border-slate-200 pt-2 mt-2">
                            <div><span className="text-slate-400 w-24 inline-block">Total budget:</span> <strong>{fmt(gbBudgetTotal)}</strong></div>
                            <div><span className="text-slate-400 w-24 inline-block">Per child:</span> {fmt(gbCostPerChild)}</div>
                          </div>
                        </div>

                        {gbForm.whyCommunity && (
                          <div className="p-3 bg-green-50 rounded-lg">
                            <div className="text-[10px] font-semibold text-green-800 mb-1">Your Story</div>
                            <p className="text-xs text-green-700 leading-relaxed">{gbForm.whyCommunity}</p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button onClick={() => setGbStep(2)} className="btn-outline btn-sm">Back</button>
                          <button
                            onClick={handleSubmitGiveBack}
                            disabled={submittingGb}
                            className="btn-primary btn-sm disabled:opacity-60"
                          >
                            {submittingGb ? 'Submitting...' : 'Submit Programme'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Impact stats */}
                {coach.givesBack && (
                  <div className="card p-4 bg-green-50/50">
                    <div className="text-[9px] uppercase font-bold text-green-700 tracking-wider mb-2">Your Impact</div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <div className="font-bold text-lg text-green-700">{coach.volunteerHours || 0}</div>
                        <div className="text-[9px] text-slate-500">Volunteer Hours</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg text-green-700">{coach.impactChildrenTaught || 0}</div>
                        <div className="text-[9px] text-slate-500">Kids Taught</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg text-green-700">{impactPrograms.length}</div>
                        <div className="text-[9px] text-slate-500">Programmes</div>
                      </div>
                    </div>
                    {coach.isCommunityChampion && (
                      <div className="text-center mt-3">
                        <span className="badge badge-green text-[10px]">Community Champion</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
