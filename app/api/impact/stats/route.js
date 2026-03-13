import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ImpactProgram from '@/models/ImpactProgram';
import ImpactChild from '@/models/ImpactChild';

export async function GET() {
  try {
    await dbConnect();
    const [programs, childCount] = await Promise.all([
      ImpactProgram.find({ status: { $in: ['funding', 'active', 'completed'] } }).lean(),
      ImpactChild.countDocuments({ status: { $in: ['active', 'completed'] } }),
    ]);

    const communities = [...new Set(programs.map(p => p.community).filter(Boolean))];
    const totalSessions = programs.reduce((s, p) => s + (p.impactStats?.sessionsDelivered || 0), 0);

    return NextResponse.json({
      totalChildren: childCount || programs.reduce((s, p) => s + (p.enrolled || 0), 0),
      totalCommunities: communities.length,
      totalProgrammes: programs.length,
      totalSessions,
      avgAttendance: totalSessions > 0 ? Math.round(programs.reduce((s, p) => s + (p.impactStats?.attendance || 0), 0) / programs.length) : 0,
    });
  } catch (err) {
    return NextResponse.json({ totalChildren: 0, totalCommunities: 0, totalProgrammes: 0, totalSessions: 0, avgAttendance: 0 });
  }
}
