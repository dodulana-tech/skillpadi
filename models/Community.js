import mongoose from 'mongoose';

// Force re-registration if schema changed
if (mongoose.models.Community) {
  delete mongoose.models.Community;
}

const CommunitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ['estate', 'residential', 'compound', 'community'],
    default: 'estate',
  },

  contactName: String,
  contactRole: String,
  email: String,
  phone: String,

  area: String,
  address: String,
  city: { type: String, enum: ['abuja', 'lagos'], default: 'abuja' },

  facilities: [String],
  interestedCategories: [String],

  defaultMarkupPercent: { type: Number, default: 10, min: 0, max: 30 },
  programMarkups: [{
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
    markupPercent: Number,
    customPrice: Number,
    isActive: { type: Boolean, default: true },
  }],
  residentDiscount: { type: Number, default: 5 },
  venueProvided: { type: Boolean, default: true },
  venueFee: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  pendingPayout: { type: Number, default: 0 },
  estimatedHouseholds: Number,
  estimatedKids: Number,

  status: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending' },
  isActive: { type: Boolean, default: true },
  notes: String,

  programIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Program' }],
}, {
  timestamps: true,
});

CommunitySchema.index({ area: 1, isActive: 1 });

export default mongoose.model('Community', CommunitySchema);