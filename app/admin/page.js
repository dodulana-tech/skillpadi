'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

const fmt = (n) => `₦${Number(n).toLocaleString()}`;

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'enquiries', label: 'Enquiries', icon: '📩' },
  { id: 'coaches', label: 'Coaches', icon: '🏅' },
  { id: 'programs', label: 'Programs', icon: '📋' },
  { id: 'members', label: 'Members', icon: '👨‍👩‍👧' },
  { id: 'schools', label: 'Schools', icon: '🏫' },
  { id: 'payments', label: 'Payments', icon: '💳' },
];

export default function AdminPage() {
  const { isAuthenticated, isAdmin, loading, authFetch, dbUser } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [enquiries, setEnquiries] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && (!isAuthenticated || !isAdmin)) {
      router.push(isAuthenticated ? '/dashboard/parent' : '/auth/login');
    }
  }, [loading, isAuthenticated, isAdmin, router]);

  const loadData = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingData(true);
    try {
      const [sRes, eRes, cRes, pRes, uRes] = await Promise.all([
        authFetch('/api/admin/stats'),
        authFetch('/api/enquiries'),
        authFetch('/api/coaches?active=false'),
        authFetch('/api/programs?active=false'),
        authFetch('/api/users?role=parent'),
      ]);
      if (sRes.ok) setStats((await sRes.json()));
      if (eRes.ok) setEnquiries((await eRes.json()).enquiries || []);
      if (cRes.ok) setCoaches((await cRes.json()).coaches || []);
      if (pRes.ok) setPrograms((await pRes.json()).programs || []);
      if (uRes.ok) setUsers((await uRes.json()).users || []);
    } catch (e) { console.error('Admin load error:', e); }
    setLoadingData(false);
  }, [isAdmin, authFetch]);

  useEffect(() => { if (isAdmin) loadData(); }, [isAdmin, loadData]);

  const updateEnquiry = async (id, status) => {
    await authFetch(`/api/enquiries/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    setEnquiries((prev) => prev.map((e) => e._id === id ? { ...e, status } : e));
  };

  if (loading || !isAdmin) return <div className="min-h-screen bg-cream flex items-center justify-center"><p className="text-slate-400 text-sm">Loading...</p></div>;

  const ov = stats?.overview || {};
  const newEnq = enquiries.filter((e) => e.status === 'new').length;

  return (
    <div className="min-h-screen bg-cream flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-slate-200/60 min-h-screen p-3 shrink-0 hidden md:block">
        <Link href="/" className="flex items-center gap-2 mb-6 px-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-primary to-teal-light flex items-center justify-center text-white text-[10px] font-extrabold">SP</div>
          <span className="font-serif text-base text-teal-primary">Admin</span>
        </Link>
        <nav className="space-y-0.5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${tab === t.id ? 'bg-teal-primary/10 text-teal-primary' : 'text-slate-500 hover:bg-slate-50'}`}>
              <span>{t.icon}</span> {t.label}
              {t.id === 'enquiries' && newEnq > 0 && <span className="ml-auto bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{newEnq}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile tabs */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex overflow-x-auto px-2 py-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[9px] font-medium shrink-0 ${tab === t.id ? 'text-teal-primary' : 'text-slate-400'}`}>
            <span className="text-base">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
        {/* Dashboard */}
        {tab === 'dashboard' && (
          <div className="animate-fade-in">
            <h1 className="font-serif text-xl mb-4">Dashboard</h1>
            {loadingData ? <p className="text-sm text-slate-400">Loading...</p> : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    { l: 'Revenue', v: fmt(ov.totalRevenue || 0), c: 'text-green-700' },
                    { l: 'Kids Enrolled', v: ov.activeEnrollments || 0 },
                    { l: 'Active Coaches', v: ov.totalCoaches || 0 },
                    { l: 'New Enquiries', v: ov.newEnquiries || 0, c: newEnq > 0 ? 'text-red-600' : '' },
                  ].map((s) => (
                    <div key={s.l} className="card p-3">
                      <div className="text-[9px] uppercase font-bold text-slate-400">{s.l}</div>
                      <div className={`font-serif text-xl ${s.c || 'text-slate-900'}`}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="card p-4">
                    <div className="font-bold text-xs mb-2">Capacity: {ov.capacityPercent || 0}%</div>
                    <div className="progress-bar h-2.5"><div className="progress-fill bg-teal-primary" style={{ width: `${ov.capacityPercent || 0}%` }} /></div>
                    <div className="text-[9px] text-slate-400 mt-1">{ov.usedSpots || 0}/{ov.totalSpots || 0} spots filled</div>
                  </div>
                  <div className="card p-4">
                    <div className="font-bold text-xs mb-2">Revenue by Type</div>
                    {stats?.revenue?.byType && Object.entries(stats.revenue.byType).map(([type, amt]) => (
                      <div key={type} className="flex justify-between text-[11px] py-0.5">
                        <span className="text-slate-500 capitalize">{type}</span>
                        <span className="font-semibold">{fmt(amt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Enquiries */}
        {tab === 'enquiries' && (
          <div className="animate-fade-in">
            <h1 className="font-serif text-xl mb-4">Enquiries ({enquiries.length})</h1>
            <div className="space-y-2">
              {enquiries.map((enq) => (
                <div key={enq._id} className="card p-4">
                  <div className="flex justify-between mb-1.5">
                    <div>
                      <div className="font-bold text-sm">{enq.parentName}</div>
                      <div className="text-[10px] text-slate-500">{enq.phone} · {enq.childName} ({enq.childAge}yrs) · {enq.source}</div>
                    </div>
                    <span className={`badge ${enq.status === 'new' ? 'badge-red' : enq.status === 'contacted' ? 'badge-amber' : enq.status === 'enrolled' ? 'badge-green' : 'badge-gray'}`}>{enq.status}</span>
                  </div>
                  {enq.message && <p className="text-[11px] text-slate-600 italic mb-2">&ldquo;{enq.message}&rdquo;</p>}
                  <div className="flex gap-1">
                    {enq.status === 'new' && <button onClick={() => updateEnquiry(enq._id, 'contacted')} className="btn-primary btn-sm">Mark Contacted</button>}
                    {enq.status === 'contacted' && <button onClick={() => updateEnquiry(enq._id, 'enrolled')} className="btn-primary btn-sm">Mark Enrolled</button>}
                    {(enq.status === 'new' || enq.status === 'contacted') && (
                      <a href={`https://wa.me/${enq.phone?.replace(/^0/, '234')}?text=${encodeURIComponent(`Hi ${enq.parentName}, this is SkillPadi! Thanks for your enquiry.`)}`} target="_blank" rel="noopener noreferrer" className="btn-whatsapp btn-sm">💬 WhatsApp</a>
                    )}
                    {enq.status !== 'declined' && enq.status !== 'enrolled' && <button onClick={() => updateEnquiry(enq._id, 'declined')} className="btn-outline btn-sm text-red-500">Decline</button>}
                  </div>
                </div>
              ))}
              {enquiries.length === 0 && <div className="card p-8 text-center text-slate-400 text-sm">No enquiries yet.</div>}
            </div>
          </div>
        )}

        {/* Coaches */}
        {tab === 'coaches' && (
          <div className="animate-fade-in">
            <h1 className="font-serif text-xl mb-4">Coaches ({coaches.length})</h1>
            <div className="card overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Coach</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Category</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Shield</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Rating</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {coaches.map((c) => (
                    <tr key={c._id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="p-3 font-semibold"><Link href={`/coaches/${c.slug}`} className="hover:text-teal-primary">{c.name}</Link></td>
                      <td className="p-3">{c.categoryId?.icon} {c.categoryId?.name}</td>
                      <td className="p-3"><span className={`badge ${c.shieldLevel === 'certified' ? 'badge-green' : c.shieldLevel === 'verified' ? 'badge-blue' : 'badge-amber'}`}>🛡️ {c.shieldLevel}</span></td>
                      <td className="p-3">⭐ {c.rating} ({c.reviewCount})</td>
                      <td className="p-3"><span className={`badge ${c.isActive ? 'badge-green' : 'badge-gray'}`}>{c.isActive ? 'Active' : 'Inactive'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Programs */}
        {tab === 'programs' && (
          <div className="animate-fade-in">
            <h1 className="font-serif text-xl mb-4">Programs ({programs.length})</h1>
            <div className="card overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Program</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Coach</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Capacity</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Price/Session</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Revenue Pot.</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map((p) => {
                    const spots = p.spotsTotal - p.spotsTaken;
                    const pct = Math.round((p.spotsTaken / p.spotsTotal) * 100);
                    return (
                      <tr key={p._id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="p-3"><span className="font-semibold">{p.categoryId?.icon} {p.name}</span><br /><span className="text-[9px] text-slate-400">{p.schedule}</span></td>
                        <td className="p-3">{p.coachId?.name}</td>
                        <td className="p-3">
                          <div className="progress-bar w-16"><div className={`progress-fill ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} /></div>
                          <span className="text-[9px] text-slate-400">{p.spotsTaken}/{p.spotsTotal}</span>
                        </td>
                        <td className="p-3">{fmt(p.pricePerSession)}</td>
                        <td className="p-3 font-semibold">{fmt(p.pricePerSession * p.sessions * p.spotsTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Members */}
        {tab === 'members' && (
          <div className="animate-fade-in">
            <h1 className="font-serif text-xl mb-4">Members ({users.length})</h1>
            <div className="card overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Parent</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Contact</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Children</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Membership</th>
                    <th className="text-left p-3 text-[9px] uppercase font-bold text-slate-400">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} className="border-b border-slate-50">
                      <td className="p-3 font-semibold">{u.name}</td>
                      <td className="p-3 text-[10px]">{u.email}<br />{u.phone}</td>
                      <td className="p-3">{u.children?.map((c) => `${c.name} (${c.age})`).join(', ') || '—'}</td>
                      <td className="p-3"><span className={`badge ${u.membershipPaid ? 'badge-green' : 'badge-amber'}`}>{u.membershipPaid ? 'Active' : 'Pending'}</span></td>
                      <td className="p-3 text-[10px] text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Schools */}
        {tab === 'schools' && (
          <div className="animate-fade-in">
            <h1 className="font-serif text-xl mb-4">Schools</h1>
            <p className="text-sm text-slate-400">School management coming in next release. Use the API at <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">/api/schools</code> directly for now.</p>
          </div>
        )}

        {/* Payments */}
        {tab === 'payments' && (
          <div className="animate-fade-in">
            <h1 className="font-serif text-xl mb-4">Payments</h1>
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="card p-3"><div className="text-[9px] uppercase font-bold text-slate-400">Gross Revenue</div><div className="font-serif text-lg text-green-700">{fmt(stats.revenue?.total || 0)}</div></div>
                <div className="card p-3"><div className="text-[9px] uppercase font-bold text-slate-400">VAT Collected</div><div className="font-serif text-lg">{fmt(stats.revenue?.tax || 0)}</div></div>
                <div className="card p-3"><div className="text-[9px] uppercase font-bold text-slate-400">Transactions</div><div className="font-serif text-lg">{stats.revenue?.payments || 0}</div></div>
                <div className="card p-3"><div className="text-[9px] uppercase font-bold text-slate-400">Conversion</div><div className="font-serif text-lg">{ov.conversionRate || 0}%</div></div>
              </div>
            )}
            <p className="text-sm text-slate-400">Detailed payment table coming in next release. Paystack dashboard available at <a href="https://dashboard.paystack.com" target="_blank" rel="noopener noreferrer" className="text-teal-primary underline">dashboard.paystack.com</a>.</p>
          </div>
        )}
      </main>
    </div>
  );
}
