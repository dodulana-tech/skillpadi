import { handler, success, error, parseBody } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Community from '@/models/Community';
import Enrollment from '@/models/Enrollment';

export const GET = handler(async (request) => {
  const auth = await requireRole(request, ['admin', 'community']);
  if (isAuthError(auth)) return auth;
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const filter = {};
  if (auth.dbUser.role === 'community') filter._id = auth.dbUser.communityId;
  if (searchParams.get('status') && auth.dbUser.role === 'admin') filter.status = searchParams.get('status');

  const communities = await Community.find(filter).sort({ createdAt: -1 }).lean();
  const enriched = await Promise.all(communities.map(async (c) => {
    const activeResidents = await Enrollment.countDocuments({ communityId: c._id, status: 'active' });
    return { ...c, activeResidents };
  }));
  return success({ communities: enriched });
});

export const POST = handler(async (request) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;
  const body = await parseBody(request);
  if (!body?.name?.trim() || !body?.slug?.trim()) return error('Name and slug required', 400);
  await dbConnect();
  const community = await Community.create({ ...body, status: body.status || 'approved' });
  return success({ community }, 201);
});
