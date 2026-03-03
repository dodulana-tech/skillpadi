import { handler, success, error, parseBody, validateBody } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Invite from '@/models/Invite';
import School from '@/models/School';
import Community from '@/models/Community';

// ── Code generator ────────────────────────────────────────────────
// Format: first 3 letters of entity name + "-" + 6 random alphanumeric
// Avoids visually ambiguous chars: 0/O, 1/I/l
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randStr = (n) =>
  Array.from({ length: n }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');

const buildCode = (entityName) => {
  const prefix = entityName
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, 'X');
  return `${prefix}-${randStr(6)}`;
};

// Try to generate a unique code (max 5 attempts)
async function generateUniqueCode(entityName) {
  for (let i = 0; i < 5; i++) {
    const code = buildCode(entityName);
    const exists = await Invite.findOne({ code }).lean();
    if (!exists) return code;
  }
  // Fallback: pure random to avoid any prefix collision
  return `SP-${randStr(8)}`;
}

// ── GET /api/invites ──────────────────────────────────────────────
// Admin  → all invites
// School → invites for their school (entityId = dbUser.schoolId)
// Community users are not expected to self-serve; admin handles their invites
export const GET = handler(async (request) => {
  const auth = await requireRole(request, ['admin', 'school']);
  if (isAuthError(auth)) return auth;

  await dbConnect();

  const filter = {};

  if (auth.dbUser.role === 'school') {
    if (!auth.dbUser.schoolId) return error('No school associated with your account', 400);
    filter.entityId = auth.dbUser.schoolId;
    filter.type = 'school';
  }

  const { searchParams } = new URL(request.url);
  if (searchParams.get('type')) filter.type = searchParams.get('type');
  if (searchParams.get('entityId')) filter.entityId = searchParams.get('entityId');

  const invites = await Invite.find(filter)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return success({ invites });
});

// ── POST /api/invites ─────────────────────────────────────────────
// Admin or school can create an invite.
// If code is not provided, one is auto-generated.
export const POST = handler(async (request) => {
  const auth = await requireRole(request, ['admin', 'school']);
  if (isAuthError(auth)) return auth;

  const body = await parseBody(request);
  if (!body) return error('Invalid JSON body', 400);

  const validationErrors = validateBody(body, {
    type: { required: true, type: 'string', enum: ['school', 'community'] },
    entityId: { required: true, type: 'string' },
    entityName: { required: true, type: 'string', maxLength: 100 },
  });
  if (validationErrors.length) return error('Validation failed', 400, validationErrors);

  // School users can only create invites for their own school
  if (auth.dbUser.role === 'school') {
    if (!auth.dbUser.schoolId) return error('No school associated with your account', 400);
    if (String(auth.dbUser.schoolId) !== String(body.entityId)) {
      return error('You can only create invites for your own school', 403);
    }
    if (body.type !== 'school') return error('School users can only create school invites', 403);
  }

  await dbConnect();

  // Verify the referenced entity actually exists
  if (body.type === 'school') {
    const school = await School.findById(body.entityId).lean();
    if (!school) return error('School not found', 404);
  } else {
    const community = await Community.findById(body.entityId).lean();
    if (!community) return error('Community not found', 404);
  }

  // Resolve or generate code
  let code;
  if (body.code) {
    code = String(body.code).toUpperCase().trim();
    const clash = await Invite.findOne({ code }).lean();
    if (clash) return error('Invite code already exists', 409);
  } else {
    code = await generateUniqueCode(body.entityName);
  }

  const invite = await Invite.create({
    code,
    type: body.type,
    entityId: body.entityId,
    entityName: String(body.entityName).trim(),
    createdBy: auth.dbUser._id,
    maxUses: body.maxUses != null ? Number(body.maxUses) : 0,
    discount: body.discount != null ? Math.min(100, Math.max(0, Number(body.discount))) : 0,
    expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    isActive: true,
  });

  return success({ invite }, 201);
});
