import { handler, success, error, parseBody } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import { ROLES } from '@/lib/constants';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export const GET = handler(async (request, { params }) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  await dbConnect();
  const user = await User.findById(id).lean();
  if (!user) return error('User not found', 404);
  return success({ user });
});

export const PATCH = handler(async (request, { params }) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  const body = await parseBody(request);
  if (!body) return error('Invalid request', 400);

  // Admin can update role — validate it
  if (body.role && !ROLES.includes(body.role)) {
    return error(`Invalid role. Must be: ${ROLES.join(', ')}`, 400);
  }

  await dbConnect();
  const user = await User.findByIdAndUpdate(id, body, { new: true, runValidators: true }).lean();
  if (!user) return error('User not found', 404);
  return success({ user });
});
