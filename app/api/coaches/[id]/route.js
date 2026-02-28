import { handler, success, error, isObjectIdOrSlug, parseBody } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Coach from '@/models/Coach';

// GET /api/coaches/[id] — Public
export const GET = handler(async (request, { params }) => {
  const { id } = await params;
  await dbConnect();

  const coach = await Coach.findOne(isObjectIdOrSlug(id))
    .populate('categoryId', 'name slug icon color sponsor')
    .lean();

  if (!coach) return error('Coach not found', 404);
  return success({ coach });
});

// PUT /api/coaches/[id] — Admin
export const PUT = handler(async (request, { params }) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const body = await parseBody(request);
  if (!body) return error('Invalid JSON body', 400);

  await dbConnect();
  const coach = await Coach.findByIdAndUpdate(id, body, { new: true, runValidators: true });
  if (!coach) return error('Coach not found', 404);
  return success({ coach });
});

// DELETE /api/coaches/[id] — Admin (soft delete)
export const DELETE = handler(async (request, { params }) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  await dbConnect();
  const coach = await Coach.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!coach) return error('Coach not found', 404);
  return success({ message: 'Coach deactivated' });
});
