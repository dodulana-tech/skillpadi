import { handler, success, error, parseBody, validateBody } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import School from '@/models/School';
import Enrollment from '@/models/Enrollment';

export const GET = handler(async (request) => {
  const auth = await requireRole(request, ['admin', 'school']);
  if (isAuthError(auth)) return auth;
  await dbConnect();

  const filter = {};
  if (auth.dbUser.role === 'school') filter._id = auth.dbUser.schoolId;

  const schools = await School.find(filter).sort({ name: 1 }).lean();
  const enriched = await Promise.all(schools.map(async (school) => {
    const activeStudents = await Enrollment.countDocuments({ schoolId: school._id, status: 'active' });
    return { ...school, activeStudents };
  }));
  return success({ schools: enriched });
});

export const POST = handler(async (request) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;
  const body = await parseBody(request);
  if (!body) return error('Invalid JSON body', 400);

  const errors = validateBody(body, {
    name: { required: true, type: 'string', maxLength: 200 },
    slug: { required: true, type: 'string', maxLength: 100 },
    marginPercent: { type: 'number', min: 0, max: 50 },
  });
  if (errors.length) return error('Validation failed', 400, errors);

  await dbConnect();
  const school = await School.create(body);
  return success({ school }, 201);
});
