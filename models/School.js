import mongoose from 'mongoose';

if (mongoose.models.School) {
  delete mongoose.models.School;
}

const SchoolSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  schoolType: {
    type: String,
    enum: ['nursery', 'primary', 'secondary', 'nursery-primary', 'primary-secondary', 'all-through'],
  },
  contactName: String,
  contactRole: String,
  email: String,
  phone: String,
  address: String,
  area: String,
  city: { type: String, enum: ['abuja', 'lagos'], default: 'abuja' },
  website: String,

  // Partnership lifecycle
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending',
  },
  applicationDate: Date,
  approvedDate: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectedDate: Date,
  rejectionReason: String,
  estimatedStudents: Number,
  facilities: [String],
  interestedCategories: [String],
  notes: String,

  // Commercial
  defaultMarkupPercent: { type: Number, default: 15, min: 0, max: 50 },
  programMarkups: [{
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
    markupPercent: Number,
    customPrice: Number,
    isActive: { type: Boolean, default: true },
  }],
  billingCycle: { type: String, enum: ['per-enrollment', 'monthly', 'termly'], default: 'per-enrollment' },
  totalEarnings: { type: Number, default: 0 },
  pendingPayout: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },

  // Linked staff accounts
  userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, {
  timestamps: true,
});

SchoolSchema.index({ status: 1 });
SchoolSchema.index({ area: 1 });

export default mongoose.model('School', SchoolSchema);