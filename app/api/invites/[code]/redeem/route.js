import { handler, success, error } from '@/lib/api-utils';
import { authenticate, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Invite from '@/models/Invite';
import User from '@/models/User';

// ── POST /api/invites/[code]/redeem ───────────────────────────────
// Authenticated users redeem an invite code.
// Links them to the school or community, increments usedCount.
export const POST = handler(async (request, { params }) => {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  const { code } = await params;
  await dbConnect();

  // ── 1. Fetch and validate the invite ──────────────────────────
  const invite = await Invite.findOne({ code: code.toUpperCase().trim() }).lean();
  if (!invite) return error('Invalid invite code', 404);

  if (!invite.isActive) return error('This invite is no longer active', 400);

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return error('This invite has expired', 400);
  }

  if (invite.maxUses > 0 && invite.usedCount >= invite.maxUses) {
    return error('This invite has reached its maximum uses', 400);
  }

  // Check if this user has already redeemed this invite
  const alreadyUsed = invite.usedBy.some(
    (u) => String(u.userId) === String(auth.dbUser._id),
  );
  if (alreadyUsed) return error('You have already used this invite code', 409);

  // ── 2. Atomically claim the invite slot ───────────────────────
  // Re-check conditions inside findOneAndUpdate to guard against
  // race conditions when maxUses is set.
  const updated = await Invite.findOneAndUpdate(
    {
      _id: invite._id,
      isActive: true,
      $and: [
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
        { $or: [{ maxUses: 0 }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }] },
      ],
    },
    {
      $inc: { usedCount: 1 },
      $push: { usedBy: { userId: auth.dbUser._id, usedAt: new Date() } },
    },
    { new: true },
  );

  if (!updated) {
    // Rare race: someone else took the last slot between our check and update
    return error('Invite could not be redeemed — it may have just been claimed', 409);
  }

  // ── 3. Link user to school or community ───────────────────────
  const userUpdate = {};
  if (invite.type === 'school') {
    userUpdate.schoolId = invite.entityId;
  } else {
    userUpdate.communityId = invite.entityId;
  }

  await User.findByIdAndUpdate(auth.dbUser._id, userUpdate);

  return success({
    redeemed: true,
    type: invite.type,
    entityName: invite.entityName,
    entityId: invite.entityId,
    discount: invite.discount,
  });
});
