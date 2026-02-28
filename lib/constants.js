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

export const ROLES = ['parent', 'coach', 'school', 'admin'];

export const ENQUIRY_STATUSES = ['new', 'contacted', 'enrolled', 'declined'];
export const ENQUIRY_SOURCES = ['website', 'whatsapp', 'referral', 'social', 'school', 'other'];
export const ENROLLMENT_STATUSES = ['pending', 'active', 'completed', 'cancelled', 'paused'];
export const PAYMENT_TYPES = ['membership', 'enrollment', 'starter-kit', 'product', 'insurance'];
export const PAYMENT_STATUSES = ['pending', 'success', 'failed', 'refunded'];
export const SUPERVISION_MODELS = ['parent-present', 'drop-off', 'school-chaperone', 'nanny-driver'];
export const SHIELD_LEVELS = ['certified', 'verified', 'in-progress'];

export const PAYSTACK_CHANNELS = ['card', 'bank', 'ussd', 'bank_transfer'];

// Rate limit settings (per IP)
export const RATE_LIMITS = {
  public: { windowMs: 60_000, max: 20 },      // 20 req/min for public endpoints
  auth: { windowMs: 60_000, max: 10 },         // 10 req/min for auth attempts
  webhook: { windowMs: 60_000, max: 100 },     // 100 req/min for webhooks
  authenticated: { windowMs: 60_000, max: 60 }, // 60 req/min for logged-in users
};
