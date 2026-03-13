import { handler, success, error } from '@/lib/api-utils';
import { authenticate, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Coach from '@/models/Coach';
import User from '@/models/User';

// POST /api/coaches/claim-invite — Authenticated user claims a coach invite code
export const POST = handler(async (request) => {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  const body = await request.json().catch(() => null);
  if (!body?.inviteCode) return error('Invite code required', 400);

  await dbConnect();

  const coach = await Coach.findOne({ inviteCode: String(body.inviteCode) });
  if (!coach) return error('Invalid invite code', 404);
  if (coach.inviteStatus !== 'pending') return error('This invite has already been used', 400);
  if (coach.userId) return error('This coach profile is already linked to an account', 400);

  // Link user to coach
  await User.updateOne(
    { _id: auth.dbUser._id },
    { role: 'coach', coachId: coach._id },
  );

  coach.userId = auth.dbUser._id;
  coach.inviteStatus = 'claimed';
  coach.isActive = true;
  if (!coach.email && auth.dbUser.email) coach.email = auth.dbUser.email;
  await coach.save();

  return success({
    message: 'Welcome aboard! Your coach account is now active.',
    coachId: coach._id,
    coachName: coach.name,
  });
});
