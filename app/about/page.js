import Link from 'next/link';
import Navbar from '@/components/Navbar';

const VALUES = [
  { icon: '🛡️', title: 'Safety first', body: 'Every coach goes through a 14-point vetting process — credentials, background, first aid, and parent reviews.' },
  { icon: '📈', title: 'Progress over performance', body: 'We track milestones, not just medals. Every child moves at their own pace with structured goals.' },
  { icon: '🌍', title: 'Built for Nigeria', body: 'Pricing, scheduling, and supervision models designed for how Nigerian families actually live.' },
  { icon: '🤝', title: 'Community-led', body: 'We grow through schools, estates, and neighbourhoods — not just individual sign-ups.' },
];

const TEAM = [
  // Replace with real team members
  { name: 'Founder Name', role: 'Co-Founder & CEO', bio: 'Short bio here — background, passion, or fun fact.', initials: 'F', color: '#0F766E' },
  { name: 'Founder Name', role: 'Co-Founder & CTO', bio: 'Short bio here — background, passion, or fun fact.', initials: 'F', color: '#0891B2' },
  { name: 'Team Member', role: 'Head of Operations', bio: 'Short bio here — background, passion, or fun fact.', initials: 'T', color: '#7C3AED' },
  { name: 'Team Member', role: 'Head of Partnerships', bio: 'Short bio here — background, passion, or fun fact.', initials: 'T', color: '#D97706' },
];

const MILESTONES = [
  { year: '2024', event: 'SkillPadi founded in Abuja' },
  { year: '2024', event: 'First 10 coaches onboarded and vetted' },
  { year: '2025', event: '150+ kids enrolled across 6 categories' },
  { year: '2025', event: 'School and estate partnership programme launched' },
  { year: '2026', event: 'Expanding to Lagos' },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-cream">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-12 px-5 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold uppercase tracking-wider mb-4">
            Our Story
          </div>
          <h1 className="font-serif text-[clamp(2rem,5vw,3rem)] leading-[1.08] mb-4">
            Skills that last a lifetime,<br />starting in Nigeria
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed max-w-xl mx-auto">
            SkillPadi started with a simple frustration: finding good, consistent, affordable skills coaching for kids in Abuja
            was harder than it should be. We built the platform we wished existed.
          </p>
        </div>
      </section>

      {/* Mission strip */}
      <div className="bg-teal-700 text-white py-10 px-5 text-center">
        <div className="max-w-xl mx-auto">
          <div className="text-[9px] uppercase font-bold tracking-wider text-teal-300 mb-2">Our Mission</div>
          <p className="font-serif text-[1.4rem] leading-snug">
            Make world-class skills coaching accessible to every Nigerian child — regardless of where they live or what their school offers.
          </p>
        </div>
      </div>

      {/* Values */}
      <section className="py-14 px-5">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-[1.5rem] text-center mb-8">What we stand for</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {VALUES.map(v => (
              <div key={v.title} className="bg-white rounded-2xl border border-slate-200/60 p-5">
                <div className="text-2xl mb-2">{v.icon}</div>
                <div className="font-semibold text-sm mb-1">{v.title}</div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-10 px-5 bg-white border-t border-b border-slate-200/60">
        <div className="max-w-lg mx-auto">
          <h2 className="font-serif text-[1.5rem] text-center mb-8">Our journey</h2>
          <div className="relative pl-6 border-l-2 border-teal-200 space-y-6">
            {MILESTONES.map((m, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[1.65rem] w-3 h-3 rounded-full bg-teal-500 border-2 border-white top-0.5" />
                <div className="text-[9px] font-bold text-teal-600 uppercase tracking-wider mb-0.5">{m.year}</div>
                <div className="text-sm font-medium text-slate-800">{m.event}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-14 px-5">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-[1.5rem] text-center mb-2">Meet the team</h2>
          <p className="text-slate-500 text-xs text-center mb-8">The people building SkillPadi</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TEAM.map((m) => (
              <div key={m.name + m.role} className="bg-white rounded-2xl border border-slate-200/60 p-5 flex gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white shrink-0"
                  style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}aa)` }}
                >
                  {m.initials}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-900">{m.name}</div>
                  <div className="text-[10px] font-semibold text-teal-600 mb-1">{m.role}</div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{m.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coaches CTA */}
      <section className="py-10 px-5 bg-gradient-to-b from-slate-50 to-cream border-t border-slate-200/60">
        <div className="max-w-2xl mx-auto text-center">
          <div className="font-serif text-[1.3rem] mb-2">Backed by great coaches</div>
          <p className="text-slate-500 text-sm mb-5">
            Every coach on SkillPadi is vetted, trained, and reviewed by parents.
            Our coaching team is the backbone of what we do.
          </p>
          <Link href="/#coaches" className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white text-xs font-semibold rounded-xl hover:-translate-y-0.5 transition-all">
            Meet Our Coaches →
          </Link>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="py-12 px-5 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="font-serif text-[1.4rem] mb-2">Get your child started</h2>
          <p className="text-slate-500 text-sm mb-6">Browse programs, find a coach, and enroll in minutes.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/#programs" className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-700 text-white text-xs font-semibold rounded-xl hover:-translate-y-0.5 transition-all">
              Browse Programs →
            </Link>
            <Link href="/partners" className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:-translate-y-0.5 transition-all">
              Partner With Us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
