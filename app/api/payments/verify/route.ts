import { handler, success, error } from '@/lib/api-utils';
import { authenticate, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Payment from '@/models/Payment';
import Program from '@/models/Program';
import Enrollment from '@/models/Enrollment';
import User from '@/models/User';
import { verifyPayment } from '@/lib/paystack';

const PaymentModel = Payment as any;
const UserModel = User as any;
const ProgramModel = Program as any;
const EnrollmentModel = Enrollment as any;

export const GET = handler(async (request) => {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const reference = searchParams.get('reference');
  if (!reference) return error('Reference required', 400);

  await dbConnect();

  const payment = await PaymentModel.findOne({ reference });
  if (!payment) return error('Payment not found', 404);

  // Prevent double processing
  if (payment.status === 'success') {
    return success({ status: 'already_processed' });
  }

  // Verify with Paystack
  let verification;
  try {
    verification = await verifyPayment(reference);
  } catch (err) {
    console.error('Paystack verify error:', err);
    return error('Could not verify payment', 502);
  }

  if (verification.status !== 'success') {
    return success({ status: verification.status });
  }

  // Atomic update guard
  const updatedPayment = await PaymentModel.findOneAndUpdate(
    { _id: payment._id, status: { $ne: 'success' } },
    {
      $set: {
        status: 'success',
        paystackRef: String(verification.id || ''),
        channel: verification.channel,
        paidAt: verification.paid_at
          ? new Date(verification.paid_at)
          : new Date(),
      },
    },
    { new: true }
  );

  if (!updatedPayment) {
    return success({ status: 'already_processed' });
  }

  const webhookData = payment.webhookData || {};
  const checkoutItems = webhookData.checkoutItems;

  // ─────────────────────────────────────
  // MEMBERSHIP PROCESSING
  // ─────────────────────────────────────
  const processMembership = async () => {
    await UserModel.findByIdAndUpdate(payment.userId, {
      membershipPaid: true,
      membershipDate: new Date(),
      membershipRef: reference,
    });
  };

  // ─────────────────────────────────────
  // ENROLLMENT PROCESSING
  // ─────────────────────────────────────
  const processEnrollment = async () => {
    if (!webhookData.programId) return;

    const existing = await EnrollmentModel.findOne({
      userId: payment.userId,
      programId: webhookData.programId,
      childName: webhookData.childName,
      status: { $in: ['pending', 'active'] },
    });

    if (existing) return;

    // Capacity-safe increment
    const program = await ProgramModel.findOneAndUpdate(
      {
        _id: webhookData.programId,
        $expr: { $lt: ['$spotsTaken', '$spotsTotal'] },
      },
      { $inc: { spotsTaken: 1 } },
      { new: true }
    );

    if (!program) {
      console.warn('Program full or not found');
      return;
    }

    await EnrollmentModel.create({
      userId: payment.userId,
      childName: webhookData.childName || 'Child',
      childAge: webhookData.childAge,
      programId: webhookData.programId,
      status: 'active',
      paymentId: payment._id,
      startDate: new Date(),
    });
  };

  // ─────────────────────────────────────
  // PROCESS CHECKOUT ITEMS
  // ─────────────────────────────────────
  if (Array.isArray(checkoutItems)) {
    for (const item of checkoutItems) {
      if (item.type === 'membership') {
        await processMembership();
      }

      if (item.type === 'enrollment') {
        await processEnrollment();
      }
    }
  } else {
    // Fallback legacy logic
    if (payment.type === 'membership') {
      await processMembership();
    }

    if (payment.type === 'enrollment') {
      await processEnrollment();
    }
  }

  return success({ status: 'success' });
});