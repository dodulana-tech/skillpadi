import { notFound } from 'next/navigation';
import dbConnect from '@/lib/db';
import ImpactProgram from '@/models/ImpactProgram';
import Donation from '@/models/Donation';
import Link from 'next/link';
import DonateSection from './DonateSection';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  await dbConnect();
  const program = await ImpactProgram.findOne({ slug })
    .populate('categoryId', 'name icon')
    .lean();

  if (!program) return { title: 'Programme Not Found | SkillPadi Impact' };

  const title = `${program.name} | SkillPadi Impact`;
  const description = program.description || `Help fund free ${program.categoryId?.name || 'skills'} coaching for kids in ${program.community}`;
  const url = `${process.env.NEXT_PUBLIC_APP_URL || 'https://skillpadi.com'}/impact/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'SkillPadi',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

const fmt = (n) => `\u20A6${Number(n).toLocaleString()}`;

export default async function ImpactProgramPage({ params }) {
  const { slug } = await params;
  await dbConnect();

  const program = await ImpactProgram.findOne({ slug })
    .populate('categoryId', 'name icon color')
    .populate('coachId', 'name slug initials')
    .lean();

  if (!program) return notFound();

  const donations = await Donation.find({ programId: program._id, paymentStatus: 'success' })
    .sort({ createdAt: -1 }).limit(20)
    .select('donorName amount isAnonymous message createdAt').lean();

  const fundingPct = program.totalBudget > 0 ? Math.min(100, Math.round((program.fundedAmount / program.totalBudget) * 100)) : 0;
  const totalDonors = await Donation.countDocuments({ programId: program._id, paymentStatus: 'success' });
  const category = program.categoryId;
  const coach = program.coachId;

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://skillpadi.com'}/impact/${slug}`;
  const shareText = encodeURIComponent(
    `Help fund free ${category?.name || 'skills'} coaching for ${program.capacity || 30} kids in ${program.community}!\n\n${program.name}\n${shareUrl}`
  );

  const budgetItems = [
    { label: 'Equipment', amount: program.budget?.equipment },
    { label: 'Venue', amount: program.budget?.venue },
    { label: 'Transport', amount: program.budget?.transport },
    { label: 'Food & Refreshments', amount: program.budget?.food },
    { label: 'Assistant Stipend', amount: program.budget?.stipend },
    { label: 'Other', amount: program.budget?.other },
  ].filter(b => b.amount > 0);

  // Serialize for client component
  const programId = String(program._id);

  return (
    <main className="min-h-screen bg-cream">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-100">
        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #0F766E, #14B8A6, #CA8A04)' }} />
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-serif text-lg text-teal-primary">SkillPadi</Link>
          <span className="badge bg-green-100 text-green-800 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">Impact</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          {category && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3"
              style={{ backgroundColor: `${category.color}15`, color: category.color }}>
              {category.icon} {category.name}
            </span>
          )}
          <h1 className="font-serif text-2xl sm:text-3xl text-slate-800 mb-2">{program.name}</h1>
          <p className="text-sm text-slate-500">
            Free {category?.name || 'skills'} coaching for kids in <strong>{program.community}</strong>, {program.city === 'lagos' ? 'Lagos' : 'Abuja'}
          </p>
        </div>

        {/* Coach info */}
        {coach && (
          <div className="card p-4 mb-6 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-teal-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
              {coach.initials || coach.name?.[0]}
            </div>
            <div>
              <div className="text-xs text-slate-400">Coach</div>
              <div className="font-semibold text-sm">{coach.name}</div>
              {program.coachDonatesTime && (
                <div className="text-[10px] text-green-600 font-medium mt-0.5">Coaching for free</div>
              )}
            </div>
          </div>
        )}

        {/* Funding progress */}
        <div className="card p-6 mb-6">
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="font-serif text-2xl text-teal-primary">{fmt(program.fundedAmount || 0)}</div>
              <div className="text-xs text-slate-400">raised of {fmt(program.totalBudget)} goal</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-700">{fundingPct}%</div>
              <div className="text-[10px] text-slate-400">{totalDonors} donor{totalDonors !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${fundingPct}%`,
                background: 'linear-gradient(90deg, #0F766E, #14B8A6)',
              }}
            />
          </div>
        </div>

        {/* Story */}
        {program.description && (
          <div className="card p-5 mb-6">
            <h2 className="font-bold text-sm mb-2">The Story</h2>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{program.description}</p>
          </div>
        )}

        {/* Programme details */}
        <div className="card p-5 mb-6">
          <h2 className="font-bold text-sm mb-3">Programme Details</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Community', value: program.community },
              { label: 'City', value: program.city === 'lagos' ? 'Lagos' : 'Abuja' },
              { label: 'Venue', value: program.venue || 'TBD' },
              { label: 'Schedule', value: program.schedule || 'TBD' },
              { label: 'Age Range', value: program.ageRange || 'All ages' },
              { label: 'Capacity', value: `${program.capacity || 30} kids` },
              { label: 'Term Length', value: `${program.termWeeks || 12} weeks` },
              { label: 'Cost Per Child', value: program.costPerChild ? fmt(program.costPerChild) : 'Free' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">{label}</div>
                <div className="text-xs text-slate-700 mt-0.5">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Budget breakdown */}
        {budgetItems.length > 0 && (
          <div className="card p-5 mb-6">
            <h2 className="font-bold text-sm mb-3">Budget Breakdown</h2>
            <div className="space-y-2">
              {budgetItems.map(({ label, amount }) => {
                const pct = program.totalBudget > 0 ? Math.round((amount / program.totalBudget) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{label}</span>
                      <span className="font-semibold">{fmt(amount)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-primary/40 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="border-t border-slate-100 pt-2 mt-2 flex justify-between text-xs font-bold">
                <span>Total</span>
                <span>{fmt(program.totalBudget)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Donate section (client component) */}
        <DonateSection programId={programId} programName={program.name} />

        {/* Recent donors */}
        {donations.length > 0 && (
          <div className="card p-5 mb-6">
            <h2 className="font-bold text-sm mb-3">Recent Supporters ({totalDonors})</h2>
            <div className="space-y-2.5">
              {donations.map((d, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <div className="text-xs font-medium">
                      {d.isAnonymous ? 'Anonymous' : d.donorName || 'Supporter'}
                    </div>
                    {d.message && (
                      <div className="text-[10px] text-slate-400 italic mt-0.5">&quot;{d.message}&quot;</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-teal-primary">{fmt(d.amount)}</div>
                    <div className="text-[9px] text-slate-400">
                      {new Date(d.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Share */}
        <div className="text-center mb-8">
          <a
            href={`https://wa.me/?text=${shareText}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white text-sm font-semibold rounded-xl hover:bg-green-600 transition-colors"
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Share on WhatsApp
          </a>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-400 pb-8">
          <Link href="/" className="hover:text-teal-primary">SkillPadi</Link>
          {' \u00B7 '}
          <Link href="/impact" className="hover:text-teal-primary">More Impact Programmes</Link>
        </div>
      </div>
    </main>
  );
}
