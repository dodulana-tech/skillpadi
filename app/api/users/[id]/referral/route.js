import { handler, success, error, parseBody } from '@/lib/api-utils';
import { authenticate, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';

// POST /api/users/[id]/referral
// Called after a new user signs up via a referral link.
// Increments the referrer's referralCount.
export const POST = handler(async (request, { params }) => {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  const { id: referrerId } = await params;
  const body = await parseBody(request);

  await dbConnect();

  const referrer = await User.findById(referrerId);
  if (!referrer) return error('Referrer not found', 404);

  // Increment referral count
  await User.findByIdAndUpdate(referrerId, { $inc: { referralCount: 1 } });

  // Set referredBy on new user if not already set
  if (body?.referredUserId) {
    await User.findOneAndUpdate(
      { firebaseUid: auth.firebaseUid, referredBy: { $exists: false } },
      { referredBy: referrerId }
    );
  }

  return success({ ok: true });
});
