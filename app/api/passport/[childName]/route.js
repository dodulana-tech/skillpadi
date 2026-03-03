import { handler, success, error } from '@/lib/api-utils';
import { authenticate, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import ChildPassport from '@/models/ChildPassport';

// GET /api/passport/[childName] — Get a child's passport
// Parents see their own child. Admins can pass ?userId= to view any.
export const GET = handler(async (request, { params }) => {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  const { childName } = await params;
  const { searchParams } = new URL(request.url);

  await dbConnect();

  let userId = auth.dbUser._id;
  if (auth.dbUser.role === 'admin' && searchParams.get('userId')) {
    userId = searchParams.get('userId');
  } else if (auth.dbUser.role !== 'parent' && auth.dbUser.role !== 'admin') {
    return error('Access denied', 403);
  }

  const passport = await ChildPassport.findOne({
    userId,
    childName: decodeURIComponent(childName),
  })
    .populate('achievements.achievementId', 'code name description icon type rarity points')
    .populate('achievements.programId', 'name')
    .populate('skillLevels.categoryId', 'name slug icon color')
    .lean();

  if (!passport) {
    // Return empty passport structure (child exists but hasn't earned anything yet)
    return success({ passport: null, empty: true });
  }

  return success({ passport });
});
