/**
 * SkillPadi — Database Seed Script
 * Run: npm run seed  (uses --env-file=.env.local)
 * Or:  node --env-file=.env.local scripts/seed.mjs
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not set. Make sure .env.local exists with MONGODB_URI.');
  process.exit(1);
}

// ── Inline schemas (avoids path alias issues outside Next.js) ──

const CategorySchema = new mongoose.Schema({
  name: String, slug: String, icon: String, color: String,
  description: String, active: { type: Boolean, default: true },
  order: Number, sponsor: { name: String, tagline: String, logo: String },
}, { timestamps: true });

const VettingItemSchema = new mongoose.Schema({
  status: String, date: Date, expires: Date, note: String,
}, { _id: false });

const CoachSchema = new mongoose.Schema({
  name: String, slug: String, initials: String, title: String, bio: String,
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  whatsapp: String,
  vetting: {
    nin: VettingItemSchema, police: VettingItemSchema, address: VettingItemSchema,
    photoMatch: VettingItemSchema, coachingCert: VettingItemSchema, experience: VettingItemSchema,
    references: VettingItemSchema, firstAid: VettingItemSchema, safeguarding: VettingItemSchema,
    sportSafety: VettingItemSchema, reverification: VettingItemSchema, insurance: VettingItemSchema,
    rating: VettingItemSchema, incidents: VettingItemSchema,
  },
  shieldLevel: String, rating: Number, reviewCount: Number,
  yearsExperience: Number, ageGroups: String,
  languages: [String], venues: [String], trainingsCompleted: [String],
  testimonials: [{ parent: String, text: String, rating: Number }],
  qa: [{ question: String, answer: String }],
  isActive: { type: Boolean, default: true }, featuredOrder: Number,
}, { timestamps: true });

const ProgramSchema = new mongoose.Schema({
  name: String, slug: String,
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach' },
  ageRange: String, ageMin: Number, ageMax: Number,
  location: String, locationNote: String, schedule: String,
  duration: Number, sessions: Number, groupSize: String,
  pricePerSession: Number, supervision: String,
  spotsTotal: Number, spotsTaken: Number,
  milestones: [String], highlights: [String],
  whatToBring: [String], safetyNote: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const ProductSchema = new mongoose.Schema({
  name: String, slug: String, price: Number,
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  brand: String, inStock: { type: Boolean, default: true },
  sold: Number, order: Number,
}, { timestamps: true });

const StarterKitSchema = new mongoose.Schema({
  name: String, slug: String,
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  icon: String, contents: [String],
  individualPrice: Number, kitPrice: Number,
  brand: String, inStock: { type: Boolean, default: true }, sold: Number,
}, { timestamps: true });

const SchoolSchema = new mongoose.Schema({
  name: String, slug: String, contactName: String, contactRole: String,
  email: String, phone: String, area: String,
  marginPercent: Number, isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Category = mongoose.model('Category', CategorySchema);
const Coach = mongoose.model('Coach', CoachSchema);
const Program = mongoose.model('Program', ProgramSchema);
const Product = mongoose.model('Product', ProductSchema);
const StarterKit = mongoose.model('StarterKit', StarterKitSchema);
const School = mongoose.model('School', SchoolSchema);

// ── Vetting helper ──
const v = (status = 'verified', note = '', date = '2025-01-10', expires = null) => ({
  status, note, date: new Date(date), ...(expires && { expires: new Date(expires) }),
});

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Clear
  await Promise.all([
    Category.deleteMany(), Coach.deleteMany(), Program.deleteMany(),
    Product.deleteMany(), StarterKit.deleteMany(), School.deleteMany(),
  ]);
  console.log('🗑️  Cleared existing data');

  // ── Categories ──
  const cats = await Category.insertMany([
    { name: 'Swimming', slug: 'swimming', icon: '🏊', color: '#0891B2', description: 'Pool swimming at trusted hotel & club venues', order: 1, sponsor: { name: 'Speedo', tagline: 'Presented by Speedo' } },
    { name: 'Football', slug: 'football', icon: '⚽', color: '#16A34A', description: 'Structured coaching on quality pitches', order: 2 },
    { name: 'Taekwondo', slug: 'taekwondo', icon: '🥋', color: '#DC2626', description: 'Discipline, fitness & self-defense', order: 3 },
    { name: 'Piano & Music', slug: 'piano', icon: '🎹', color: '#7C3AED', description: 'Classical & contemporary with certified instructors', order: 4, sponsor: { name: 'Yamaha', tagline: 'Powered by Yamaha' } },
    { name: 'Tennis', slug: 'tennis', icon: '🎾', color: '#CA8A04', description: 'Court skills & competitive training', order: 5 },
    { name: 'Coding & Robotics', slug: 'coding', icon: '💻', color: '#2563EB', description: 'Scratch, Python & hardware for future builders', order: 6 },
  ]);
  const cm = Object.fromEntries(cats.map((c) => [c.slug, c._id]));
  console.log(`📦 ${cats.length} categories`);

  // ── Coaches ──
  const bv = {
    nin: v(), police: v('verified', 'NPF — FCT Command', '2024-12-15'),
    address: v(), photoMatch: v(), experience: v(),
    references: v('verified', '3 refs checked'),
    firstAid: v('verified', 'Red Cross Nigeria', '2024-11-20', '2026-11-20'),
    safeguarding: v('verified', '', '2024-11-01', '2025-11-01'),
    reverification: v('verified', '', '2025-01-15', '2026-01-15'),
    insurance: v('verified', '', '2025-01-01', '2025-12-31'),
    rating: v(), incidents: v('verified', 'Zero'),
  };

  const coaches = await Coach.insertMany([
    { name: 'Coach Amaka Obi', slug: 'coach-amaka', initials: 'AO', title: 'Head Swimming Instructor', bio: 'Former national youth swimmer. 8 years coaching. STA Level 2 certified. Mother of two.', categoryId: cm.swimming, whatsapp: '2348012345678', vetting: { ...bv, coachingCert: v('verified', 'STA Level 2 — #ST-28194'), sportSafety: v('verified', 'Lifeguard (RLSS)') }, shieldLevel: 'certified', rating: 4.9, reviewCount: 47, yearsExperience: 8, ageGroups: '3-10', languages: ['English', 'Igbo', 'Pidgin'], venues: ['Transcorp Hilton Pool', 'Sheraton Pool'], trainingsCompleted: ['Session Reporting', 'Drop-off Protocol', 'Incident Reporting', 'Photo Privacy'], testimonials: [{ parent: 'Mrs. Adebayo', text: 'Timi was terrified of water. After 4 sessions he\'s jumping in.', rating: 5 }], qa: [{ question: 'My child is terrified of water?', answer: 'Most start nervous. Play-based approach, no forcing. By session 3 they\'re smiling.' }, { question: 'Can my driver drop off?', answer: 'Yes — pre-registered with photo ID. Come in person on day 1 to set up.' }], featuredOrder: 1 },
    { name: 'Coach Emeka Nwosu', slug: 'coach-emeka', initials: 'EN', title: 'Senior Swimming Coach', bio: 'Competitive swimmer turned coach. Stroke technique specialist. 6 years.', categoryId: cm.swimming, whatsapp: '2348023456789', vetting: { ...bv, coachingCert: v('verified', 'Swim England Level 2'), sportSafety: v('verified', 'Lifeguard (RLSS)') }, shieldLevel: 'certified', rating: 4.8, reviewCount: 32, yearsExperience: 6, ageGroups: '6-16', languages: ['English', 'Igbo'], venues: ['Sheraton Pool'], trainingsCompleted: ['Session Reporting', 'Drop-off Protocol', 'Communication Standards'], testimonials: [{ parent: 'Mr. Okafor', text: 'Chidera\'s freestyle improved dramatically.', rating: 5 }], qa: [{ question: 'Do you send progress updates?', answer: 'WhatsApp voice note or video after every session.' }], featuredOrder: 2 },
    { name: 'Mrs. Folake Adeniyi', slug: 'mrs-folake', initials: 'FA', title: 'Piano Instructor', bio: 'B.A. Music UniLag. ABRSM Grade 8. 12 years teaching kids.', categoryId: cm.piano, whatsapp: '2348034567890', vetting: { ...bv, coachingCert: v('verified', 'B.A. Music, ABRSM Grade 8'), sportSafety: v('na') }, shieldLevel: 'certified', rating: 5.0, reviewCount: 28, yearsExperience: 12, ageGroups: '4-16', languages: ['English', 'Yoruba'], venues: ['Music Hub, Garki'], trainingsCompleted: ['Session Reporting', 'Communication Standards', 'Photo Privacy'], testimonials: [{ parent: 'Mrs. Akande', text: 'My son played his first piece at school after 2 months.', rating: 5 }], qa: [{ question: 'Need a piano at home?', answer: '61-key practice keyboard recommended. Yamaha PSS-A50 available in shop.' }], featuredOrder: 3 },
    { name: 'Master Chinedu Chukwu', slug: 'master-chukwu', initials: 'CC', title: 'Taekwondo Master', bio: '3rd Dan Black Belt. Trained in South Korea. 15 years. Discipline-focused.', categoryId: cm.taekwondo, whatsapp: '2348045678901', vetting: { ...bv, coachingCert: v('verified', '3rd Dan — Kukkiwon Certified'), sportSafety: v('verified', 'NTF Registered') }, shieldLevel: 'certified', rating: 4.9, reviewCount: 63, yearsExperience: 15, ageGroups: '4-16', languages: ['English', 'Igbo', 'Pidgin'], venues: ['Sports Complex, Garki'], trainingsCompleted: ['Session Reporting', 'Drop-off Protocol', 'Incident Reporting', 'Communication Standards', 'Photo Privacy'], testimonials: [{ parent: 'Dr. Eze', text: 'Son\'s behaviour improved within weeks. Discipline is real.', rating: 5 }], qa: [{ question: 'Contact sparring?', answer: 'No contact for beginners. Light sparring at green belt with full gear.' }], featuredOrder: 4 },
    { name: 'Coach Bayo Adeyemi', slug: 'coach-bayo', initials: 'BA', title: 'Football Coach', bio: 'Former Shooting Stars youth. CAF C License. 10 years grassroots coaching.', categoryId: cm.football, whatsapp: '2348056789012', vetting: { ...bv, coachingCert: v('verified', 'CAF C License'), sportSafety: v('verified', 'NFF Registered') }, shieldLevel: 'certified', rating: 4.7, reviewCount: 38, yearsExperience: 10, ageGroups: '4-14', languages: ['English', 'Yoruba', 'Pidgin'], venues: ['Jabi Lake Turf', 'Wuse Zone 5 Pitch'], trainingsCompleted: ['Session Reporting', 'Drop-off Protocol', 'Incident Reporting'], testimonials: [{ parent: 'Mr. Aliyu', text: 'Finally structured football — not just 20 kids chasing a ball.', rating: 5 }], qa: [{ question: 'Proper coaching or kickabout?', answer: 'Structured sessions: warm-up, drill, small-sided game, cool-down.' }], featuredOrder: 5 },
    { name: 'Coach Ngozi Eze', slug: 'coach-ngozi', initials: 'NE', title: 'Football (Girls)', bio: 'Former Super Falcons U-17. 5 years coaching girls.', categoryId: cm.football, whatsapp: '2348067890123', vetting: { ...bv, coachingCert: v('verified', 'NFF D License + FIFA Grassroots'), insurance: v('pending') }, shieldLevel: 'verified', rating: 4.8, reviewCount: 15, yearsExperience: 5, ageGroups: '5-12', languages: ['English', 'Igbo'], venues: ['Jabi Lake Turf'], trainingsCompleted: ['Session Reporting', 'Drop-off Protocol'], testimonials: [{ parent: 'Mrs. Adekunle', text: 'A female coach my daughter looks up to.', rating: 5 }], qa: [{ question: 'Are sessions really girls-only?', answer: 'Yes — Saturday mornings exclusively girls. Safe space.' }], featuredOrder: 6 },
    { name: 'Mr. Tunde Fashola', slug: 'mr-tunde', initials: 'TF', title: 'Coding Instructor', bio: '7 years at Andela/Flutterwave. Scratch for young, Python for older kids.', categoryId: cm.coding, whatsapp: '2348078901234', vetting: { ...bv, coachingCert: v('verified', 'B.Sc CS — Google CS First'), sportSafety: v('na') }, shieldLevel: 'certified', rating: 4.9, reviewCount: 21, yearsExperience: 3, ageGroups: '6-14', languages: ['English', 'Yoruba'], venues: ['STEM Hub, Wuse 2'], trainingsCompleted: ['Session Reporting', 'Communication Standards', 'Photo Privacy'], testimonials: [{ parent: 'Mrs. Akinola', text: '8-year-old built a game in Scratch after 3 sessions.', rating: 5 }], qa: [{ question: 'Need a laptop?', answer: 'Provided for sessions. Any laptop with Chrome for home practice.' }], featuredOrder: 7 },
    { name: 'Coach Uche Nnaji', slug: 'coach-uche', initials: 'UN', title: 'Tennis Coach', bio: 'ITF Level 1. Former national junior circuit. 6 years coaching kids.', categoryId: cm.tennis, whatsapp: '2348089012345', vetting: { ...bv, coachingCert: v('verified', 'ITF Level 1'), sportSafety: v('verified', 'TFN Registered') }, shieldLevel: 'certified', rating: 4.8, reviewCount: 19, yearsExperience: 6, ageGroups: '5-16', languages: ['English', 'Igbo'], venues: ['National Stadium Courts', 'IBB Golf Club Courts'], trainingsCompleted: ['Session Reporting', 'Drop-off Protocol'], testimonials: [{ parent: 'Barr. Onwueme', text: 'Punctual, professional. My son looks forward to sessions.', rating: 5 }], qa: [{ question: 'Need own racket?', answer: 'Junior rackets available. Recommend buying after 3-4 sessions — in our shop.' }], featuredOrder: 8 },
  ]);
  const chm = Object.fromEntries(coaches.map((c) => [c.slug, c._id]));
  console.log(`📦 ${coaches.length} coaches`);

  // ── Programs ──
  const programs = await Program.insertMany([
    { name: 'Little Swimmers', slug: 'little-swimmers', categoryId: cm.swimming, coachId: chm['coach-amaka'], ageRange: '3-5', ageMin: 3, ageMax: 5, location: 'Transcorp Hilton Pool, Maitama', locationNote: 'Leisure centre entrance, left side.', schedule: 'Mon & Wed, 9:00 AM', duration: 45, sessions: 4, groupSize: '1-on-1', pricePerSession: 25000, supervision: 'parent-present', spotsTotal: 6, spotsTaken: 4, milestones: ['Water Comfort', 'Floating Basics', 'Kicking Technique', 'First Unassisted Float'], highlights: ['Water confidence', 'Floating & kicking', 'Safety awareness'], whatToBring: ['Swimsuit & cap', 'Towel', 'Water bottle', 'Goggles (optional)'], safetyNote: '1.2m max. Lifeguard on duty. 1:1 ratio.' },
    { name: 'Junior Swimmers', slug: 'junior-swimmers', categoryId: cm.swimming, coachId: chm['coach-emeka'], ageRange: '6-10', ageMin: 6, ageMax: 10, location: 'Sheraton Hotel Pool, Wuse', locationNote: 'Main lobby → health club.', schedule: 'Tue & Thu, 3:30 PM', duration: 60, sessions: 8, groupSize: '4-6 kids', pricePerSession: 23000, supervision: 'drop-off', spotsTotal: 6, spotsTaken: 6, milestones: ['Freestyle 25m', 'Backstroke Intro', 'Treading 60s', 'Diving Basics', 'Endurance 50m', 'Stroke Correction', 'Speed Drills', 'Assessment'], highlights: ['Freestyle & backstroke', 'Diving', 'Endurance'], whatToBring: ['Swimsuit, cap & goggles', 'Towel', 'Water bottle'], safetyNote: 'Sign in/out. WhatsApp session alerts.' },
    { name: 'Weekend Football Skills', slug: 'weekend-football', categoryId: cm.football, coachId: chm['coach-bayo'], ageRange: '5-8', ageMin: 5, ageMax: 8, location: 'Jabi Lake Turf', locationNote: 'Behind Jabi Lake Mall.', schedule: 'Sat, 8:00 AM', duration: 90, sessions: 8, groupSize: '10-14 kids', pricePerSession: 10000, supervision: 'drop-off', spotsTotal: 14, spotsTaken: 9, milestones: ['Ball Control', 'Passing', 'Dribbling', 'Shooting', 'Positioning', 'Small-Sided Game', 'Teamwork', 'Mini Tournament'], whatToBring: ['Football boots', 'Shin guards', 'Water bottle'], safetyNote: 'Artificial turf. First aid on site.' },
    { name: 'Girls Football Academy', slug: 'girls-football', categoryId: cm.football, coachId: chm['coach-ngozi'], ageRange: '6-12', ageMin: 6, ageMax: 12, location: 'Jabi Lake Turf', schedule: 'Sat, 10:00 AM', duration: 90, sessions: 8, groupSize: '8-12 kids', pricePerSession: 10000, supervision: 'drop-off', spotsTotal: 12, spotsTaken: 5, milestones: ['Ball Control', 'Passing', 'Dribbling', 'Shooting', '1v1 Defending', 'Game Intelligence', 'Set Pieces', 'Showcase Match'], whatToBring: ['Boots', 'Shin guards', 'Water bottle'], safetyNote: 'Female coaching staff. Safe environment.' },
    { name: 'Little Warriors', slug: 'little-warriors', categoryId: cm.taekwondo, coachId: chm['master-chukwu'], ageRange: '5-8', ageMin: 5, ageMax: 8, location: 'Sports Complex, Garki', schedule: 'Sat & Sun, 10:00 AM', duration: 60, sessions: 12, groupSize: '6-10 kids', pricePerSession: 15000, supervision: 'drop-off', spotsTotal: 10, spotsTaken: 7, milestones: ['White Belt Basics', 'Stance & Balance', 'Basic Kicks', 'Basic Blocks', 'Form 1', 'Yellow Belt Prep', 'Sparring Intro', 'Discipline', 'Form 2', 'Speed Drills', 'Yellow Belt Test', 'Graduation'], whatToBring: ['Dobok', 'Water bottle', 'Towel'], safetyNote: 'Padded area. No contact sparring for beginners.' },
    { name: 'Piano Explorers', slug: 'piano-explorers', categoryId: cm.piano, coachId: chm['mrs-folake'], ageRange: '5-9', ageMin: 5, ageMax: 9, location: 'Music Hub, Garki Area 11', locationNote: 'Off Nile St, opposite First Bank.', schedule: 'Fri, 4:00 PM', duration: 30, sessions: 4, groupSize: '1-on-1', pricePerSession: 20000, supervision: 'nanny-driver', spotsTotal: 3, spotsTaken: 1, milestones: ['Note Reading', 'Simple Melodies', 'Two-Hand Coordination', 'First Recital Piece'], whatToBring: ['Nothing — keyboards provided'], safetyNote: 'Indoor AC studio. Parents/nannies in reception.' },
    { name: 'Code Explorers (Scratch)', slug: 'code-explorers', categoryId: cm.coding, coachId: chm['mr-tunde'], ageRange: '6-9', ageMin: 6, ageMax: 9, location: 'STEM Hub, Wuse 2', schedule: 'Sat, 11:00 AM', duration: 90, sessions: 8, groupSize: '4-6 kids', pricePerSession: 18000, supervision: 'drop-off', spotsTotal: 6, spotsTaken: 3, milestones: ['What is Code?', 'First Scratch Project', 'Loops', 'Events', 'Variables', 'First Game', 'Debugging', 'Showcase'], whatToBring: ['Nothing — laptops provided'], safetyNote: 'Indoor AC lab. Supervised. No unsupervised internet.' },
    { name: 'Junior Tennis', slug: 'junior-tennis', categoryId: cm.tennis, coachId: chm['coach-uche'], ageRange: '6-12', ageMin: 6, ageMax: 12, location: 'National Stadium Courts', schedule: 'Sat, 8:00 AM', duration: 60, sessions: 8, groupSize: '3-4 kids', pricePerSession: 15000, supervision: 'drop-off', spotsTotal: 4, spotsTaken: 2, milestones: ['Grip & Stance', 'Forehand', 'Backhand', 'Serving', 'Rally 10', 'Net Play', 'Match Rules', 'Mini Tournament'], whatToBring: ['Racket (or use ours)', 'Water bottle', 'Tennis shoes', 'Cap'], safetyNote: 'Shaded rest area. Hydration breaks every 20min.' },
  ]);
  console.log(`📦 ${programs.length} programs`);

  // ── Starter Kits ──
  const kits = await StarterKit.insertMany([
    { name: 'Tadpole Kit', slug: 'tadpole-kit', categoryId: cm.swimming, icon: '🐸', contents: ['Kids swimsuit', 'Swim cap', 'Goggles', 'Towel', 'Waterproof bag', 'Arm floats'], individualPrice: 22500, kitPrice: 18000, brand: 'Speedo', sold: 23 },
    { name: 'Dolphin Kit', slug: 'dolphin-kit', categoryId: cm.swimming, icon: '🐬', contents: ['Swimsuit', 'Cap', 'Goggles', 'Towel', 'Swim bag', 'Kickboard', 'Bottle'], individualPrice: 26000, kitPrice: 21000, brand: 'Speedo', sold: 18 },
    { name: 'Striker Kit', slug: 'striker-kit', categoryId: cm.football, icon: '⚡', contents: ['Boots (moulded)', 'Shin guards', 'Socks', 'Bottle', 'Training bib', 'Bag'], individualPrice: 22000, kitPrice: 17000, sold: 31 },
    { name: 'Warrior Kit', slug: 'warrior-kit', categoryId: cm.taekwondo, icon: '🔥', contents: ['Dobok', 'White belt', 'Mouth guard', 'Bottle', 'Bag'], individualPrice: 15000, kitPrice: 12000, sold: 14 },
    { name: 'Keys Kit', slug: 'keys-kit', categoryId: cm.piano, icon: '🎵', contents: ['Yamaha PSS-A50', 'Theory workbook', 'Headphones', 'Stand'], individualPrice: 85000, kitPrice: 72000, brand: 'Yamaha', sold: 5 },
    { name: 'Coder Kit', slug: 'coder-kit', categoryId: cm.coding, icon: '🚀', contents: ['Workbook', 'USB (Scratch)', 'Mouse', 'Headphones', 'Notebook'], individualPrice: 15000, kitPrice: 12000, sold: 8 },
    { name: 'Ace Kit', slug: 'ace-kit', categoryId: cm.tennis, icon: '🏆', contents: ['Junior racket', 'Balls (x3)', 'Grip tape', 'Bottle', 'Bag'], individualPrice: 20000, kitPrice: 16000, sold: 6 },
  ]);
  console.log(`📦 ${kits.length} starter kits`);

  // ── Products ──
  const products = await Product.insertMany([
    { name: 'Kids Swimsuit', slug: 'kids-swimsuit', price: 6000, categoryId: cm.swimming, brand: 'Nabaiji', sold: 15, order: 1 },
    { name: 'Swim Cap', slug: 'swim-cap', price: 2500, categoryId: cm.swimming, brand: 'Speedo', sold: 22, order: 2 },
    { name: 'Junior Goggles', slug: 'junior-goggles', price: 4000, categoryId: cm.swimming, brand: 'Arena', sold: 19, order: 3 },
    { name: 'Kickboard', slug: 'kickboard', price: 5000, categoryId: cm.swimming, brand: 'Nabaiji', sold: 8, order: 4 },
    { name: 'Football Boots', slug: 'football-boots', price: 8000, categoryId: cm.football, sold: 24, order: 5 },
    { name: 'Shin Guards', slug: 'shin-guards', price: 3500, categoryId: cm.football, sold: 20, order: 6 },
    { name: 'Dobok Uniform', slug: 'dobok-uniform', price: 8000, categoryId: cm.taekwondo, brand: 'Mooto', sold: 11, order: 7 },
    { name: 'Yamaha PSS-A50', slug: 'yamaha-pss-a50', price: 65000, categoryId: cm.piano, brand: 'Yamaha', sold: 3, order: 8 },
    { name: 'Theory Workbook', slug: 'theory-workbook', price: 3000, categoryId: cm.piano, brand: 'SkillPadi', sold: 7, order: 9 },
    { name: 'Junior Racket 23"', slug: 'junior-racket', price: 8000, categoryId: cm.tennis, brand: 'Wilson', sold: 4, order: 10 },
    { name: 'Coding Workbook', slug: 'coding-workbook', price: 3500, categoryId: cm.coding, brand: 'SkillPadi', sold: 6, order: 11 },
    { name: 'SkillPadi Water Bottle', slug: 'sp-water-bottle', price: 2500, brand: 'SkillPadi', sold: 40, order: 12 },
    { name: 'SkillPadi Bag', slug: 'sp-bag', price: 3000, brand: 'SkillPadi', sold: 35, order: 13 },
  ]);
  console.log(`📦 ${products.length} products`);

  // ── Schools ──
  const schools = await School.insertMany([
    { name: 'Greenfield International School', slug: 'greenfield', contactName: 'Mrs. Adesanya', contactRole: 'P.E. Teacher', email: 'pe@greenfield.edu.ng', phone: '08091112222', area: 'Maitama', marginPercent: 15 },
    { name: 'Premiere Academy', slug: 'premiere', contactName: 'Mr. Obaseki', contactRole: 'Sports Director', email: 'sports@premiere.edu.ng', phone: '08123334444', area: 'Lugbe', marginPercent: 12 },
  ]);
  console.log(`📦 ${schools.length} schools`);

  console.log('\n🎉 Seed complete! SkillPadi database ready.');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
