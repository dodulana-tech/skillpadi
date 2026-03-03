import { notFound } from 'next/navigation';
import dbConnect from '@/lib/db';
import ChildPassport from '@/models/ChildPassport';
import User from '@/models/User';
import Link from 'next/link';

export async function generateMetadata({ params }) {
  const { childName } = await params;
  const name = decodeURIComponent(childName);
  return {
    title: `${name}'s Skill Passport | SkillPadi`,
    description: `See ${name}'s achievements, skill levels, and learning journey on SkillPadi — Nigeria's kids skills platform.`,
    openGraph: {
      title: `${name}'s Skill Passport`,
      description: `${name} is building amazing skills on SkillPadi! Check out their achievements and progress.`,
      siteName: 'SkillPadi',
    },
  };
}

const LEVEL_COLORS = {
  beginner: '#94a3b8',
  explorer: '#60a5fa',
  intermediate: '#2dd4bf',
  advanced: '#a855f7',
  elite: '#f59e0b',
};
const LEVEL_PCT_BASE = { beginner: 0, explorer: 50, intermediate: 150, advanced: 300, elite: 600 };
const NEXT_LEVEL_PTS = { beginner: 50, explorer: 150, intermediate: 300, advanced: 600, elite: 600 };

export default async function PublicPassportPage({ params }) {
  const { userId, childName } = await params;
  const name = decodeURIComponent(childName);

  await dbConnect();

  const [passport, user] = await Promise.all([
    ChildPassport.findOne({ userId, childName: name })
      .populate('achievements.achievementId', 'name description icon points rarity')
      .populate('skillLevels.categoryId', 'name icon color')
      .lean(),
    User.findById(userId, 'name area').lean(),
  ]);

  if (!passport || !user) return notFound();

  const stats = passport.stats || {};
  const skillLevels = passport.skillLevels || [];
  const achievements = passport.achievements || [];

  return (
    <main className="min-h-screen bg-cream flex flex-col items-center py-10 px-4">
      {/* Passport card */}
      <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-xl border border-slate-200/60">
        {/* Header */}
        <div className="bg-gradient-to-br from-teal-600 to-teal-800 px-6 py-6 text-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="font-serif text-2xl leading-tight">{name}</div>
              <div className="text-teal-200 text-xs mt-1">SkillPadi Skill Passport</div>
              {user.area && (
                <div className="text-teal-300 text-[10px] mt-0.5">📍 {user.area}</div>
              )}
            </div>
            <div className="text-4xl opacity-70">🛂</div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 bg-white/10 rounded-xl p-3">
            {[
              { label: 'Sessions', value: stats.totalSessions || 0 },
              { label: 'Hours', value: stats.totalHours || 0 },
              { label: 'Streak 🔥', value: stats.currentStreak || 0 },
              { label: 'Sports', value: stats.sportsCount || 0 },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-white font-bold text-xl leading-none">{value}</div>
                <div className="text-teal-200 text-[9px] mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5">
          {/* Skill Levels */}
          {skillLevels.length > 0 && (
            <div className="mb-5">
              <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-3">
                Skill Levels
              </div>
              <div className="space-y-3">
                {skillLevels.map((sl) => {
                  const cat = sl.categoryId || {};
                  const level = sl.level || 'beginner';
                  const pts = sl.points || 0;
                  const base = LEVEL_PCT_BASE[level] || 0;
                  const next = NEXT_LEVEL_PTS[level] || 600;
                  const pct = level === 'elite' ? 100 : Math.min(100, Math.round(((pts - base) / (next - base)) * 100));
                  const color = LEVEL_COLORS[level] || '#94a3b8';
                  return (
                    <div key={String(sl.categoryId?._id || sl.categoryId)}>
                      <div className="flex justify-between text-[11px] mb-1.5">
                        <span className="font-semibold text-slate-700">
                          {cat.icon && <span className="mr-1">{cat.icon}</span>}
                          {cat.name || 'Activity'}
                        </span>
                        <span className="text-slate-400 capitalize font-medium">{level}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Achievements */}
          {achievements.length > 0 && (
            <div className="mb-5">
              <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-3">
                Achievements ({achievements.length})
              </div>
              <div className="flex flex-wrap gap-2.5">
                {achievements.map((a, i) => {
                  const ach = a.achievementId;
                  if (!ach) return null;
                  const rarityGlow = {
                    common: '',
                    rare: '0 0 8px rgba(96,165,250,0.5)',
                    epic: '0 0 8px rgba(168,85,247,0.5)',
                    legendary: '0 0 10px rgba(245,158,11,0.6)',
                  };
                  return (
                    <div
                      key={i}
                      title={`${ach.name}: ${ach.description}`}
                      className="w-12 h-12 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-2xl"
                      style={{ boxShadow: rarityGlow[ach.rarity] || '' }}
                    >
                      {ach.icon || '🏅'}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Earned date */}
          {achievements.length > 0 && (
            <p className="text-[9px] text-slate-300 text-right mb-3">
              Latest badge: {new Date(achievements[achievements.length - 1].earnedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}

          {/* CTA */}
          <div className="border-t border-slate-100 pt-4 mt-2 text-center">
            <p className="text-[11px] text-slate-500 mb-3">
              Want this for your child?
            </p>
            <Link
              href="/"
              className="inline-block bg-teal-600 text-white text-xs font-semibold px-5 py-2.5 rounded-full hover:bg-teal-700 transition-colors">
              Join SkillPadi →
            </Link>
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="mt-6 text-center">
        <Link href="/" className="font-serif text-teal-700 text-sm font-bold">SkillPadi</Link>
        <p className="text-[10px] text-slate-400 mt-1">Nigeria&apos;s Skills Development Platform for Kids</p>
      </div>
    </main>
  );
}
