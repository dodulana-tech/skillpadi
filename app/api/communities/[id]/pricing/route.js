import { handler, success, error, parseBody } from '@/lib/api-utils';
import { authenticate, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Community from '@/models/Community';
import Program from '@/models/Program';

function calcPricing(program, community, programMarkup) {
  const base = program.pricePerSession || 0;
  const sessions = program.sessions || 1;
  const baseTotalPrice = base * sessions;

  let markupPercent = community.defaultMarkupPercent ?? 10;
  let customPrice = null;

  if (programMarkup) {
    if (typeof programMarkup.customPrice === 'number') customPrice = programMarkup.customPrice;
    else if (typeof programMarkup.markupPercent === 'number') markupPercent = programMarkup.markupPercent;
  }

  const publicPricePerSession = customPrice ?? Math.round(base * (1 + markupPercent / 100));
  const residentDiscount = community.residentDiscount ?? 0;
  const residentPricePerSession = Math.round(publicPricePerSession * (1 - residentDiscount / 100));

  const markupAmount = publicPricePerSession - base;
  const residentMarkupAmount = residentPricePerSession - base;

  return {
    programId: program._id,
    programName: program.name,
    categoryIcon: program.categoryId?.icon || '',
    categoryName: program.categoryId?.name || '',
    sessions,
    basePricePerSession: base,
    baseTotalPrice,
    markupPercent: customPrice ? null : markupPercent,
    residentDiscount,
    customPrice: customPrice ?? null,
    publicPricePerSession,
    publicTotalPrice: publicPricePerSession * sessions,
    residentPricePerSession,
    residentTotalPrice: residentPricePerSession * sessions,
    communityEarningPerResident: residentMarkupAmount * sessions,
    communityEarningPerNonResident: markupAmount * sessions,
    venueFeePerSession: community.venueFee || 0,
    isActive: programMarkup?.isActive !== false,
  };
}

export const GET = handler(async (request, { params }) => {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  await dbConnect();

  const community = await Community.findById(id).lean();
  if (!community) return error('Community not found', 404);

  if (auth.dbUser.role === 'community') {
    if (String(auth.dbUser.communityId) !== String(community._id)) return error('Access denied', 403);
  } else if (auth.dbUser.role !== 'admin') {
    // Parents fetching their resident price for a single program
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');
    if (!programId) return error('Access denied', 403);
    const program = await Program.findById(programId).populate('categoryId', 'name icon').lean();
    if (!program) return error('Program not found', 404);
    const override = community.programMarkups?.find(pm => String(pm.programId) === String(programId) && pm.isActive !== false);
    return success({ pricing: calcPricing(program, community, override) });
  }

  const programs = await Program.find({ isActive: true })
    .populate('categoryId', 'name icon')
    .sort({ name: 1 })
    .lean();

  const pricing = programs.map(prog => {
    const override = community.programMarkups?.find(pm => String(pm.programId) === String(prog._id));
    return calcPricing(prog, community, override);
  });

  return success({
    pricing,
    defaultMarkupPercent: community.defaultMarkupPercent ?? 10,
    residentDiscount: community.residentDiscount ?? 5,
    venueProvided: community.venueProvided,
    venueFee: community.venueFee || 0,
    totalEarnings: community.totalEarnings || 0,
    pendingPayout: community.pendingPayout || 0,
  });
});

export const PATCH = handler(async (request, { params }) => {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  await dbConnect();

  const community = await Community.findById(id);
  if (!community) return error('Community not found', 404);

  if (auth.dbUser.role === 'community' && String(auth.dbUser.communityId) !== String(community._id)) {
    return error('Access denied', 403);
  }
  if (!['community', 'admin'].includes(auth.dbUser.role)) return error('Access denied', 403);

  const body = await parseBody(request);

  if (typeof body.defaultMarkupPercent === 'number') {
    const pct = body.defaultMarkupPercent;
    if (pct < 0 || pct > 30) return error('Community markup must be 0–30%', 400);
    community.defaultMarkupPercent = pct;
    community.marginPercent = pct;
  }
  if (typeof body.residentDiscount === 'number') {
    const d = body.residentDiscount;
    if (d < 0 || d > 50) return error('Resident discount must be 0–50%', 400);
    community.residentDiscount = d;
  }
  if (Array.isArray(body.programMarkups)) {
    for (const pm of body.programMarkups) {
      const idx = community.programMarkups.findIndex(x => String(x.programId) === String(pm.programId));
      if (idx >= 0) community.programMarkups[idx] = { ...community.programMarkups[idx].toObject(), ...pm };
      else community.programMarkups.push(pm);
    }
  }

  await community.save();
  return success({ ok: true, defaultMarkupPercent: community.defaultMarkupPercent });
});
