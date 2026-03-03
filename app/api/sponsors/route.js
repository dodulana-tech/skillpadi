import { handler, success, error, parseBody } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Sponsor from '@/models/Sponsor';

// GET /api/sponsors — Public: returns active sponsors (admin sees all with ?all=true)
export const GET = handler(async (request) => {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get('all') === 'true';
  await dbConnect();
  const filter = all ? {} : { active: true };
  const sponsors = await Sponsor.find(filter).sort({ name: 1 }).lean();
  return success({ sponsors });
});

// POST /api/sponsors — Admin only: create sponsor
export const POST = handler(async (request) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;

  const body = await parseBody(request);
  if (!body?.name?.trim()) return error('Sponsor name is required', 400);

  await dbConnect();

  const slug = body.slug?.trim() ||
    body.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 80);

  const sponsor = await Sponsor.create({
    name:         body.name.trim(),
    slug,
    tagline:      body.tagline?.trim() || undefined,
    logo:         body.logo?.trim() || undefined,
    website:      body.website?.trim() || undefined,
    contactName:  body.contactName?.trim() || undefined,
    contactEmail: body.contactEmail?.trim() || undefined,
    contactPhone: body.contactPhone?.trim() || undefined,
    type:         body.type || 'general',
    active:       body.active !== false,
    notes:        body.notes?.trim() || undefined,
  });

  return success({ sponsor }, 201);
});
