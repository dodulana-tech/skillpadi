import mongoose from 'mongoose';

const ProgramSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach', required: true },

  ageRange: String, // "3-5"
  ageMin: Number,
  ageMax: Number,

  location: String,
  locationNote: String, // "Leisure centre entrance, left side"
  locationCoords: {
    lat: Number,
    lng: Number,
  },

  schedule: String, // "Mon & Wed, 9:00 AM"
  duration: Number, // minutes
  sessions: Number, // total in term
  groupSize: String, // "1-on-1" or "4-6 kids"

  pricePerSession: { type: Number, required: true },
  currency: { type: String, default: 'NGN' },

  supervision: {
    type: String,
    enum: ['parent-present', 'drop-off', 'school-chaperone', 'nanny-driver'],
    required: true,
  },

  spotsTotal: { type: Number, required: true },
  spotsTaken: { type: Number, default: 0 },

  milestones: [String], // ["Water Comfort", "Floating Basics", ...]
  highlights: [String],
  whatToBring: [String],
  safetyNote: String,

  starterKitId: { type: mongoose.Schema.Types.ObjectId, ref: 'StarterKit' },

  isActive: { type: Boolean, default: true },
  termStart: Date,
  termEnd: Date,

  // SEO
  metaTitle: String,
  metaDescription: String,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

ProgramSchema.virtual('spotsRemaining').get(function () {
  return this.spotsTotal - this.spotsTaken;
});

ProgramSchema.virtual('totalPrice').get(function () {
  return this.pricePerSession * this.sessions;
});

ProgramSchema.virtual('isFull').get(function () {
  return this.spotsTaken >= this.spotsTotal;
});

ProgramSchema.index({ categoryId: 1, isActive: 1 });
ProgramSchema.index({ coachId: 1 });
ProgramSchema.index({ slug: 1 });

export default mongoose.models.Program || mongoose.model('Program', ProgramSchema);
