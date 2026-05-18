const supabase = require('../db');
const { sendEmail } = require('../utils/mailer');

/**
 * Supabase Email Listener
 * Listens for database changes and sends real-time email notifications.
 */
function startEmailListener() {
  console.log('[EmailListener] Starting Supabase Realtime listener for emails...');

  const channel = supabase
    .channel('backend_email_notifications')
    .on(
      'postgres_changes',
      {
        event: '*', // Listen for INSERT and UPDATE
        schema: 'public',
        table: 'bookings'
      },
      async (payload) => {
        const { eventType, new: booking, old: oldBooking } = payload;
        
        try {
          // Fetch employee details to get their email
          const empId = booking.employee_id || booking.user_id;
          if (!empId) {
            console.warn('[EmailListener] No employee_id in booking payload, skipping.');
            return;
          }
          const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('name, email')
            .eq('id', empId)
            .single();

          if (empError || !employee || !employee.email) {
            console.warn(`[EmailListener] No email found for employee ${empId}`);
            return;
          }

          // INSERT: bookings.js now handles confirmation/waitlist emails directly.
          // The listener handles only special edge cases here.
          if (eventType === 'INSERT') {
            console.log(`[EmailListener] New booking INSERT detected for ${employee.name} — email handled by allocation engine.`);
            // No duplicate email here.
          } else if (eventType === 'UPDATE' && oldBooking && oldBooking.status !== booking.status) {
            // Status changed (e.g. PENDING -> CONFIRMED)
            console.log(`[EmailListener] Booking status updated to ${booking.status} for ${employee.name}. Sending update email.`);
            
            let subject = 'Transport Booking Update';
            let message = '';
            let statusColor = '#2563eb';

            if (booking.status === 'CONFIRMED') {
              subject = '✅ Transport Booking Confirmed';
              message = 'Your transport booking has been confirmed. Details are below.';
              statusColor = '#16a34a';
            } else if (booking.status === 'WAITLISTED') {
              subject = '⏳ Transport Booking Waitlisted';
              message = 'Your transport booking is currently on the waitlist. We will update you if a seat becomes available.';
              statusColor = '#ca8a04';
            } else if (booking.status?.startsWith('CANCELLED')) {
              subject = '❌ Transport Booking Cancelled';
              message = 'Your transport booking has been cancelled.';
              statusColor = '#dc2626';
            }

            await sendEmail(
              employee.email,
              subject,
              `Dear ${employee.name},\n\n${message}\n\nNew Status: ${booking.status}\nDate: ${booking.booking_date}\nDestination: ${booking.destination}`,
              `
                <h2>${subject}</h2>
                <p>Dear <strong>${employee.name}</strong>,</p>
                <p>${message}</p>
                <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${booking.status}</span></p>
                  <p><strong>Date:</strong> ${booking.booking_date}</p>
                  <p><strong>Destination:</strong> ${booking.destination}</p>
                  ${booking.vehicle_id ? `<p><strong>Vehicle:</strong> Assigned</p>` : ''}
                </div>
                <p>Please check your dashboard for more details.</p>
              `
            );
          }
        } catch (err) {
          console.error('[EmailListener] Error processing email notification:', err.message);
        }
      }
    )
    .subscribe();
}

module.exports = { startEmailListener };
