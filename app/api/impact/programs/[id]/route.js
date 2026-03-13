import { handler, success, error } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import ImpactProgram from '@/models/ImpactProgram';

const VALID_STATUSES = ['proposed', 'funding', 'active', 'completed', 'paused'];

// GET /api/impact/programs/[id]
export const GET = handler(async (request, { params }) => {
  const { id } = await params;
  await dbConnect();

  const program = await ImpactProgram.findById(id)
    .populate('categoryId', 'name icon color')
    .populate('coachId', 'name slug initials')
    .populate('sponsorId', 'name logo tier')
    .lean();

  if (!program) return error('Programme not found', 404);
  return success({ program });
});

// PATCH /api/impact/programs/[id] — Admin only
export const PATCH = handler(async (request, { params }) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return error('Invalid request body', 400);

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return error(`Invalid status. Must be: ${VALID_STATUSES.join(', ')}`, 400);
  }

  await dbConnect();

  const update = {};
  if (body.status) update.status = body.status;
  if (body.name) update.name = body.name;
  if (body.description !== undefined) update.description = body.description;
  if (body.capacity) update.capacity = Number(body.capacity);
  if (body.totalBudget) update.totalBudget = Number(body.totalBudget);
  if (body.schedule) update.schedule = body.schedule;
  if (body.venue) update.venue = body.venue;
  if (body.startDate) update.startDate = new Date(body.startDate);
  if (body.endDate) update.endDate = new Date(body.endDate);
  if (body.coachId) update.coachId = body.coachId;
  if (body.sponsorId) update.sponsorId = body.sponsorId;
  if (body.budget) update.budget = body.budget;

  const program = await ImpactProgram.findByIdAndUpdate(id, update, { new: true });
  if (!program) return error('Programme not found', 404);

  return success({ program });
});
