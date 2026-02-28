// ═══════════════════════════════════════════════════════
// Environment Variable Validation
// Called once at startup. Fail fast, fail loud.
// ═══════════════════════════════════════════════════════

const required = [
  'MONGODB_URI',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
];

const optional = [
  'PAYSTACK_SECRET_KEY',
  'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
  'WHATSAPP_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'NEXT_PUBLIC_WA_BUSINESS',
  'ADMIN_EMAIL',
];

let validated = false;

export function validateEnv() {
  if (validated) return;

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `❌ Missing required environment variables:\n${missing.map((k) => `   - ${k}`).join('\n')}\n\nCopy .env.example to .env.local and fill in values.`
    );
  }

  const warnings = optional.filter((key) => !process.env[key]);
  if (warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn(
      `⚠️  Optional env vars not set (features will be disabled):\n${warnings.map((k) => `   - ${k}`).join('\n')}`
    );
  }

  validated = true;
}

export function hasPaystack() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export function hasWhatsApp() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}
