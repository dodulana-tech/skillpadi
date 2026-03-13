import Link from 'next/link';
import Navbar from '@/components/Navbar';

const fmt = (n) => `₦${Number(n).toLocaleString()}`;

export default function ImpactPage() {
  return (
    <main className="min-h-screen bg-cream">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-14 px-5 text-center bg-gradient-to-b from-teal-50/60 to-cream">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider mb-4">
            SkillPadi Impact
          </div>
          <h1 className="font-serif text-[clamp(2rem,5vw,3rem)] leading-[1.08] mb-4">
            Skills for <span className="text-teal-primary">Every Child</span>
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed max-w-xl mx-auto mb-7">
            We believe every child deserves access to quality skills training — regardless of background.
            Through our Give Back programme, we extend SkillPadi&apos;s structured coaching to underserved communities across Nigeria.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a href="#donate" className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:-translate-y-0.5 transition-all">
              Donate
            </a>
            <a href="#programme" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:-translate-y-0.5 transition-all">
              Start a Give Back Programme
            </a>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <div className="border-y border-slate-200/60 bg-white py-6 px-5">
        <div className="max-w-3xl mx-auto flex justify-center gap-10 flex-wrap">
          {[
            { v: '500+', l: 'Children reached' },
            { v: '3', l: 'Communities served' },
            { v: '6', l: 'Skill categories' },
            { v: '20+', l: 'Volunteer coaches' },
          ].map(s => (
            <div key={s.l} className="text-center">
              <div className="font-serif text-2xl text-teal-700">{s.v}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Programme cards placeholder */}
      <section id="programme" className="py-14 px-5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-[9px] uppercase font-bold text-teal-600 tracking-wider mb-1">Give Back Programmes</div>
            <h2 className="font-serif text-[1.7rem] mb-2">Active programmes</h2>
            <p className="text-slate-500 text-sm">Our current impact initiatives across Nigerian communities.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: 'Swim Safe Abuja', desc: 'Free swimming lessons for 120 children in Kuje community. Drowning prevention + water confidence.', cat: 'Swimming', color: '#0891B2', icon: '🏊' },
              { title: 'Goals for Good', desc: 'Weekly football coaching for kids at Dutse Makaranta. Building teamwork and discipline through sport.', cat: 'Football', color: '#16A34A', icon: '⚽' },
              { title: 'Code Abuja', desc: 'Introductory coding workshops for secondary school students. Scratch, Python, and web basics.', cat: 'Coding', color: '#7C3AED', icon: '💻' },
              { title: 'Music Makers', desc: 'Keyboard and percussion classes for children in partner orphanages across FCT.', cat: 'Music', color: '#D97706', icon: '🎹' },
            ].map(p => (
              <div key={p.title} className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
                <div className="h-1.5 w-full" style={{ background: p.color }} />
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{p.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: p.color }}>{p.cat}</span>
                  </div>
                  <div className="font-semibold text-sm mb-1">{p.title}</div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 px-5 bg-white border-t border-slate-200/60">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-[1.5rem] text-center mb-8">How the Give Back Programme works</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { n: '01', t: 'Identify', d: 'We partner with local leaders to find communities where kids lack access to structured activities.' },
              { n: '02', t: 'Fund', d: 'Donations and corporate sponsors fund coach fees, equipment, and starter kits.' },
              { n: '03', t: 'Deliver', d: 'Our vetted coaches run the same structured programs we offer paying families.' },
              { n: '04', t: 'Track', d: 'Kids get passports, earn achievements, and join the leaderboard — just like everyone else.' },
            ].map(s => (
              <div key={s.n} className="text-center">
                <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-sm font-bold text-teal-700 mx-auto mb-2">{s.n}</div>
                <div className="font-bold text-xs mb-0.5">{s.t}</div>
                <div className="text-[10px] text-slate-500 leading-snug">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Donate CTA */}
      <section id="donate" className="py-14 px-5 text-center">
        <div className="max-w-lg mx-auto">
          <h2 className="font-serif text-[1.5rem] mb-2">Support a child&apos;s journey</h2>
          <p className="text-slate-500 text-sm mb-6">
            {fmt(15000)} sponsors one child for a full term of structured coaching. Every contribution — large or small — goes directly to programme delivery.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a href="mailto:hello@skillpadi.com?subject=Give%20Back%20Donation" className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:-translate-y-0.5 transition-all">
              Donate Now
            </a>
            <a href="mailto:hello@skillpadi.com?subject=Corporate%20Give%20Back%20Programme" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:-translate-y-0.5 transition-all">
              Corporate Sponsorship
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
