import { handler, success } from '@/lib/api-utils';
import { authenticate, isAuthError } from '@/lib/auth';

export const POST = handler(async (request) => {
  const result = await authenticate(request);
  if (isAuthError(result)) return result;

  const { dbUser } = result;
  return success({
    user: {
      id: dbUser._id,
      name: dbUser.name,
      email: dbUser.email,
      phone: dbUser.phone,
      role: dbUser.role,
      avatar: dbUser.avatar,
      area: dbUser.area,
      children: dbUser.children,
      membershipPaid: dbUser.membershipPaid,
      membershipDate: dbUser.membershipDate,
    },
  });
});
