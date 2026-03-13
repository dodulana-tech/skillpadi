import Link from 'next/link';
import Navbar from '@/components/Navbar';
import dbConnect from '@/lib/db';
import ImpactProgram from '@/models/ImpactProgram';
import Donation from '@/models/Donation';
import Coach from '@/models/Coach';

const fmt = (n) => `\u20A6${Number(n).toLocaleString()}`;
const WA_BIZ = process.env.NEXT_PUBLIC_WA_BUSINESS || '234XXXXXXXXXX';

export const metadata = {
  title: 'SkillPadi Impact | Skills for Every Child',
  description: 'Help fund free skills coaching for underserved kids across Nigeria. Every donation goes directly to programme delivery.',
};

export default async function ImpactPage() {
  await dbConnect();

  const programs = await ImpactProgram.find({ status: { $in: ['funding', 'active', 'completed'] } })
    .populate('categoryId', 'name icon color')
    .populate('coachId', 'name slug initials')
    .sort({ status: 1, createdAt: -1 })
    .lean();

  const totalDonations = await Donation.aggregate([
    { $match: { paymentStatus: 'success' } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  const donationStats = totalDonations[0] || { total: 0, count: 0 };

  const totalChildrenReached = programs.reduce((sum, p) => sum + (p.enrolled || 0), 0);
  const communitiesServed = [...new Set(programs.map(p => p.community).filter(Boolean))].length;
  const volunteerCoaches = await Coach.countDocuments({ givesBack: true, isActive: true });

  const fundingPrograms = programs.filter(p => p.status === 'funding');
  const activePrograms = programs.filter(p => p.status === 'active');
  const completedPrograms = programs.filter(p => p.status === 'completed');

  const recentDonors = await Donation.find({ paymentStatus: 'success' })
    .sort({ createdAt: -1 })
    .limit(8)
    .select('donorName amount isAnonymous programId createdAt')
    .populate('programId', 'name slug')
    .lean();

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
            <a href="#programmes" className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:-translate-y-0.5 transition-all">
              Donate Now
            </a>
            <a href="#sponsor" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:-translate-y-0.5 transition-all">
              Corporate Sponsorship
            </a>
          </div>
        </div>
      </section>

      {/* Live Stats */}
      <div className="border-y border-slate-200/60 bg-white py-6 px-5">
        <div className="max-w-3xl mx-auto flex justify-center gap-10 flex-wrap">
          {[
            { v: totalChildrenReached > 0 ? `${totalChildrenReached}+` : '0', l: 'Children reached' },
            { v: String(communitiesServed || 0), l: 'Communities served' },
            { v: donationStats.total > 0 ? fmt(donationStats.total) : '\u20A60', l: 'Total raised' },
            { v: String(volunteerCoaches || 0), l: 'Volunteer coaches' },
          ].map(s => (
            <div key={s.l} className="text-center">
              <div className="font-serif text-2xl text-teal-700">{s.v}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Programmes needing funding */}
      {fundingPrograms.length > 0 && (
        <section id="programmes" className="py-14 px-5">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <div className="text-[9px] uppercase font-bold text-teal-600 tracking-wider mb-1">Give Back Programmes</div>
              <h2 className="font-serif text-[1.7rem] mb-2">Programmes needing your support</h2>
              <p className="text-slate-500 text-sm">Pick a programme and donate directly. 100% goes to programme delivery.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fundingPrograms.map(p => {
                const cat = p.categoryId;
                const fundPct = p.totalBudget > 0 ? Math.min(100, Math.round((p.fundedAmount / p.totalBudget) * 100)) : 0;
                return (
                  <Link key={p._id} href={`/impact/${p.slug}`}
                    className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all group">
                    <div className="h-1.5 w-full" style={{ background: cat?.color || '#0F766E' }} />
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{cat?.icon || '💚'}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cat?.color || '#0F766E' }}>{cat?.name || 'Skills'}</span>
                        <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Needs funding</span>
                      </div>
                      <div className="font-semibold text-sm mb-1 group-hover:text-teal-primary transition-colors">{p.name}</div>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                        {p.description || `Free ${cat?.name || 'skills'} coaching for ${p.capacity || 30} kids in ${p.community}`}
                      </p>

                      {/* Funding progress */}
                      <div className="mb-2">
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="font-semibold text-teal-700">{fmt(p.fundedAmount || 0)} raised</span>
                          <span className="text-slate-400">of {fmt(p.totalBudget)}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{
                            width: `${fundPct}%`,
                            background: `linear-gradient(90deg, ${cat?.color || '#0F766E'}, ${cat?.color || '#0F766E'}88)`,
                          }} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{p.community}, {p.city === 'lagos' ? 'Lagos' : 'Abuja'}</span>
                        <span>{p.capacity || 30} kids</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Active programmes */}
      {activePrograms.length > 0 && (
        <section className={`py-14 px-5 ${fundingPrograms.length === 0 ? '' : 'bg-white border-t border-slate-200/60'}`}
          id={fundingPrograms.length === 0 ? 'programmes' : undefined}>
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <div className="text-[9px] uppercase font-bold text-emerald-600 tracking-wider mb-1">Running Now</div>
              <h2 className="font-serif text-[1.7rem] mb-2">Active programmes</h2>
              <p className="text-slate-500 text-sm">These programmes are currently delivering free coaching to kids.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activePrograms.map(p => {
                const cat = p.categoryId;
                return (
                  <Link key={p._id} href={`/impact/${p.slug}`}
                    className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all group">
                    <div className="h-1.5 w-full" style={{ background: cat?.color || '#0F766E' }} />
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{cat?.icon || '💚'}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cat?.color || '#0F766E' }}>{cat?.name || 'Skills'}</span>
                        <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Active</span>
                      </div>
                      <div className="font-semibold text-sm mb-1 group-hover:text-teal-primary transition-colors">{p.name}</div>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                        {p.description || `Free ${cat?.name || 'skills'} coaching for kids in ${p.community}`}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400">
                        <span>{p.community}, {p.city === 'lagos' ? 'Lagos' : 'Abuja'}</span>
                        {p.enrolled > 0 && <span>{p.enrolled} kids enrolled</span>}
                        {p.coachId && <span>Coach {p.coachId.name}</span>}
                      </div>
                      {p.impactStats?.sessionsDelivered > 0 && (
                        <div className="mt-2 flex gap-3 text-[10px]">
                          <span className="font-semibold text-teal-700">{p.impactStats.sessionsDelivered} sessions</span>
                          {p.impactStats.milestonesEarned > 0 && <span className="text-amber-600">{p.impactStats.milestonesEarned} milestones earned</span>}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Completed programmes */}
      {completedPrograms.length > 0 && (
        <section className="py-14 px-5 bg-slate-50 border-t border-slate-200/60">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="font-serif text-[1.3rem] mb-2 text-slate-600">Completed programmes</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {completedPrograms.map(p => {
                const cat = p.categoryId;
                return (
                  <Link key={p._id} href={`/impact/${p.slug}`}
                    className="bg-white/80 rounded-xl border border-slate-200/60 p-4 hover:bg-white transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{cat?.icon || '💚'}</span>
                      <span className="font-semibold text-xs">{p.name}</span>
                      <span className="ml-auto text-[8px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Completed</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {p.community} &middot; {p.enrolled || 0} kids reached &middot; {p.impactStats?.sessionsDelivered || 0} sessions
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Empty state if no programmes */}
      {programs.length === 0 && (
        <section id="programmes" className="py-14 px-5">
          <div className="max-w-lg mx-auto text-center">
            <div className="text-4xl mb-4">💚</div>
            <h2 className="font-serif text-[1.5rem] mb-2">Programmes launching soon</h2>
            <p className="text-slate-500 text-sm mb-6">
              We&apos;re preparing our first Give Back programmes. Want to propose a programme for your community?
            </p>
            <a href={`https://wa.me/${WA_BIZ}?text=${encodeURIComponent('Hi! I\'d like to propose a Give Back programme for my community.')}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:-translate-y-0.5 transition-all">
              Propose a Programme
            </a>
          </div>
        </section>
      )}

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

      {/* Recent donors wall */}
      {recentDonors.length > 0 && (
        <section className="py-12 px-5 border-t border-slate-200/60">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-[1.3rem] text-center mb-6">Recent Supporters</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {recentDonors.map((d, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200/60 p-3 text-center">
                  <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm mx-auto mb-2">
                    {d.isAnonymous ? '?' : (d.donorName || 'S')[0].toUpperCase()}
                  </div>
                  <div className="text-xs font-medium truncate">{d.isAnonymous ? 'Anonymous' : d.donorName || 'Supporter'}</div>
                  <div className="text-[10px] font-bold text-teal-primary mt-0.5">{fmt(d.amount)}</div>
                  {d.programId && (
                    <div className="text-[9px] text-slate-400 mt-0.5 truncate">for {d.programId.name}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Corporate Sponsorship CTA */}
      <section id="sponsor" className="py-14 px-5 bg-slate-900 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-[9px] uppercase font-bold text-teal-400 tracking-wider mb-2">For Organisations</div>
          <h2 className="font-serif text-[1.7rem] mb-3">Corporate Sponsorship</h2>
          <p className="text-slate-300 text-sm leading-relaxed mb-6 max-w-lg mx-auto">
            Sponsor a full Give Back programme for your community. Your brand gets visibility, your team gets volunteer opportunities,
            and kids get life-changing skills training. Packages start from {fmt(500000)}.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 max-w-xl mx-auto">
            {[
              { tier: 'Bronze', price: fmt(500000), desc: 'Sponsor 30 kids for one term', color: 'bg-amber-700' },
              { tier: 'Silver', price: fmt(1500000), desc: 'Full programme + equipment', color: 'bg-slate-400' },
              { tier: 'Gold', price: fmt(3000000), desc: 'Named programme + annual report', color: 'bg-amber-400' },
            ].map(t => (
              <div key={t.tier} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
                <div className={`inline-block w-3 h-3 rounded-full ${t.color} mb-2`} />
                <div className="font-bold text-sm">{t.tier}</div>
                <div className="text-teal-400 font-bold text-xs mb-1">{t.price}</div>
                <div className="text-[10px] text-slate-400">{t.desc}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            <a href={`https://wa.me/${WA_BIZ}?text=${encodeURIComponent('Hi! We\'re interested in corporate sponsorship for the Give Back programme.')}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-500 transition-colors">
              Chat With Us
            </a>
            <a href={`mailto:hello@skillpadi.com?subject=${encodeURIComponent('Corporate Give Back Sponsorship')}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white text-sm font-semibold rounded-xl hover:bg-white/20 transition-colors border border-white/20">
              Email Us
            </a>
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
            <a href="#programmes" className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:-translate-y-0.5 transition-all">
              Choose a Programme to Support
            </a>
          </div>
          {donationStats.count > 0 && (
            <p className="text-[10px] text-slate-400 mt-4">
              {donationStats.count} people have donated {fmt(donationStats.total)} so far
            </p>
          )}
        </div>
      </section>

      {/* Propose a programme */}
      <section className="py-10 px-5 bg-teal-50/50 border-t border-teal-100/60 text-center">
        <div className="max-w-md mx-auto">
          <h3 className="font-serif text-lg mb-1">Are you a coach?</h3>
          <p className="text-[11px] text-slate-500 mb-4">
            Want to volunteer your skills and run a free programme in your community? We&apos;ll help you fund it and find the kids.
          </p>
          <a href={`https://wa.me/${WA_BIZ}?text=${encodeURIComponent('Hi! I\'m a coach and I\'d like to propose a Give Back programme for my community.')}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-xs font-semibold rounded-xl hover:-translate-y-0.5 transition-all">
            Propose a Programme
          </a>
        </div>
      </section>
    </main>
  );
}
