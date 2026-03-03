import { handler, success, error, parseBody } from '@/lib/api-utils';
import { authenticate, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Tournament from '@/models/Tournament';

// POST /api/tournaments/[id]/register — Register a team or individual
export const POST = handler(async (request, { params }) => {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const body = await parseBody(request);
  if (!body) return error('Invalid request', 400);

  const { childName, schoolId, teamName } = body;
  if (!childName) return error('childName is required', 400);

  await dbConnect();

  const tournament = await Tournament.findById(id);
  if (!tournament) return error('Tournament not found', 404);
  if (!tournament.isActive) return error('Tournament is not active', 400);
  if (!['registration'].includes(tournament.status)) {
    return error('Registration is not currently open for this tournament', 400);
  }
  if (tournament.registrationDeadline && new Date() > tournament.registrationDeadline) {
    return error('Registration deadline has passed', 400);
  }
  if (tournament.maxTeams && tournament.teams.length >= tournament.maxTeams) {
    return error('Tournament is full — all team slots are taken', 400);
  }

  // Build team entry
  const team = {
    name: teamName || `${childName}'s Team`,
    schoolId: schoolId || undefined,
    members: [{ childName, userId: auth.dbUser._id }],
    registeredAt: new Date(),
    paid: tournament.entryFee === 0, // auto-paid if free
  };

  tournament.teams.push(team);
  await tournament.save();

  return success({ registered: true, team, tournament: { id: tournament._id, name: tournament.name } });
});
