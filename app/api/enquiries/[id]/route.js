import { handler, success, error, parseBody } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import { ENQUIRY_STATUSES } from '@/lib/constants';
import dbConnect from '@/lib/db';
import Enquiry from '@/models/Enquiry';

export const PATCH = handler(async (request, { params }) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const body = await parseBody(request);
  if (!body) return error('Invalid JSON body', 400);

  if (body.status && !ENQUIRY_STATUSES.includes(body.status)) {
    return error(`Invalid status. Must be: ${ENQUIRY_STATUSES.join(', ')}`, 400);
  }

  await dbConnect();
  const update = {};
  if (body.status) update.status = body.status;
  if (body.notes) update.notes = body.notes;
  if (body.assignedTo) update.assignedTo = body.assignedTo;
  if (body.followUpDate) update.followUpDate = body.followUpDate;
  if (body.status === 'enrolled') update.convertedAt = new Date();

  const enquiry = await Enquiry.findByIdAndUpdate(id, update, { new: true });
  if (!enquiry) return error('Enquiry not found', 404);
  return success({ enquiry });
});

export const DELETE = handler(async (request, { params }) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  await dbConnect();
  const enquiry = await Enquiry.findByIdAndDelete(id);
  if (!enquiry) return error('Enquiry not found', 404);
  return success({ message: 'Enquiry deleted' });
});
