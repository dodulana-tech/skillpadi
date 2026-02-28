import { handler, success, error, parseBody } from '@/lib/api-utils';
import { authenticate, isAuthError } from '@/lib/auth';
import { PRICING } from '@/lib/constants';
import dbConnect from '@/lib/db';
import { Order } from '@/models/Shop';

export const GET = handler(async (request) => {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;
  await dbConnect();

  const filter = {};
  if (auth.dbUser.role === 'parent') filter.userId = auth.dbUser._id;

  const orders = await Order.find(filter)
    .populate('paymentId', 'reference status paidAt')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return success({ orders });
});

export const POST = handler(async (request) => {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;
  const body = await parseBody(request);
  if (!body) return error('Invalid request', 400);

  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return error('At least one item is required', 400);
  }

  for (const item of body.items) {
    if (!item.name || !item.price || item.price <= 0) {
      return error('Each item must have a name and positive price', 400);
    }
  }

  const subtotal = body.items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
  const tax = Math.round(subtotal * PRICING.vatRate);

  await dbConnect();
  const order = await Order.create({
    userId: auth.dbUser._id,
    items: body.items,
    subtotal,
    tax,
    total: subtotal + tax,
    deliveryNote: body.deliveryNote,
  });
  return success({ order }, 201);
});
