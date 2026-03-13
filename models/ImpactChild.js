import mongoose from 'mongoose';

const ImpactChildSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: Number,
  gender: String,
  community: String,
  guardianName: String,
  guardianPhone: String,
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'ImpactProgram' },
  sponsorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sponsor' },
  sessionsAttended: { type: Number, default: 0 },
  totalSessions: Number,
  milestonesCompleted: [String],
  passportId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChildPassport' },
  status: { type: String, enum: ['active', 'completed', 'dropped'], default: 'active' },
  notes: String,
  photo: String,
}, { timestamps: true });

ImpactChildSchema.index({ programId: 1 });

export default mongoose.models.ImpactChild || mongoose.model('ImpactChild', ImpactChildSchema);
