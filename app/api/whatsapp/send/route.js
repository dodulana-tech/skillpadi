import { handler, success, error, parseBody, validateBody } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import { hasWhatsApp } from '@/lib/env';
import { LIMITS } from '@/lib/constants';
import { sendTextMessage } from '@/lib/whatsapp';

export const POST = handler(async (request) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;

  if (!hasWhatsApp()) return error('WhatsApp is not configured', 503);

  const body = await parseBody(request);
  if (!body) return error('Invalid request', 400);

  const errors = validateBody(body, {
    to: { required: true, type: 'string', maxLength: LIMITS.maxPhoneLength },
    message: { required: true, type: 'string', maxLength: 1000 },
  });
  if (errors.length) return error('Validation failed', 400, errors);

  const result = await sendTextMessage(body.to, body.message);
  if (!result) return error('Failed to send message', 502);
  return success({ sent: true });
});
