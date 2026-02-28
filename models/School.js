import mongoose from 'mongoose';

const SchoolSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  contactName: String,
  contactRole: String, // "P.E. Teacher", "Sports Director"
  email: String,
  phone: String,
  address: String,
  area: String,

  marginPercent: { type: Number, default: 15, min: 0, max: 50 },

  isActive: { type: Boolean, default: true },

  // Linked users (school staff accounts)
  userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, {
  timestamps: true,
});

export default mongoose.models.School || mongoose.model('School', SchoolSchema);
