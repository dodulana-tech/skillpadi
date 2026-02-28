// ═══════════════════════════════════════════════════════
// Auth Middleware
// Verifies Firebase tokens, resolves DB user with role.
// ═══════════════════════════════════════════════════════

import { verifyToken } from './firebase-admin';
import dbConnect from './db';
import User from '@/models/User';
import { error } from './api-utils';
import { ROLES } from './constants';

/**
 * Authenticate request — returns { user, dbUser } or error Response
 */
export async function authenticate(request) {
  const firebaseUser = await verifyToken(request);
  if (!firebaseUser) {
    return error('Authentication required', 401);
  }

  await dbConnect();
  let dbUser = await User.findOne({ firebaseUid: firebaseUser.uid }).lean();

  // Auto-create user on first API call
  if (!dbUser) {
    const isAdmin = process.env.ADMIN_EMAIL && firebaseUser.email === process.env.ADMIN_EMAIL;
    dbUser = await User.create({
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.name || firebaseUser.email?.split('@')[0] || 'User',
      avatar: firebaseUser.picture,
      role: isAdmin ? 'admin' : 'parent',
    });
    dbUser = dbUser.toObject();
  }

  if (!dbUser.isActive) {
    return error('Account is deactivated', 403);
  }

  // Update last login (fire-and-forget)
  User.updateOne({ _id: dbUser._id }, { lastLoginAt: new Date() }).catch(() => {});

  return { user: firebaseUser, dbUser };
}

/**
 * Require specific role(s) — returns auth result or error Response
 */
export async function requireRole(request, roles) {
  const result = await authenticate(request);

  // If authenticate returned an error Response, pass it through
  if (result instanceof Response) return result;

  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  if (!allowedRoles.includes(result.dbUser.role)) {
    return error('Insufficient permissions', 403);
  }

  return result;
}

/**
 * Optional auth — returns user or null, never errors
 */
export async function optionalAuth(request) {
  try {
    const firebaseUser = await verifyToken(request);
    if (!firebaseUser) return { user: null, dbUser: null };

    await dbConnect();
    const dbUser = await User.findOne({ firebaseUid: firebaseUser.uid }).lean();
    return { user: firebaseUser, dbUser };
  } catch {
    return { user: null, dbUser: null };
  }
}

/**
 * Check if auth result is an error (Response object)
 */
export function isAuthError(result) {
  return result instanceof Response;
}
