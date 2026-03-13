import mongoose from 'mongoose';

const ImpactProgramSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach' },
  proposedByCoachId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach' },
  community: String,
  city: { type: String, enum: ['abuja', 'lagos'] },
  venue: String,
  venueType: String,
  venueNotes: String,
  schedule: String,
  ageRange: String,
  capacity: Number,
  enrolled: { type: Number, default: 0 },
  costPerChild: Number,
  totalBudget: Number,
  fundedAmount: { type: Number, default: 0 },
  budget: {
    equipment: { type: Number, default: 0 },
    venue: { type: Number, default: 0 },
    transport: { type: Number, default: 0 },
    food: { type: Number, default: 0 },
    stipend: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  coachDonatesTime: { type: Boolean, default: true },
  coachStory: String,
  status: { type: String, enum: ['proposed', 'funding', 'active', 'completed', 'paused'], default: 'proposed' },
  termWeeks: { type: Number, default: 12 },
  startDate: Date,
  endDate: Date,
  sponsorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sponsor' },
  photos: [String],
  impactStats: {
    attendance: { type: Number, default: 0 },
    sessionsDelivered: { type: Number, default: 0 },
    milestonesEarned: { type: Number, default: 0 },
    coachesTrainedFromProgram: { type: Number, default: 0 },
  },
}, { timestamps: true });

ImpactProgramSchema.index({ status: 1 });
ImpactProgramSchema.index({ slug: 1 });

export default mongoose.models.ImpactProgram || mongoose.model('ImpactProgram', ImpactProgramSchema);
