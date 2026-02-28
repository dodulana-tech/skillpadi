import { handler, success, error, parseBody, validateBody, sanitize } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import { applyRateLimit, getClientIp } from '@/lib/rate-limit';
import { RATE_LIMITS, LIMITS, ENQUIRY_SOURCES } from '@/lib/constants';
import dbConnect from '@/lib/db';
import Enquiry from '@/models/Enquiry';
import { notifyNewEnquiry } from '@/lib/whatsapp';

// GET /api/enquiries — Admin only
export const GET = handler(async (request) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;

  await dbConnect();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const filter = {};
  if (status) filter.status = status;

  const enquiries = await Enquiry.find(filter)
    .populate('programId', 'name slug categoryId')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return success({ enquiries });
});

// POST /api/enquiries — PUBLIC (rate limited)
export const POST = handler(async (request) => {
  // Rate limit — 5 enquiries per minute per IP
  const rl = applyRateLimit(request, { ...RATE_LIMITS.public, max: 5, prefix: 'enquiry' });
  if (rl.limited) {
    return error('Too many enquiries. Please try again in a minute.', 429);
  }

  const body = await parseBody(request);
  if (!body) return error('Invalid request', 400);

  const errors = validateBody(body, {
    parentName: { required: true, type: 'string', maxLength: LIMITS.maxNameLength, minLength: 2 },
    phone: { required: true, type: 'string', maxLength: LIMITS.maxPhoneLength, minLength: 7 },
    childName: { type: 'string', maxLength: LIMITS.maxNameLength },
    childAge: { type: 'number', min: LIMITS.minChildAge, max: LIMITS.maxChildAge },
    message: { type: 'string', maxLength: LIMITS.maxEnquiryMessageLength },
    source: { type: 'string', enum: ENQUIRY_SOURCES },
  });
  if (errors.length) return error('Validation failed', 400, errors);

  await dbConnect();
  const enquiry = await Enquiry.create({
    parentName: sanitize(body.parentName),
    phone: sanitize(body.phone),
    email: body.email ? sanitize(body.email) : undefined,
    childName: body.childName ? sanitize(body.childName) : undefined,
    childAge: body.childAge,
    programId: body.programId || undefined,
    message: body.message ? sanitize(body.message) : undefined,
    source: body.source || 'website',
  });

  // Notify admin (fire-and-forget)
  notifyNewEnquiry(
    process.env.NEXT_PUBLIC_WA_BUSINESS,
    body.parentName, body.childName || 'a child', 'Program',
  );

  return success({ enquiry }, 201);
});
