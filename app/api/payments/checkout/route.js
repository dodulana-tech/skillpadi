import { handler, success, error, parseBody } from '@/lib/api-utils';
import { authenticate, isAuthError } from '@/lib/auth';
import { applyRateLimit } from '@/lib/rate-limit';
import { PRICING, RATE_LIMITS } from '@/lib/constants';
import { hasPaystack } from '@/lib/env';
import dbConnect from '@/lib/db';
import Payment from '@/models/Payment';
import Program from '@/models/Program';
import Enrollment from '@/models/Enrollment';
import { initializePayment, generateReference } from '@/lib/paystack';

// POST /api/payments/checkout — Unified checkout
export const POST = handler(async (request) => {
  const rl = applyRateLimit(request, { ...RATE_LIMITS.authenticated, max: 5, prefix: 'checkout' });
  if (rl.limited) return error('Too many attempts', 429);

  if (!hasPaystack()) return error('Payment service not configured', 503);

  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  const body = await parseBody(request);
  if (!body) return error('Invalid request', 400);

  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return error('No items in checkout', 400);
  }
  if (!body.childName || !body.programId) {
    return error('Child name and program are required', 400);
  }

  if (!auth.dbUser.email) {
    return error('Email required for payments. Update your profile.', 400);
  }

  await dbConnect();

  // Calculate totals from items
  let subtotal = 0;
  const description = [];

  for (const item of body.items) {
    if (!item.type || !item.amount || item.amount <= 0) {
      return error('Invalid item in checkout', 400);
    }
    subtotal += Math.round(item.amount);
    description.push(item.label || item.type);
  }

  const tax = Math.round(subtotal * PRICING.vatRate);
  const total = subtotal + tax;
  const reference = generateReference('CHK');

  // Verify program exists and has spots (atomic check)
  const enrollmentItem = body.items.find((i) => i.type === 'enrollment');
  if (enrollmentItem) {
    const program = await Program.findOne({
      _id: body.programId,
      isActive: true,
    }).lean();
    if (!program) return error('Program not found', 404);
    if (program.spotsTaken >= program.spotsTotal) {
      return error('Program is full — join the waitlist via WhatsApp', 400);
    }
  }

  // Create payment record
  const payment = await Payment.create({
    userId: auth.dbUser._id,
    reference,
    amount: subtotal,
    tax,
    totalAmount: total,
    type: 'enrollment', // Primary type
    description: description.join(' + '),
    status: 'pending',
    // Store checkout details for webhook processing
    webhookData: {
      checkoutItems: body.items,
      childName: body.childName,
      childAge: body.childAge,
      programId: body.programId,
    },
  });

  // Initialize Paystack
  let paystackData;
  try {
    paystackData = await initializePayment({
      email: auth.dbUser.email,
      amount: total * 100, // kobo
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://skillpadi-b3nv.vercel.app'}/dashboard/parent?payment=${reference}`,
      metadata: {
        userId: String(auth.dbUser._id),
        paymentId: String(payment._id),
        checkoutType: 'unified',
        childName: body.childName,
        programId: body.programId,
      },
    });
  } catch (err) {
    await Payment.findByIdAndUpdate(payment._id, { status: 'failed' });
    return error(`Payment initialization failed: ${err.message}`, 502);
  }

  return success({
    authorization_url: paystackData.authorization_url,
    access_code: paystackData.access_code,
    reference,
    total,
    tax,
  });
});
