'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { toast } from 'sonner';

const fmt = (n) => `₦${Number(n).toLocaleString()}`;

const TABS = [
  { id: 'residents', label: 'Residents', icon: '🏘️' },
  { id: 'programmes', label: 'Programmes', icon: '📋' },
  { id: 'pricing', label: 'Pricing', icon: '💰' },
  { id: 'invite', label: 'Invite', icon: '🔗' },
];

export default function CommunityDashboard() {
  const { isAuthenticated, dbUser, loading, authFetch } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState('residents');
  const [enrollments, setEnrollments] = useState([]);
  const [invites, setInvites] = useState([]);
  const [pricingData, setPricingData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  // Pricing state
  const [defaultMarkup, setDefaultMarkup] = useState(10);
  const [residentDiscount, setResidentDiscount] = useState(5);
  const [programMarkups, setProgramMarkups] = useState({});
  const [savingMarkup, setSavingMarkup] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/auth/login');
    if (!loading && isAuthenticated && !['community', 'admin'].includes(dbUser?.role)) {
      router.push('/dashboard/parent');
    }
  }, [loading, isAuthenticated, dbUser, router]);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingData(true);
    const communityId = dbUser?.communityId;
    try {
      const [enrRes, invRes, priceRes] = await Promise.all([
        authFetch('/api/enrollments'),
        authFetch('/api/invites?type=community'),
        communityId ? authFetch(`/api/communities/${communityId}/pricing`) : Promise.resolve(null),
      ]);
      if (enrRes.ok) setEnrollments((await enrRes.json()).enrollments || []);
      if (invRes.ok) setInvites((await invRes.json()).invites || []);
      if (priceRes?.ok) {
        const d = await priceRes.json();
        setPricingData(d);
        setDefaultMarkup(d.defaultMarkupPercent ?? 10);
        setResidentDiscount(d.residentDiscount ?? 5);
        const overrides = {};
        (d.pricing || []).forEach(p => { overrides[p.programId] = p.markupPercent ?? d.defaultMarkupPercent ?? 10; });
        setProgramMarkups(overrides);
      }
    } catch (e) { console.error(e); }
    setLoadingData(false);
  }, [isAuthenticated, dbUser, authFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  const activeInvite = invites.find(inv => inv.isActive) || null;
  const communityName = dbUser?.name || 'Estate';
  const activeCount = enrollments.filter(e => e.status === 'active').length;

  const copyLink = (code) => {
    const link = `${window.location.origin}/auth/signup?invite=${code}`;
    navigator.clipboard.writeText(link).then(() => toast.success('Link copied!'));
  };

  const shareWhatsApp = (code) => {
    const link = `${window.location.origin}/auth/signup?invite=${code}`;
    const discount = pricingData?.residentDiscount;
    const msg = encodeURIComponent(
      `SkillPadi is now at ${communityName}! 🎉\n\n` +
      `Swimming, football, martial arts and more — right here in our estate. Vetted coaches, structured programmes.` +
      (discount ? ` Residents get ${discount}% off!` : '') +
      `\n\nSign up here: ${link}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const handleGenerateInvite = async () => {
    if (!dbUser?.communityId) { toast.error('No community linked to your account'); return; }
    setGeneratingInvite(true);
    const res = await authFetch('/api/invites', {
      method: 'POST',
      body: JSON.stringify({ type: 'community', entityId: dbUser.communityId, entityName: communityName }),
    });
    const data = await res.json();
    if (res.ok) { toast.success('New invite code generated!'); await loadData(); }
    else toast.error(data.error || 'Failed to generate invite');
    setGeneratingInvite(false);
  };

  const saveMarkupSettings = async () => {
    const communityId = dbUser?.communityId;
    if (!communityId) return;
    setSavingMarkup(true);
    const res = await authFetch(`/api/communities/${communityId}/pricing`, {
      method: 'PATCH',
      body: JSON.stringify({
        defaultMarkupPercent: defaultMarkup,
        residentDiscount,
        programMarkups: Object.entries(programMarkups).map(([programId, markupPercent]) => ({ programId, markupPercent: Number(markupPercent) })),
      }),
    });
    if (res.ok) { toast.success('Pricing saved!'); await loadData(); }
    else toast.error('Failed to save pricing');
    setSavingMarkup(false);
  };

  const requestPayout = () => {
    const pending = pricingData?.pendingPayout || 0;
    const msg = encodeURIComponent(
      `Hi SkillPadi! ${communityName} is requesting a payout of ₦${pending.toLocaleString()} in estate earnings. Please process when convenient.`
    );
    window.open(`https://wa.me/${process.env.NEXT_PUBLIC_WA_BUSINESS || ''}?text=${msg}`, '_blank');
  };

  if (loading) return <div className="min-h-screen bg-cream flex items-center justify-center"><p className="text-slate-400 text-sm">Loading…</p></div>;
  if (!isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-20 pb-12">
        <div className="mb-6">
          <h1 className="font-serif text-2xl mb-0.5">{communityName}</h1>
          <p className="text-xs text-slate-500">Estate dashboard</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Enrolled Residents', value: enrollments.length },
            { label: 'Active Now', value: activeCount },
            { label: 'Total Earned', value: fmt(pricingData?.totalEarnings || 0) },
          ].map(s => (
            <div key={s.label} className="card p-3 text-center">
              <div className="font-serif text-xl text-teal-primary">{s.value}</div>
              <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-slate-200">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors ${tab === t.id ? 'bg-white border border-b-white border-slate-200 text-teal-primary -mb-px' : 'text-slate-400 hover:text-slate-600'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── RESIDENTS ── */}
        {tab === 'residents' && (
          <div>
            <h2 className="font-bold text-sm mb-3">Resident Enrollments</h2>
            {loadingData ? (
              <div className="card p-8 text-center text-slate-400 text-sm">Loading…</div>
            ) : enrollments.length === 0 ? (
              <div className="card p-10 text-center">
                <div className="text-3xl mb-2">🏘️</div>
                <p className="text-slate-400 text-sm mb-3">No residents enrolled yet.</p>
                <button onClick={() => setTab('invite')} className="btn-primary btn-sm">Share Invite Link</button>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left p-3 font-bold text-[9px] uppercase text-slate-400">Child</th>
                      <th className="text-left p-3 font-bold text-[9px] uppercase text-slate-400">Parent</th>
                      <th className="text-left p-3 font-bold text-[9px] uppercase text-slate-400">Programme</th>
                      <th className="text-left p-3 font-bold text-[9px] uppercase text-slate-400">Progress</th>
                      <th className="text-left p-3 font-bold text-[9px] uppercase text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map(enr => {
                      const prog = enr.programId || {};
                      const pct = prog.sessions ? Math.round((enr.sessionsCompleted / prog.sessions) * 100) : 0;
                      return (
                        <tr key={enr._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                          <td className="p-3 font-semibold">{enr.childName}</td>
                          <td className="p-3 text-slate-500 text-[10px]">{enr.userId?.name || '—'}</td>
                          <td className="p-3 text-slate-600">{prog.name || '—'}</td>
                          <td className="p-3">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden mb-0.5"><div className="h-full rounded-full bg-teal-primary" style={{ width: `${pct}%` }} /></div>
                            <span className="text-[9px] text-slate-400">{enr.sessionsCompleted}/{prog.sessions || '?'}</span>
                          </td>
                          <td className="p-3"><span className={`badge ${enr.status === 'active' ? 'badge-green' : enr.status === 'completed' ? 'badge-blue' : 'badge-amber'}`}>{enr.status}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── PROGRAMMES ── */}
        {tab === 'programmes' && (
          <div>
            <h2 className="font-bold text-sm mb-3">Programmes at {communityName}</h2>
            {pricingData?.pricing?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pricingData.pricing.slice(0, 6).map(p => {
                  const hasFacility = true; // Could check community facilities vs program category
                  return (
                    <div key={p.programId} className={`card p-4 ${hasFacility ? 'border-teal-primary/20' : ''}`}>
                      <div className="flex items-start gap-2">
                        <div className="text-xl">{p.categoryIcon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate">{p.programName}</div>
                          <div className="text-[10px] text-slate-400">{p.sessions} sessions</div>
                          <div className="mt-2 text-xs">
                            <span className="text-slate-400">Resident price: </span>
                            <span className="font-semibold text-teal-primary">{fmt(p.residentTotalPrice)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="card p-8 text-center text-slate-400 text-sm">Loading programmes…</div>
            )}
          </div>
        )}

        {/* ── PRICING ── */}
        {tab === 'pricing' && (
          <div className="space-y-4">
            {/* Earnings */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card p-4">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">Total Earned</div>
                <div className="font-serif text-xl text-teal-primary">{fmt(pricingData?.totalEarnings || 0)}</div>
              </div>
              <div className="card p-4">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">Pending Payout</div>
                <div className="font-serif text-xl text-amber-600">{fmt(pricingData?.pendingPayout || 0)}</div>
                {(pricingData?.pendingPayout || 0) > 0 && (
                  <button onClick={requestPayout} className="mt-2 text-[9px] font-semibold text-teal-primary border border-teal-primary/30 rounded-lg px-2 py-1 hover:bg-teal-primary/10 transition-colors">
                    Request Payout
                  </button>
                )}
              </div>
            </div>

            {/* Venue Economics */}
            {pricingData?.venueProvided && (
              <div className="card p-4 bg-blue-50/50 border-blue-100">
                <div className="font-bold text-xs mb-2">Venue Economics</div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>Venue fee/session: <strong>{fmt(pricingData.venueFee || 0)}</strong></div>
                  <div>Markup earnings: <strong>tracked above</strong></div>
                </div>
              </div>
            )}

            {/* Default markup */}
            <div className="card p-5">
              <div className="font-bold text-sm mb-0.5">Default Markup</div>
              <div className="text-[10px] text-slate-400 mb-4">Percentage added to SkillPadi&apos;s base price. Max 30% for estates.</div>
              <div className="flex items-center gap-4">
                <button onClick={() => setDefaultMarkup(m => Math.max(0, m - 5))} className="w-9 h-9 rounded-full border border-slate-200 text-slate-600 font-bold text-lg hover:bg-slate-50 flex items-center justify-center">−</button>
                <div className="text-center">
                  <div className="font-serif text-3xl text-teal-primary">{defaultMarkup}%</div>
                  <div className="text-[9px] text-slate-400">markup</div>
                </div>
                <button onClick={() => setDefaultMarkup(m => Math.min(30, m + 5))} className="w-9 h-9 rounded-full border border-slate-200 text-slate-600 font-bold text-lg hover:bg-slate-50 flex items-center justify-center">+</button>
              </div>
            </div>

            {/* Resident discount */}
            <div className="card p-5">
              <div className="font-bold text-sm mb-0.5">Resident Discount</div>
              <div className="text-[10px] text-slate-400 mb-4">Discount off your marked-up price for registered residents vs non-residents.</div>
              <div className="flex items-center gap-4">
                <button onClick={() => setResidentDiscount(d => Math.max(0, d - 5))} className="w-9 h-9 rounded-full border border-slate-200 text-slate-600 font-bold text-lg hover:bg-slate-50 flex items-center justify-center">−</button>
                <div className="text-center">
                  <div className="font-serif text-3xl text-teal-primary">{residentDiscount}%</div>
                  <div className="text-[9px] text-slate-400">resident discount</div>
                </div>
                <button onClick={() => setResidentDiscount(d => Math.min(50, d + 5))} className="w-9 h-9 rounded-full border border-slate-200 text-slate-600 font-bold text-lg hover:bg-slate-50 flex items-center justify-center">+</button>
              </div>
            </div>

            {/* Per-programme pricing table */}
            {pricingData?.pricing?.length > 0 && (
              <div className="card overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <div className="font-bold text-sm">Per-Programme Pricing</div>
                </div>
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Programme</th>
                        <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Base</th>
                        <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Markup</th>
                        <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Resident Pays</th>
                        <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">You Earn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pricingData.pricing.map(p => {
                        const markup = programMarkups[p.programId] ?? defaultMarkup;
                        const publicPerSess = Math.round(p.basePricePerSession * (1 + markup / 100));
                        const residentPerSess = Math.round(publicPerSess * (1 - residentDiscount / 100));
                        const residentTotal = residentPerSess * p.sessions;
                        const earnPerResident = (residentPerSess - p.basePricePerSession) * p.sessions;
                        return (
                          <tr key={p.programId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                            <td className="p-3">
                              <div className="font-semibold">{p.categoryIcon} {p.programName}</div>
                              <div className="text-[9px] text-slate-400">{p.sessions} sessions</div>
                            </td>
                            <td className="p-3 text-slate-600">{fmt(p.baseTotalPrice)}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                <input type="number" min={0} max={30} value={markup}
                                  onChange={e => setProgramMarkups(prev => ({ ...prev, [p.programId]: Math.min(30, Math.max(0, Number(e.target.value))) }))}
                                  className="w-12 border border-slate-200 rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-teal-primary/30" />
                                <span className="text-slate-400">%</span>
                              </div>
                            </td>
                            <td className="p-3 font-semibold">{fmt(residentTotal)}</td>
                            <td className="p-3 text-teal-primary font-semibold">{earnPerResident > 0 ? fmt(earnPerResident) : <span className="text-slate-300">—</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <button onClick={saveMarkupSettings} disabled={savingMarkup} className="btn-primary btn-sm disabled:opacity-60">
              {savingMarkup ? 'Saving…' : 'Save Pricing Settings'}
            </button>
          </div>
        )}

        {/* ── INVITE ── */}
        {tab === 'invite' && (
          <div>
            <h2 className="font-bold text-sm mb-3">Invite Residents to SkillPadi</h2>
            {loadingData ? (
              <div className="card p-8 text-center text-slate-400 text-sm">Loading…</div>
            ) : activeInvite ? (
              <>
                <div className="card p-6 mb-4 bg-teal-primary/5 border-teal-primary/20">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Your Estate Invite Code</div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="font-mono text-2xl font-bold text-teal-primary tracking-widest">{activeInvite.code}</span>
                    <button onClick={() => navigator.clipboard.writeText(activeInvite.code).then(() => toast.success('Copied!'))}
                      className="text-[10px] text-teal-primary font-semibold border border-teal-primary/30 rounded-lg px-2 py-1 hover:bg-teal-primary/10 transition-colors">Copy Code</button>
                  </div>
                  <div className="mb-4">
                    <div className="text-[10px] text-slate-500 mb-1">Resident sign-up link</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-[10px] text-slate-500 truncate font-mono">
                        {typeof window !== 'undefined' ? `${window.location.origin}/auth/signup?invite=${activeInvite.code}` : `…/auth/signup?invite=${activeInvite.code}`}
                      </div>
                      <button onClick={() => copyLink(activeInvite.code)} className="btn-primary btn-sm shrink-0">Copy Link</button>
                    </div>
                  </div>
                  <button onClick={() => shareWhatsApp(activeInvite.code)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-500 text-white text-[11px] font-semibold rounded-lg hover:bg-green-600 transition-colors">
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Share in Estate WhatsApp Group
                  </button>
                </div>
                <button onClick={handleGenerateInvite} disabled={generatingInvite} className="btn-outline btn-sm">
                  {generatingInvite ? 'Generating…' : '+ Generate New Code'}
                </button>
              </>
            ) : (
              <div className="card p-10 text-center">
                <div className="text-3xl mb-2">🔗</div>
                <p className="text-slate-400 text-sm mb-4">No active invite code yet.</p>
                <button onClick={handleGenerateInvite} disabled={generatingInvite} className="btn-primary btn-sm disabled:opacity-60">
                  {generatingInvite ? 'Generating…' : 'Generate Invite Code'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
