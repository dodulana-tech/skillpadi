import Link from 'next/link';
import Navbar from '@/components/Navbar';

const fmt = (n) => `₦${Number(n).toLocaleString()}`;

const SCHOOL_BENEFITS = [
  { icon: '🏃', title: 'Ready-made coaches', body: 'We source, vet, and insure every coach. You never deal with hiring, screening, or payroll.' },
  { icon: '📋', title: 'Structured curriculum', body: 'Term-based programs with weekly lesson plans, progress milestones, and end-of-term reports — already built.' },
  { icon: '📊', title: 'Parent dashboard', body: 'Parents track their child\'s progress, attendance, and achievements in real time. Fewer admin calls for you.' },
  { icon: '💰', title: 'Revenue share', body: 'Set your own markup (up to 50%). SkillPadi collects, handles VAT, and pays your share monthly.' },
];

const ESTATE_BENEFITS = [
  { icon: '🏊', title: 'Activate your facilities', body: 'Pools, courts, and open spaces that sit idle can become income-generating hubs for your residents.' },
  { icon: '🏷️', title: 'Resident discounts', body: 'Your residents get exclusive pricing — a tangible amenity that adds real value to living in your estate.' },
  { icon: '💵', title: 'Revenue share', body: 'Earn on every enrollment made by your residents. No upfront cost — we set everything up.' },
  { icon: '🔒', title: 'No logistics headache', body: 'We handle coach scheduling, parent comms, payments, and progress tracking end to end.' },
];

const HOW_SCHOOL = [
  { n: '01', t: 'Apply online', d: 'Fill out a short partnership form — takes under 5 minutes.' },
  { n: '02', t: 'We onboard you', d: 'Our team sets up your school account, programs, and pricing within 48 hours.' },
  { n: '03', t: 'Coaches show up', d: 'Vetted coaches run sessions at your venue on an agreed schedule.' },
  { n: '04', t: 'You earn monthly', d: 'Your markup is calculated and paid directly to your account each month.' },
];

const HOW_ESTATE = [
  { n: '01', t: 'Apply online', d: 'Tell us about your estate and what facilities you have.' },
  { n: '02', t: 'We set it up', d: 'We map your spaces to available programs and configure resident pricing.' },
  { n: '03', t: 'Residents enroll', d: 'Parents in your estate book directly through the SkillPadi platform.' },
  { n: '04', t: 'You earn passively', d: 'Revenue share is tracked and paid monthly with a full breakdown.' },
];

export default function PartnersPage() {
  return (
    <main className="min-h-screen bg-cream">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-14 px-5 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold uppercase tracking-wider mb-4">
            🤝 Partner With SkillPadi
          </div>
          <h1 className="font-serif text-[clamp(2rem,5vw,3rem)] leading-[1.08] mb-4">
            Bring world-class skills training<br />to your school or estate
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed max-w-xl mx-auto mb-7">
            We handle the coaches, the curriculum, the parent comms, and the payments.
            You provide the venue and the community — and earn a revenue share on every enrollment.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/schools/join" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:-translate-y-0.5 transition-all">
              🏫 Start a School Partnership
            </Link>
            <Link href="/communities/join" className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:-translate-y-0.5 transition-all">
              🏘️ Bring SkillPadi to Your Estate
            </Link>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <div className="border-y border-slate-200/60 bg-white py-6 px-5">
        <div className="max-w-3xl mx-auto flex justify-center gap-10 flex-wrap">
          {[
            { v: '150+', l: 'Kids enrolled' },
            { v: '10+', l: 'Partner locations' },
            { v: '6', l: 'Skill categories' },
            { v: '24h', l: 'Onboarding time' },
          ].map(s => (
            <div key={s.l} className="text-center">
              <div className="font-serif text-2xl text-teal-700">{s.v}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FOR SCHOOLS ── */}
      <section className="py-14 px-5">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🏫</span>
            <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">For Schools</div>
          </div>
          <h2 className="font-serif text-[1.7rem] mb-2">Structured P.E. &amp; extracurriculars — delivered</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-xl">
            Whether you want to enhance your P.E. programme or offer after-school activities, SkillPadi plugs in seamlessly.
            You set the markup. We handle everything else.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {SCHOOL_BENEFITS.map(b => (
              <div key={b.title} className="bg-white rounded-2xl border border-slate-200/60 p-5">
                <div className="text-2xl mb-2">{b.icon}</div>
                <div className="font-semibold text-sm mb-1">{b.title}</div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 text-white rounded-2xl p-6 mb-8">
            <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-4">How it works</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {HOW_SCHOOL.map(s => (
                <div key={s.n}>
                  <div className="text-[9px] font-bold text-teal-400 tracking-wider mb-1">STEP {s.n}</div>
                  <div className="font-semibold text-xs mb-1">{s.t}</div>
                  <div className="text-[10px] text-slate-400 leading-snug">{s.d}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-teal-50 border border-teal-200/60 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="font-semibold text-sm text-teal-900 mb-0.5">Ready to partner?</div>
              <p className="text-[11px] text-teal-700">Application takes under 5 minutes. We&apos;ll WhatsApp you within 24 hours.</p>
            </div>
            <Link href="/schools/join" className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl whitespace-nowrap hover:-translate-y-0.5 transition-all">
              Let&apos;s Go →
            </Link>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-slate-200/60 mx-5" />

      {/* ── FOR ESTATES ── */}
      <section className="py-14 px-5">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🏘️</span>
            <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">For Estates &amp; Communities</div>
          </div>
          <h2 className="font-serif text-[1.7rem] mb-2">Turn your common areas into skill-building hubs</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-xl">
            Your pool, tennis court, or open field can generate income for the estate while giving resident families
            an exclusive benefit they&apos;ll love.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {ESTATE_BENEFITS.map(b => (
              <div key={b.title} className="bg-white rounded-2xl border border-slate-200/60 p-5">
                <div className="text-2xl mb-2">{b.icon}</div>
                <div className="font-semibold text-sm mb-1">{b.title}</div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>

          <div className="bg-emerald-900 text-white rounded-2xl p-6 mb-8">
            <div className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider mb-4">How it works</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {HOW_ESTATE.map(s => (
                <div key={s.n}>
                  <div className="text-[9px] font-bold text-emerald-400 tracking-wider mb-1">STEP {s.n}</div>
                  <div className="font-semibold text-xs mb-1">{s.t}</div>
                  <div className="text-[10px] text-emerald-200 leading-snug">{s.d}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200/60 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="font-semibold text-sm text-emerald-900 mb-0.5">Interested?</div>
              <p className="text-[11px] text-emerald-700">Apply online or WhatsApp us — we&apos;ll walk you through the setup.</p>
            </div>
            <Link href="/communities/join" className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 text-white text-xs font-semibold rounded-xl whitespace-nowrap hover:-translate-y-0.5 transition-all">
              Let&apos;s Go →
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 px-5 bg-white border-t border-slate-200/60">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-serif text-[1.5rem] mb-7 text-center">Common questions</h2>
          <div className="space-y-5">
            {[
              { q: 'Is there a cost to become a partner?', a: 'No upfront cost. SkillPadi earns from the base program fees; you earn from your markup. We only succeed when enrollments happen.' },
              { q: 'What categories are available?', a: 'Swimming, football, taekwondo, tennis, coding, chess, piano, and more. We match what\'s available to what your facilities support.' },
              { q: 'Do we need to provide coaches?', a: 'No. SkillPadi sources, vets, and insures all coaches. You only provide the venue.' },
              { q: 'How are we paid?', a: 'Monthly, directly to your bank account. You get a full breakdown of enrollments, program revenue, and your share.' },
              { q: 'How long does onboarding take?', a: 'Typically 24–48 hours after your application is reviewed. We\'ll WhatsApp you to confirm and collect any details we need.' },
            ].map(f => (
              <div key={f.q} className="border-b border-slate-100 pb-5">
                <div className="font-semibold text-sm mb-1">{f.q}</div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-12 px-5 text-center">
        <div className="max-w-lg mx-auto">
          <h2 className="font-serif text-[1.5rem] mb-2">Let&apos;s build this together</h2>
          <p className="text-slate-500 text-sm mb-6">Any questions before applying? Chat with us on WhatsApp — we respond fast.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/schools/join" className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:-translate-y-0.5 transition-all">
              🏫 Start School Partnership
            </Link>
            <Link href="/communities/join" className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 text-white text-xs font-semibold rounded-xl hover:-translate-y-0.5 transition-all">
              🏘️ Bring SkillPadi to Your Estate
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
