import { handler, success, error, parseBody } from '@/lib/api-utils';
import { authenticate, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import ChildPassport from '@/models/ChildPassport';
import Achievement from '@/models/Achievement';
import Enrollment from '@/models/Enrollment';

const STREAK_ACHIEVEMENTS = [
  { code: 'STREAK_5', value: 5 },
  { code: 'STREAK_10', value: 10 },
  { code: 'STREAK_20', value: 20 },
];

// PATCH /api/passport/[childName]/stats — Called when a session is logged.
// Increments totalSessions, hours, streak. Auto-awards streak achievements.
export const PATCH = handler(async (request, { params }) => {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;
  if (!['admin', 'coach'].includes(auth.dbUser.role)) return error('Forbidden', 403);

  const { childName } = await params;
  const body = await parseBody(request);
  if (!body) return error('Invalid request', 400);

  const { userId, programId, categoryId, sessionDurationMinutes } = body;
  if (!userId) return error('userId is required', 400);

  await dbConnect();

  const decodedName = decodeURIComponent(childName);
  let passport = await ChildPassport.findOne({ userId, childName: decodedName });
  if (!passport) {
    passport = new ChildPassport({ userId, childName: decodedName, stats: {} });
  }

  // Update session stats
  passport.stats.totalSessions = (passport.stats.totalSessions || 0) + 1;
  if (sessionDurationMinutes) {
    passport.stats.totalHours = +((passport.stats.totalHours || 0) + sessionDurationMinutes / 60).toFixed(1);
  }

  // Streak logic: if last session was within 14 days, continue streak; else reset
  const now = new Date();
  const lastSession = passport.stats.lastSessionDate;
  const daysSinceLast = lastSession ? (now - lastSession) / (1000 * 60 * 60 * 24) : null;
  if (!lastSession || daysSinceLast > 14) {
    passport.stats.currentStreak = 1;
  } else {
    passport.stats.currentStreak = (passport.stats.currentStreak || 0) + 1;
  }
  if (passport.stats.currentStreak > (passport.stats.longestStreak || 0)) {
    passport.stats.longestStreak = passport.stats.currentStreak;
  }
  passport.stats.lastSessionDate = now;

  // Update skill level for this category
  if (categoryId) {
    const levelIdx = passport.skillLevels.findIndex(
      (sl) => String(sl.categoryId) === String(categoryId),
    );
    if (levelIdx < 0) {
      passport.skillLevels.push({ categoryId, points: 0, level: 'beginner', updatedAt: now });
    } else {
      passport.skillLevels[levelIdx].updatedAt = now;
    }
  }

  // Count distinct sports (distinct categoryIds from skillLevels)
  passport.stats.sportsCount = passport.skillLevels.length;

  // Auto-award streak achievements
  const streakAchs = await Achievement.find({
    code: { $in: STREAK_ACHIEVEMENTS.map(s => s.code) },
    isActive: true,
  }).lean();

  for (const sa of STREAK_ACHIEVEMENTS) {
    if ((passport.stats.currentStreak || 0) >= sa.value) {
      const ach = streakAchs.find(a => a.code === sa.code);
      if (!ach) continue;
      const alreadyEarned = passport.achievements.some(
        a => String(a.achievementId) === String(ach._id),
      );
      if (!alreadyEarned) {
        passport.achievements.push({
          achievementId: ach._id,
          earnedAt: now,
          programId: programId || undefined,
          awardedBy: auth.dbUser._id,
        });
      }
    }
  }

  // Auto-award multi-sport badges
  const multiSportCodes = passport.stats.sportsCount >= 3 ? ['MULTI_SPORT_2', 'MULTI_SPORT_3']
    : passport.stats.sportsCount >= 2 ? ['MULTI_SPORT_2'] : [];
  if (multiSportCodes.length) {
    const msAchs = await Achievement.find({ code: { $in: multiSportCodes }, isActive: true }).lean();
    for (const ach of msAchs) {
      const alreadyEarned = passport.achievements.some(a => String(a.achievementId) === String(ach._id));
      if (!alreadyEarned) {
        passport.achievements.push({ achievementId: ach._id, earnedAt: now, awardedBy: auth.dbUser._id });
      }
    }
  }

  await passport.save();
  return success({ passport: { stats: passport.stats, achievements: passport.achievements } });
});
