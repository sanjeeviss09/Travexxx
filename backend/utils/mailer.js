/**
 * mailer.js
 * Real email service for Revexy Transport Platform using Nodemailer.
 * Configure EMAIL_USER and EMAIL_PASS in .env to enable actual email delivery.
 */

const nodemailer = require('nodemailer');

// Check if email credentials are configured
const isConfigured = process.env.EMAIL_USER && 
                     process.env.EMAIL_PASS && 
                     process.env.EMAIL_USER !== 'your-email@gmail.com';

let transporter = null;

if (isConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true for port 465, false for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  // Verify connection on startup
  transporter.verify((error) => {
    if (error) {
      console.warn('[MAILER] ⚠️  SMTP connection failed:', error.message);
      console.warn('[MAILER] Emails will be logged to console only.');
    } else {
      console.log('[MAILER] ✅ SMTP server connected. Real emails will be sent.');
    }
  });
} else {
  console.log('[MAILER] ℹ️  Email credentials not configured. Set EMAIL_USER and EMAIL_PASS in .env to enable real emails.');
}

/**
 * Send an email.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} [html] - Optional HTML body
 */
const sendEmail = async (to, subject, text, html) => {
  console.log(`[MAILER] 📧 Sending email to: ${to}`);
  console.log(`[MAILER] Subject: ${subject}`);

  if (!isConfigured || !transporter) {
    // Fallback: log to console
    console.log(`[MAILER] Body (console fallback): ${text}`);
    return { messageId: 'console-only', preview: text };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Revexy Transport" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html: html || `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
          <div style="background: #2563eb; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">🚌 Revexy Transport</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">${text.replace(/\n/g, '<br>')}</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            <p style="color: #94a3b8; font-size: 12px;">This is an automated message from Revexy Transport Platform. Please do not reply to this email.</p>
          </div>
        </div>
      `,
    });

    console.log(`[MAILER] ✅ Email sent successfully to ${to}. Message ID: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[MAILER] ❌ Failed to send email to ${to}:`, err.message);
    // Don't throw - email failure shouldn't crash booking flow
    return null;
  }
};

module.exports = { sendEmail };
