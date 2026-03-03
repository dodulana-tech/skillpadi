import { handler, success, error, parseBody } from '@/lib/api-utils';
import { authenticate, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import School from '@/models/School';
import Program from '@/models/Program';

// ── Helper: compute prices for a single program ───────────────────
function calcPricing(program, school, programMarkup) {
  const base = program.pricePerSession || 0;
  const sessions = program.sessions || 1;
  const baseTotalPrice = base * sessions;

  let markupPercent = school.defaultMarkupPercent ?? 15;
  let customPrice = null;

  if (programMarkup) {
    if (typeof programMarkup.customPrice === 'number') {
      customPrice = programMarkup.customPrice;
    } else if (typeof programMarkup.markupPercent === 'number') {
      markupPercent = programMarkup.markupPercent;
    }
  }

  const parentPricePerSession = customPrice ?? Math.round(base * (1 + markupPercent / 100));
  const parentTotalPrice = parentPricePerSession * sessions;
  const markupAmount = parentPricePerSession - base;
  const schoolEarningPerChild = markupAmount * sessions;

  return {
    programId: program._id,
    programName: program.name,
    categoryIcon: program.categoryId?.icon || '',
    categoryName: program.categoryId?.name || '',
    sessions,
    basePricePerSession: base,
    baseTotalPrice,
    markupPercent: customPrice ? null : markupPercent,
    customPrice: customPrice ?? null,
    markupAmount,
    parentPricePerSession,
    parentTotalPrice,
    schoolEarningPerChild,
    isActive: programMarkup?.isActive !== false,
  };
}

// GET /api/schools/[id]/pricing
// Returns all programs with the school's calculated markup.
// Used by school dashboard and EnrollmentCheckout.
export const GET = handler(async (request, { params }) => {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  await dbConnect();

  const school = await School.findById(id).lean();
  if (!school) return error('School not found', 404);

  // School users can only see their own pricing; admins can see any
  if (auth.dbUser.role === 'school') {
    const schoolId = String(auth.dbUser.schoolId);
    if (schoolId !== String(school._id)) return error('Access denied', 403);
  } else if (auth.dbUser.role !== 'admin') {
    // Parents can fetch pricing for their own schoolId (for checkout price display)
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');
    if (!programId) return error('Access denied', 403);
    // Single-program lookup for parent checkout — return just that program
    const program = await Program.findById(programId)
      .populate('categoryId', 'name icon')
      .lean();
    if (!program) return error('Program not found', 404);
    const override = school.programMarkups?.find(pm => String(pm.programId) === String(programId) && pm.isActive !== false);
    return success({ pricing: calcPricing(program, school, override) });
  }

  const programs = await Program.find({ isActive: true })
    .populate('categoryId', 'name icon')
    .sort({ name: 1 })
    .lean();

  const pricing = programs.map(prog => {
    const override = school.programMarkups?.find(pm => String(pm.programId) === String(prog._id));
    return calcPricing(prog, school, override);
  });

  return success({
    pricing,
    defaultMarkupPercent: school.defaultMarkupPercent ?? 15,
    totalEarnings: school.totalEarnings || 0,
    pendingPayout: school.pendingPayout || 0,
    billingCycle: school.billingCycle,
  });
});

// PATCH /api/schools/[id]/pricing
// Update school markup settings.
export const PATCH = handler(async (request, { params }) => {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  await dbConnect();

  const school = await School.findById(id);
  if (!school) return error('School not found', 404);

  if (auth.dbUser.role === 'school' && String(auth.dbUser.schoolId) !== String(school._id)) {
    return error('Access denied', 403);
  }
  if (!['school', 'admin'].includes(auth.dbUser.role)) return error('Access denied', 403);

  const body = await parseBody(request);

  if (typeof body.defaultMarkupPercent === 'number') {
    const pct = body.defaultMarkupPercent;
    if (pct < 0 || pct > 50) return error('Markup must be between 0% and 50%', 400);
    school.defaultMarkupPercent = pct;
    school.marginPercent = pct; // keep in sync
  }

  if (Array.isArray(body.programMarkups)) {
    for (const pm of body.programMarkups) {
      if (pm.markupPercent !== undefined && (pm.markupPercent < 0 || pm.markupPercent > 50)) {
        return error('Per-program markup must be 0–50%', 400);
      }
      const idx = school.programMarkups.findIndex(x => String(x.programId) === String(pm.programId));
      if (idx >= 0) {
        school.programMarkups[idx] = { ...school.programMarkups[idx].toObject(), ...pm };
      } else {
        school.programMarkups.push(pm);
      }
    }
  }

  if (body.billingCycle) school.billingCycle = body.billingCycle;

  await school.save();
  return success({ ok: true, defaultMarkupPercent: school.defaultMarkupPercent });
});
