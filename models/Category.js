import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true }, // "Swimming"
  slug: { type: String, required: true, unique: true }, // "swimming"
  icon: { type: String, required: true }, // "🏊"
  color: { type: String, required: true }, // "#0891B2"
  description: String,
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  sponsorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sponsor', default: null },
}, { timestamps: true });

export default mongoose.models.Category || mongoose.model('Category', CategorySchema);
