import mongoose from 'mongoose';

const VettingItemSchema = new mongoose.Schema({
  status: { type: String, enum: ['verified', 'pending', 'failed', 'na', 'expired'], default: 'pending' },
  date: Date,
  expires: Date,
  note: String,
  verifiedBy: String,
  documentUrl: String,
}, { _id: false });

const TestimonialSchema = new mongoose.Schema({
  parent: String,
  text: String,
  rating: { type: Number, min: 1, max: 5 },
  date: { type: Date, default: Date.now },
  approved: { type: Boolean, default: false },
});

const QASchema = new mongoose.Schema({
  question: String,
  answer: String,
}, { _id: false });

const CoachSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // linked user account
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  initials: { type: String, required: true },
  title: String,
  bio: String,
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  whatsapp: String,
  email: String,

  // Vetting — 4 tiers, 14 items
  vetting: {
    // Tier 1: Identity & Background
    nin: VettingItemSchema,
    police: VettingItemSchema,
    address: VettingItemSchema,
    photoMatch: VettingItemSchema,
    // Tier 2: Professional Credentials
    coachingCert: VettingItemSchema,
    experience: VettingItemSchema,
    references: VettingItemSchema,
    // Tier 3: Child Safety
    firstAid: VettingItemSchema,
    safeguarding: VettingItemSchema,
    sportSafety: VettingItemSchema,
    // Tier 4: Ongoing Trust
    reverification: VettingItemSchema,
    insurance: VettingItemSchema,
    rating: VettingItemSchema,
    incidents: VettingItemSchema,
  },

  shieldLevel: {
    type: String,
    enum: ['certified', 'verified', 'in-progress'],
    default: 'in-progress',
  },

  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  yearsExperience: Number,
  ageGroups: String, // "3-10"
  languages: [String],
  venues: [String],

  videoIntroUrl: String,
  trainingsCompleted: [String], // names of completed SkillPadi trainings

  testimonials: [TestimonialSchema],
  qa: [QASchema],

  isActive: { type: Boolean, default: true },
  featuredOrder: { type: Number, default: 0 }, // for homepage ordering
}, {
  timestamps: true,
});

// Auto-calculate shield level before save
CoachSchema.pre('save', function (next) {
  const v = this.vetting;
  if (!v) return next();

  const tier1 = ['nin', 'police', 'address', 'photoMatch'];
  const tier2 = ['coachingCert', 'experience', 'references'];
  const tier3 = ['firstAid', 'safeguarding'];
  const tier4 = ['reverification', 'insurance'];

  const isVerified = (items) => items.every(k => {
    const item = v[k];
    return item && (item.status === 'verified' || item.status === 'na');
  });

  if (isVerified([...tier1, ...tier2, ...tier3, ...tier4])) {
    this.shieldLevel = 'certified';
  } else if (isVerified([...tier1, ...tier2])) {
    this.shieldLevel = 'verified';
  } else {
    this.shieldLevel = 'in-progress';
  }

  next();
});

CoachSchema.index({ categoryId: 1, isActive: 1 });
CoachSchema.index({ slug: 1 });

export default mongoose.models.Coach || mongoose.model('Coach', CoachSchema);
