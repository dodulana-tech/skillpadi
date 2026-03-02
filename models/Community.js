import mongoose from 'mongoose';

const CommunitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ['estate', 'residential', 'compound', 'community'],
    default: 'estate',
  },

  // Contact
  contactName: String,
  contactRole: String,  // e.g., "Estate Manager", "Residents' Association Chair"
  email: String,
  phone: String,

  // Location
  area: String,         // e.g., "Maitama", "Gwarinpa"
  address: String,

  // Facilities available
  facilities: [{
    type: { type: String },  // 'pool', 'court', 'field', 'hall', 'garden'
    name: String,
    notes: String,
  }],

  // Commercial
  marginPercent: { type: Number, default: 10 },  // SkillPadi margin on programs run here
  residentDiscount: { type: Number, default: 0 }, // % discount for residents
  estimatedHouseholds: Number,
  estimatedKids: Number,

  // Status
  isActive: { type: Boolean, default: true },
  partnerSince: Date,
  notes: String,

  // Programs running at this community
  programIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Program' }],
}, {
  timestamps: true,
});

CommunitySchema.index({ area: 1, isActive: 1 });

export default mongoose.models.Community || mongoose.model('Community', CommunitySchema);