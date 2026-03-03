import mongoose from 'mongoose';

const TeamMemberSchema = new mongoose.Schema({
  childName: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: false });

const TeamSchema = new mongoose.Schema({
  name: String,
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' },
  members: [TeamMemberSchema],
  registeredAt: { type: Date, default: Date.now },
  paid: { type: Boolean, default: false },
}, { _id: true });

const ResultSchema = new mongoose.Schema({
  position: Number,
  teamName: String,
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
  points: Number,
  notes: String,
}, { _id: false });

const TournamentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  type: {
    type: String,
    enum: ['individual', 'team', 'relay', 'league', 'knockout', 'inter-school', 'community', 'open', 'masterclass'],
    required: true,
  },
  description: String,
  venue: String,
  area: String,
  city: { type: String, enum: ['abuja', 'lagos'], default: 'abuja' },
  ageRange: String,
  prizes: String,
  date: Date,
  registrationDeadline: Date,
  maxTeams: Number,
  maxPerTeam: Number,
  entryFee: { type: Number, default: 0 },
  teams: [TeamSchema],
  results: [ResultSchema],
  status: {
    type: String,
    enum: ['upcoming', 'registration', 'in-progress', 'completed', 'cancelled'],
    default: 'upcoming',
  },
  sponsoredBy: { name: String, logo: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

TournamentSchema.index({ status: 1, date: 1 });
TournamentSchema.index({ categoryId: 1 });

export default mongoose.models.Tournament || mongoose.model('Tournament', TournamentSchema);
