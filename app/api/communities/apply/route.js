import { handler, success, error, parseBody } from '@/lib/api-utils';
import { applyRateLimit } from '@/lib/rate-limit';
import { RATE_LIMITS } from '@/lib/constants';
import dbConnect from '@/lib/db';
import Community from '@/models/Community';
import { sendTextMessage } from '@/lib/whatsapp';
import { PLATFORM } from '@/lib/constants';

// POST /api/communities/apply — public endpoint
export const POST = handler(async (request) => {
  const rl = applyRateLimit(request, { ...RATE_LIMITS.public, prefix: 'community-apply' });
  if (rl.limited) return error('Too many applications from this IP', 429);

  const body = await parseBody(request);
  if (!body?.name?.trim()) return error('Community name is required', 400);
  if (!body?.contactEmail?.trim()) return error('Contact email is required', 400);

  await dbConnect();

  // Dedup by email
  const existing = await Community.findOne({ email: body.contactEmail.trim().toLowerCase() }).lean();
  if (existing) return error('A partnership request with this email already exists. We will WhatsApp you within 24 hours.', 409);

  const slug = body.name.toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 80);

  let finalSlug = slug;
  let suffix = 1;
  while (await Community.findOne({ slug: finalSlug }).lean()) {
    finalSlug = `${slug}-${suffix++}`;
  }

  const community = await Community.create({
    name: body.name.trim(),
    slug: finalSlug,
    type: body.type || 'estate',
    contactName: body.contactName?.trim(),
    contactRole: body.contactRole?.trim(),
    email: body.contactEmail?.trim().toLowerCase(),
    phone: body.contactPhone?.trim(),
    area: body.area?.trim(),
    city: body.city || 'abuja',
    address: body.address?.trim(),
    estimatedHouseholds: body.estimatedHouseholds ? Number(body.estimatedHouseholds) : undefined,
    estimatedKids: body.estimatedKids ? Number(body.estimatedKids) : undefined,
    venueProvided: body.venueProvided !== false,
    facilities: body.facilities || [],
    notes: body.notes?.trim(),
    status: 'pending',
    applicationDate: new Date(),
  });

  // Notify admin (fire-and-forget)
  const adminPhone = process.env.ADMIN_WHATSAPP_PHONE;
  if (adminPhone) {
    sendTextMessage(adminPhone,
      `🏘️ *New Estate Partnership*\n\n` +
      `*${body.name.trim()}* (${body.type || 'estate'}) in ${body.area || 'unknown area'}\n` +
      `Contact: ${body.contactName || 'N/A'} · ${body.contactPhone || 'N/A'}\n` +
      `~${body.estimatedHouseholds || '?'} households · ~${body.estimatedKids || '?'} kids\n\n` +
      `Review: ${PLATFORM.url}/admin`
    );
  }

  return success({ ok: true, communityId: community._id }, 201);
});
