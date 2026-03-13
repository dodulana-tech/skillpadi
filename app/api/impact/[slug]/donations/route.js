import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ImpactProgram from '@/models/ImpactProgram';
import Donation from '@/models/Donation';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { slug } = await params;
    const program = await ImpactProgram.findOne({ slug });
    if (!program) return NextResponse.json({ donations: [] });

    const donations = await Donation.find({ programId: program._id, paymentStatus: 'success' })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('donorName amount isAnonymous message createdAt')
      .lean();

    return NextResponse.json({ donations });
  } catch (err) {
    return NextResponse.json({ donations: [] });
  }
}
