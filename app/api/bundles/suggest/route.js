import { handler, success, error } from '@/lib/api-utils';
import { authenticate, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Enrollment from '@/models/Enrollment';
import ChildPassport from '@/models/ChildPassport';
import { getSuggestedBundles } from '@/lib/bundle-engine';

// GET /api/bundles/suggest?childName=[name]
export const GET = handler(async (request) => {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const childName = searchParams.get('childName');
  if (!childName) return error('childName is required', 400);

  await dbConnect();

  const child = auth.dbUser.children?.find(c => c.name === childName) || { name: childName };

  const [enrollments, passport] = await Promise.all([
    Enrollment.find({ userId: auth.dbUser._id, childName, status: 'active' })
      .populate('programId', 'name sessions sessionType categoryId')
      .populate({ path: 'programId', populate: { path: 'categoryId', select: 'name slug icon color' } })
      .lean(),
    ChildPassport.findOne({ userId: auth.dbUser._id, childName }).lean(),
  ]);

  const bundles = await getSuggestedBundles(child, enrollments, passport);
  return success({ bundles });
});
