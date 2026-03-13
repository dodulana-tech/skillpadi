import mongoose from 'mongoose';

const EnrollmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  childName: { type: String, required: true },
  childAge: Number,
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' }, // if via school
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' },

  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled', 'paused'],
    default: 'pending',
  },

  sessionsCompleted: { type: Number, default: 0 },
  milestonesCompleted: [String],
  insured: { type: Boolean, default: false },

  startDate: Date,
  endDate: Date,
  nextSession: String, // "Mon 24 Feb, 9:00 AM"

  notes: String, // coach notes on child
  parentNotes: String,

  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },

  // Term report (Section D)
  termReport: {
    published: { type: Boolean, default: false },
    publishedAt: Date,
    overallRating: { type: Number, min: 1, max: 5 },
    attendance: { present: Number, total: Number },
    skillMarkers: [{
      skill: String,
      beforeLevel: String,
      afterLevel: String,
      rating: { type: Number, min: 1, max: 5 },
    }],
    strengths: [String],
    improvements: [String],
    coachNotes: String,
    recommendation: { type: String, enum: ['repeat', 'advance', 'new-sport', 'private'] },
    recommendedProgramId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
    certificateEarned: { type: Boolean, default: false },
  },
}, {
  timestamps: true,
});

EnrollmentSchema.index({ userId: 1, status: 1 });
EnrollmentSchema.index({ programId: 1, status: 1 });
EnrollmentSchema.index({ schoolId: 1 });

export default mongoose.models.Enrollment || mongoose.model('Enrollment', EnrollmentSchema);
