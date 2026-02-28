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

  const { searchParams } = new URL(request.url);
  const reference = searchParams.get('reference');
  if (!reference) return error('Reference required', 400);

  await dbConnect();

  const payment = await Payment.findOne({ reference }).lean();
  if (!payment) return error('Payment not found', 404);
  if (payment.status === 'success') return success({ status: 'already_processed', payment });

  // Verify with Paystack
  let verification;
  try {
    verification = await verifyPayment(reference);
  } catch (err) {
    return error('Could not verify payment', 502);
  }

  if (verification.status !== 'success') {
    return success({ status: verification.status });
  }

  // Update payment
  await Payment.findByIdAndUpdate(payment._id, {
    status: 'success',
    paystackRef: String(verification.id || ''),
    channel: verification.channel,
    paidAt: verification.paid_at ? new Date(verification.paid_at) : new Date(),
  });

  // Process checkout items
  const checkout = payment.webhookData?.checkoutItems;
  if (Array.isArray(checkout)) {
    for (const item of checkout) {
      if (item.type === 'membership') {
        await User.findByIdAndUpdate(payment.userId, {
          membershipPaid: true,
          membershipDate: new Date(),
          membershipRef: reference,
        });
      }
      if (item.type === 'enrollment' && payment.webhookData?.programId) {
        const existing = await Enrollment.findOne({
          userId: payment.userId,
          programId: payment.webhookData.programId,
          childName: payment.webhookData.childName,
          status: { $in: ['pending', 'active'] },
        });
        if (!existing) {
          const program = await Program.findOneAndUpdate(
            { _id: payment.webhookData.programId, $expr: { $lt: ['$spotsTaken', '$spotsTotal'] } },
            { $inc: { spotsTaken: 1 } },
            { new: true },
          );
          if (program) {
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
  }

  // Also handle simple membership/enrollment payments
  if (payment.type === 'membership' && !checkout) {
    await User.findByIdAndUpdate(payment.userId, {
      membershipPaid: true,
      membershipDate: new Date(),
      membershipRef: reference,
    });
  }

  return success({ status: 'success' });
});