import { handler, success, error, parseBody, validateBody } from '@/lib/api-utils';
import { authenticate, isAuthError } from '@/lib/auth';
import { applyRateLimit } from '@/lib/rate-limit';
import { PRICING, PAYMENT_TYPES, RATE_LIMITS } from '@/lib/constants';
import { hasPaystack } from '@/lib/env';
import dbConnect from '@/lib/db';
import Payment from '@/models/Payment';
import { initializePayment, generateReference } from '@/lib/paystack';

// POST /api/payments/initialize
export const POST = handler(async (request) => {
  // Rate limit — 5 payment inits per minute
  const rl = applyRateLimit(request, { ...RATE_LIMITS.authenticated, max: 5, prefix: 'payment' });
  if (rl.limited) return error('Too many payment attempts', 429);

  if (!hasPaystack()) {
    return error('Payment service is not configured. Contact support.', 503);
  }

  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  const body = await parseBody(request);
  if (!body) return error('Invalid request', 400);

  const errors = validateBody(body, {
    type: { required: true, type: 'string', enum: PAYMENT_TYPES },
    amount: { required: true, type: 'number', min: 100 },
    description: { type: 'string', maxLength: 200 },
  });
  if (errors.length) return error('Validation failed', 400, errors);

  if (!auth.dbUser.email) {
    return error('Email is required for payments. Update your profile first.', 400);
  }

  const amount = Math.round(Number(body.amount));
  const tax = Math.round(amount * PRICING.vatRate);
  const total = amount + tax;
  const prefix = body.type === 'membership' ? 'MEM' : body.type === 'enrollment' ? 'ENR' : 'SP';
  const reference = generateReference(prefix);

  await dbConnect();

  // Create payment record FIRST (before Paystack call)
  const payment = await Payment.create({
    userId: auth.dbUser._id,
    reference,
    amount,
    tax,
    totalAmount: total,
    type: body.type,
    description: body.description || body.type,
    enrollmentId: body.enrollmentId || undefined,
    orderId: body.orderId || undefined,
    status: 'pending',
  });

  // Initialize with Paystack
  let paystackData;
  try {
    paystackData = await initializePayment({
      email: auth.dbUser.email,
      amount: total * 100, // kobo
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/parent?payment=${reference}`,
      metadata: {
        userId: String(auth.dbUser._id),
        paymentType: body.type,
        paymentId: String(payment._id),
      },
    });
  } catch (err) {
    // Mark payment as failed if Paystack init fails
    await Payment.findByIdAndUpdate(payment._id, { status: 'failed' });
    return error(`Payment initialization failed: ${err.message}`, 502);
  }

  return success({
    authorization_url: paystackData.authorization_url,
    access_code: paystackData.access_code,
    reference,
    amount: total,
    tax,
  });
});
