import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Donation from '@/models/Donation';
import ImpactProgram from '@/models/ImpactProgram';
import { verifyPayment } from '@/lib/paystack';
import { sendTextMessage } from '@/lib/whatsapp';

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get('reference');
    if (!reference) return NextResponse.json({ error: 'reference required' }, { status: 400 });

    const donation = await Donation.findOne({ paymentReference: reference });
    if (!donation) return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
    if (donation.paymentStatus === 'success') {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://skillpadi.com'}/impact?donated=true`);
    }

    const verification = await verifyPayment(reference);
    if (verification.status !== 'success') {
      donation.paymentStatus = 'failed';
      await donation.save();
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://skillpadi.com'}/impact?donated=false`);
    }

    donation.paymentStatus = 'success';
    await donation.save();

    // Increment funded amount
    await ImpactProgram.findByIdAndUpdate(donation.programId, {
      $inc: { fundedAmount: donation.amount },
    });

    // Check if fully funded -> activate
    const program = await ImpactProgram.findById(donation.programId);
    if (program && program.fundedAmount >= program.totalBudget && program.status === 'funding') {
      program.status = 'active';
      await program.save();
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://skillpadi.com'}/impact?donated=true`);
  } catch (err) {
    console.error('Donation verify error:', err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://skillpadi.com'}/impact?donated=false`);
  }
}
