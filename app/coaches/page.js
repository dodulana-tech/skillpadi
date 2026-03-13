import dbConnect from '@/lib/db';
import Coach from '@/models/Coach';
import Category from '@/models/Category';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

const fmt = (n) => `\u20A6${Number(n).toLocaleString()}`;
const WA_BIZ = process.env.NEXT_PUBLIC_WA_BUSINESS || '234XXXXXXXXXX';

export const metadata = {
  title: 'Our Coaches | SkillPadi',
  description: 'Meet SkillPadi\'s vetted coaches. Every coach passes our 14-point background check. Swimming, football, martial arts, music, coding and more.',
};

export default async function CoachesPage() {
  await dbConnect();

  const [coaches, categories] = await Promise.all([
    Coach.find({ isActive: true })
      .populate('categoryId', 'name slug icon color')
      .sort({ featuredOrder: 1, rating: -1 })
      .lean(),
    Category.find({ active: true }).sort({ order: 1 }).lean(),
  ]);

  const VETTING_TIERS = [
    { label: 'Identity & Background', items: ['NIN verification', 'Police clearance', 'Address verified', 'Photo match'] },
    { label: 'Professional Credentials', items: ['Coaching certification', 'Experience verified', 'References checked'] },
    { label: 'Child Safety', items: ['First aid certified', 'Safeguarding training', 'Sport safety certified'] },
    { label: 'Ongoing Trust', items: ['Re-verification', 'Insurance active', 'Rating maintained', 'No incident history'] },
  ];

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-14 px-5 text-center bg-gradient-to-b from-teal-50/60 to-cream">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold uppercase tracking-wider mb-4">
            14-Point Vetted
          </div>
          <h1 className="font-serif text-[clamp(2rem,5vw,3rem)] leading-[1.08] mb-4">
            Coaches your children will <span className="text-teal-primary">love</span>
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed max-w-xl mx-auto mb-7">
            Every SkillPadi coach is background-checked, credential-verified, and safeguarding-trained.
            They don&apos;t just teach skills — they inspire confidence.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/#programs" className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:-translate-y-0.5 transition-all">
              Browse Programs
            </Link>
            <Link href="/coaches/join" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-teal-700 text-sm font-semibold rounded-xl border border-teal-200 hover:-translate-y-0.5 transition-all">
              Become a Coach
            </Link>
          </div>
        </div>
      </section>

      {/* Trust stats */}
      <div className="border-y border-slate-200/60 bg-white py-5 px-5">
        <div className="max-w-3xl mx-auto flex justify-center gap-10 flex-wrap">
          {[
            { v: String(coaches.length), l: 'Active coaches' },
            { v: String(categories.length), l: 'Skill categories' },
            { v: '14', l: 'Point vetting' },
            { v: '4.9', l: 'Avg. rating' },
          ].map(s => (
            <div key={s.l} className="text-center">
              <div className="font-serif text-2xl text-teal-700">{s.v}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Coach grid by category */}
      <section className="py-14 px-5">
        <div className="max-w-5xl mx-auto">
          {categories.filter(cat => coaches.some(c => String(c.categoryId?._id || c.categoryId) === String(cat._id))).map(cat => {
            const catCoaches = coaches.filter(c => String(c.categoryId?._id || c.categoryId) === String(cat._id));
            return (
              <div key={cat._id} className="mb-12 last:mb-0">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">{cat.icon}</span>
                  <h2 className="font-serif text-lg">{cat.name}</h2>
                  <span className="text-[10px] text-slate-400 ml-1">{catCoaches.length} coach{catCoaches.length !== 1 ? 'es' : ''}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catCoaches.map(c => {
                    const catData = c.categoryId || cat;
                    const shieldColor = c.shieldLevel === 'certified' ? 'bg-emerald-50 text-emerald-700' : c.shieldLevel === 'verified' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700';
                    return (
                      <Link key={c._id} href={`/coaches/${c.slug}`}
                        className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all group">
                        {/* Colored top band */}
                        <div className="h-1.5" style={{ background: catData.color || '#0F766E' }} />
                        <div className="p-5">
                          <div className="flex items-start gap-3 mb-3">
                            {/* Avatar */}
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                              style={{ background: `linear-gradient(135deg, ${catData.color || '#0F766E'}, ${catData.color || '#0F766E'}88)` }}>
                              {c.initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm group-hover:text-teal-primary transition-colors truncate">{c.name}</div>
                              <div className="text-[10px] truncate" style={{ color: catData.color || '#64748b' }}>
                                {c.title || `${catData.name} Coach`}
                              </div>
                            </div>
                          </div>

                          {/* Badges */}
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${shieldColor}`}>
                              {c.shieldLevel === 'certified' ? '🛡️ Certified' : c.shieldLevel === 'verified' ? '🛡️ Verified' : '🛡️ In Progress'}
                            </span>
                            {c.coachTier === 'master' && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">Master</span>
                            )}
                            {c.coachTier === 'independent' && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Independent</span>
                            )}
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-3 text-[10px] text-slate-400">
                            {c.rating > 0 && <span className="font-medium">⭐ {c.rating.toFixed(1)}</span>}
                            {c.yearsExperience > 0 && <span>{c.yearsExperience} yrs</span>}
                            {c.ageGroups && <span>Ages {c.ageGroups}</span>}
                            {c.city && <span className="capitalize">{c.city}</span>}
                          </div>

                          {/* Bio preview */}
                          {c.bio && (
                            <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">{c.bio}</p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {coaches.length === 0 && (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">🏅</div>
              <h2 className="font-serif text-xl mb-2">Coaches coming soon</h2>
              <p className="text-sm text-slate-500 mb-6">We&apos;re vetting our first batch of coaches. Want to be one of them?</p>
              <Link href="/coaches/join" className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white text-sm font-semibold rounded-xl">
                Apply to Coach
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Vetting process */}
      <section className="py-14 px-5 bg-white border-t border-slate-200/60">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-[9px] uppercase font-bold text-teal-600 tracking-wider mb-1">Our Standard</div>
            <h2 className="font-serif text-[1.7rem] mb-2">The 14-point vetting process</h2>
            <p className="text-slate-500 text-sm">Before a coach teaches your child, they pass every one of these checks.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {VETTING_TIERS.map((tier, i) => (
              <div key={tier.label} className="bg-cream rounded-2xl border border-slate-200/60 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200/60 flex items-center justify-center text-xs font-bold text-teal-700">
                    T{i + 1}
                  </div>
                  <div className="font-bold text-xs">{tier.label}</div>
                </div>
                <div className="space-y-1.5">
                  {tier.items.map(item => (
                    <div key={item} className="flex items-center gap-2 text-[11px] text-slate-600">
                      <span className="text-emerald-500 text-xs">✓</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shield levels */}
      <section className="py-12 px-5 border-t border-slate-200/60">
        <div className="max-w-3xl mx-auto">
          <h3 className="font-serif text-lg text-center mb-6">What the shield means</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { level: 'In Progress', icon: '🛡️', color: 'bg-amber-50 border-amber-200', desc: 'Coach is undergoing our vetting process. They can be booked but vetting is not yet complete.' },
              { level: 'Verified', icon: '🛡️', color: 'bg-blue-50 border-blue-200', desc: 'Identity confirmed and professional credentials verified. Tiers 1 & 2 complete.' },
              { level: 'Certified', icon: '🛡️', color: 'bg-emerald-50 border-emerald-200', desc: 'All 14 checks passed including child safety and ongoing trust. Our highest standard.' },
            ].map(s => (
              <div key={s.level} className={`rounded-xl border p-5 text-center ${s.color}`}>
                <div className="text-2xl mb-2">{s.icon}</div>
                <div className="font-bold text-sm mb-1">{s.level}</div>
                <p className="text-[10px] text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Three tiers CTA */}
      <section className="py-14 px-5 bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-[9px] uppercase font-bold text-teal-400 tracking-wider mb-2">For Coaches</div>
          <h2 className="font-serif text-[1.7rem] mb-3">Three ways to coach with us</h2>
          <p className="text-slate-300 text-sm mb-8 max-w-lg mx-auto">
            Whether you&apos;re just starting out or running your own academy, there&apos;s a tier for you.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { tier: 'Partner', fee: '15%', desc: 'We set pricing, find venues, and fill your classes. You just coach.', badge: 'Most coaches start here' },
              { tier: 'Independent', fee: '15%', desc: 'Set your own rates, create your own programmes. We handle the rest.', badge: 'For established coaches' },
              { tier: 'Master', fee: '10%', desc: 'Build your academy on SkillPadi. Branded methodology, multiple coaches.', badge: 'By invitation' },
            ].map(t => (
              <div key={t.tier} className="bg-white/10 backdrop-blur rounded-xl p-5 border border-white/10 text-left">
                <div className="text-[8px] font-bold text-teal-400 uppercase tracking-wider mb-1">{t.badge}</div>
                <div className="font-serif text-base mb-1">{t.tier} Coach</div>
                <p className="text-[10px] text-slate-400 mb-3">{t.desc}</p>
                <div className="text-xs font-semibold text-white">Platform fee: {t.fee}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/coaches/join" className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-500 transition-colors">
              Join as a Coach
            </Link>
            <a href={`https://wa.me/${WA_BIZ}?text=${encodeURIComponent("Hi! I'm interested in coaching with SkillPadi.")}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white text-sm font-semibold rounded-xl hover:bg-white/20 transition-colors border border-white/20">
              Chat With Us
            </a>
          </div>
        </div>
      </section>

      {/* Parent trust strip */}
      <section className="py-8 px-5 bg-white border-t border-slate-200/60">
        <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-6 text-[10px] text-slate-400">
          <span>✓ Every coach background-checked</span>
          <span>✓ First aid certified</span>
          <span>✓ Safeguarding trained</span>
          <span>✓ Re-verified every 6 months</span>
          <span>✓ Insured sessions available</span>
        </div>
      </section>
    </main>
  );
}
