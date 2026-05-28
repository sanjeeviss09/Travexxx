const supabase = require('../db');
const { sendEmail } = require('../utils/mailer');
const { sendWhatsApp } = require('../utils/whatsapp');

/**
 * Supabase Notification Listener
 * Listens for database changes and sends real-time email & WhatsApp notifications.
 */
function startNotificationListener() {
  console.log('[NotificationListener] Starting Supabase Realtime listener for emails & WhatsApp...');

  const channel = supabase
    .channel('backend_notifications')
    // Listen for Bookings updates
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'bookings' },
      async (payload) => {
        const { new: booking, old: oldBooking } = payload;
        
        try {
          if (oldBooking.status === booking.status) return;

          // Fetch employee details
          const empId = booking.employee_id || booking.user_id;
          if (!empId) return;
          
          const { data: employee } = await supabase
            .from('employees')
            .select('name, email, mobile')
            .eq('id', empId)
            .single();

          if (!employee) return;

          console.log(`[NotificationListener] Booking status updated to ${booking.status} for ${employee.name}.`);
          
          let subject = 'Transport Booking Update';
          let message = '';
          let statusColor = '#2563eb';

          if (booking.status === 'CONFIRMED') {
            subject = '✅ Transport Booking Confirmed';
            message = 'Your transport booking has been confirmed. Details are below.';
            statusColor = '#16a34a';
          } else if (booking.status === 'WAITLISTED') {
            subject = '⏳ Transport Booking Waitlisted';
            message = 'Your transport booking is currently on the waitlist.';
            statusColor = '#ca8a04';
          } else if (booking.status?.startsWith('CANCELLED')) {
            subject = '❌ Transport Booking Cancelled';
            message = 'Your transport booking has been cancelled.';
            statusColor = '#dc2626';
          }

          const plainTextMsg = `Dear ${employee.name},\n\n${message}\n\nNew Status: ${booking.status}\nDate: ${booking.booking_date}\nDestination: ${booking.destination}`;
          
          // Send Email to Employee
          if (employee.email) {
            await sendEmail(
              employee.email,
              subject,
              plainTextMsg,
              `<h2>${subject}</h2><p>Dear <strong>${employee.name}</strong>,</p><p>${message}</p>
               <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                 <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${booking.status}</span></p>
                 <p><strong>Date:</strong> ${booking.booking_date}</p>
                 <p><strong>Destination:</strong> ${booking.destination}</p>
               </div>
               <p>Please check your dashboard for more details.</p>`
            );
          }

          // Send WhatsApp to Employee
          if (employee.mobile) {
            const waMsg = `*${subject}*\nHello ${employee.name},\n${message}\n\n*Date:* ${booking.booking_date}\n*Destination:* ${booking.destination}\n*Status:* ${booking.status}`;
            await sendWhatsApp(employee.mobile, waMsg);
          }

          // If CONFIRMED and vehicle is assigned, notify the driver
          if (booking.status === 'CONFIRMED' && booking.vehicle_id) {
            const { data: driver } = await supabase
              .from('drivers')
              .select('name, mobile')
              .eq('assigned_vehicle', booking.vehicle_id)
              .single();
              
            if (driver && driver.mobile) {
              const driverMsg = `*🚨 NEW TRIP ASSIGNED 🚨*\nHello ${driver.name},\nYou have a new confirmed trip.\n\n*Passenger:* ${employee.name} (${employee.mobile || 'No contact'})\n*Date:* ${booking.booking_date}\n*Destination:* ${booking.destination}\n*Pickup:* ${booking.pickup_point}\n\nPlease check your driver dashboard.`;
              await sendWhatsApp(driver.mobile, driverMsg);
            }
          }
          
        } catch (err) {
          console.error('[NotificationListener] Error processing booking notification:', err.message);
        }
      }
    )
    // Listen for Gate Passes updates
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'gate_passes' },
      async (payload) => {
        const { new: gp, old: oldGp } = payload;
        
        try {
          if (oldGp.status === gp.status) return;
          if (gp.status !== 'APPROVED' && gp.status !== 'DENIED') return;

          // Fetch employee details
          if (!gp.employee_id) return;
          const { data: employee } = await supabase
            .from('employees')
            .select('name, email, mobile')
            .eq('id', gp.employee_id)
            .single();

          if (!employee) return;

          const statusEmoji = gp.status === 'APPROVED' ? '✅' : '❌';
          const subject = `${statusEmoji} Gate Pass ${gp.status}`;
          const message = `Your material gate pass (${gp.gate_pass_number}) has been ${gp.status.toLowerCase()}.`;

          // Send Email to Employee
          if (employee.email) {
            await sendEmail(
              employee.email,
              `Gate Pass ${gp.gate_pass_number} is ${gp.status}`,
              `Dear ${employee.name},\n\n${message}\n\nDispatched To: ${gp.dispatched_to}\nPurpose: ${gp.purpose}\n\nPlease check your dashboard to download the official PDF.`,
              `<h2>Gate Pass Update ${statusEmoji}</h2>
               <p>Dear <strong>${employee.name}</strong>,</p>
               <p>${message}</p>
               <ul>
                 <li><strong>Pass No:</strong> ${gp.gate_pass_number}</li>
                 <li><strong>Dispatched To:</strong> ${gp.dispatched_to}</li>
                 <li><strong>Purpose:</strong> ${gp.purpose || 'N/A'}</li>
               </ul>
               <p>You can download the approved PDF from your dashboard.</p>`
            );
          }

          // Send WhatsApp to Employee
          if (employee.mobile) {
            const waMsg = `*GATE PASS ${gp.status} ${statusEmoji}*\nHello ${employee.name},\n${message}\n\n*Pass No:* ${gp.gate_pass_number}\n*Dispatched To:* ${gp.dispatched_to}\n*Purpose:* ${gp.purpose || 'N/A'}\n\nPlease log in to download your pass.`;
            await sendWhatsApp(employee.mobile, waMsg);
          }

          // If APPROVED, try to notify driver
          if (gp.status === 'APPROVED' && gp.mode_of_transfer_vehicle_no) {
            // Find driver by vehicle number (join with vehicles)
            const { data: driverData } = await supabase
              .from('drivers')
              .select('name, mobile, vehicles!inner(vehicle_number)')
              .eq('vehicles.vehicle_number', gp.mode_of_transfer_vehicle_no.trim())
              .single();
              
            if (driverData && driverData.mobile) {
              const driverMsg = `*📦 GOODS TRANSFER ASSIGNED 📦*\nHello ${driverData.name},\nYou have been assigned to transport goods.\n\n*Gate Pass:* ${gp.gate_pass_number}\n*Requestor:* ${employee.name} (${employee.mobile || 'No contact'})\n*Dispatched To:* ${gp.dispatched_to}\n\nPlease collect the gate pass copy.`;
              await sendWhatsApp(driverData.mobile, driverMsg);
            }
          }

        } catch (err) {
          console.error('[NotificationListener] Error processing gate pass notification:', err.message);
        }
      }
    )
    .subscribe();
}

module.exports = { startNotificationListener };
