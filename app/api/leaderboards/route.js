import mongoose from 'mongoose';
import { handler, success, error } from '@/lib/api-utils';
import dbConnect from '@/lib/db';
import ChildPassport from '@/models/ChildPassport';
import Enrollment from '@/models/Enrollment';
import User from '@/models/User';

// GET /api/leaderboards — Public leaderboard aggregations
// ?type=kids|schools|areas &category= &area= &limit=10
export const GET = handler(async (request) => {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'kids';
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const categoryId = searchParams.get('categoryId');
  const area = searchParams.get('area');

  if (type === 'kids') {
    const catOid = categoryId && mongoose.Types.ObjectId.isValid(categoryId)
      ? new mongoose.Types.ObjectId(categoryId)
      : null;

    const pipeline = [
      ...(catOid ? [{ $match: { 'skillLevels.categoryId': catOid } }] : []),
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmpty: false } },
      // Privacy: default opt-in, skip opted-out users
      { $match: { 'user.leaderboardOptOut': { $ne: true } } },
      ...(area ? [{ $match: { 'user.area': area } }] : []),
      {
        $addFields: {
          // Privacy: first name + first letter of last name only
          displayName: {
            $let: {
              vars: { parts: { $split: ['$user.name', ' '] } },
              in: {
                $concat: [
                  { $arrayElemAt: ['$$parts', 0] },
                  ' ',
                  {
                    $cond: {
                      if: { $gt: [{ $size: '$$parts' }, 1] },
                      then: { $concat: [{ $substr: [{ $arrayElemAt: ['$$parts', 1] }, 0, 1] }, '.'] },
                      else: '',
                    },
                  },
                ],
              },
            },
          },
          userArea: '$user.area',
        },
      },
      { $sort: { 'stats.totalSessions': -1, 'stats.currentStreak': -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          displayName: 1,
          userArea: 1,
          stats: 1,
          achievements: { $size: '$achievements' },
          skillLevels: 1,
        },
      },
    ];

    const kids = await ChildPassport.aggregate(pipeline);
    return success({ leaderboard: kids.map((k, i) => ({ rank: i + 1, ...k })) });
  }

  if (type === 'schools') {
    const pipeline = [
      { $match: { status: { $in: ['active', 'pending'] }, schoolId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$schoolId',
          totalEnrolled: { $sum: 1 },
          totalSessions: { $sum: '$sessionsCompleted' },
          totalCapacity: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'schools',
          localField: '_id',
          foreignField: '_id',
          as: 'school',
        },
      },
      { $unwind: { path: '$school', preserveNullAndEmpty: false } },
      ...(area ? [{ $match: { 'school.area': area } }] : []),
      { $sort: { totalEnrolled: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          schoolName: '$school.name',
          area: '$school.area',
          totalEnrolled: 1,
          totalSessions: 1,
        },
      },
    ];

    const schools = await Enrollment.aggregate(pipeline);
    return success({ leaderboard: schools.map((s, i) => ({ rank: i + 1, ...s })) });
  }

  if (type === 'areas') {
    const pipeline = [
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmpty: false } },
      {
        $group: {
          _id: '$user.area',
          totalKids: { $sum: 1 },
          totalSessions: { $sum: '$stats.totalSessions' },
        },
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { totalSessions: -1 } },
      { $limit: limit },
      {
        $project: {
          area: '$_id',
          totalKids: 1,
          totalSessions: 1,
        },
      },
    ];

    const areas = await ChildPassport.aggregate(pipeline);
    return success({ leaderboard: areas.map((a, i) => ({ rank: i + 1, ...a })) });
  }

  return error('Invalid type. Use kids, schools, or areas', 400);
});
