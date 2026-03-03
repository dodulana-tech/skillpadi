import { handler, success, error, parseBody } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { StarterKit } from '@/models/Shop';
import '@/models/Category';

export const GET = handler(async (request, { params }) => {
  await dbConnect();
  const kit = await StarterKit.findById(params.id)
    .populate('categoryId', 'name slug icon color')
    .lean();
  if (!kit) return error('Kit not found', 404);
  return success({ kit });
});

export const PUT = handler(async (request, { params }) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;
  const body = await parseBody(request);
  if (!body) return error('Invalid JSON body', 400);
  await dbConnect();
  if (body.contents && typeof body.contents === 'string') {
    body.contents = body.contents.split('\n').map(s => s.trim()).filter(Boolean);
  }
  if (body.individualPrice != null) body.individualPrice = Number(body.individualPrice);
  if (body.kitPrice != null) body.kitPrice = Number(body.kitPrice);
  const kit = await StarterKit.findByIdAndUpdate(
    params.id, body, { new: true, runValidators: true }
  ).lean();
  if (!kit) return error('Kit not found', 404);
  return success({ kit });
});

export const DELETE = handler(async (request, { params }) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;
  await dbConnect();
  const kit = await StarterKit.findByIdAndDelete(params.id).lean();
  if (!kit) return error('Kit not found', 404);
  return success({ deleted: true });
});
