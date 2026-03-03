import { handler, success, error, parseBody } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Achievement from '@/models/Achievement';
import ChildPassport from '@/models/ChildPassport';
import Enrollment from '@/models/Enrollment';
import User from '@/models/User';
import { LEVEL_POINTS, SKILL_LEVELS } from '@/lib/constants';
import { notifyAchievementEarned } from '@/lib/whatsapp';

// POST /api/passport/[childName]/award — Coach or admin awards an achievement
export const POST = handler(async (request, { params }) => {
  const auth = await requireRole(request, ['admin', 'coach']);
  if (isAuthError(auth)) return auth;

  const { childName } = await params;
  const body = await parseBody(request);
  if (!body) return error('Invalid request', 400);

  const { achievementCode, achievementId, userId, programId } = body;
  if ((!achievementCode && !achievementId) || !userId) {
    return error('achievementCode (or achievementId) and userId are required', 400);
  }

  await dbConnect();

  // Validate achievement — support lookup by _id or code
  const achievement = achievementId
    ? await Achievement.findOne({ _id: achievementId, isActive: true }).lean()
    : await Achievement.findOne({ code: achievementCode, isActive: true }).lean();
  if (!achievement) return error('Achievement not found', 404);

  // Check active enrollment
  if (programId) {
    const enrollment = await Enrollment.findOne({
      userId,
      programId,
      childName: decodeURIComponent(childName),
      status: { $in: ['active', 'completed'] },
    }).lean();
    if (!enrollment) return error('Child has no active enrollment in this program', 400);
  }

  const decodedName = decodeURIComponent(childName);

  // Find or create passport
  let passport = await ChildPassport.findOne({ userId, childName: decodedName });
  if (!passport) {
    passport = new ChildPassport({ userId, childName: decodedName, stats: {} });
  }

  // Check if already earned
  const alreadyEarned = passport.achievements.some(
    (a) => String(a.achievementId) === String(achievement._id),
  );
  if (alreadyEarned) return error('Child has already earned this achievement', 409);

  // Award it
  passport.achievements.push({
    achievementId: achievement._id,
    earnedAt: new Date(),
    programId: programId || undefined,
    awardedBy: auth.dbUser._id,
  });

  // Update skill level points for category-specific achievements
  if (achievement.categoryId) {
    const levelIdx = passport.skillLevels.findIndex(
      (sl) => String(sl.categoryId) === String(achievement.categoryId),
    );
    if (levelIdx >= 0) {
      passport.skillLevels[levelIdx].points += achievement.points;
      passport.skillLevels[levelIdx].updatedAt = new Date();
      // Recalculate level based on points
      const points = passport.skillLevels[levelIdx].points;
      const newLevel = SKILL_LEVELS.slice().reverse().find((l) => points >= LEVEL_POINTS[l]) || 'beginner';
      passport.skillLevels[levelIdx].level = newLevel;
    } else {
      passport.skillLevels.push({
        categoryId: achievement.categoryId,
        points: achievement.points,
        level: 'beginner',
        updatedAt: new Date(),
      });
    }
  }

  await passport.save();

  // Fire-and-forget WhatsApp notification to parent
  try {
    const parent = await User.findById(userId).lean();
    if (parent?.phone) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://skillpadi-b3nv.vercel.app';
      const passportUrl = `${appUrl}/passport/${userId}/${encodeURIComponent(decodedName)}`;
      notifyAchievementEarned?.(parent.phone, decodedName, achievement.name, achievement.icon, passportUrl);
    }
  } catch { /* ignore */ }

  return success({ awarded: true, achievement, passport: { achievements: passport.achievements } });
});
