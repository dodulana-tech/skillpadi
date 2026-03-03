import { handler, success, error, parseBody } from '@/lib/api-utils';
import { requireRole, isAuthError } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Product } from '@/models/Shop';
import '@/models/Category';

export const GET = handler(async (request, { params }) => {
  await dbConnect();
  const product = await Product.findById(params.id)
    .populate('categoryId', 'name slug icon color')
    .lean();
  if (!product) return error('Product not found', 404);
  return success({ product });
});

export const PUT = handler(async (request, { params }) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;
  const body = await parseBody(request);
  if (!body) return error('Invalid JSON body', 400);
  await dbConnect();
  if (body.price != null) body.price = Number(body.price);
  if (body.order != null) body.order = Number(body.order);
  const product = await Product.findByIdAndUpdate(
    params.id, body, { new: true, runValidators: true }
  ).lean();
  if (!product) return error('Product not found', 404);
  return success({ product });
});

export const DELETE = handler(async (request, { params }) => {
  const auth = await requireRole(request, 'admin');
  if (isAuthError(auth)) return auth;
  await dbConnect();
  const product = await Product.findByIdAndDelete(params.id).lean();
  if (!product) return error('Product not found', 404);
  return success({ deleted: true });
});
