import mongoose from 'mongoose';

const SponsorSchema = new mongoose.Schema({
  name:         { type: String, required: true },       // "Speedo Nigeria"
  slug:         { type: String, required: true, unique: true }, // "speedo-nigeria"
  tagline:      String,                                  // "Presented by Speedo"
  logo:         String,                                  // URL
  website:      String,
  contactName:  String,
  contactEmail: String,
  contactPhone: String,
  // What surface(s) this sponsor is linked to
  type: {
    type: String,
    enum: ['category', 'tournament', 'product', 'platform', 'general'],
    default: 'general',
  },
  active: { type: Boolean, default: true },
  notes: String,                                         // internal admin notes
}, { timestamps: true });

export default mongoose.models.Sponsor || mongoose.model('Sponsor', SponsorSchema);
