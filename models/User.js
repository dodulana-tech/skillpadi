import mongoose from 'mongoose';

const ChildSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['male', 'female'] },
  notes: String,
});

const UserSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true, index: true },
  email: { type: String, sparse: true, index: true },
  phone: String,
  name: { type: String, required: true },
  avatar: String,
  role: {
    type: String,
    enum: ['parent', 'coach', 'school', 'community', 'admin'],
    default: 'parent',
  },
  area: String, // e.g., "Maitama", "Wuse", "Garki"

  // Parent-specific
  children: [ChildSchema],
  membershipPaid: { type: Boolean, default: false },
  membershipDate: Date,
  membershipRef: String, // Paystack reference

  // School-specific
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },

  // Community/Estate-specific
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' },

  // Coach-specific
  coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach' },

  // Referral system
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // who referred this user
  referralCode: { type: String, unique: true, sparse: true },          // unique invite code
  referralCount: { type: Number, default: 0 },                         // how many people they referred
  referralEarnings: { type: Number, default: 0 },                      // total earned from referrals (kobo)

  // Meta
  isActive: { type: Boolean, default: true },
  lastLoginAt: Date,
}, {
  timestamps: true,
});

export default mongoose.models.User || mongoose.model('User', UserSchema);