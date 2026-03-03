import { handler, success, error, parseBody, validateBody } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Product } from '@/models/Shop';
import '@/models/Category'; // register Category for populate

export const GET = handler(async (request) => {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const all = searchParams.get('all') === 'true';
  const filter = all ? {} : { inStock: true };
  const products = await Product.find(filter)
    .populate('categoryId', 'name slug icon color')
    .sort({ order: 1, name: 1 })
    .lean();
  return success({ products });
});

export const POST = handler(async (request) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;
  const body = await parseBody(request);
  if (!body) return error('Invalid JSON body', 400);
  const errors = validateBody(body, {
    name: { required: true, type: 'string', maxLength: 200 },
    slug: { required: true, type: 'string', maxLength: 100 },
    price: { required: true, type: 'number', min: 0 },
  });
  if (errors.length) return error('Validation failed', 400, errors);
  await dbConnect();
  const product = await Product.create(body);
  return success({ product }, 201);
});
