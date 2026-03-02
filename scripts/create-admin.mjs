#!/usr/bin/env node
/**
 * Create an admin user in the SkillPadi MongoDB.
 * Usage:
 *   node --env-file=.env.local scripts/create-admin.mjs --email=admin@example.com --uid=FIREBASE_UID --name="Admin Name"
 *
 * NOTE: `firebaseUid` must match the UID returned by Firebase Auth for the admin user.
 */

import mongoose from 'mongoose';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (const a of args) {
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      out[k] = v || true;
    }
  }
  return out;
}

const { email, uid, name } = parseArgs();
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not set. Make sure .env.local exists with MONGODB_URI.');
  process.exit(1);
}

if (!email || !uid) {
  console.error('❌ Missing required args. Usage: --email=EMAIL --uid=FIREBASE_UID [--name="Admin Name"]');
  process.exit(1);
}

const UserSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true, index: true },
  email: { type: String, sparse: true, index: true },
  phone: String,
  name: { type: String, required: true },
  avatar: String,
  role: { type: String, enum: ['parent', 'coach', 'school', 'admin'], default: 'parent' },
  area: String,
  children: Array,
  membershipPaid: { type: Boolean, default: false },
  membershipDate: Date,
  membershipRef: String,
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
  coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach' },
  isActive: { type: Boolean, default: true },
  lastLoginAt: Date,
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

async function createAdmin() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('✅ Connected to MongoDB');

  // Check existing
  const existing = await User.findOne({ firebaseUid: uid });
  if (existing) {
    console.log('ℹ️  A user with that firebaseUid already exists:');
    console.log({ email: existing.email, role: existing.role, _id: existing._id.toString() });
    if (existing.role === 'admin') {
      console.log('✅ This user is already an admin. No changes made.');
      await mongoose.disconnect();
      process.exit(0);
    }
    // Update role to admin
    existing.role = 'admin';
    existing.email = existing.email || email;
    existing.name = existing.name || (name || email.split('@')[0]);
    await existing.save();
    console.log('✅ Updated existing user to role=admin');
    await mongoose.disconnect();
    process.exit(0);
  }

  const user = new User({
    firebaseUid: uid,
    email,
    name: name || email.split('@')[0],
    role: 'admin',
    isActive: true,
  });

  await user.save();
  console.log('🎉 Admin user created:');
  console.log({ email: user.email, firebaseUid: user.firebaseUid, role: user.role, id: user._id.toString() });

  await mongoose.disconnect();
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error('❌ Failed to create admin:', err && err.message ? err.message : err);
  process.exit(1);
});
