'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

const fmt = (n) => `₦${Number(n).toLocaleString()}`;
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;
const ago = (d) => {
  if (!d) return '';
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 3600000) return `${Math.round(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.round(ms / 3600000)}h ago`;
  return `${Math.round(ms / 86400000)}d ago`;
};

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'enquiries', label: 'Enquiries', icon: '📩' },
  { id: 'enrollments', label: 'Enrollments', icon: '🎓' },
  { id: 'members', label: 'Members', icon: '👨‍👩‍👧' },
  { id: 'coaches', label: 'Coaches', icon: '🏅' },
  { id: 'programs', label: 'Programs', icon: '📋' },
  { id: 'shop', label: 'Shop', icon: '🛍️' },
  { id: 'revenue', label: 'Revenue', icon: '💳' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminPage() {
  const { isAuthenticated, isAdmin, loading, authFetch, dbUser } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [enquiries, setEnquiries] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [products, setProducts] = useState([]);
  const [kits, setKits] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [enqFilter, setEnqFilter] = useState('all');
  const [sideOpen, setSideOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!isAuthenticated || !isAdmin)) {
      router.push(isAuthenticated ? '/dashboard/parent' : '/auth/login');
    }
  }, [loading, isAuthenticated, isAdmin, router]);

  const loadData = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingData(true);
    try {
      const [sRes, eRes, enrRes, cRes, pRes, uRes, payRes, prodRes, kitRes, ordRes] = await Promise.all([
        authFetch('/api/admin/stats'),
        authFetch('/api/enquiries'),
        authFetch('/api/enrollments'),
        authFetch('/api/coaches?active=false'),
        authFetch('/api/programs?active=false'),
        authFetch('/api/users?role=parent'),
        authFetch('/api/payments/history'),
        authFetch('/api/shop/products'),
        authFetch('/api/shop/kits'),
        authFetch('/api/shop/orders'),
      ]);
      if (sRes.ok) setStats(await sRes.json());
      if (eRes.ok) setEnquiries((await eRes.json()).enquiries || []);
      if (enrRes.ok) setEnrollments((await enrRes.json()).enrollments || []);
      if (cRes.ok) setCoaches((await cRes.json()).coaches || []);
      if (pRes.ok) setPrograms((await pRes.json()).programs || []);
      if (uRes.ok) setUsers((await uRes.json()).users || []);
      if (payRes.ok) setPayments((await payRes.json()).payments || []);
      if (prodRes.ok) setProducts((await prodRes.json()).products || []);
      if (kitRes.ok) setKits((await kitRes.json()).kits || []);
      if (ordRes.ok) setOrders((await ordRes.json()).orders || []);
    } catch (e) { console.error('Admin load error:', e); }
    setLoadingData(false);
  }, [isAdmin, authFetch]);

  useEffect(() => { if (isAdmin) loadData(); }, [isAdmin, loadData]);

  const updateEnquiry = async (id, status) => {
    const res = await authFetch(`/api/enquiries/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    if (res.ok) {
      setEnquiries((prev) => prev.map((e) => e._id === id ? { ...e, status } : e));
      toast.success(`Enquiry marked as ${status}`);
    }
  };

  const deleteEnquiry = async (id) => {
    if (!confirm('Delete this enquiry permanently?')) return;
    const res = await authFetch(`/api/enquiries/${id}`, { method: 'DELETE' });
    if (res.ok) { setEnquiries((prev) => prev.filter((e) => e._id !== id)); toast.success('Enquiry deleted'); }
  };

  const updateEnrollment = async (id, update) => {
    const res = await authFetch(`/api/enrollments/${id}`, { method: 'PATCH', body: JSON.stringify(update) });
    if (res.ok) {
      const data = await res.json();
      setEnrollments((prev) => prev.map((e) => e._id === id ? { ...e, ...data.enrollment } : e));
      toast.success('Enrollment updated');
    }
  };

  const toggleCoachActive = async (id, current) => {
    const res = await authFetch(`/api/coaches/${id}`, { method: 'PUT', body: JSON.stringify({ isActive: !current }) });
    if (res.ok) {
      setCoaches((prev) => prev.map((c) => c._id === id ? { ...c, isActive: !current } : c));
      toast.success(`Coach ${!current ? 'activated' : 'deactivated'}`);
    }
  };

  const toggleProgramActive = async (id, current) => {
    const res = await authFetch(`/api/programs/${id}`, { method: 'PUT', body: JSON.stringify({ isActive: !current }) });
    if (res.ok) {
      setPrograms((prev) => prev.map((p) => p._id === id ? { ...p, isActive: !current } : p));
      toast.success(`Program ${!current ? 'activated' : 'deactivated'}`);
    }
  };

  const updateProgramSpots = async (id, spotsTotal) => {
    const newTotal = prompt('New total spots:', spotsTotal);
    if (!newTotal || isNaN(newTotal)) return;
    const res = await authFetch(`/api/programs/${id}`, { method: 'PUT', body: JSON.stringify({ spotsTotal: Number(newTotal) }) });
    if (res.ok) {
      setPrograms((prev) => prev.map((p) => p._id === id ? { ...p, spotsTotal: Number(newTotal) } : p));
      toast.success('Spots updated');
    }
  };

  const updateProgramPrice = async (id, current) => {
    const newPrice = prompt('New price per session (₦):', current);
    if (!newPrice || isNaN(newPrice)) return;
    const res = await authFetch(`/api/programs/${id}`, { method: 'PUT', body: JSON.stringify({ pricePerSession: Number(newPrice) }) });
    if (res.ok) {
      setPrograms((prev) => prev.map((p) => p._id === id ? { ...p, pricePerSession: Number(newPrice) } : p));
      toast.success('Price updated');
    }
  };

  const changeUserRole = async (id, currentRole) => {
    const newRole = prompt('New role (parent, coach, school, community, admin):', currentRole);
    if (!newRole || !['parent', 'coach', 'school', 'community', 'admin'].includes(newRole)) { if (newRole) toast.error('Invalid role'); return; }
    const res = await authFetch(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify({ role: newRole }) });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u._id === id ? { ...u, role: newRole } : u));
      toast.success(`Role changed to ${newRole}`);
    }
  };

  const deleteCoach = async (id) => {
    if (!confirm('Deactivate this coach?')) return;
    const res = await authFetch(`/api/coaches/${id}`, { method: 'DELETE' });
    if (res.ok) { setCoaches((prev) => prev.map((c) => c._id === id ? { ...c, isActive: false } : c)); toast.success('Coach deactivated'); }
  };

  if (loading || !isAdmin) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-primary to-teal-light flex items-center justify-center text-white text-sm font-extrabold mx-auto mb-3 animate-pulse">SP</div>
        <p className="text-slate-400 text-xs">Loading admin...</p>
      </div>
    </div>
  );

  const ov = stats?.overview || {};
  const rev = stats?.revenue || {};
  const newEnq = enquiries.filter((e) => e.status === 'new').length;
  const activeEnr = enrollments.filter((e) => e.status === 'active').length;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* ── Desktop Sidebar ── */}
      <aside className="w-52 bg-white border-r border-slate-200/80 min-h-screen shrink-0 hidden lg:flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-primary to-teal-light flex items-center justify-center text-white text-[9px] font-extrabold">SP</div>
            <span className="font-serif text-sm text-teal-primary">SkillPadi</span>
          </Link>
          <div className="text-[9px] text-slate-400 mt-1">Admin Panel</div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all ${tab === t.id ? 'bg-teal-primary/8 text-teal-primary font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
              <span className="text-sm">{t.icon}</span>
              <span>{t.label}</span>
              {t.id === 'enquiries' && newEnq > 0 && <span className="ml-auto bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{newEnq}</span>}
              {t.id === 'enrollments' && activeEnr > 0 && <span className="ml-auto text-[9px] text-slate-400">{activeEnr}</span>}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-teal-primary text-white text-[9px] font-bold flex items-center justify-center">{dbUser?.name?.[0]}</div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold text-slate-700 truncate">{dbUser?.name}</div>
              <div className="text-[8px] text-slate-400 truncate">{dbUser?.email}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between">
        <button onClick={() => setSideOpen(true)} className="p-1.5"><svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg></button>
        <span className="font-serif text-sm text-teal-primary">Admin</span>
        <Link href="/" className="text-[10px] text-slate-400">View Site →</Link>
      </div>

      {/* ── Mobile Sidebar Overlay ── */}
      {sideOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/30" onClick={() => setSideOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-64 bg-white h-full shadow-xl p-3 space-y-0.5">
            <div className="flex justify-between items-center mb-3 px-2">
              <span className="font-serif text-sm text-teal-primary">Admin</span>
              <button onClick={() => setSideOpen(false)} className="text-slate-400">✕</button>
            </div>
            {TABS.map((t) => (
              <button key={t.id} onClick={() => { setTab(t.id); setSideOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium ${tab === t.id ? 'bg-teal-primary/8 text-teal-primary' : 'text-slate-500'}`}>
                <span>{t.icon}</span><span>{t.label}</span>
                {t.id === 'enquiries' && newEnq > 0 && <span className="ml-auto bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{newEnq}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="p-4 lg:p-6 max-w-6xl">

          {/* ════════ DASHBOARD ════════ */}
          {tab === 'dashboard' && (
            <div className="animate-fade-in">
              <h1 className="font-serif text-xl mb-4">Dashboard</h1>
              {loadingData ? <p className="text-sm text-slate-400">Loading...</p> : (
                <>
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    {[
                      { l: 'Revenue', v: fmt(ov.totalRevenue || 0), sub: `${rev.payments || 0} transactions`, color: 'text-emerald-700' },
                      { l: 'Active Kids', v: ov.activeEnrollments || 0, sub: `${ov.totalChildren || 0} total children` },
                      { l: 'Coaches', v: ov.totalCoaches || 0, sub: `${ov.certifiedCoaches || 0} certified` },
                      { l: 'New Enquiries', v: newEnq, sub: `${enquiries.length} total`, color: newEnq > 0 ? 'text-red-600' : '' },
                    ].map((s) => (
                      <div key={s.l} className="bg-white rounded-xl border border-slate-200/80 p-4">
                        <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">{s.l}</div>
                        <div className={`font-serif text-2xl mt-1 ${s.color || 'text-slate-900'}`}>{s.v}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{s.sub}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Capacity */}
                    <div className="bg-white rounded-xl border border-slate-200/80 p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div className="font-bold text-xs">Program Capacity</div>
                        <span className="text-[10px] text-slate-400">{ov.usedSpots || 0}/{ov.totalSpots || 0} spots</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${(ov.capacityPercent || 0) > 85 ? 'bg-red-500' : (ov.capacityPercent || 0) > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${ov.capacityPercent || 0}%` }} />
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1.5">{ov.capacityPercent || 0}% filled</div>
                      {/* Per-program breakdown */}
                      <div className="mt-3 space-y-1.5">
                        {programs.slice(0, 5).map((p) => {
                          const filled = pct(p.spotsTaken, p.spotsTotal);
                          return (
                            <div key={p._id} className="flex items-center gap-2 text-[10px]">
                              <span className="text-slate-600 truncate flex-1">{p.categoryId?.icon} {p.name}</span>
                              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${filled >= 90 ? 'bg-red-500' : filled >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${filled}%` }} />
                              </div>
                              <span className="text-slate-400 w-12 text-right">{p.spotsTaken}/{p.spotsTotal}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Revenue by Type */}
                    <div className="bg-white rounded-xl border border-slate-200/80 p-4">
                      <div className="font-bold text-xs mb-3">Revenue Breakdown</div>
                      {rev.byType && Object.entries(rev.byType).length > 0 ? (
                        <div className="space-y-2">
                          {Object.entries(rev.byType).sort((a, b) => b[1] - a[1]).map(([type, amt]) => (
                            <div key={type} className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: type === 'enrollment' ? '#0F766E' : type === 'membership' ? '#7C3AED' : type === 'product' ? '#CA8A04' : '#64748b' }} />
                              <span className="text-[11px] text-slate-600 flex-1 capitalize">{type.replace('-', ' ')}</span>
                              <span className="text-[11px] font-semibold">{fmt(amt)}</span>
                              <span className="text-[9px] text-slate-400 w-10 text-right">{pct(amt, ov.totalRevenue || 1)}%</span>
                            </div>
                          ))}
                          <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between text-xs">
                            <span className="text-slate-500">VAT Collected</span>
                            <span className="font-semibold">{fmt(rev.tax || 0)}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400">No revenue data yet.</p>
                      )}
                    </div>

                    {/* Recent Enquiries */}
                    <div className="bg-white rounded-xl border border-slate-200/80 p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div className="font-bold text-xs">Recent Enquiries</div>
                        <button onClick={() => setTab('enquiries')} className="text-[10px] text-teal-primary font-semibold">View All →</button>
                      </div>
                      {enquiries.slice(0, 4).map((enq) => (
                        <div key={enq._id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                          <div>
                            <div className="text-[11px] font-semibold">{enq.parentName}</div>
                            <div className="text-[9px] text-slate-400">{enq.childName} · {enq.phone}</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`badge ${enq.status === 'new' ? 'badge-red' : enq.status === 'contacted' ? 'badge-amber' : 'badge-green'}`}>{enq.status}</span>
                            <span className="text-[8px] text-slate-400">{ago(enq.createdAt)}</span>
                          </div>
                        </div>
                      ))}
                      {enquiries.length === 0 && <p className="text-[11px] text-slate-400 text-center py-4">No enquiries yet.</p>}
                    </div>

                    {/* Recent Enrollments */}
                    <div className="bg-white rounded-xl border border-slate-200/80 p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div className="font-bold text-xs">Recent Enrollments</div>
                        <button onClick={() => setTab('enrollments')} className="text-[10px] text-teal-primary font-semibold">View All →</button>
                      </div>
                      {enrollments.slice(0, 4).map((enr) => (
                        <div key={enr._id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                          <div>
                            <div className="text-[11px] font-semibold">{enr.childName}</div>
                            <div className="text-[9px] text-slate-400">{enr.programId?.name} · {enr.sessionsCompleted || 0}/{enr.programId?.sessions || 0}</div>
                          </div>
                          <span className={`badge ${enr.status === 'active' ? 'badge-green' : enr.status === 'completed' ? 'badge-blue' : 'badge-amber'}`}>{enr.status}</span>
                        </div>
                      ))}
                      {enrollments.length === 0 && <p className="text-[11px] text-slate-400 text-center py-4">No enrollments yet.</p>}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ════════ ENQUIRIES ════════ */}
          {tab === 'enquiries' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h1 className="font-serif text-xl">Enquiries <span className="text-sm font-sans text-slate-400">({enquiries.length})</span></h1>
                <div className="flex gap-1">
                  {['all', 'new', 'contacted', 'enrolled', 'declined'].map((f) => (
                    <button key={f} onClick={() => setEnqFilter(f)} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${enqFilter === f ? 'bg-teal-primary text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
                      {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                      {f === 'new' && newEnq > 0 && <span className="ml-1 text-[8px]">({newEnq})</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {enquiries.filter((e) => enqFilter === 'all' || e.status === enqFilter).map((enq) => (
                  <div key={enq._id} className={`bg-white rounded-xl border p-4 ${enq.status === 'new' ? 'border-red-200 bg-red-50/30' : 'border-slate-200/80'}`}>
                    <div className="flex justify-between mb-2">
                      <div>
                        <div className="font-bold text-sm">{enq.parentName}</div>
                        <div className="text-[10px] text-slate-500">{enq.phone} · {enq.email || 'no email'}</div>
                        <div className="text-[10px] text-slate-500">Child: {enq.childName || '—'} ({enq.childAge || '—'}yrs) · Source: {enq.source}</div>
                      </div>
                      <div className="text-right">
                        <span className={`badge ${enq.status === 'new' ? 'badge-red' : enq.status === 'contacted' ? 'badge-amber' : enq.status === 'enrolled' ? 'badge-green' : 'badge-gray'}`}>{enq.status}</span>
                        <div className="text-[8px] text-slate-400 mt-1">{ago(enq.createdAt)}</div>
                      </div>
                    </div>
                    {enq.message && <p className="text-[11px] text-slate-600 italic bg-slate-50 rounded-lg p-2 mb-2">&ldquo;{enq.message}&rdquo;</p>}
                    {enq.programId?.name && <div className="text-[10px] text-teal-primary font-semibold mb-2">Program: {enq.programId.name}</div>}
                    <div className="flex gap-1.5 flex-wrap">
                      {enq.status === 'new' && <button onClick={() => updateEnquiry(enq._id, 'contacted')} className="btn-primary btn-sm text-[10px]">Mark Contacted ✓</button>}
                      {enq.status === 'contacted' && <button onClick={() => updateEnquiry(enq._id, 'enrolled')} className="btn-primary btn-sm text-[10px]">Mark Enrolled ✓</button>}
                      <a href={`https://wa.me/${(enq.phone || '').replace(/^0/, '234')}?text=${encodeURIComponent(`Hi ${enq.parentName}, this is SkillPadi!`)}`} target="_blank" rel="noopener noreferrer" className="btn-sm bg-[#25D366] text-white rounded-lg text-[10px] font-semibold px-2.5 py-1">💬 WhatsApp</a>
                      {!['declined', 'enrolled'].includes(enq.status) && <button onClick={() => updateEnquiry(enq._id, 'declined')} className="btn-outline btn-sm text-[10px] text-red-500 border-red-200">Decline</button>}
                      <button onClick={() => deleteEnquiry(enq._id)} className="btn-sm text-[10px] text-slate-400 hover:text-red-500">🗑️</button>
                    </div>
                  </div>
                ))}
                {enquiries.filter((e) => enqFilter === 'all' || e.status === enqFilter).length === 0 && (
                  <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center text-slate-400 text-sm">No enquiries found.</div>
                )}
              </div>
            </div>
          )}

          {/* ════════ ENROLLMENTS ════════ */}
          {tab === 'enrollments' && (
            <div className="animate-fade-in">
              <h1 className="font-serif text-xl mb-4">Enrollments <span className="text-sm font-sans text-slate-400">({enrollments.length})</span></h1>
              <div className="bg-white rounded-xl border border-slate-200/80 overflow-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Child</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Program</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Parent</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Progress</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Status</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Actions</th>
                  </tr></thead>
                  <tbody>
                    {enrollments.map((enr) => {
                      const prog = enr.programId || {};
                      const done = pct(enr.sessionsCompleted || 0, prog.sessions || 1);
                      return (
                        <tr key={enr._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="p-3"><div className="font-semibold">{enr.childName}</div><div className="text-[9px] text-slate-400">{enr.childAge ? `${enr.childAge} yrs` : ''}</div></td>
                          <td className="p-3">{prog.categoryId?.icon} {prog.name}</td>
                          <td className="p-3 text-[10px]">{enr.userId?.name || '—'}<br /><span className="text-slate-400">{enr.userId?.phone || enr.userId?.email}</span></td>
                          <td className="p-3">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-teal-primary" style={{ width: `${done}%` }} /></div>
                            <span className="text-[9px] text-slate-400">{enr.sessionsCompleted || 0}/{prog.sessions || 0}</span>
                          </td>
                          <td className="p-3"><span className={`badge ${enr.status === 'active' ? 'badge-green' : enr.status === 'completed' ? 'badge-blue' : 'badge-amber'}`}>{enr.status}</span></td>
                          <td className="p-3">
                            {enr.status === 'active' && (
                              <button onClick={() => updateEnrollment(enr._id, { sessionsCompleted: (enr.sessionsCompleted || 0) + 1 })} className="btn-outline btn-sm text-[9px]">+1 Session</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {enrollments.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">No enrollments yet.</div>}
              </div>
            </div>
          )}

          {/* ════════ MEMBERS ════════ */}
          {tab === 'members' && (
            <div className="animate-fade-in">
              <h1 className="font-serif text-xl mb-4">Members <span className="text-sm font-sans text-slate-400">({users.length})</span></h1>
              <div className="bg-white rounded-xl border border-slate-200/80 overflow-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Parent</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Contact</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Children</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Membership</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Joined</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Actions</th>
                  </tr></thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="p-3 font-semibold">{u.name || '—'}</td>
                        <td className="p-3 text-[10px]">{u.email}<br /><span className="text-slate-400">{u.phone || '—'}</span></td>
                        <td className="p-3">{u.children?.length > 0 ? u.children.map((c) => `${c.name} (${c.age})`).join(', ') : '—'}</td>
                        <td className="p-3"><span className={`badge ${u.membershipPaid ? 'badge-green' : 'badge-amber'}`}>{u.membershipPaid ? 'Active' : 'Pending'}</span></td>
                        <td className="p-3 text-[10px] text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="p-3">
                          <button onClick={() => changeUserRole(u._id, u.role)} className="btn-outline btn-sm text-[9px]">
                            {u.role} ✎
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">No members yet.</div>}
              </div>
            </div>
          )}

          {/* ════════ COACHES ════════ */}
          {tab === 'coaches' && (
            <div className="animate-fade-in">
              <h1 className="font-serif text-xl mb-4">Coaches <span className="text-sm font-sans text-slate-400">({coaches.length})</span></h1>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {coaches.map((c) => {
                  const cat = c.categoryId || {};
                  return (
                    <div key={c._id} className="bg-white rounded-xl border border-slate-200/80 p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: `linear-gradient(135deg, ${cat.color || '#0F766E'}, ${cat.color || '#0F766E'}88)` }}>{c.initials}</div>
                        <div>
                          <div className="font-bold text-sm">{c.name}</div>
                          <div className="text-[10px]" style={{ color: cat.color }}>{cat.icon} {c.title}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className={`badge ${c.shieldLevel === 'certified' ? 'badge-green' : c.shieldLevel === 'verified' ? 'badge-blue' : 'badge-amber'}`}>🛡️ {c.shieldLevel}</span>
                        <span className="text-[10px] text-slate-400">⭐ {c.rating} ({c.reviewCount})</span>
                        <span className="text-[10px] text-slate-400">{c.yearsExperience} yrs</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{c.whatsapp}</div>
                      <div className="flex gap-1.5 mt-2">
                        <Link href={`/coaches/${c.slug}`} className="btn-outline btn-sm text-[9px]">View</Link>
                        <button onClick={() => toggleCoachActive(c._id, c.isActive)} className={`btn-sm text-[9px] rounded-lg font-semibold px-2 py-1 ${c.isActive ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                          {c.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <span className={`badge ${c.isActive ? 'badge-green' : 'badge-gray'}`}>{c.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {coaches.length === 0 && <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center text-slate-400 text-sm">No coaches yet.</div>}
            </div>
          )}

          {/* ════════ PROGRAMS ════════ */}
          {tab === 'programs' && (
            <div className="animate-fade-in">
              <h1 className="font-serif text-xl mb-4">Programs <span className="text-sm font-sans text-slate-400">({programs.length})</span></h1>
              <div className="bg-white rounded-xl border border-slate-200/80 overflow-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Program</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Coach</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Schedule</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Capacity</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Price/Session</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Revenue Pot.</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Actions</th>
                  </tr></thead>
                  <tbody>
                    {programs.map((p) => {
                      const filled = pct(p.spotsTaken, p.spotsTotal);
                      return (
                        <tr key={p._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="p-3"><span className="font-semibold">{p.categoryId?.icon} {p.name}</span><br /><span className="text-[9px] text-slate-400">Ages {p.ageRange}</span></td>
                          <td className="p-3">{p.coachId?.name || '—'}</td>
                          <td className="p-3 text-[10px]">{p.schedule}<br /><span className="text-slate-400">{p.duration}min · {p.sessions} sessions</span></td>
                          <td className="p-3">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${filled >= 90 ? 'bg-red-500' : filled >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${filled}%` }} /></div>
                            <span className="text-[9px] text-slate-400">{p.spotsTaken}/{p.spotsTotal} ({filled}%)</span>
                          </td>
                          <td className="p-3 font-semibold">{fmt(p.pricePerSession)}</td>
                          <td className="p-3 font-semibold text-emerald-700">{fmt(p.pricePerSession * p.sessions * p.spotsTotal)}</td>
                          <td className="p-3">
                            <div className="flex gap-1 flex-wrap">
                              <button onClick={() => updateProgramSpots(p._id, p.spotsTotal)} className="btn-outline btn-sm text-[9px]">Spots</button>
                              <button onClick={() => updateProgramPrice(p._id, p.pricePerSession)} className="btn-outline btn-sm text-[9px]">Price</button>
                              <button onClick={() => toggleProgramActive(p._id, p.isActive)} className={`btn-sm text-[9px] rounded-lg font-semibold px-2 py-1 ${p.isActive ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                                {p.isActive ? 'Off' : 'On'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════ SHOP ════════ */}
          {tab === 'shop' && (
            <div className="animate-fade-in">
              <h1 className="font-serif text-xl mb-4">Shop</h1>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Starter Kits */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4">
                  <div className="font-bold text-xs mb-3">🎁 Starter Kits ({kits.length})</div>
                  {kits.map((k) => (
                    <div key={k._id} className="flex justify-between py-2 border-b border-slate-50 last:border-0">
                      <div><div className="text-[11px] font-semibold">{k.icon} {k.name}</div><div className="text-[9px] text-slate-400">{k.brand || ''} · {k.sold || 0} sold</div></div>
                      <div className="text-right"><div className="text-[11px] font-semibold">{fmt(k.kitPrice)}</div><div className="text-[9px] text-slate-400 line-through">{fmt(k.individualPrice)}</div></div>
                    </div>
                  ))}
                </div>
                {/* Products */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4">
                  <div className="font-bold text-xs mb-3">🛒 Products ({products.length})</div>
                  {products.map((p) => (
                    <div key={p._id} className="flex justify-between py-2 border-b border-slate-50 last:border-0">
                      <div><div className="text-[11px] font-semibold">{p.categoryId?.icon} {p.name}</div><div className="text-[9px] text-slate-400">{p.brand || ''} · {p.sold || 0} sold</div></div>
                      <span className="text-[11px] font-semibold">{fmt(p.price)}</span>
                    </div>
                  ))}
                </div>
                {/* Orders */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4">
                  <div className="font-bold text-xs mb-3">📦 Recent Orders ({orders.length})</div>
                  {orders.length > 0 ? orders.slice(0, 10).map((o) => (
                    <div key={o._id} className="flex justify-between py-2 border-b border-slate-50 last:border-0">
                      <div><div className="text-[11px] font-semibold">{o.items?.length} items</div><div className="text-[9px] text-slate-400">{ago(o.createdAt)}</div></div>
                      <div className="text-right"><div className="text-[11px] font-semibold">{fmt(o.total)}</div><span className={`badge ${o.status === 'delivered' ? 'badge-green' : 'badge-amber'}`}>{o.status || 'pending'}</span></div>
                    </div>
                  )) : <p className="text-[11px] text-slate-400 text-center py-4">No orders yet.</p>}
                </div>
              </div>
            </div>
          )}

          {/* ════════ REVENUE ════════ */}
          {tab === 'revenue' && (
            <div className="animate-fade-in">
              <h1 className="font-serif text-xl mb-4">Revenue</h1>
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                  { l: 'Gross Revenue', v: fmt(rev.total || ov.totalRevenue || 0), color: 'text-emerald-700' },
                  { l: 'VAT Collected', v: fmt(rev.tax || ov.totalTax || 0) },
                  { l: 'Transactions', v: rev.payments || payments.length },
                  { l: 'Conversion', v: `${ov.conversionRate || 0}%`, sub: 'enquiry → enrolled' },
                ].map((s) => (
                  <div key={s.l} className="bg-white rounded-xl border border-slate-200/80 p-4">
                    <div className="text-[9px] uppercase font-bold text-slate-400">{s.l}</div>
                    <div className={`font-serif text-xl mt-1 ${s.color || ''}`}>{s.v}</div>
                    {s.sub && <div className="text-[9px] text-slate-400">{s.sub}</div>}
                  </div>
                ))}
              </div>
              {/* Payment history */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-4">
                <div className="font-bold text-xs mb-3">Transaction History</div>
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-slate-100">
                      <th className="text-left p-2 text-[9px] uppercase font-bold text-slate-400">Reference</th>
                      <th className="text-left p-2 text-[9px] uppercase font-bold text-slate-400">Description</th>
                      <th className="text-left p-2 text-[9px] uppercase font-bold text-slate-400">Amount</th>
                      <th className="text-left p-2 text-[9px] uppercase font-bold text-slate-400">Channel</th>
                      <th className="text-left p-2 text-[9px] uppercase font-bold text-slate-400">Status</th>
                      <th className="text-left p-2 text-[9px] uppercase font-bold text-slate-400">Date</th>
                    </tr></thead>
                    <tbody>
                      {payments.slice(0, 25).map((p) => (
                        <tr key={p._id} className="border-b border-slate-50">
                          <td className="p-2 text-[10px] font-mono text-slate-400">{p.reference?.slice(0, 15)}...</td>
                          <td className="p-2">{p.description}</td>
                          <td className="p-2 font-semibold">{fmt(p.totalAmount)}</td>
                          <td className="p-2 text-slate-400">{p.channel || '—'}</td>
                          <td className="p-2"><span className={`badge ${p.status === 'success' ? 'badge-green' : p.status === 'pending' ? 'badge-amber' : 'badge-red'}`}>{p.status}</span></td>
                          <td className="p-2 text-[10px] text-slate-400">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : ago(p.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {payments.length === 0 && <p className="text-[11px] text-slate-400 text-center py-4">No payments yet.</p>}
              </div>
            </div>
          )}

          {/* ════════ SETTINGS ════════ */}
          {tab === 'settings' && (
            <div className="animate-fade-in">
              <h1 className="font-serif text-xl mb-4">Settings</h1>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200/80 p-5">
                  <div className="font-bold text-xs mb-3">💰 Pricing</div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between py-1.5 border-b border-slate-50"><span className="text-slate-500">Membership Fee</span><span className="font-semibold">₦15,000 (one-time)</span></div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50"><span className="text-slate-500">VAT Rate</span><span className="font-semibold">7.5%</span></div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50"><span className="text-slate-500">Insurance/Session</span><span className="font-semibold">₦500</span></div>
                    <div className="flex justify-between py-1.5"><span className="text-slate-500">Insurance/Term</span><span className="font-semibold">₦3,000</span></div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/80 p-5">
                  <div className="font-bold text-xs mb-3">🔗 Integrations</div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between py-1.5 border-b border-slate-50"><span className="text-slate-500">MongoDB</span><span className="badge badge-green">Connected</span></div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50"><span className="text-slate-500">Firebase Auth</span><span className="badge badge-green">Active</span></div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50"><span className="text-slate-500">Paystack</span><span className="badge badge-green">Test Mode</span></div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50"><span className="text-slate-500">WhatsApp</span><span className={`badge ${process.env.NEXT_PUBLIC_WA_BUSINESS ? 'badge-green' : 'badge-amber'}`}>{process.env.NEXT_PUBLIC_WA_BUSINESS ? 'Configured' : 'Not Set'}</span></div>
                    <div className="flex justify-between py-1.5"><span className="text-slate-500">Sanity Blog</span><span className={`badge ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ? 'badge-green' : 'badge-amber'}`}>{process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ? 'Connected' : 'Not Set'}</span></div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/80 p-5">
                  <div className="font-bold text-xs mb-3">📊 Platform Info</div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between py-1.5 border-b border-slate-50"><span className="text-slate-500">Admin Email</span><span className="font-semibold">{dbUser?.email}</span></div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50"><span className="text-slate-500">Total Parents</span><span className="font-semibold">{ov.totalParents || 0}</span></div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50"><span className="text-slate-500">Total Programs</span><span className="font-semibold">{ov.totalPrograms || 0}</span></div>
                    <div className="flex justify-between py-1.5"><span className="text-slate-500">Schools</span><span className="font-semibold">{ov.schools || 0}</span></div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/80 p-5">
                  <div className="font-bold text-xs mb-3">🏷️ Category Sponsors</div>
                  <div className="space-y-2 text-[11px]">
                    {stats?.categories?.map((c) => (
                      <div key={c._id} className="flex justify-between py-1.5 border-b border-slate-50 last:border-0">
                        <span>{c.icon} {c.name}</span>
                        <span className="text-slate-400">{c.sponsor?.name || 'No sponsor'} · {c.programCount || 0} programs</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}