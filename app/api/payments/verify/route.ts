// @ts-nocheck
import { handler, success, error } from '@/lib/api-utils';
import { authenticate, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Payment from '@/models/Payment';
import Program from '@/models/Program';
import Enrollment from '@/models/Enrollment';
import User from '@/models/User';
import School from '@/models/School';
import Community from '@/models/Community';
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

  await Payment.updateOne({ _id: payment._id }, {
    status: 'success',
    paystackRef: String(verification.id || ''),
    channel: verification.channel,
    paidAt: verification.paid_at ? new Date(verification.paid_at) : new Date(),
  });

  const checkout = payment.webhookData?.checkoutItems;
  if (Array.isArray(checkout)) {
    for (const item of checkout) {
      if (item.type === 'membership') {
        await User.updateOne({ _id: payment.userId }, {
          membershipPaid: true,
          membershipDate: new Date(),
          membershipRef: ref,
        });
      }
      if (item.type === 'enrollment' && payment.webhookData?.programId) {
        const existingEnr = await Enrollment.find({ userId: payment.userId, programId: payment.webhookData.programId, status: 'active' }).lean();
        if (existingEnr.length === 0) {
          await Program.updateOne(
            { _id: payment.webhookData.programId, spotsTaken: { $lt: 100 } },
            { $inc: { spotsTaken: 1 } },
          );
          await Enrollment.create({
            userId: payment.userId,
            childName: payment.webhookData.childName || 'Child',
            childAge: payment.webhookData.childAge,
            programId: payment.webhookData.programId,
            status: 'active',
            paymentId: payment._id,
            startDate: new Date(),
          });
        }
      }
    }
  }

  if (payment.type === 'membership' && !checkout) {
    await User.updateOne({ _id: payment.userId }, {
      membershipPaid: true,
      membershipDate: new Date(),
      membershipRef: ref,
    });
  }

  // ── Credit partner markup earnings ──────────────────────────────
  if (payment.schoolId && typeof payment.schoolMarkup === 'number' && payment.schoolMarkup > 0) {
    await School.updateOne(
      { _id: payment.schoolId },
      { $inc: { pendingPayout: payment.schoolMarkup, totalEarnings: payment.schoolMarkup } },
    );
  }
  if (payment.communityId && typeof payment.communityMarkup === 'number' && payment.communityMarkup > 0) {
    await Community.updateOne(
      { _id: payment.communityId },
      { $inc: { pendingPayout: payment.communityMarkup, totalEarnings: payment.communityMarkup } },
    );
  }

  return success({ status: 'success' });
});