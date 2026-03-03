import mongoose from 'mongoose';

const AchievementEarnedSchema = new mongoose.Schema({
  achievementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement', required: true },
  earnedAt: { type: Date, default: Date.now },
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
  awardedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: false });

const SkillLevelSchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  level: {
    type: String,
    enum: ['beginner', 'explorer', 'intermediate', 'advanced', 'elite'],
    default: 'beginner',
  },
  points: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const TournamentEntrySchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
  result: String,
  position: Number,
  date: Date,
}, { _id: false });

const ChildPassportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  childName: { type: String, required: true },
  childAge: Number,
  achievements: [AchievementEarnedSchema],
  skillLevels: [SkillLevelSchema],
  stats: {
    totalSessions: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    sportsCount: { type: Number, default: 0 },
    lastSessionDate: Date,
  },
  tournaments: [TournamentEntrySchema],
}, { timestamps: true });

// Unique passport per child per parent
ChildPassportSchema.index({ userId: 1, childName: 1 }, { unique: true });

export default mongoose.models.ChildPassport || mongoose.model('ChildPassport', ChildPassportSchema);
