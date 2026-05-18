/**
 * sms.js
 * SMS notification service for Revexy Transport Platform.
 * Uses Twilio for SMS delivery. Falls back to console log if not configured.
 * 
 * To enable: add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER to .env
 */

const isConfigured =
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_PHONE_NUMBER &&
  process.env.TWILIO_ACCOUNT_SID !== 'your_account_sid';

let twilio = null;

if (isConfigured) {
  try {
    twilio = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    console.log('[SMS] ✅ Twilio SMS configured and ready.');
  } catch (e) {
    console.warn('[SMS] ⚠️  Twilio package not found. Run: npm install twilio');
  }
} else {
  console.log('[SMS] ℹ️  Twilio not configured. Add TWILIO_* vars to .env to enable SMS.');
}

/**
 * Normalize a phone number to E.164 format for Twilio.
 * Handles Indian numbers (10-digit → +91XXXXXXXXXX).
 */
function normalizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`; // Assume India
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
  return `+${digits}`;
}

/**
 * Send an SMS message.
 * @param {string} to   - Recipient phone number (any format; will be normalized)
 * @param {string} body - Message body (max 160 chars for single SMS)
 * @returns {Promise<object|null>}
 */
const sendSMS = async (to, body) => {
  const phone = normalizePhone(to);
  if (!phone) {
    console.warn('[SMS] Skipping: no phone number provided.');
    return null;
  }

  console.log(`[SMS] 📱 Sending SMS to: ${phone}`);
  console.log(`[SMS] Message: ${body}`);

  if (!isConfigured || !twilio) {
    console.log(`[SMS] (console fallback) → ${phone}: ${body}`);
    return { sid: 'console-only', to: phone, body };
  }

  try {
    const message = await twilio.messages.create({
      body: body.substring(0, 1600), // Twilio limit
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    console.log(`[SMS] ✅ SMS sent to ${phone}. SID: ${message.sid}`);
    return message;
  } catch (err) {
    console.error(`[SMS] ❌ Failed to send SMS to ${phone}:`, err.message);
    return null; // Don't crash the booking flow
  }
};

/**
 * Send both email and SMS notification together.
 * @param {object} emp       - Employee object with { email, mobile, name }
 * @param {string} subject   - Email subject
 * @param {string} text      - Plain text (used for both SMS and email body)
 * @param {string} [html]    - Optional HTML for email
 */
const notify = async (emp, subject, text, html) => {
  const { sendEmail } = require('./mailer');
  const promises = [];

  if (emp?.email) {
    promises.push(sendEmail(emp.email, subject, text, html).catch(e =>
      console.error('[Notify] Email error:', e.message)
    ));
  }

  if (emp?.mobile) {
    // Truncate for SMS — keep to 160 chars
    const smsText = text.length > 155 ? text.substring(0, 152) + '...' : text;
    promises.push(sendSMS(emp.mobile, `Revexy Transport: ${smsText}`).catch(e =>
      console.error('[Notify] SMS error:', e.message)
    ));
  }

  await Promise.allSettled(promises);
};

module.exports = { sendSMS, notify, normalizePhone };
