import { handler, success, error, parseBody } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import School from '@/models/School';

export const GET = handler(async (request, { params }) => {
  const auth = await requireRole(request, ['admin', 'school']);
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  await dbConnect();
  const school = await School.findById(id).lean();
  if (!school) return error('School not found', 404);
  return success({ school });
});

export const PUT = handler(async (request, { params }) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  const body = await parseBody(request);
  if (!body) return error('Invalid JSON body', 400);
  await dbConnect();
  const school = await School.findByIdAndUpdate(id, body, { new: true, runValidators: true });
  if (!school) return error('School not found', 404);
  return success({ school });
});
