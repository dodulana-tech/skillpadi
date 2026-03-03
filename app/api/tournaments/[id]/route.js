import { handler, success, error, parseBody } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Tournament from '@/models/Tournament';
import ChildPassport from '@/models/ChildPassport';
import Achievement from '@/models/Achievement';

// GET /api/tournaments/[id] — Public, by id or slug
export const GET = handler(async (request, { params }) => {
  const { id } = await params;
  await dbConnect();

  const query = id.match(/^[0-9a-fA-F]{24}$/)
    ? { _id: id }
    : { slug: id };

  const tournament = await Tournament.findOne(query)
    .populate('categoryId', 'name slug icon color')
    .populate('sponsorId', 'name tagline logo website')
    .lean();

  if (!tournament) return error('Tournament not found', 404);
  return success({ tournament });
});

// PUT /api/tournaments/[id] — Admin: update
export const PUT = handler(async (request, { params }) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const body = await parseBody(request);
  if (!body) return error('Invalid request', 400);

  await dbConnect();

  // Strip teams to prevent accidental overwrite; results are allowed
  const { teams, ...safeBody } = body; // eslint-disable-line no-unused-vars
  const tournament = await Tournament.findByIdAndUpdate(id, safeBody, { new: true, runValidators: true });
  if (!tournament) return error('Tournament not found', 404);

  // ── Auto-award TOURNAMENT_WIN to 1st-place team members (fire-and-forget) ──
  if (safeBody.results?.length > 0 && safeBody.status === 'completed') {
    (async () => {
      try {
        const ach = await Achievement.findOne({ code: 'TOURNAMENT_WIN', isActive: true }).lean();
        if (!ach) return;

        const winner = safeBody.results.find(r => Number(r.position) === 1);
        if (!winner) return;

        // Find the registered team by name
        const winningTeam = tournament.teams?.find(t => t.name === winner.teamName);
        if (!winningTeam) return;

        const now = new Date();
        for (const member of winningTeam.members || []) {
          if (!member.userId || !member.childName) continue;
          let passport = await ChildPassport.findOne({ userId: member.userId, childName: member.childName });
          if (!passport) continue;

          const alreadyEarned = passport.achievements.some(
            a => String(a.achievementId) === String(ach._id),
          );
          if (!alreadyEarned) {
            passport.achievements.push({
              achievementId: ach._id,
              earnedAt: now,
              awardedBy: auth.dbUser._id,
            });
            passport.tournaments = passport.tournaments || [];
            passport.tournaments.push({
              tournamentId: tournament._id,
              result: 'winner',
              position: 1,
              date: now,
            });
            await passport.save();
          }
        }
      } catch (e) {
        console.error('TOURNAMENT_WIN award failed (non-blocking):', e.message);
      }
    })();
  }

  return success({ tournament });
});
