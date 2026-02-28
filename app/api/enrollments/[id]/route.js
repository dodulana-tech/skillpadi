import { handler, success, error, parseBody } from '@/lib/api-utils';
import { authenticate, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Enrollment from '@/models/Enrollment';

export const GET = handler(async (request, { params }) => {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  await dbConnect();

  const enrollment = await Enrollment.findById(id)
    .populate('programId')
    .populate('userId', 'name email phone')
    .lean();

  if (!enrollment) return error('Enrollment not found', 404);
  if (auth.dbUser.role === 'parent' && String(enrollment.userId?._id) !== String(auth.dbUser._id)) {
    return error('Access denied', 403);
  }
  return success({ enrollment });
});

export const PATCH = handler(async (request, { params }) => {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;
  if (!['admin', 'coach'].includes(auth.dbUser.role)) {
    return error('Only coaches and admins can update enrollments', 403);
  }

  const { id } = await params;
  const body = await parseBody(request);
  if (!body) return error('Invalid JSON body', 400);

  await dbConnect();
  const update = {};
  if (typeof body.sessionsCompleted === 'number') update.sessionsCompleted = body.sessionsCompleted;
  if (body.addMilestone) update.$addToSet = { milestonesCompleted: body.addMilestone };
  if (body.status) update.status = body.status;
  if (body.nextSession) update.nextSession = body.nextSession;
  if (body.notes) update.notes = body.notes;

  const enrollment = await Enrollment.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  if (!enrollment) return error('Enrollment not found', 404);
  return success({ enrollment });
});
