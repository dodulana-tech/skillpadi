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
    enum: ['parent', 'coach', 'school', 'admin'],
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

  // Coach-specific
  coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach' },

  // Meta
  isActive: { type: Boolean, default: true },
  lastLoginAt: Date,
}, {
  timestamps: true,
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
