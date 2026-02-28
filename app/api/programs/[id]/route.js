import { handler, success, error, isObjectIdOrSlug, parseBody } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Program from '@/models/Program';

export const GET = handler(async (request, { params }) => {
  const { id } = await params;
  await dbConnect();
  const program = await Program.findOne(isObjectIdOrSlug(id))
    .populate('categoryId', 'name slug icon color sponsor')
    .populate('coachId', 'name slug initials shieldLevel rating reviewCount whatsapp bio yearsExperience ageGroups')
    .populate('starterKitId')
    .lean();
  if (!program) return error('Program not found', 404);
  return success({ program });
});

export const PUT = handler(async (request, { params }) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  const body = await parseBody(request);
  if (!body) return error('Invalid JSON body', 400);
  await dbConnect();
  const program = await Program.findByIdAndUpdate(id, body, { new: true, runValidators: true });
  if (!program) return error('Program not found', 404);
  return success({ program });
});

export const DELETE = handler(async (request, { params }) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  await dbConnect();
  await Program.findByIdAndUpdate(id, { isActive: false });
  return success({ message: 'Program deactivated' });
});
