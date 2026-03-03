import { handler, success, error, parseBody } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Tournament from '@/models/Tournament';

// GET /api/tournaments — Public listing
export const GET = handler(async (request) => {
  await dbConnect();
  const { searchParams } = new URL(request.url);

  const filter = { isActive: true };
  if (searchParams.get('status')) filter.status = searchParams.get('status');
  if (searchParams.get('area')) filter.area = searchParams.get('area');
  if (searchParams.get('categoryId')) filter.categoryId = searchParams.get('categoryId');
  if (searchParams.get('city')) filter.city = searchParams.get('city');

  const tournaments = await Tournament.find(filter)
    .populate('categoryId', 'name slug icon color')
    .sort({ date: 1 })
    .lean();

  return success({ tournaments });
});

// POST /api/tournaments — Admin: create tournament
export const POST = handler(async (request) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;

  const body = await parseBody(request);
  if (!body) return error('Invalid request', 400);
  if (!body.name || !body.type || !body.date) {
    return error('name, type, and date are required', 400);
  }

  await dbConnect();

  // Auto-generate slug if not provided
  if (!body.slug) {
    body.slug = body.name.toLowerCase().trim()
      .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      + '-' + Date.now().toString(36);
  }

  const tournament = await Tournament.create(body);
  return success({ tournament }, 201);
});
