// ═══════════════════════════════════════════════════════
// API Route Utilities
// Every route handler wraps through these for safety.
// ═══════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

// ── Consistent response helpers ──

export function success(data, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message, status = 400, details = null) {
  const body = { error: message };
  if (details && process.env.NODE_ENV === 'development') {
    body.details = details;
  }
  return NextResponse.json(body, { status });
}

// ── Route handler wrapper — catches all errors ──

export function handler(fn) {
  return async (request, context) => {
    try {
      return await fn(request, context);
    } catch (err) {
      // Mongoose validation error
      if (err instanceof mongoose.Error.ValidationError) {
        const messages = Object.values(err.errors).map((e) => e.message);
        console.error(`[Validation] ${request.url}: ${messages.join(', ')}`);
        return error('Validation failed', 400, messages);
      }

      // Mongoose cast error (bad ObjectId)
      if (err instanceof mongoose.Error.CastError) {
        console.error(`[CastError] ${request.url}: ${err.message}`);
        return error('Invalid ID format', 400);
      }

      // Duplicate key
      if (err.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0] || 'field';
        console.error(`[Duplicate] ${request.url}: ${field}`);
        return error(`Duplicate ${field}`, 409);
      }

      // Everything else
      console.error(`[API Error] ${request.method} ${request.url}:`, err.message);
      if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
      }
      return error('Internal server error', 500);
    }
  };
}

// ── Input validation ──

export function validateBody(body, schema) {
  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = body[field];

    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }

    if (value === undefined || value === null) continue;

    if (rules.type === 'string' && typeof value !== 'string') {
      errors.push(`${field} must be a string`);
    } else if (rules.type === 'number' && (typeof value !== 'number' || isNaN(value))) {
      errors.push(`${field} must be a number`);
    } else if (rules.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`${field} must be a boolean`);
    }

    if (rules.type === 'string' && typeof value === 'string') {
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} must be ${rules.maxLength} characters or less`);
      }
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
      }
    }

    if (rules.type === 'number' && typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${field} must be at least ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${field} must be at most ${rules.max}`);
      }
    }
  }

  return errors;
}

// ── ObjectId validation ──

export function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

export function isObjectIdOrSlug(id) {
  return isValidObjectId(id) ? { _id: id } : { slug: String(id).toLowerCase().trim() };
}

// ── Sanitize string input ──

export function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.trim().slice(0, 1000); // trim + cap length
}

export function sanitizeBody(body, fields) {
  const clean = {};
  for (const field of fields) {
    if (body[field] !== undefined) {
      clean[field] = typeof body[field] === 'string' ? sanitize(body[field]) : body[field];
    }
  }
  return clean;
}

// ── Parse JSON body safely ──

export async function parseBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
