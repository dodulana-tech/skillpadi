'use client';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import EnrollmentCheckout from '@/components/EnrollmentCheckout';

const fmt = (n) => `₦${Number(n).toLocaleString()}`;
const waLink = (phone, text) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
const WA_BIZ = process.env.NEXT_PUBLIC_WA_BUSINESS || '234XXXXXXXXXX';
const MEMBERSHIP = 15000;

const LAGOS_CATEGORIES = [
  { slug: 'swimming', name: 'Swimming', icon: '🏊', color: '#0891B2' },
  { slug: 'football', name: 'Football', icon: '⚽', color: '#16A34A' },
  { slug: 'taekwondo', name: 'Taekwondo', icon: '🥋', color: '#DC2626' },
  { slug: 'tennis', name: 'Tennis', icon: '🎾', color: '#D97706' },
];

const SUPERVISION_MAP = {
  'parent-present': { label: 'Parent Stays', icon: '👁️' },
  'drop-off': { label: 'Drop & Pick', icon: '🚗' },
  'school-chaperone': { label: 'School Chaperone', icon: '🏫' },
  'nanny-driver': { label: 'Nanny/Driver', icon: '🙋' },
};

function ShieldBadge({ level }) {
  const m = { certified: 'badge-green', verified: 'badge-blue', 'in-progress': 'badge-amber' };
  const l = { certified: 'Certified', verified: 'Verified', 'in-progress': 'Pending' };
  return <span className={`badge ${m[level] || m['in-progress']}`}>🛡️ {l[level] || 'Pending'}</span>;
}

function CoachAvatar({ initials, color, size = 40 }) {
  return (
    <div
      className="flex items-center justify-center font-extrabold text-white/80 shrink-0"
      style={{ width: size, height: size, borderRadius: size * 0.25, background: `linear-gradient(135deg, ${color}, ${color}aa)`, fontSize: size * 0.32 }}
    >
      {initials}
    </div>
  );
}

function LeaderboardTeaser() {
  const [kids, setKids] = useState([]);
  const [topSchool, setTopSchool] = useState(null);
  const [topArea, setTopArea] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/leaderboards?type=kids&limit=3').then(r => r.ok ? r.json() : {}),
      fetch('/api/leaderboards?type=schools&limit=1').then(r => r.ok ? r.json() : {}),
      fetch('/api/leaderboards?type=areas&limit=1').then(r => r.ok ? r.json() : {}),
    ]).then(([k, s, a]) => {
      setKids(k.leaderboard || []);
      setTopSchool((s.leaderboard || [])[0] || null);
      setTopArea((a.leaderboard || [])[0] || null);
    });
  }, []);

  if (kids.length === 0 && !topSchool && !topArea) return null;

  return (
    <section className="py-12 px-5 bg-gradient-to-b from-teal-50/50 to-cream">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[9px] uppercase font-bold text-teal-600 tracking-wider mb-1">Live Rankings</div>
            <h2 className="font-serif text-xl">🏆 Leaderboard</h2>
          </div>
          <Link href="/leaderboard" className="text-teal-primary text-xs font-semibold hover:underline">
            View Full →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Top 3 kids */}
          {kids.length > 0 && (
            <div className="card p-4 sm:col-span-2">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-3">Top Kids This Term</div>
              <div className="space-y-2.5">
                {kids.map((k, i) => (
                  <div key={k._id || i} className="flex items-center gap-3">
                    <span className="text-lg w-6 text-center shrink-0">{['🥇','🥈','🥉'][i]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">{k.displayName}</div>
                      {k.userArea && <div className="text-[9px] text-slate-400">📍 {k.userArea}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-teal-700">{k.stats?.totalSessions || 0} sessions</div>
                      <div className="text-[9px] text-orange-500">{k.stats?.currentStreak || 0}🔥</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Top school + area */}
          <div className="space-y-3">
            {topSchool && (
              <div className="card p-4">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">🏫 Top School</div>
                <div className="font-semibold text-sm">{topSchool.schoolName}</div>
                {topSchool.area && <div className="text-[9px] text-slate-400">📍 {topSchool.area}</div>}
                <div className="text-xs text-teal-700 font-bold mt-1">{topSchool.totalEnrolled} kids enrolled</div>
              </div>
            )}
            {topArea && (
              <div className="card p-4">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">📍 Most Active Area</div>
                <div className="font-semibold text-sm">{topArea.area}</div>
                <div className="text-xs text-teal-700 font-bold mt-1">{topArea.totalSessions} sessions completed</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingClient({ categories, coaches, programs }) {
  const { isAuthenticated, dbUser } = useAuth();
  const [enrollProg, setEnrollProg] = useState(null);
  const [enqProg, setEnqProg] = useState(null);
  const [form, setForm] = useState({ parentName: '', phone: '', childName: '', childAge: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [cityFilter, setCityFilter] = useState('abuja');

  const filteredPrograms = programs.filter(p => (p.city || 'abuja') === cityFilter);

  const submitEnquiry = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, childAge: Number(form.childAge), programId: enqProg?._id, source: 'website' }),
      });
      if (res.ok) {
        toast.success('Enquiry sent! We\'ll WhatsApp you within 24hrs.');
        setEnqProg(null);
        setForm({ parentName: '', phone: '', childName: '', childAge: '', message: '' });
      } else {
        toast.error('Failed to send. Please try WhatsApp instead.');
      }
    } catch { toast.error('Network error'); }
    setSubmitting(false);
  };

  return (
    <>
      {/* Hero */}
      <section className="pt-24 pb-10 text-center">
        <div className="max-w-2xl mx-auto px-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold mb-4 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
            Abuja &amp; Lagos
          </div>
          <h1 className="font-serif text-[clamp(2rem,5vw,3rem)] leading-[1.08] mb-3 animate-fade-in">
            Give your child <span className="text-teal-primary">skills that last</span> a lifetime
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed max-w-lg mx-auto mb-5 animate-fade-in">
            Swimming · Football · Taekwondo · Piano · Tennis · Coding — vetted coaches at trusted venues across Abuja and Lagos.
          </p>
          <div className="flex gap-2 justify-center flex-wrap animate-fade-in">
            <a href="#programs" className="btn-primary py-2.5 px-6 rounded-xl">Browse Programs</a>
            <a href={waLink(WA_BIZ, 'Hi! Interested in SkillPadi.')} target="_blank" rel="noopener noreferrer" className="btn-whatsapp py-2.5 px-6 rounded-xl">💬 WhatsApp Us</a>
          </div>
        </div>
      </section>

      {/* Categories */}
      <div className="flex gap-1.5 justify-center flex-wrap px-5 pb-6">
        {categories.map((c) => (
          <div key={c._id} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/60 text-[11px] font-semibold text-slate-700 animate-fade-in">
            {c.icon} {c.name}
            {c.sponsorId?.name && <span className="text-[8px] text-slate-400">{c.sponsorId.tagline || `by ${c.sponsorId.name}`}</span>}
          </div>
        ))}
      </div>

      {/* Membership */}
      <section className="px-5 pb-8">
        <div className={`max-w-2xl mx-auto rounded-2xl px-6 py-5 flex items-center justify-between flex-wrap gap-3 text-white ${isAuthenticated && dbUser?.membershipPaid ? 'bg-gradient-to-r from-emerald-600 to-emerald-500' : 'bg-gradient-to-r from-teal-primary to-teal-600'}`}>
          {isAuthenticated && dbUser?.membershipPaid ? (
            <>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider opacity-70">You&apos;re a Member ✓</div>
                <div className="font-serif text-xl">Know a parent who&apos;d love this?</div>
              </div>
              <button onClick={() => { navigator.clipboard.writeText('https://skillpadi-b3nv.vercel.app'); alert('Link copied!'); }} className="bg-white text-emerald-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:-translate-y-0.5 transition-all">
                Share with Friends 🔗
              </button>
            </>
          ) : (
            <>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider opacity-70">One-Time Membership</div>
                <div className="font-serif text-2xl">{fmt(MEMBERSHIP)}</div>
              </div>
              <Link href={isAuthenticated ? "/dashboard/parent" : "/auth/signup"} className="bg-white text-teal-primary px-5 py-2.5 rounded-xl font-bold text-sm hover:-translate-y-0.5 transition-all">
                {isAuthenticated ? 'Pay Now →' : 'Get Started →'}
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Programs */}
      <section id="programs" className="py-8 px-5">
        <div className="page-container">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <h2 className="font-serif text-[clamp(1.4rem,3vw,1.8rem)]">Programs</h2>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setCityFilter('abuja')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${cityFilter === 'abuja' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                Abuja
              </button>
              <button
                onClick={() => setCityFilter('lagos')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${cityFilter === 'lagos' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                Lagos
                <span className="text-[8px] font-bold bg-teal-500 text-white px-1.5 py-0.5 rounded-full leading-none">NEW</span>
              </button>
            </div>
          </div>
          {cityFilter === 'lagos' && filteredPrograms.length === 0 && (
            <div className="py-6">
              <div className="text-center mb-6">
                <p className="text-slate-500 text-sm">Lagos programs launching soon. Reserve your child&apos;s spot at the founding member price.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {LAGOS_CATEGORIES.map(cat => (
                  <Link
                    key={cat.slug}
                    href={`/lagos?category=${cat.slug}`}
                    className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-slate-200/80 hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: `${cat.color}18` }}>
                      {cat.icon}
                    </div>
                    <div className="font-semibold text-xs text-slate-800">{cat.name}</div>
                    <div className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${cat.color}18`, color: cat.color }}>
                      Join Waitlist
                    </div>
                  </Link>
                ))}
              </div>
              <div className="text-center mt-5">
                <Link href="/lagos" className="text-xs text-teal-primary font-semibold hover:underline">
                  View Lagos launch details →
                </Link>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPrograms.map((prog) => {
              const cat = prog.categoryId;
              const coach = prog.coachId;
              const total = prog.pricePerSession * prog.sessions;
              const spots = prog.spotsTotal - prog.spotsTaken;
              const sup = SUPERVISION_MAP[prog.supervision];
              return (
                <div key={prog._id} className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all animate-fade-in">
                  {/* Category strip */}
                  <div className="h-1 w-full" style={{ background: cat?.color || '#0F766E' }} />
                  <div className="p-5">
                    {/* Top row: category + availability */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cat?.color }}>
                        {cat?.name}
                      </span>
                      {spots <= 0
                        ? <span className="text-[10px] font-semibold text-red-500">Full</span>
                        : spots <= 3
                        ? <span className="text-[10px] font-semibold text-amber-600">{spots} spot{spots !== 1 ? 's' : ''} left</span>
                        : <span className="text-[10px] text-slate-400">{spots} spots</span>}
                    </div>
                    {/* Program name */}
                    <div className="font-serif text-[1.05rem] leading-snug mb-1">{prog.name}</div>
                    {/* Coach */}
                    <div className="flex items-center gap-1.5 mb-3">
                      <Link href={`/coaches/${coach?.slug}`} className="text-xs font-semibold text-slate-700 hover:text-teal-primary transition-colors">
                        {coach?.name}
                      </Link>
                      <ShieldBadge level={coach?.shieldLevel} />
                    </div>
                    {/* Meta */}
                    <div className="text-[11px] text-slate-400 space-y-0.5 mb-4">
                      <div>{prog.location} · Ages {prog.ageRange}</div>
                      <div>{prog.schedule} · {prog.duration} min · {prog.groupSize}</div>
                      {sup && <div>{sup.label}{prog.gender && prog.gender !== 'any' ? ` · ${prog.gender === 'female' ? 'Girls' : 'Boys'} only` : ''}</div>}
                    </div>
                    {/* Price + actions */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                      <div>
                        <div className="font-serif text-xl text-slate-900">{fmt(total)}</div>
                        <div className="text-[10px] text-slate-400">{prog.sessions} sessions · incl. VAT</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={waLink(WA_BIZ, `Hi, I have a question about "${prog.name}".`)}
                          target="_blank" rel="noopener noreferrer"
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-[#25D366] hover:text-white text-slate-500 flex items-center justify-center text-sm transition-colors"
                          title="Ask on WhatsApp"
                        >
                          💬
                        </a>
                        <button
                          onClick={() => setEnrollProg(prog)}
                          className="btn-primary btn-sm px-4"
                        >
                          Enroll
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Coaches */}
      <section id="coaches" className="py-10 px-5 bg-gradient-to-b from-emerald-50/50 to-cream">
        <div className="page-container">
          <h2 className="font-serif text-[1.7rem] text-center mb-1">Meet Our Coaches</h2>
          <p className="text-slate-500 text-xs text-center mb-6">Every coach is vetted, credentialed, and reviewed by real parents</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {coaches.map((coach) => {
              const cat = coach.categoryId;
              return (
                <Link key={coach._id} href={`/coaches/${coach.slug}`} className="card p-3.5 text-center hover:-translate-y-0.5 transition-transform animate-fade-in">
                  <div className="flex justify-center mb-2"><CoachAvatar initials={coach.initials} color={cat?.color || '#0F766E'} size={56} /></div>
                  <div className="font-bold text-[13px] mb-1">{coach.name}</div>
                  <ShieldBadge level={coach.shieldLevel} />
                  <div className="text-[10px] font-semibold my-1" style={{ color: cat?.color }}>{cat?.icon} {coach.title}</div>
                  <div className="text-[10px] text-slate-400">⭐ {coach.rating} · {coach.yearsExperience} yrs · Ages {coach.ageGroups}</div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-10 px-5">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-[1.7rem] text-center mb-6">How It Works</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { n: '01', t: 'Join', d: `${fmt(MEMBERSHIP)} one-time`, i: '🔐' },
              { n: '02', t: 'Browse & Book', d: 'Pick a program. Add a starter kit.', i: '📋' },
              { n: '03', t: 'Drop Off (or Stay)', d: 'Each program shows the supervision model.', i: '🚗' },
              { n: '04', t: 'Track & Level Up', d: 'Milestones, reports, certificates.', i: '📊' },
            ].map((s) => (
              <div key={s.n} className="text-center animate-fade-in">
                <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/60 flex items-center justify-center text-xl mx-auto mb-1.5">{s.i}</div>
                <div className="text-[9px] font-bold text-teal-primary tracking-wider">STEP {s.n}</div>
                <div className="font-bold text-xs mb-0.5">{s.t}</div>
                <div className="text-[10px] text-slate-500 leading-snug">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shop CTA */}
      <section className="px-5 pb-8 max-w-2xl mx-auto">
        <div className="card p-5 bg-emerald-50 border-emerald-200/60 flex items-center justify-between gap-3 flex-wrap animate-fade-in">
          <div>
            <div className="text-lg mb-0.5">🎁</div>
            <div className="font-bold text-sm">Starter Kits from {fmt(12000)}</div>
            <p className="text-[11px] text-slate-500">Swimwear, boots, uniforms, keyboards — delivered at session one.</p>
          </div>
          <Link href="/shop" className="btn-primary btn-sm">Browse Shop →</Link>
        </div>
      </section>

      {/* Trust Stats */}
      <section className="py-6 px-5 border-t border-slate-200/60 text-center">
        <div className="flex justify-center gap-8 flex-wrap">
          {[{ v: '150+', l: 'Kids' }, { v: String(coaches.length), l: 'Coaches' }, { v: '6', l: 'Categories' }, { v: '4.9★', l: 'Rating' }].map((s) => (
            <div key={s.l}><div className="font-serif text-xl text-teal-primary">{s.v}</div><div className="text-[9px] text-slate-400">{s.l}</div></div>
          ))}
        </div>
      </section>

      {/* ── Leaderboard Teaser ── */}
      <LeaderboardTeaser />

      {/* ── Partner With Us ── */}
      <section className="py-12 px-5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-7">
            <div className="text-[9px] uppercase font-bold text-teal-600 tracking-wider mb-1">Partner With Us</div>
            <h2 className="font-serif text-[1.6rem]">Bring SkillPadi to your community</h2>
            <p className="text-slate-500 text-sm mt-1">We handle the coaches, the curriculum, and the progress tracking — you focus on your kids.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* School card */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white flex flex-col">
              <div className="text-3xl mb-3">🏫</div>
              <div className="font-serif text-lg mb-1">For Schools</div>
              <p className="text-slate-300 text-xs leading-relaxed flex-1 mb-4">
                Structured P.E. and extracurricular programs delivered by vetted coaches on your grounds. Progress reports, parent dashboards, and markup revenue — all included.
              </p>
              <div className="flex flex-col gap-2">
                <a href="/schools/apply" className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-primary text-white text-xs font-semibold rounded-xl hover:bg-teal-600 transition-colors">
                  Get Started →
                </a>
                <a href="/school" className="inline-flex items-center justify-center px-4 py-2 bg-white/10 text-white text-xs font-semibold rounded-xl hover:bg-white/20 transition-colors border border-white/20">
                  School Portal Login
                </a>
              </div>
            </div>
            {/* Estate/Community card */}
            <div className="bg-gradient-to-br from-emerald-700 to-teal-800 rounded-2xl p-6 text-white flex flex-col">
              <div className="text-3xl mb-3">🏘️</div>
              <div className="font-serif text-lg mb-1">For Estates & Communities</div>
              <p className="text-emerald-100 text-xs leading-relaxed flex-1 mb-4">
                Turn your common areas into skill-building hubs. Residents get exclusive discounts, and your estate earns a revenue share on every enrollment.
              </p>
              <div className="flex flex-col gap-2">
                <a href="/communities/apply" className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white text-emerald-800 text-xs font-semibold rounded-xl hover:bg-emerald-50 transition-colors">
                  Get Started →
                </a>
                <a href={waLink(WA_BIZ, 'Hi! I manage an estate and want to discuss a SkillPadi partnership.')} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white/10 text-white text-xs font-semibold rounded-xl hover:bg-white/20 transition-colors border border-white/20">
                  💬 Chat First
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 bg-white">
        <div className="max-w-4xl mx-auto px-5 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
            <div>
              <div className="font-serif text-base mb-3">SkillPadi</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">Vetted coaches. Structured programs. Lifelong skills — for Abuja&apos;s next generation.</p>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-3">Explore</div>
              <ul className="space-y-2">
                {[{ href: '/#programs', label: 'Programs' }, { href: '/shop', label: 'Shop' }, { href: '/leaderboard', label: 'Leaderboard' }, { href: '/tournaments', label: 'Tournaments' }].map(l => (
                  <li key={l.href}><Link href={l.href} className="text-[11px] text-slate-600 hover:text-teal-primary transition-colors">{l.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-3">Partners</div>
              <ul className="space-y-2">
                {[{ href: '/schools/apply', label: 'Schools' }, { href: '/communities/apply', label: 'Estates' }, { href: '/school', label: 'School Portal' }, { href: '/dashboard/community', label: 'Estate Portal' }].map(l => (
                  <li key={l.href}><Link href={l.href} className="text-[11px] text-slate-600 hover:text-teal-primary transition-colors">{l.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-3">Connect</div>
              <ul className="space-y-2">
                <li><a href={waLink(WA_BIZ, 'Hi SkillPadi!')} target="_blank" rel="noopener noreferrer" className="text-[11px] text-slate-600 hover:text-teal-primary transition-colors">💬 WhatsApp</a></li>
                <li><Link href="/auth/signup" className="text-[11px] text-slate-600 hover:text-teal-primary transition-colors">Sign Up</Link></li>
                <li><Link href="/auth/login" className="text-[11px] text-slate-600 hover:text-teal-primary transition-colors">Log In</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-5 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[10px] text-slate-400">© {new Date().getFullYear()} SkillPadi Ltd · Abuja, Nigeria</p>
            <p className="text-[10px] text-slate-400">Prices include 7.5% VAT · All coaches are vetted</p>
          </div>
        </div>
      </footer>

      {/* Enrollment Checkout */}
      {enrollProg && (
        <EnrollmentCheckout program={enrollProg} onClose={() => setEnrollProg(null)} />
      )}

      {/* Enquiry Modal (kept as fallback for questions) */}
      {enqProg && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={() => setEnqProg(null)}>
          <div onClick={(e) => e.stopPropagation()} className="card w-full max-w-sm rounded-2xl max-h-[90vh] overflow-auto">
            <div className="p-5">
              <div className="flex justify-between mb-3">
                <div>
                  <h3 className="font-serif text-lg">Enquire</h3>
                  <p className="text-teal-primary font-semibold text-[11px]">{enqProg.name}</p>
                </div>
                <button onClick={() => setEnqProg(null)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
              </div>
              <form onSubmit={submitEnquiry} className="space-y-2.5">
                <div><label className="label">Name</label><input className="input" required placeholder="Mrs. Adebayo" value={form.parentName} onChange={(e) => setForm((p) => ({ ...p, parentName: e.target.value }))} /></div>
                <div><label className="label">WhatsApp</label><input className="input" required placeholder="0812-345-6789" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></div>
                <div><label className="label">Child&apos;s Name</label><input className="input" required placeholder="Timi" value={form.childName} onChange={(e) => setForm((p) => ({ ...p, childName: e.target.value }))} /></div>
                <div><label className="label">Age</label><input className="input" type="number" min="2" max="18" required placeholder="6" value={form.childAge} onChange={(e) => setForm((p) => ({ ...p, childAge: e.target.value }))} /></div>
                <div><label className="label">Message (optional)</label><textarea className="input" rows={2} placeholder="Questions?" value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} /></div>
                <button type="submit" disabled={submitting} className="btn-primary w-full justify-center py-2.5 disabled:opacity-50">
                  {submitting ? 'Sending...' : 'Send Enquiry'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
