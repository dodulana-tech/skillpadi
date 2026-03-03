import dbConnect from '@/lib/db';
import Tournament from '@/models/Tournament';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Tournaments | SkillPadi',
  description: 'Compete, grow, and win! Join SkillPadi tournaments for kids across Abuja and Lagos.',
};

const STATUS_BADGE = {
  upcoming: { label: 'Upcoming', cls: 'bg-blue-100 text-blue-700' },
  registration: { label: 'Open', cls: 'bg-green-100 text-green-700' },
  'in-progress': { label: 'Live 🔴', cls: 'bg-red-100 text-red-700' },
  completed: { label: 'Ended', cls: 'bg-slate-100 text-slate-500' },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-400' },
};

export default async function TournamentsPage() {
  await dbConnect();

  const tournaments = await Tournament.find({ isActive: true })
    .populate('categoryId', 'name slug icon color')
    .sort({ date: 1 })
    .lean();

  const open = tournaments.filter(t => t.status === 'registration');
  const upcoming = tournaments.filter(t => t.status === 'upcoming');
  const past = tournaments.filter(t => ['completed', 'in-progress'].includes(t.status));

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="text-4xl mb-3">🏆</div>
          <h1 className="font-serif text-3xl mb-2">Tournaments</h1>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Compete with kids across Abuja and Lagos. Build confidence, make friends, and win badges.
          </p>
        </div>

        {/* Open registrations */}
        {open.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <h2 className="font-bold text-sm">Registration Open</h2>
            </div>
            <div className="space-y-3">
              {open.map(t => <TournamentCard key={t._id} t={t} highlight />)}
            </div>
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div className="mb-8">
            <h2 className="font-bold text-sm mb-3">Coming Soon</h2>
            <div className="space-y-3">
              {upcoming.map(t => <TournamentCard key={t._id} t={t} />)}
            </div>
          </div>
        )}

        {/* Past / Live */}
        {past.length > 0 && (
          <div>
            <h2 className="font-bold text-sm mb-3 text-slate-400">Past & Live</h2>
            <div className="space-y-3">
              {past.map(t => <TournamentCard key={t._id} t={t} />)}
            </div>
          </div>
        )}

        {tournaments.length === 0 && (
          <div className="card p-10 text-center text-slate-400 text-sm">
            No tournaments yet — check back soon!
          </div>
        )}
      </div>
    </main>
  );
}

function TournamentCard({ t, highlight }) {
  const cat = t.categoryId || {};
  const sb = STATUS_BADGE[t.status] || STATUS_BADGE.upcoming;
  const spotsLeft = t.maxTeams ? t.maxTeams - (t.teams?.length || 0) : null;
  const dateStr = t.date ? new Date(t.date).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'TBC';

  return (
    <Link href={`/tournaments/${t.slug || t._id}`}>
      <div className={`card p-4 hover:shadow-md transition-shadow cursor-pointer ${highlight ? 'border-green-300/60 bg-green-50/20' : ''}`}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 pr-3">
            <div className="flex items-center gap-2 mb-1">
              {cat.icon && <span className="text-lg">{cat.icon}</span>}
              <h3 className="font-serif text-base leading-tight">{t.name}</h3>
            </div>
            <div className="text-[10px] text-slate-500 space-y-0.5">
              <div>📅 {dateStr}</div>
              {t.venue && <div>📍 {t.venue}</div>}
              {t.city && <div className="capitalize">🏙️ {t.city}</div>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${sb.cls}`}>{sb.label}</span>
            {t.entryFee === 0 ? (
              <span className="text-[9px] font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">Free</span>
            ) : t.entryFee ? (
              <span className="text-[9px] font-semibold text-slate-600">₦{Number(t.entryFee).toLocaleString()}</span>
            ) : null}
          </div>
        </div>

        <div className="flex gap-4 text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-50">
          <span>👥 {t.teams?.length || 0} teams{t.maxTeams ? ` / ${t.maxTeams}` : ''}</span>
          {spotsLeft !== null && spotsLeft > 0 && <span className="text-green-600 font-semibold">{spotsLeft} spots left</span>}
          {spotsLeft === 0 && <span className="text-red-500 font-semibold">Full</span>}
          {t.type && <span className="capitalize">{t.type}</span>}
        </div>
      </div>
    </Link>
  );
}
