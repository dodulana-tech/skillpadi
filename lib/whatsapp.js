// ═══════════════════════════════════════════════════════
// WhatsApp Cloud API — Notifications
//
// DESIGN PRINCIPLE: WhatsApp is "fire and forget".
// A failed notification should NEVER block a payment,
// enrollment, or any business-critical operation.
// Every function catches its own errors.
// ═══════════════════════════════════════════════════════

import { hasWhatsApp } from './env';
import { PLATFORM } from './constants';

const BASE_URL = () =>
  `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

/**
 * Send a WhatsApp text message — never throws
 */
export async function sendTextMessage(to, body) {
  if (!hasWhatsApp()) {
    console.info('[WhatsApp] Not configured — skipping message');
    return null;
  }

  if (!to || !body) {
    console.warn('[WhatsApp] Missing to or body');
    return null;
  }

  // Normalize Nigerian phone number
  let phone = String(to).replace(/[\s-()]/g, '');
  if (phone.startsWith('0')) phone = `234${phone.slice(1)}`;
  if (!phone.startsWith('234')) phone = `234${phone}`;

  try {
    const res = await fetch(BASE_URL(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body },
      }),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    const data = await res.json();
    if (data.error) {
      console.error('[WhatsApp] API error:', data.error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[WhatsApp] Send failed:', err.message);
    return null;
  }
}

// ── Pre-built notification templates ──

export async function notifyEnrollmentConfirmed(phone, childName, programName, schedule) {
  return sendTextMessage(phone,
    `✅ *SkillPadi Enrollment Confirmed*\n\n` +
    `${childName} is enrolled in *${programName}*!\n\n` +
    `📅 Schedule: ${schedule}\n` +
    `📍 Details: ${PLATFORM.url}/dashboard/parent\n\n` +
    `Questions? Reply to this message.`
  );
}

export async function notifyPaymentReceived(phone, amount, description) {
  return sendTextMessage(phone,
    `💳 *Payment Received*\n\n` +
    `Amount: ₦${Number(amount).toLocaleString()}\n` +
    `For: ${description}\n\n` +
    `Thank you! Receipt available in your dashboard.`
  );
}

export async function notifySessionReminder(phone, childName, programName, date, venue) {
  return sendTextMessage(phone,
    `📅 *Session Reminder*\n\n` +
    `${childName}'s *${programName}* session is tomorrow!\n\n` +
    `🕐 ${date}\n📍 ${venue}`
  );
}

export async function notifyNewEnquiry(adminPhone, parentName, childName, programName) {
  return sendTextMessage(adminPhone,
    `🔔 *New Enquiry*\n\n` +
    `${parentName} enquired about *${programName}* for ${childName}.\n\n` +
    `View: ${PLATFORM.url}/admin`
  );
}

export async function notifyCoachSession(coachPhone, programName, date, kidsCount) {
  return sendTextMessage(coachPhone,
    `📋 *Session Tomorrow*\n\n` +
    `*${programName}*\n📅 ${date}\n👶 ${kidsCount} kids expected\n\n` +
    `Please confirm readiness by replying ✅`
  );
}
