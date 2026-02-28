import { handler, success, error, parseBody, validateBody } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { StarterKit } from '@/models/Shop';

export const GET = handler(async () => {
  await dbConnect();
  const kits = await StarterKit.find({ inStock: true })
    .populate('categoryId', 'name slug icon color')
    .sort({ name: 1 })
    .lean();
  return success({ kits });
});

export const POST = handler(async (request) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;
  const body = await parseBody(request);
  if (!body) return error('Invalid JSON body', 400);
  const errors = validateBody(body, {
    name: { required: true, type: 'string', maxLength: 200 },
    slug: { required: true, type: 'string', maxLength: 100 },
    categoryId: { required: true, type: 'string' },
    kitPrice: { required: true, type: 'number', min: 0 },
    individualPrice: { required: true, type: 'number', min: 0 },
  });
  if (errors.length) return error('Validation failed', 400, errors);
  await dbConnect();
  const kit = await StarterKit.create(body);
  return success({ kit }, 201);
});
