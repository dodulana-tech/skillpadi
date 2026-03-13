import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { authenticate, requireRole, isAuthError } from '@/lib/auth';
import ImpactProgram from '@/models/ImpactProgram';
import Coach from '@/models/Coach';

export async function POST(req) {
  try {
    const auth = await requireRole(req, ['coach', 'admin']);
    if (isAuthError(auth)) return auth;

    await dbConnect();

    const body = await req.json();
    const { name, community, city, whyCommunity, categoryId, venue, venueType, venueNotes, schedule, ageRange, capacity, termWeeks, coachDonatesTime, coachStory, budget } = body;

    if (!name || !community || !categoryId) {
      return NextResponse.json({ error: 'Name, community, and category are required' }, { status: 400 });
    }

    // Verify coach has a coachId linked
    if (auth.dbUser.role === 'coach' && !auth.dbUser.coachId) {
      return NextResponse.json({ error: 'Coach profile not linked. Contact admin.' }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString(36);

    const totalBudget = (budget?.equipment || 0) + (budget?.venue || 0) + (budget?.transport || 0) + (budget?.food || 0) + (budget?.stipend || 0) + (budget?.other || 0);

    const program = await ImpactProgram.create({
      name,
      slug,
      description: whyCommunity,
      community,
      city: city || 'abuja',
      categoryId,
      venue,
      venueType,
      venueNotes,
      schedule,
      ageRange,
      capacity: capacity || 30,
      termWeeks: termWeeks || 12,
      coachDonatesTime: coachDonatesTime !== false,
      coachStory: whyCommunity,
      proposedByCoachId: auth.dbUser.coachId,
      coachId: auth.dbUser.coachId,
      budget: { ...budget, total: totalBudget },
      totalBudget,
      costPerChild: capacity ? Math.ceil(totalBudget / capacity) : 0,
      status: 'proposed',
    });

    // Update coach
    if (auth.dbUser.coachId) {
      await Coach.findByIdAndUpdate(auth.dbUser.coachId, {
        givesBack: true,
        $push: { giveBackProgramIds: program._id },
      });
    }

    return NextResponse.json({ success: true, program }, { status: 201 });
  } catch (err) {
    console.error('Impact propose error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
