import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Donation from '@/models/Donation';
import ImpactProgram from '@/models/ImpactProgram';
import { initializePayment } from '@/lib/paystack';

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { amount, programId, donorName, donorEmail, donorPhone, isAnonymous, isRecurring, message, type } = body;

    // Input validation
    const numAmount = Number(amount);
    if (!numAmount || numAmount < 1000 || numAmount > 10_000_000) {
      return NextResponse.json({ error: 'Donation must be between ₦1,000 and ₦10,000,000' }, { status: 400 });
    }
    if (!programId || typeof programId !== 'string') {
      return NextResponse.json({ error: 'programId required' }, { status: 400 });
    }

    // Validate email format if provided
    if (donorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(donorEmail))) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate type
    const validTypes = ['individual', 'corporate', 'parent-crosssubsidy', 'coach-contribution'];
    const safeType = validTypes.includes(type) ? type : 'individual';

    const program = await ImpactProgram.findById(programId);
    if (!program) return NextResponse.json({ error: 'Programme not found' }, { status: 404 });
    if (!['funding', 'active'].includes(program.status)) {
      return NextResponse.json({ error: 'Programme is not accepting donations' }, { status: 400 });
    }

    const reference = `DON-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const donation = await Donation.create({
      donorName: isAnonymous ? 'Anonymous' : String(donorName || '').slice(0, 100),
      donorEmail: donorEmail ? String(donorEmail).slice(0, 200) : undefined,
      donorPhone: donorPhone ? String(donorPhone).slice(0, 20) : undefined,
      amount: numAmount,
      programId,
      paymentReference: reference,
      isAnonymous: !!isAnonymous,
      isRecurring: !!isRecurring,
      message: message ? String(message).slice(0, 500) : undefined,
      type: safeType,
    });

    // Initialize Paystack payment
    const email = donorEmail || 'donor@skillpadi.com';
    const paymentData = await initializePayment({
      email: String(email),
      amount: Math.round(numAmount * 100), // kobo
      reference,
      metadata: { donationId: donation._id.toString(), programId, type: 'impact-donation' },
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://skillpadi.com'}/api/impact/donate/verify?reference=${reference}`,
    });

    return NextResponse.json({ authorization_url: paymentData.authorization_url, reference });
  } catch (err) {
    console.error('Donation error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
