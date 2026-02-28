import { handler, success, error, isObjectIdOrSlug, validateBody, sanitizeBody, parseBody } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Coach from '@/models/Coach';
import Category from '@/models/Category';

// GET /api/coaches — Public
export const GET = handler(async (request) => {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get('category');
  const showInactive = searchParams.get('active') === 'false';

  const filter = {};
  if (!showInactive) filter.isActive = true;

  if (categorySlug) {
    const category = await Category.findOne({ slug: categorySlug }).lean();
    if (category) filter.categoryId = category._id;
  }

  const coaches = await Coach.find(filter)
    .populate('categoryId', 'name slug icon color sponsor')
    .sort({ featuredOrder: 1, rating: -1 })
    .lean();

  return success({ coaches });
});

// POST /api/coaches — Admin only
export const POST = handler(async (request) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;

  const body = await parseBody(request);
  if (!body) return error('Invalid JSON body', 400);

  const errors = validateBody(body, {
    name: { required: true, type: 'string', maxLength: 100 },
    slug: { required: true, type: 'string', maxLength: 100 },
    initials: { required: true, type: 'string', maxLength: 4 },
    categoryId: { required: true, type: 'string' },
  });
  if (errors.length) return error('Validation failed', 400, errors);

  await dbConnect();
  const coach = await Coach.create(body);
  return success({ coach }, 201);
});
