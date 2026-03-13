import { handler, success, error } from '@/lib/api-utils';
import dbConnect from '@/lib/db';
import Enquiry from '@/models/Enquiry';
import Category from '@/models/Category';

export const POST = handler(async (request) => {
  const body = await request.json().catch(() => null);
  if (!body) return error('Invalid request body', 400);

  const { name, email, phone, city, categorySlug, title, bio, yearsExperience, ageGroups, certifications, venues, whySkillPadi } = body;

  if (!name || !email || !phone || !categorySlug) {
    return error('Name, email, phone, and category are required', 400);
  }

  await dbConnect();

  // Validate category exists
  const category = await Category.findOne({ slug: categorySlug }).lean();
  if (!category) return error('Invalid category', 400);

  // Check for duplicate application (same email, not declined)
  const existing = await Enquiry.findOne({
    email: String(email).trim().toLowerCase(),
    source: 'coach-application',
    status: { $in: ['new', 'contacted'] },
  }).lean();
  if (existing) return error('You already have a pending application', 400);

  // Store as enquiry with coach application data in message
  const applicationData = {
    categorySlug,
    categoryName: category.name,
    title: title || '',
    bio: bio || '',
    yearsExperience: yearsExperience || '',
    ageGroups: ageGroups || '',
    certifications: certifications || '',
    venues: venues || '',
    whySkillPadi: whySkillPadi || '',
    city: city || 'abuja',
  };

  await Enquiry.create({
    parentName: String(name).trim(),
    phone: String(phone).trim(),
    email: String(email).trim().toLowerCase(),
    source: 'coach-application',
    status: 'new',
    message: JSON.stringify(applicationData),
  });

  return success({ message: 'Application received' }, 201);
});
