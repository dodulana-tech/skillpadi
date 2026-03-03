import { handler, success } from '@/lib/api-utils';
import dbConnect from '@/lib/db';
import Category from '@/models/Category';

// GET /api/categories — Public list of active categories
export const GET = handler(async () => {
  await dbConnect();
  const categories = await Category.find({ active: true })
    .populate('sponsorId', 'name tagline logo website')
    .sort({ order: 1, name: 1 })
    .lean();
  return success({ categories });
});
