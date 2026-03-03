// ═══════════════════════════════════════════════════════
// SKILLPADI — Centralized Configuration
// Every magic number and business rule lives here.
// ═══════════════════════════════════════════════════════

export const PLATFORM = {
  name: 'SkillPadi',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  whatsapp: process.env.NEXT_PUBLIC_WA_BUSINESS || '2348000000000',
  currency: 'NGN',
};

export const PRICING = {
  membershipFee: 15_000,    // ₦ one-time
  vatRate: 0.075,           // 7.5%
  insurancePerSession: 500, // ₦
  insurancePerTerm: 3_000,  // ₦
};

export const LIMITS = {
  maxChildAge: 18,
  minChildAge: 2,
  maxChildrenPerParent: 10,
  maxEnrollmentsPerChild: 5,
  maxEnquiryMessageLength: 500,
  maxNameLength: 100,
  maxPhoneLength: 20,
};

export const ROLES = ['parent', 'coach', 'school', 'community', 'admin'];

export const ENQUIRY_STATUSES = ['new', 'contacted', 'enrolled', 'declined'];
export const ENQUIRY_SOURCES = ['website', 'whatsapp', 'referral', 'social', 'school', 'community', 'other'];
export const ENROLLMENT_STATUSES = ['pending', 'active', 'completed', 'cancelled', 'paused'];
export const PAYMENT_TYPES = ['membership', 'enrollment', 'starter-kit', 'product', 'insurance'];
export const PAYMENT_STATUSES = ['pending', 'success', 'failed', 'refunded'];
export const SUPERVISION_MODELS = ['parent-present', 'drop-off', 'school-chaperone', 'nanny-driver'];
export const SHIELD_LEVELS = ['certified', 'verified', 'in-progress'];

export const PAYSTACK_CHANNELS = ['card', 'bank', 'ussd', 'bank_transfer'];

// Coach Referral System
export const REFERRAL = {
  coachSignupBonus: 5_000,     // ₦5,000 when referred coach completes vetting
  coachCommissionRate: 0.03,   // 3% of referred coach's session revenue
  coachCommissionMonths: 12,   // Commission expires after 12 months
  parentReferralCredit: 2_500, // ₦2,500 credit when referred parent signs up
  trustScoreDefault: 50,
  trustScorePerVettedReferral: 10,
  trustScorePenaltyComplaint: -20,
  trustScorePerCleanTerm: 5,
};

// Cities & areas
export const AREAS = {
  abuja: {
    name: 'Abuja',
    areas: ['Maitama', 'Wuse', 'Garki', 'Asokoro', 'Jabi', 'Gwarinpa'],
    active: true,
  },
  lagos: {
    name: 'Lagos',
    areas: ['Lekki', 'Ikoyi', 'Victoria Island'],
    active: true,
    isNew: true,
  },
};

// Gamification
export const SKILL_LEVELS = ['beginner', 'explorer', 'intermediate', 'advanced', 'elite'];
export const LEVEL_POINTS = { beginner: 0, explorer: 50, intermediate: 150, advanced: 300, elite: 600 };

// Rate limit settings (per IP)
export const RATE_LIMITS = {
  public: { windowMs: 60_000, max: 20 },      // 20 req/min for public endpoints
  auth: { windowMs: 60_000, max: 10 },         // 10 req/min for auth attempts
  webhook: { windowMs: 60_000, max: 100 },     // 100 req/min for webhooks
  authenticated: { windowMs: 60_000, max: 60 }, // 60 req/min for logged-in users
};