import { handler, success, error, parseBody } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Sponsor from '@/models/Sponsor';

// GET /api/sponsors/[id] — Public
export const GET = handler(async (request, { params }) => {
  await dbConnect();
  const sponsor = await Sponsor.findById(params.id).lean();
  if (!sponsor) return error('Sponsor not found', 404);
  return success({ sponsor });
});

// PUT /api/sponsors/[id] — Admin only
export const PUT = handler(async (request, { params }) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;

  const body = await parseBody(request);
  if (!body) return error('Invalid request', 400);

  await dbConnect();

  const update = {};
  if (body.name !== undefined)         update.name         = body.name.trim();
  if (body.tagline !== undefined)      update.tagline      = body.tagline?.trim() || null;
  if (body.logo !== undefined)         update.logo         = body.logo?.trim() || null;
  if (body.website !== undefined)      update.website      = body.website?.trim() || null;
  if (body.contactName !== undefined)  update.contactName  = body.contactName?.trim() || null;
  if (body.contactEmail !== undefined) update.contactEmail = body.contactEmail?.trim() || null;
  if (body.contactPhone !== undefined) update.contactPhone = body.contactPhone?.trim() || null;
  if (body.type !== undefined)         update.type         = body.type;
  if (body.active !== undefined)       update.active       = body.active;
  if (body.notes !== undefined)        update.notes        = body.notes?.trim() || null;

  const sponsor = await Sponsor.findByIdAndUpdate(params.id, update, { new: true }).lean();
  if (!sponsor) return error('Sponsor not found', 404);
  return success({ sponsor });
});

// DELETE /api/sponsors/[id] — Admin only
export const DELETE = handler(async (request, { params }) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;

  await dbConnect();
  const sponsor = await Sponsor.findByIdAndDelete(params.id).lean();
  if (!sponsor) return error('Sponsor not found', 404);
  return success({ ok: true });
});
