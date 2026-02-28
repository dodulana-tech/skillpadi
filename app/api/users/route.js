import { handler, success, error, parseBody, sanitizeBody } from '@/lib/api-utils';
import { authenticate, requireRole, isAuthError } from '@/lib/auth';
import { LIMITS } from '@/lib/constants';
import dbConnect from '@/lib/db';
import User from '@/models/User';

// GET /api/users — Admin: paginated user list
export const GET = handler(async (request) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

  const filter = {};
  if (role) filter.role = role;

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  return success({ users, total, page, pages: Math.ceil(total / limit) });
});

// PATCH /api/users — Update OWN profile (field whitelist)
export const PATCH = handler(async (request) => {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;
  const body = await parseBody(request);
  if (!body) return error('Invalid request', 400);

  // Only allow specific fields
  const allowed = ['name', 'phone', 'area', 'children'];
  const update = sanitizeBody(body, allowed);

  // Validate children if provided
  if (update.children) {
    if (!Array.isArray(update.children)) return error('children must be an array', 400);
    if (update.children.length > LIMITS.maxChildrenPerParent) return error(`Maximum ${LIMITS.maxChildrenPerParent} children`, 400);
    for (const child of update.children) {
      if (!child.name || typeof child.name !== 'string') return error('Each child must have a name', 400);
      if (child.age && (child.age < LIMITS.minChildAge || child.age > LIMITS.maxChildAge)) {
        return error(`Child age must be between ${LIMITS.minChildAge} and ${LIMITS.maxChildAge}`, 400);
      }
    }
  }

  await dbConnect();
  const user = await User.findByIdAndUpdate(auth.dbUser._id, update, { new: true, runValidators: true }).lean();
  return success({ user });
});
