/**
 * whatsapp.js
 * Simulated WhatsApp notification service.
 * The user requested to remove Twilio, so this service will log notifications to the console.
 */

/**
 * Sends a simulated WhatsApp message.
 * @param {string} mobile - The recipient's mobile number.
 * @param {string} message - The content of the WhatsApp message.
 */
const sendWhatsApp = async (mobile, message) => {
  if (!mobile) {
    console.warn('[WHATSAPP] ⚠️ Missing mobile number. Cannot send message.');
    return false;
  }

  // Formatting mobile number for log
  let cleaned = mobile.replace(/\D/g, '');
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned; // Assume India code if exactly 10 digits
  }
  
  console.log(`\n======================================================`);
  console.log(`💬 [WHATSAPP NOTIFICATION - SIMULATED]`);
  console.log(`To: +${cleaned}`);
  console.log(`Message:\n${message}`);
  console.log(`======================================================\n`);
  
  return true;
};

module.exports = { sendWhatsApp };
