import { handler, success, error, parseBody, validateBody } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Program from '@/models/Program';
import Category from '@/models/Category';

export const GET = handler(async (request) => {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get('category');
  const showInactive = searchParams.get('active') === 'false';

  const filter = {};
  if (!showInactive) filter.isActive = true;

  if (categorySlug) {
    const cat = await Category.findOne({ slug: categorySlug }).lean();
    if (cat) filter.categoryId = cat._id;
  }

  const programs = await Program.find(filter)
    .populate('categoryId', 'name slug icon color sponsor')
    .populate('coachId', 'name slug initials shieldLevel rating whatsapp')
    .populate('starterKitId', 'name kitPrice icon')
    .sort({ categoryId: 1, name: 1 })
    .lean();

  return success({ programs });
});

export const POST = handler(async (request) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;

  const body = await parseBody(request);
  if (!body) return error('Invalid JSON body', 400);

  const errors = validateBody(body, {
    name: { required: true, type: 'string', maxLength: 100 },
    slug: { required: true, type: 'string', maxLength: 100 },
    categoryId: { required: true, type: 'string' },
    coachId: { required: true, type: 'string' },
    pricePerSession: { required: true, type: 'number', min: 0 },
    spotsTotal: { required: true, type: 'number', min: 1 },
    supervision: { required: true, type: 'string', enum: ['parent-present', 'drop-off', 'school-chaperone', 'nanny-driver'] },
  });
  if (errors.length) return error('Validation failed', 400, errors);

  await dbConnect();
  const program = await Program.create(body);
  return success({ program }, 201);
});
