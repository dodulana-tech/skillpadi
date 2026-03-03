import mongoose from 'mongoose';

const AchievementSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  type: {
    type: String,
    enum: ['milestone', 'badge', 'streak', 'tournament', 'special'],
    required: true,
  },
  requirement: {
    type: { type: String }, // 'sessions_completed', 'streak_days', 'sports_count', 'tournament_win'
    value: { type: Number, default: 1 },
  },
  points: { type: Number, default: 10 },
  rarity: {
    type: String,
    enum: ['common', 'rare', 'epic', 'legendary'],
    default: 'common',
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

AchievementSchema.index({ type: 1, isActive: 1 });
AchievementSchema.index({ categoryId: 1 });

export default mongoose.models.Achievement || mongoose.model('Achievement', AchievementSchema);
