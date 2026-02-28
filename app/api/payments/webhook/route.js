import { NextResponse } from 'next/server';
import { validateWebhookSignature } from '@/lib/paystack';
import dbConnect from '@/lib/db';
import Payment from '@/models/Payment';
import User from '@/models/User';
import Enrollment from '@/models/Enrollment';
import Program from '@/models/Program';
import { notifyPaymentReceived } from '@/lib/whatsapp';

export const runtime = 'nodejs';

// POST /api/payments/webhook — Paystack webhook
export async function POST(request) {
  // ══════════════════════════════════════════════════════════
  // PAYMENT WEBHOOK — Production Requirements:
  //
  // 1. SIGNATURE: Verify every request is from Paystack
  // 2. IDEMPOTENT: Handle duplicate webhooks safely
  // 3. ATOMIC: Each status transition happens once
  // 4. RESILIENT: WhatsApp failure doesn't break payment
  // 5. ALWAYS 200: Even on errors — Paystack retries on non-200
  // ══════════════════════════════════════════════════════════

  let rawBody;
  try {
    rawBody = await request.text();
  } catch {
    console.error('[Webhook] Failed to read body');
    return NextResponse.json({ received: true });
  }

  // 1. VERIFY SIGNATURE
  const signature = request.headers.get('x-paystack-signature') || '';
  if (process.env.PAYSTACK_SECRET_KEY && !validateWebhookSignature(rawBody, signature)) {
    console.error('[Webhook] Invalid signature');
    // Return 200 anyway — don't leak info about signature validation
    return NextResponse.json({ received: true });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    console.error('[Webhook] Invalid JSON');
    return NextResponse.json({ received: true });
  }

  if (event.event !== 'charge.success') {
    // We only handle successful charges
    return NextResponse.json({ received: true });
  }

  const data = event.data;
  if (!data?.reference) {
    console.error('[Webhook] No reference in payload');
    return NextResponse.json({ received: true });
  }

  try {
    await dbConnect();

    // 2. IDEMPOTENT — Check if already processed
    const existing = await Payment.findOne({
      reference: data.reference,
      status: 'success',
    }).lean();

    if (existing) {
      console.info(`[Webhook] Already processed: ${data.reference}`);
      return NextResponse.json({ received: true });
    }

    // 3. ATOMIC STATUS UPDATE — Only update if currently pending
    const payment = await Payment.findOneAndUpdate(
      { reference: data.reference, status: 'pending' },
      {
        status: 'success',
        paystackRef: String(data.id || ''),
        channel: data.channel,
        paidAt: data.paid_at ? new Date(data.paid_at) : new Date(),
        webhookData: data,
      },
      { new: true },
    );

    if (!payment) {
      console.warn(`[Webhook] Payment not found or not pending: ${data.reference}`);
      return NextResponse.json({ received: true });
    }

    console.info(`[Webhook] Payment confirmed: ${data.reference} — ₦${payment.totalAmount}`);

    // Handle membership payment
    if (payment.type === 'membership') {
      await User.findByIdAndUpdate(payment.userId, {
        membershipPaid: true,
        membershipDate: new Date(),
        membershipRef: data.reference,
      });
    }

    // Handle enrollment payment
    if (payment.type === 'enrollment' && payment.enrollmentId) {
      await Enrollment.findByIdAndUpdate(payment.enrollmentId, {
        status: 'active',
        paymentId: payment._id,
      });
    }

    // Handle unified checkout (enrollment + optional kit + optional membership)
    const checkout = payment.webhookData?.checkoutItems;
    if (Array.isArray(checkout) && checkout.length > 0) {
      const childName = payment.webhookData?.childName;
      const childAge = payment.webhookData?.childAge;
      const programId = payment.webhookData?.programId;

      for (const item of checkout) {
        if (item.type === 'membership') {
          await User.findByIdAndUpdate(payment.userId, {
            membershipPaid: true,
            membershipDate: new Date(),
            membershipRef: data.reference,
          });
        }

        if (item.type === 'enrollment' && programId) {
          // Atomic spot booking
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
          }
        }
      }
    }

    // 4. RESILIENT — WhatsApp failure doesn't affect payment
    try {
      const user = await User.findById(payment.userId).select('phone').lean();
      if (user?.phone) {
        await notifyPaymentReceived(user.phone, payment.totalAmount, payment.description);
      }
    } catch (e) {
      console.error('[Webhook] WhatsApp notify failed (non-blocking):', e.message);
    }
  } catch (err) {
    console.error('[Webhook] Processing error:', err.message);
    // Still return 200 — we don't want Paystack to retry and double-process
  }

  return NextResponse.json({ received: true });
}
