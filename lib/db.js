// ═══════════════════════════════════════════════════════
// MongoDB Connection (Singleton)
// ═══════════════════════════════════════════════════════

import mongoose from 'mongoose';
import { validateEnv } from './env';

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.__mongoose;
if (!cached) {
  cached = global.__mongoose = { conn: null, promise: null };
}

export default async function dbConnect() {
  // Validate env on first call
  validateEnv();

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 5000,  // Fail fast if DB unreachable
        socketTimeoutMS: 45000,          // Close sockets after 45s
        maxPoolSize: 10,                 // Connection pool
      })
      .then((m) => {
        console.log('[DB] Connected to MongoDB');
        return m;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    console.error('[DB] Connection failed:', err.message);
    throw new Error('Database connection failed');
  }

  return cached.conn;
}

/**
 * Check if DB is connected — for health checks
 */
export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}
