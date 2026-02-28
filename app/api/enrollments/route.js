import { handler, success, error, parseBody, validateBody } from '@/lib/api-utils';
import { authenticate, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Enrollment from '@/models/Enrollment';
import Program from '@/models/Program';
import { LIMITS } from '@/lib/constants';
import { notifyEnrollmentConfirmed } from '@/lib/whatsapp';

// GET /api/enrollments — Users see own, admin sees all
export const GET = handler(async (request) => {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  await dbConnect();
  const { searchParams } = new URL(request.url);

  const filter = {};
  if (auth.dbUser.role === 'parent') {
    filter.userId = auth.dbUser._id;
  } else if (auth.dbUser.role === 'school') {
    filter.schoolId = auth.dbUser.schoolId;
  }
  // Admin sees all

  if (searchParams.get('programId')) filter.programId = searchParams.get('programId');
  if (searchParams.get('status')) filter.status = searchParams.get('status');

  const enrollments = await Enrollment.find(filter)
    .populate('programId', 'name slug categoryId schedule location milestones sessions pricePerSession')
    .populate('userId', 'name email phone')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return success({ enrollments });
});

// POST /api/enrollments — Create enrollment with ATOMIC spot booking
export const POST = handler(async (request) => {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  const body = await parseBody(request);
  if (!body) return error('Invalid JSON body', 400);

  const errors = validateBody(body, {
    programId: { required: true, type: 'string' },
    childName: { required: true, type: 'string', maxLength: LIMITS.maxNameLength },
    childAge: { type: 'number', min: LIMITS.minChildAge, max: LIMITS.maxChildAge },
  });
  if (errors.length) return error('Validation failed', 400, errors);

  await dbConnect();

  // ══════════════════════════════════════════════════════════
  // ATOMIC SPOT BOOKING — Prevents double-booking race condition
  //
  // This is a single atomic operation: it ONLY increments
  // spotsTaken if it's currently less than spotsTotal.
  // Two parents clicking "enroll" simultaneously = one gets
  // the spot, the other gets "Program is full".
  // ══════════════════════════════════════════════════════════
  const program = await Program.findOneAndUpdate(
    {
      _id: body.programId,
      isActive: true,
      $expr: { $lt: ['$spotsTaken', '$spotsTotal'] },
    },
    { $inc: { spotsTaken: 1 } },
    { new: true },
  );

  if (!program) {
    // Check if program exists vs. is full
    const exists = await Program.findById(body.programId).lean();
    if (!exists) return error('Program not found', 404);
    if (!exists.isActive) return error('Program is no longer active', 400);
    return error('Program is full — join the waitlist via WhatsApp', 400);
  }

  // Check for duplicate enrollment
  const existing = await Enrollment.findOne({
    userId: auth.dbUser._id,
    programId: body.programId,
    childName: body.childName,
    status: { $in: ['pending', 'active'] },
  }).lean();

  if (existing) {
    // Rollback the spot increment
    await Program.findByIdAndUpdate(body.programId, { $inc: { spotsTaken: -1 } });
    return error('Child is already enrolled in this program', 409);
  }

  const enrollment = await Enrollment.create({
    userId: auth.dbUser._id,
    childName: body.childName.trim(),
    childAge: body.childAge,
    programId: body.programId,
    schoolId: body.schoolId || undefined,
    status: 'active',
    startDate: new Date(),
  });

  // WhatsApp notification (fire-and-forget — never blocks)
  if (auth.dbUser.phone) {
    notifyEnrollmentConfirmed(
      auth.dbUser.phone, body.childName, program.name, program.schedule,
    );
  }

  return success({ enrollment }, 201);
});
