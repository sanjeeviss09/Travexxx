require('dotenv').config();
const { sendEmail } = require('./utils/mailer');
const supabase = require('./db');

async function run() {
  const { data } = await supabase.from('bookings').select('*, employees(email, name)').eq('booking_date', '2026-05-19');
  for (const b of data) {
    if (b.employees?.email) {
      await sendEmail(
        b.employees.email, 
        'Booking Status Updated: CONFIRMED', 
        `Hello ${b.employees.name}, your transport booking for ${b.booking_date} to ${b.destination} status has been updated to: CONFIRMED.`
      ).catch(console.error);
      console.log('Sent mail to', b.employees.email);
    }
  }
}
run();
