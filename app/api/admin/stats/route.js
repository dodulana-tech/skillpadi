import { handler, success } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Coach from '@/models/Coach';
import Program from '@/models/Program';
import Enrollment from '@/models/Enrollment';
import Payment from '@/models/Payment';
import Enquiry from '@/models/Enquiry';
import School from '@/models/School';
import Category from '@/models/Category';

export const GET = handler(async (request) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;
  await dbConnect();

  // Run all queries in parallel for speed
  const [
    totalParents,
    childrenAgg,
    totalCoaches,
    certifiedCoaches,
    totalPrograms,
    activeEnrollments,
    payments,
    newEnquiries,
    totalEnquiries,
    enrolledEnquiries,
    schools,
    categories,
    programs,
  ] = await Promise.all([
    User.countDocuments({ role: 'parent' }),
    User.aggregate([{ $unwind: '$children' }, { $count: 'total' }]),
    Coach.countDocuments({ isActive: true }),
    Coach.countDocuments({ isActive: true, shieldLevel: 'certified' }),
    Program.countDocuments({ isActive: true }),
    Enrollment.countDocuments({ status: 'active' }),
    Payment.find({ status: 'success' }).select('type totalAmount tax').lean(),
    Enquiry.countDocuments({ status: 'new' }),
    Enquiry.countDocuments(),
    Enquiry.countDocuments({ status: 'enrolled' }),
    School.countDocuments({ isActive: true }),
    Category.find({ active: true }).lean(),
    Program.find({ isActive: true }).select('spotsTotal spotsTaken categoryId pricePerSession sessions').lean(),
  ]);

  const revenueByType = {};
  let totalRevenue = 0;
  let totalTax = 0;
  for (const p of payments) {
    revenueByType[p.type] = (revenueByType[p.type] || 0) + p.totalAmount;
    totalRevenue += p.totalAmount;
    totalTax += p.tax;
  }

  const totalSpots = programs.reduce((s, p) => s + p.spotsTotal, 0);
  const usedSpots = programs.reduce((s, p) => s + p.spotsTaken, 0);
  const conversionRate = totalEnquiries > 0 ? Math.round((enrolledEnquiries / totalEnquiries) * 100) : 0;

  return success({
    overview: {
      totalParents,
      totalChildren: childrenAgg[0]?.total || 0,
      totalCoaches,
      certifiedCoaches,
      totalPrograms,
      activeEnrollments,
      totalRevenue,
      totalTax,
      newEnquiries,
      conversionRate,
      totalSpots,
      usedSpots,
      capacityPercent: totalSpots > 0 ? Math.round((usedSpots / totalSpots) * 100) : 0,
      schools,
    },
    revenue: {
      total: totalRevenue,
      tax: totalTax,
      byType: revenueByType,
      payments: payments.length,
    },
    categories: categories.map((c) => ({
      ...c,
      programCount: programs.filter((p) => String(p.categoryId) === String(c._id)).length,
    })),
  });
});
