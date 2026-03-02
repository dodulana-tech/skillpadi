import { handler, success, error } from '@/lib/api-utils';
import { authenticate, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';

// 🔐 Add your admin emails here
const ADMIN_EMAILS = [
  'admin@skillpadi.com', // ← replace with your real email
];

export const POST = handler(async (request) => {
  const result = await authenticate(request);
  if (isAuthError(result)) return result;

  const { dbUser } = result;

  await dbConnect();

  // Check if this email is allowed to be admin
  if (!ADMIN_EMAILS.includes(dbUser.email)) {
    return error('Forbidden', 403);
  }

  // Promote to admin if not already
  if (dbUser.role !== 'admin') {
    await User.findByIdAndUpdate(dbUser._id, {
      role: 'admin',
    });
  }

  return success({ status: 'admin_granted' });
});