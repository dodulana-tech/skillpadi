import { handler, success, error, parseBody } from '@/lib/api-utils';
import { requireRole, authenticate, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Community from '@/models/Community';

export const GET = handler(async (request, { params }) => {
  const auth = await requireRole(request, ['admin', 'community']);
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  await dbConnect();
  const community = await Community.findById(id).lean();
  if (!community) return error('Community not found', 404);
  return success({ community });
});

export const PUT = handler(async (request, { params }) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  const body = await parseBody(request);
  if (!body) return error('Invalid JSON body', 400);
  await dbConnect();
  const community = await Community.findByIdAndUpdate(id, body, { new: true, runValidators: true });
  if (!community) return error('Community not found', 404);
  return success({ community });
});
