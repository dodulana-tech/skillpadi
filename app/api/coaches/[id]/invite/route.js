import { handler, success, error } from '@/lib/api-utils';
import { requireRole, authenticate, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Coach from '@/models/Coach';
import User from '@/models/User';
import crypto from 'crypto';

// POST /api/coaches/[id]/invite — Admin: generate invite link for a coach
export const POST = handler(async (request, { params }) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  await dbConnect();

  const coach = await Coach.findById(id);
  if (!coach) return error('Coach not found', 404);

  // Generate a unique invite code if not already present
  if (!coach.inviteCode || coach.inviteStatus === 'expired') {
    coach.inviteCode = `coach-${crypto.randomBytes(6).toString('hex')}`;
    coach.inviteStatus = 'pending';
    await coach.save();
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://skillpadi.com';
  const inviteUrl = `${baseUrl}/auth/signup?coach=${coach.inviteCode}`;

  return success({
    inviteCode: coach.inviteCode,
    inviteUrl,
    coachName: coach.name,
    status: coach.inviteStatus,
  });
});

// PUT /api/coaches/[id]/invite — Authenticated user: claim invite (link user to coach)
export const PUT = handler(async (request, { params }) => {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  await dbConnect();

  const coach = await Coach.findById(id);
  if (!coach) return error('Coach not found', 404);
  if (coach.inviteStatus !== 'pending') return error('Invite already claimed or expired', 400);

  // Link user to coach
  const user = await User.findByIdAndUpdate(
    auth.dbUser._id,
    { role: 'coach', coachId: coach._id },
    { new: true },
  );

  coach.userId = user._id;
  coach.inviteStatus = 'claimed';
  coach.isActive = true;
  await coach.save();

  return success({ message: 'Coach account activated', role: 'coach', coachId: coach._id });
});
