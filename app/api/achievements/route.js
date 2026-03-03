import { handler, success } from '@/lib/api-utils';
import dbConnect from '@/lib/db';
import Achievement from '@/models/Achievement';

// GET /api/achievements — Public, list active achievements
// ?categoryId= filters by category (also returns global achievements with no categoryId)
export const GET = handler(async (request) => {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('categoryId');

  const filter = { isActive: true };
  if (categoryId) {
    // Return achievements for this category OR global achievements (no categoryId)
    filter.$or = [
      { categoryId: categoryId },
      { categoryId: null },
      { categoryId: { $exists: false } },
    ];
  }

  const achievements = await Achievement.find(filter)
    .populate('categoryId', 'name slug icon color')
    .sort({ type: 1, rarity: 1, 'requirement.value': 1 })
    .lean();
  return success({ achievements });
});
