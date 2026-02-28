import mongoose from 'mongoose';

const EnrollmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  childName: { type: String, required: true },
  childAge: Number,
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' }, // if via school

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
}, {
  timestamps: true,
});

EnrollmentSchema.index({ userId: 1, status: 1 });
EnrollmentSchema.index({ programId: 1, status: 1 });
EnrollmentSchema.index({ schoolId: 1 });

export default mongoose.models.Enrollment || mongoose.model('Enrollment', EnrollmentSchema);
