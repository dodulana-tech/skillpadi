import mongoose from 'mongoose';

const InviteSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  },

  type: {
    type: String,
    enum: ['school', 'community'],
    required: true,
  },

  // The school or community this invite belongs to
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },

  // Stored so we can display without a second lookup
  entityName: {
    type: String,
    required: true,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // 0 = unlimited
  maxUses: { type: Number, default: 0, min: 0 },
  usedCount: { type: Number, default: 0, min: 0 },

  usedBy: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    usedAt: { type: Date, default: Date.now },
    _id: false,
  }],

  // Percentage discount unlocked for users who redeem this code (0-100)
  discount: { type: Number, default: 0, min: 0, max: 100 },

  expiresAt: Date,
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

InviteSchema.index({ entityId: 1, type: 1 });

// Virtual: whether the invite is currently valid (active + not expired + not full)
InviteSchema.virtual('isValid').get(function () {
  if (!this.isActive) return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  if (this.maxUses > 0 && this.usedCount >= this.maxUses) return false;
  return true;
});

export default mongoose.models.Invite || mongoose.model('Invite', InviteSchema);
