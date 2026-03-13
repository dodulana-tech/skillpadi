import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ImpactProgram from '@/models/ImpactProgram';

export async function GET() {
  try {
    await dbConnect();
    const programs = await ImpactProgram.find({ status: { $in: ['funding', 'active'] } })
      .populate('categoryId', 'name icon color')
      .populate('coachId', 'name slug initials')
      .populate('sponsorId', 'name logo tier')
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ programs });
  } catch (err) {
    return NextResponse.json({ programs: [] });
  }
}
