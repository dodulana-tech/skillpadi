import { handler, success, error, parseBody } from '@/lib/api-utils';
import { authenticate, requireRole, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Invite from '@/models/Invite';

// ── GET /api/invites/[code] ───────────────────────────────────────
// Public — anyone can validate a code before signing up.
// Returns only safe, non-sensitive fields.
export const GET = handler(async (request, { params }) => {
  const { code } = await params;
  await dbConnect();

  const invite = await Invite.findOne({ code: code.toUpperCase().trim() }).lean();

  if (!invite) return success({ valid: false, reason: 'Code not found' });

  if (!invite.isActive) return success({ valid: false, reason: 'Invite is no longer active' });

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return success({ valid: false, reason: 'Invite has expired' });
  }

  if (invite.maxUses > 0 && invite.usedCount >= invite.maxUses) {
    return success({ valid: false, reason: 'Invite has reached its maximum uses' });
  }

  return success({
    valid: true,
    code: invite.code,
    type: invite.type,
    entityName: invite.entityName,
    discount: invite.discount,
    usedCount: invite.usedCount,
    maxUses: invite.maxUses,
    expiresAt: invite.expiresAt ?? null,
  });
});

// ── PATCH /api/invites/[code] ─────────────────────────────────────
// Admin only — update maxUses, isActive, expiresAt, discount.
export const PATCH = handler(async (request, { params }) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;

  const { code } = await params;
  const body = await parseBody(request);
  if (!body) return error('Invalid JSON body', 400);

  await dbConnect();

  const invite = await Invite.findOne({ code: code.toUpperCase().trim() });
  if (!invite) return error('Invite not found', 404);

  const allowed = ['maxUses', 'isActive', 'expiresAt', 'discount'];
  for (const field of allowed) {
    if (body[field] !== undefined) {
      if (field === 'maxUses') invite.maxUses = Math.max(0, Number(body.maxUses));
      else if (field === 'isActive') invite.isActive = Boolean(body.isActive);
      else if (field === 'expiresAt') invite.expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined;
      else if (field === 'discount') invite.discount = Math.min(100, Math.max(0, Number(body.discount)));
    }
  }

  await invite.save();
  return success({ invite });
});
