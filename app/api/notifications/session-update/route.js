import { handler, success, error, parseBody } from '@/lib/api-utils';
import { authenticate, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Enrollment from '@/models/Enrollment';
import { sendTextMessage } from '@/lib/whatsapp';
import { PLATFORM } from '@/lib/constants';

// POST /api/notifications/session-update
// Admin sends a WhatsApp session-progress update to a parent.
export const POST = handler(async (request) => {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;
  if (auth.dbUser.role !== 'admin') return error('Admin only', 403);

  const body = await parseBody(request);
  if (!body?.enrollmentId) return error('enrollmentId required', 400);

  await dbConnect();

  const enrollment = await Enrollment.findById(body.enrollmentId)
    .populate('userId', 'name phone email')
    .populate('programId', 'name sessions')
    .lean();

  if (!enrollment) return error('Enrollment not found', 404);

  const phone = enrollment.userId?.phone;
  if (!phone) return error('Parent has no phone number on file', 400);

  const childName = enrollment.childName;
  const programName = enrollment.programId?.name || 'their program';
  const sessionsCompleted = enrollment.sessionsCompleted || 0;
  const totalSessions = enrollment.programId?.sessions || 0;
  const note = body.note?.trim();

  const message = body.message?.trim() ||
    `🌟 *Session Update — ${childName}*\n\n` +
    `${childName} just completed session ${sessionsCompleted}/${totalSessions} of *${programName}*!\n\n` +
    `View full progress: ${PLATFORM.url}/dashboard/parent`;

  const fullMessage = note ? `${message}\n\n📝 Coach note: ${note}` : message;

  await sendTextMessage(phone, fullMessage);

  return success({ sent: true });
});
