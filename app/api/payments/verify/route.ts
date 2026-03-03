// @ts-nocheck
import { handler, success, error } from '@/lib/api-utils';
import { authenticate, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Payment from '@/models/Payment';
import Program from '@/models/Program';
import Enrollment from '@/models/Enrollment';
import User from '@/models/User';
import { verifyPayment } from '@/lib/paystack';

export const GET = handler(async (request) => {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  const url = new URL(request.url);
  const reference = url.searchParams.get('reference');
  if (!reference) return error('Reference required', 400);

  await dbConnect();

  const ref = String(reference);
  const payment = await Payment.findOne({ reference: ref }).lean();
  if (!payment) return error('Payment not found', 404);
  if (payment.status === 'success') return success({ status: 'already_processed' });

  let verification;
  try {
    verification = await verifyPayment(ref);
  } catch (err) {
    return error('Could not verify payment', 502);
  }

  if (verification.status !== 'success') {
    return success({ status: verification.status });
  }

  // Update payment — MERGE, don't overwrite webhookData
  await Payment.updateOne({ _id: payment._id }, {
    status: 'success',
    paystackRef: String(verification.id || ''),
    channel: verification.channel,
    paidAt: verification.paid_at ? new Date(verification.paid_at) : new Date(),
  });

  // Use the ORIGINAL payment's webhookData (checkout items are here)
  const checkout = payment.webhookData?.checkoutItems;
  const childName = payment.webhookData?.childName;
  const childAge = payment.webhookData?.childAge;
  const programId = payment.webhookData?.programId;

  if (Array.isArray(checkout)) {
    for (const item of checkout) {
      if (item.type === 'membership') {
        await User.updateOne({ _id: payment.userId }, {
          membershipPaid: true,
          membershipDate: new Date(),
          membershipRef: ref,
        });
      }
      if (item.type === 'enrollment' && programId) {
        // Check duplicate — include childName so siblings in same program work
        const exists = await Enrollment.findOne({
          userId: payment.userId,
          programId: programId,
          childName: childName,
          status: { $in: ['pending', 'active'] },
        }).lean();

        if (!exists) {
          await Program.updateOne(
            { _id: programId, $expr: { $lt: ['$spotsTaken', '$spotsTotal'] } },
            { $inc: { spotsTaken: 1 } },
          );
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

  // Handle simple membership (non-checkout)
  if (payment.type === 'membership' && !checkout) {
    await User.updateOne({ _id: payment.userId }, {
      membershipPaid: true,
      membershipDate: new Date(),
      membershipRef: ref,
    });
  }

  return success({ status: 'success' });
});