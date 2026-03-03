import { handler, success, error, parseBody } from '@/lib/api-utils';
import { authenticate, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Enrollment from '@/models/Enrollment';
import ChildPassport from '@/models/ChildPassport';
import Achievement from '@/models/Achievement';
import { LEVEL_POINTS, SKILL_LEVELS } from '@/lib/constants';

export const GET = handler(async (request, { params }) => {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  await dbConnect();

  const enrollment = await Enrollment.findById(id)
    .populate('programId')
    .populate('userId', 'name email phone')
    .lean();

  if (!enrollment) return error('Enrollment not found', 404);
  if (auth.dbUser.role === 'parent' && String(enrollment.userId?._id) !== String(auth.dbUser._id)) {
    return error('Access denied', 403);
  }
  return success({ enrollment });
});

export const PATCH = handler(async (request, { params }) => {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;
  if (!['admin', 'coach'].includes(auth.dbUser.role)) {
    return error('Only coaches and admins can update enrollments', 403);
  }

  const { id } = await params;
  const body = await parseBody(request);
  if (!body) return error('Invalid JSON body', 400);

  await dbConnect();
  const update = {};
  if (typeof body.sessionsCompleted === 'number') update.sessionsCompleted = body.sessionsCompleted;
  if (body.addMilestone) update.$addToSet = { milestonesCompleted: body.addMilestone };
  if (body.status) update.status = body.status;
  if (body.nextSession) update.nextSession = body.nextSession;
  if (body.notes) update.notes = body.notes;

  const enrollment = await Enrollment.findByIdAndUpdate(id, update, { new: true, runValidators: true })
    .populate('programId', 'name categoryId duration milestones sessions');
  if (!enrollment) return error('Enrollment not found', 404);

  // ── Detect triggered program milestone ──────────────────────────
  let newMilestone = null;
  if (typeof body.sessionsCompleted === 'number' && enrollment.programId?.milestones?.length) {
    const milestones = enrollment.programId.milestones;
    const total = enrollment.programId.sessions || 1;
    const idx = milestones.findIndex((_, i) => {
      const threshold = Math.round(((i + 1) / milestones.length) * total);
      return body.sessionsCompleted === threshold;
    });
    if (idx >= 0) newMilestone = milestones[idx];
  }

  // ── Passport integration (fire-and-forget) ──────────────────────
  // When sessionsCompleted is incremented, update the child's passport
  if (typeof body.sessionsCompleted === 'number' && enrollment.programId) {
    (async () => {
      try {
        const prog = enrollment.programId;
        const categoryId = prog.categoryId;
        const durationMinutes = prog.duration || 60;

        let passport = await ChildPassport.findOne({
          userId: enrollment.userId,
          childName: enrollment.childName,
        });
        if (!passport) {
          passport = new ChildPassport({
            userId: enrollment.userId,
            childName: enrollment.childName,
            stats: {},
          });
        }

        // Update stats
        const now = new Date();
        const lastSession = passport.stats.lastSessionDate;
        const daysSinceLast = lastSession ? (now - lastSession) / (1000 * 60 * 60 * 24) : null;

        // Only update if session count actually went up
        const sessionDelta = body.sessionsCompleted - (enrollment.sessionsCompleted - 1);
        if (sessionDelta > 0) {
          passport.stats.totalSessions = (passport.stats.totalSessions || 0) + sessionDelta;
          passport.stats.totalHours = +((passport.stats.totalHours || 0) + (durationMinutes * sessionDelta / 60)).toFixed(1);

          if (!lastSession || daysSinceLast > 14) {
            passport.stats.currentStreak = 1;
          } else {
            passport.stats.currentStreak = (passport.stats.currentStreak || 0) + sessionDelta;
          }
          if (passport.stats.currentStreak > (passport.stats.longestStreak || 0)) {
            passport.stats.longestStreak = passport.stats.currentStreak;
          }
          passport.stats.lastSessionDate = now;
        }

        // Ensure skill level entry for this category
        if (categoryId) {
          const hasLevel = passport.skillLevels.some(sl => String(sl.categoryId) === String(categoryId));
          if (!hasLevel) {
            passport.skillLevels.push({ categoryId, points: 0, level: 'beginner', updatedAt: now });
          }
          passport.stats.sportsCount = passport.skillLevels.length;
        }

        // Auto-award session milestone achievements for this category
        const milestoneCodes = [];
        if (categoryId) {
          const catAchs = await Achievement.find({
            categoryId,
            type: 'milestone',
            isActive: true,
            'requirement.type': 'sessions_completed',
            'requirement.value': { $lte: body.sessionsCompleted },
          }).lean();

          for (const ach of catAchs) {
            const alreadyEarned = passport.achievements.some(
              a => String(a.achievementId) === String(ach._id),
            );
            if (!alreadyEarned) {
              passport.achievements.push({
                achievementId: ach._id,
                earnedAt: now,
                programId: enrollment.programId._id || enrollment.programId,
                awardedBy: auth.dbUser._id,
              });
              // Add points to skill level
              const levelIdx = passport.skillLevels.findIndex(sl => String(sl.categoryId) === String(categoryId));
              if (levelIdx >= 0) {
                passport.skillLevels[levelIdx].points += ach.points;
                const pts = passport.skillLevels[levelIdx].points;
                passport.skillLevels[levelIdx].level = SKILL_LEVELS.slice().reverse().find(l => pts >= LEVEL_POINTS[l]) || 'beginner';
                passport.skillLevels[levelIdx].updatedAt = now;
              }
              milestoneCodes.push(ach.code);
            }
          }
        }

        // Auto-award streak achievements
        const streakThresholds = [5, 10, 20];
        const streakCodes = ['STREAK_5', 'STREAK_10', 'STREAK_20'];
        for (let i = 0; i < streakThresholds.length; i++) {
          if ((passport.stats.currentStreak || 0) >= streakThresholds[i]) {
            const ach = await Achievement.findOne({ code: streakCodes[i], isActive: true }).lean();
            if (ach && !passport.achievements.some(a => String(a.achievementId) === String(ach._id))) {
              passport.achievements.push({ achievementId: ach._id, earnedAt: now, awardedBy: auth.dbUser._id });
            }
          }
        }

        // Multi-sport badges
        const sports = passport.skillLevels.length;
        const msMap = { 2: 'MULTI_SPORT_2', 3: 'MULTI_SPORT_3' };
        for (const [needed, code] of Object.entries(msMap)) {
          if (sports >= Number(needed)) {
            const ach = await Achievement.findOne({ code, isActive: true }).lean();
            if (ach && !passport.achievements.some(a => String(a.achievementId) === String(ach._id))) {
              passport.achievements.push({ achievementId: ach._id, earnedAt: now, awardedBy: auth.dbUser._id });
            }
          }
        }

        await passport.save();
      } catch (e) {
        console.error('Passport update failed (non-blocking):', e.message);
      }
    })();
  }

  return success({ enrollment, newMilestone });
});
