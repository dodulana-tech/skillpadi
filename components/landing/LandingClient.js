'use client';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import EnrollmentCheckout from '@/components/EnrollmentCheckout';

const fmt = (n) => `₦${Number(n).toLocaleString()}`;
const waLink = (phone, text) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
const WA_BIZ = process.env.NEXT_PUBLIC_WA_BUSINESS || '234XXXXXXXXXX';
const MEMBERSHIP = 15000;
const VAT = 0.075;

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

export function LandingClient({ categories, coaches, programs }) {
  const { isAuthenticated, dbUser } = useAuth();
  const [enrollProg, setEnrollProg] = useState(null);
  const [enqProg, setEnqProg] = useState(null);
  const [form, setForm] = useState({ parentName: '', phone: '', childName: '', childAge: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

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
          <div className="inline-flex px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold mb-4 animate-fade-in">
            📍 Maitama · Wuse · Garki · Asokoro · Jabi · Gwarinpa
          </div>
          <h1 className="font-serif text-[clamp(2rem,5vw,3rem)] leading-[1.08] mb-3 animate-fade-in">
            Give your child <span className="text-teal-primary">skills that last</span> a lifetime
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed max-w-lg mx-auto mb-5 animate-fade-in">
            Swimming · Football · Taekwondo · Piano · Tennis · Coding — vetted coaches at trusted Abuja venues.
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
            {c.sponsor?.name && <span className="text-[8px] text-slate-400">by {c.sponsor.name}</span>}
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
          <h2 className="font-serif text-[clamp(1.4rem,3vw,1.8rem)] text-center mb-6">Programs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {programs.map((prog) => {
              const cat = prog.categoryId;
              const coach = prog.coachId;
              const total = prog.pricePerSession * prog.sessions;
              const tax = Math.round(total * VAT);
              const spots = prog.spotsTotal - prog.spotsTaken;
              const sup = SUPERVISION_MAP[prog.supervision];
              return (
                <div key={prog._id} className="card animate-fade-in">
                  <div className="h-12 flex items-center justify-between px-3.5" style={{ background: `${cat?.color}08` }}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">{cat?.icon}</span>
                      <div>
                        <div className="text-[8px] font-bold uppercase" style={{ color: cat?.color }}>{cat?.name}</div>
                        <span className="font-serif text-sm">{prog.name}</span>
                      </div>
                    </div>
                    {spots <= 0 ? <span className="badge badge-red">FULL</span> : spots <= 3 ? <span className="badge badge-amber">{spots} left</span> : <span className="badge badge-green">{spots} spots</span>}
                  </div>
                  <div className="p-3.5 pt-2.5 space-y-1.5">
                    <div className="text-[10px] text-slate-500 leading-relaxed">
                      <div>📍 {prog.location} · Ages {prog.ageRange}</div>
                      <div>👤 <Link href={`/coaches/${coach?.slug}`} className="font-semibold hover:underline" style={{ color: cat?.color }}>{coach?.name}</Link>{' '}<ShieldBadge level={coach?.shieldLevel} /></div>
                      <div>📅 {prog.schedule} · {prog.duration}min · {prog.groupSize}</div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-50 text-[9px] text-amber-800">{sup?.icon} {sup?.label}</div>
                    <div className="flex items-end justify-between pt-1">
                      <div>
                        <div className="font-serif text-lg">{fmt(total)}</div>
                        <div className="text-[8px] text-slate-400">+ {fmt(tax)} VAT · {prog.sessions} sessions</div>
                      </div>
                      <div className="flex gap-1">
                        <a href={waLink(coach?.whatsapp || WA_BIZ, `Question about "${prog.name}".`)} target="_blank" rel="noopener noreferrer" className="btn-sm bg-[#25D366] text-white rounded-lg text-[10px] font-semibold px-2 py-1 inline-flex items-center">💬</a>
                        <button onClick={() => setEnrollProg(prog)} className="btn-primary btn-sm">Enroll Now</button>
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

      {/* School CTA */}
      <section className="px-5 pb-10 max-w-2xl mx-auto">
        <div className="card p-6 bg-amber-50 border-amber-200/60 text-center">
          <div className="text-2xl mb-1">🏫</div>
          <h2 className="font-serif text-xl mb-1">Are You a School P.E. Teacher?</h2>
          <p className="text-slate-500 text-xs leading-relaxed max-w-md mx-auto mb-4">Outsource swimming, football, martial arts & more. Your staff chaperones — we handle coaching.</p>
          <div className="flex gap-2 justify-center">
            <Link href="/dashboard/school" className="btn-primary btn-sm">School Portal →</Link>
            <a href={waLink(WA_BIZ, 'Hi! P.E. teacher interested in SkillPadi.')} target="_blank" rel="noopener noreferrer" className="btn-whatsapp btn-sm">💬 Chat</a>
          </div>
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

      {/* Footer */}
      <footer className="py-4 px-5 border-t border-slate-200/60 text-center">
        <p className="text-[8px] text-slate-400">© 2025 SkillPadi · Abuja · VAT 7.5%</p>
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
