import mongoose from 'mongoose';

const TriggerRuleSchema = new mongoose.Schema({
  field: String,   // 'categorySlug', 'completionPercent', 'sportsCount', 'childAge'
  operator: String, // 'equals', 'gte', 'lte', 'in', 'exists'
  value: mongoose.Schema.Types.Mixed,
}, { _id: false });

const BundleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  triggerRules: [TriggerRuleSchema],
  includedPrograms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Program' }],
  includedExtras: [String], // 'progress-report', 'assessment', 'certificate', 'home-session'
  price: { type: Number, required: true },
  individualPrice: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  displayPriority: { type: Number, default: 0 },
}, { timestamps: true });

BundleSchema.index({ isActive: 1, displayPriority: -1 });

export default mongoose.models.Bundle || mongoose.model('Bundle', BundleSchema);
