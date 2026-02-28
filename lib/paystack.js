// ═══════════════════════════════════════════════════════
// Paystack Integration
// ═══════════════════════════════════════════════════════

import { createHmac, randomBytes } from 'crypto';
import { hasPaystack } from './env';

const BASE_URL = 'https://api.paystack.co';

function getSecret() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error('PAYSTACK_SECRET_KEY not configured');
  return key;
}

async function paystackRequest(endpoint, method = 'GET', body = null) {
  const secret = getSecret();
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15000), // 15s timeout
  };
  if (body) options.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(`${BASE_URL}${endpoint}`, options);
  } catch (err) {
    console.error(`[Paystack] Network error on ${endpoint}:`, err.message);
    throw new Error('Payment service temporarily unavailable');
  }

  const data = await res.json();

  if (!data.status) {
    console.error(`[Paystack] ${endpoint} failed:`, data.message);
    throw new Error(data.message || 'Payment request failed');
  }

  return data.data;
}

/**
 * Initialize a payment transaction
 */
export async function initializePayment({ email, amount, reference, callbackUrl, metadata, channels }) {
  if (!hasPaystack()) throw new Error('Payment service not configured');
  if (!email || !amount || !reference) throw new Error('email, amount, and reference are required');
  if (amount <= 0) throw new Error('Amount must be positive');

  return paystackRequest('/transaction/initialize', 'POST', {
    email,
    amount: Math.round(amount), // kobo — must be integer
    reference,
    callback_url: callbackUrl,
    metadata: {
      custom_fields: [
        { display_name: 'Platform', variable_name: 'platform', value: 'SkillPadi' },
      ],
      ...metadata,
    },
    channels: channels || ['card', 'bank', 'ussd', 'bank_transfer'],
    currency: 'NGN',
  });
}

/**
 * Verify a payment
 */
export async function verifyPayment(reference) {
  if (!reference) throw new Error('Reference is required');
  return paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/**
 * Validate Paystack webhook signature
 */
export function validateWebhookSignature(rawBody, signature) {
  if (!signature) return false;
  try {
    const secret = getSecret();
    const hash = createHmac('sha512', secret).update(rawBody).digest('hex');
    // Timing-safe comparison
    if (hash.length !== signature.length) return false;
    let mismatch = 0;
    for (let i = 0; i < hash.length; i++) {
      mismatch |= hash.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return mismatch === 0;
  } catch {
    return false;
  }
}

/**
 * Generate unique, collision-resistant reference
 */
export function generateReference(prefix = 'SP') {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString('hex');
  return `${prefix}_${timestamp}_${random}`.toUpperCase();
}
