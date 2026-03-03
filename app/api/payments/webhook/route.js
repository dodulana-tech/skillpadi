import { NextResponse } from 'next/server';
import { validateWebhookSignature } from '@/lib/paystack';
import dbConnect from '@/lib/db';
import Payment from '@/models/Payment';
import User from '@/models/User';
import Enrollment from '@/models/Enrollment';
import Program from '@/models/Program';
import { notifyPaymentReceived } from '@/lib/whatsapp';

export const runtime = 'nodejs';

export async function POST(request) {
  let rawBody;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ received: true });
  }

  const signature = request.headers.get('x-paystack-signature') || '';
  if (process.env.PAYSTACK_SECRET_KEY && !validateWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ received: true });
  }

  let event;
  try { event = JSON.parse(rawBody); } catch { return NextResponse.json({ received: true }); }
  if (event.event !== 'charge.success') return NextResponse.json({ received: true });

  const data = event.data;
  if (!data?.reference) return NextResponse.json({ received: true });

  try {
    await dbConnect();

    // Already processed?
    const alreadyDone = await Payment.findOne({ reference: data.reference, status: 'success' }).lean();
    if (alreadyDone) return NextResponse.json({ received: true });

    // READ the payment first to preserve webhookData (checkout items live here)
    const original = await Payment.findOne({ reference: data.reference, status: 'pending' }).lean();
    if (!original) return NextResponse.json({ received: true });

    // Now update — MERGE webhookData, don't overwrite
    const payment = await Payment.findOneAndUpdate(
      { _id: original._id, status: 'pending' },
      {
        status: 'success',
        paystackRef: String(data.id || ''),
        channel: data.channel,
        paidAt: data.paid_at ? new Date(data.paid_at) : new Date(),
        'webhookData.paystackResponse': data,
      },
      { new: true },
    );

    if (!payment) return NextResponse.json({ received: true });
    console.info(`[Webhook] Payment confirmed: ${data.reference} — N${payment.totalAmount}`);

    // Use the ORIGINAL webhookData (which has checkoutItems)
    const checkout = original.webhookData?.checkoutItems;
    const childName = original.webhookData?.childName;
    const childAge = original.webhookData?.childAge;
    const programId = original.webhookData?.programId;

    // Handle unified checkout
    if (Array.isArray(checkout) && checkout.length > 0) {
      for (const item of checkout) {
        if (item.type === 'membership') {
          await User.findByIdAndUpdate(payment.userId, {
            membershipPaid: true,
            membershipDate: new Date(),
            membershipRef: data.reference,
          });
        }

        if (item.type === 'enrollment' && programId) {
          // Check duplicate — include childName in check
          const exists = await Enrollment.findOne({
            userId: payment.userId,
            programId: programId,
            childName: childName,
            status: { $in: ['pending', 'active'] },
          }).lean();

          if (!exists) {
            const program = await Program.findOneAndUpdate(
              { _id: programId, $expr: { $lt: ['$spotsTaken', '$spotsTotal'] } },
              { $inc: { spotsTaken: 1 } },
              { new: true },
            );
            if (program) {
              await Enrollment.create({
                userId: payment.userId,
                childName: childName || 'Child',
                childAge: childAge,
                programId: programId,
                status: 'active',
                paymentId: payment._id,
                startDate: new Date(),
              });
              console.info(`[Webhook] Enrollment created: ${childName} in ${program.name}`);
            }
          }
        }
      }
    }

    // Handle simple membership (non-checkout)
    if (payment.type === 'membership' && !checkout) {
      await User.findByIdAndUpdate(payment.userId, {
        membershipPaid: true,
        membershipDate: new Date(),
        membershipRef: data.reference,
      });
    }

    // Handle simple enrollment (non-checkout)
    if (payment.type === 'enrollment' && payment.enrollmentId && !checkout) {
      await Enrollment.findByIdAndUpdate(payment.enrollmentId, {
        status: 'active',
        paymentId: payment._id,
      });
    }

    // WhatsApp (fire and forget)
    try {
      const user = await User.findById(payment.userId).select('phone').lean();
      if (user?.phone) {
        await notifyPaymentReceived(user.phone, payment.totalAmount, payment.description);
      }
    } catch (e) { /* non-blocking */ }

  } catch (err) {
    console.error('[Webhook] Error:', err.message);
  }

  return NextResponse.json({ received: true });
}