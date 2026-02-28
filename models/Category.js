import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true }, // "Swimming"
  slug: { type: String, required: true, unique: true }, // "swimming"
  icon: { type: String, required: true }, // "🏊"
  color: { type: String, required: true }, // "#0891B2"
  description: String,
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  sponsor: {
    name: String,     // "Speedo"
    tagline: String,  // "Presented by Speedo"
    logo: String,     // URL
  },
}, { timestamps: true });

export default mongoose.models.Category || mongoose.model('Category', CategorySchema);
