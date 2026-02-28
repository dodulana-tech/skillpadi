import mongoose from 'mongoose';

const EnquirySchema = new mongoose.Schema({
  parentName: { type: String, required: true },
  phone: { type: String, required: true },
  email: String,
  childName: String,
  childAge: Number,
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
  message: String,

  status: {
    type: String,
    enum: ['new', 'contacted', 'enrolled', 'declined'],
    default: 'new',
  },

  source: {
    type: String,
    enum: ['website', 'whatsapp', 'referral', 'social', 'school', 'other'],
    default: 'website',
  },

  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // admin user
  notes: String,
  followUpDate: Date,

  convertedToUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  convertedAt: Date,
}, {
  timestamps: true,
});

EnquirySchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.Enquiry || mongoose.model('Enquiry', EnquirySchema);
