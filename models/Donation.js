import mongoose from 'mongoose';

const DonationSchema = new mongoose.Schema({
  donorName: String,
  donorEmail: String,
  donorPhone: String,
  amount: { type: Number, required: true, min: 1000 },
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'ImpactProgram', required: true },
  paymentReference: String,
  paymentStatus: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  isAnonymous: { type: Boolean, default: false },
  isRecurring: { type: Boolean, default: false },
  recurringPlanCode: String,
  message: String,
  type: { type: String, enum: ['individual', 'corporate', 'parent-crosssubsidy', 'coach-contribution'], default: 'individual' },
}, { timestamps: true });

DonationSchema.index({ programId: 1, paymentStatus: 1 });

export default mongoose.models.Donation || mongoose.model('Donation', DonationSchema);
