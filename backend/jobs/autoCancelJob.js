/**
 * autoCancelJob.js
 * Runs every 5 minutes. Finds all today's bookings still CONFIRMED whose
 * route end-time has passed, cancels them, and creates in-app notifications
 * + sends emails to each affected employee.
 */

const supabase = require('../db');
const { sendEmail } = require('../utils/mailer');
const { sendSMS } = require('../utils/sms');

/** Parse "6:00 AM - 7:00 AM" → end time as today's Date object */
function parseEndTime(estimatedTime) {
  if (!estimatedTime) return null;
  // Try to extract the second half: "7:00 AM"
  const parts = estimatedTime.split('-');
  const endStr = (parts[1] || parts[0]).trim();

  const now = new Date();
  const [time, meridiem] = endStr.split(' ');
  if (!time) return null;

  let [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;

  if (meridiem && meridiem.toUpperCase() === 'PM' && hours !== 12) hours += 12;
  if (meridiem && meridiem.toUpperCase() === 'AM' && hours === 12) hours = 0;

  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
  return endDate;
}

async function runAutoCancelJob() {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();

  console.log(`[AutoCancel] Running job at ${now.toLocaleTimeString()} for date ${today}`);

  try {
    // 0. Cleanup Past Stale Bookings (Past dates still CONFIRMED or WAITLISTED)
    // IMPORTANT: Do NOT touch ON ROUTE bookings — those were genuinely started and
    // need to be ended by the driver (or handled via a separate incomplete-trip flow).
    const { data: pastStale, error: pastErr } = await supabase
      .from('bookings')
      .select('id, employee_id, booking_date, destination, routes(route_name, estimated_time), employees(name, email)')
      .lt('booking_date', today)
      .in('status', ['CONFIRMED', 'WAITLISTED']);
    
    if (!pastErr && pastStale && pastStale.length > 0) {
      console.log(`[AutoCancel] Cleaning up ${pastStale.length} bookings from past dates.`);
      const pastIds = pastStale.map(b => b.id);
      await supabase.from('bookings').update({ status: 'CANCELLED (Auto)' }).in('id', pastIds);

      for (const b of pastStale) {
        const emp = b.employees;
        const routeInfo = b.routes?.route_name ? `Route: ${b.routes.route_name} (${b.routes.estimated_time})` : `Destination: ${b.destination}`;
        const msg = `Your booking for ${b.booking_date} (${routeInfo}) was automatically cancelled because the trip time has passed.`;
        await supabase.from('notifications').insert([{ user_id: b.employee_id, message: `⚠️ ${msg}`, read_status: false }]);
        if (emp?.email) sendEmail(emp.email, `❌ Transport Booking Auto-Cancelled — ${b.booking_date}`,
          `Dear ${emp.name},\n\n${msg}\n\nContact HR if this is an error.\n\nRevexy Transport Team`,
          `<h2>Booking Auto-Cancelled</h2><p>Dear <strong>${emp.name}</strong>,</p><p>${msg}</p>`
        ).catch(() => {});
        if (emp?.mobile) sendSMS(emp.mobile, `Revexy: ${msg}`).catch(() => {});
      }
    }

    // 0.5 ── VEHICLE STATUS SYNC ─────────────────────────────────────────────
    // [REMOVED] This block was resetting vehicles with 0 passengers to 'Available'.
    // We removed it so that if a driver starts a trip (even empty), it stays 'ON ROUTE'.

    // 1. Fetch all routes that have CONFIRMED bookings today
    const { data: routes, error: routeErr } = await supabase
      .from('routes')
      .select('id, route_name, estimated_time, vehicle_id');

    if (routeErr) throw routeErr;

    for (const route of routes) {
      const endTime = parseEndTime(route.estimated_time);
      if (!endTime) continue;

      // Only act if the trip end-time has passed
      if (now <= endTime) continue;

      // 2. Find all CONFIRMED/WAITLISTED (not started) bookings for this route today
      // ON ROUTE bookings are excluded — driver started but not ended; do NOT cancel.
      const { data: bookings, error: bookErr } = await supabase
        .from('bookings')
        .select('id, employee_id, status, employees(name, email)')
        .eq('route_id', route.id)
        .eq('booking_date', today)
        .in('status', ['CONFIRMED', 'WAITLISTED']);

      if (bookErr) throw bookErr;
      if (!bookings || bookings.length === 0) continue;

      console.log(`[AutoCancel] Route "${route.route_name}" end time ${endTime.toLocaleTimeString()} passed. Cancelling ${bookings.length} booking(s).`);

      // 3. Cancel all those bookings
      const bookingIds = bookings.map(b => b.id);
      const { error: updateErr } = await supabase
        .from('bookings')
        .update({ status: 'CANCELLED (Auto)' })
        .in('id', bookingIds);

      if (updateErr) throw updateErr;

      // 4. Create in-app notification + send email + SMS to each affected employee
      const notifications = bookings.map(b => ({
        user_id: b.employee_id,
        message: `⚠️ Your trip on route "${route.route_name}" (${route.estimated_time}) on ${today} was automatically cancelled because the driver did not start the trip in time. Please rebook or contact HR.`,
        read_status: false
      }));

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications).then(({ error: notifErr }) => {
          if (notifErr) console.error('[AutoCancel] Failed to insert notifications:', notifErr);
        });
      }

      for (const b of bookings) {
        const emp = b.employees;
        const msg = `Your trip on route "${route.route_name}" (${route.estimated_time}) on ${today} was auto-cancelled. Driver did not start in time. Please rebook.`;
        if (emp?.email) {
          sendEmail(
            emp.email,
            `❌ Transport Booking Auto-Cancelled — ${today}`,
            `Dear ${emp.name},\n\n${msg}\n\nPlease rebook via the employee portal.\n\nRevexy Transport Team`,
            `<h2>Booking Auto-Cancelled</h2>
            <p>Dear <strong>${emp.name}</strong>,</p><p>${msg}</p>
            <div style="background:#f1f5f9;padding:15px;border-radius:8px;margin:20px 0">
              <p><strong>Route:</strong> ${route.route_name}</p>
              <p><strong>Time:</strong> ${route.estimated_time}</p>
              <p><strong>Date:</strong> ${today}</p>
            </div>
            <p>Please rebook via the employee portal or contact HR.</p>`
          ).catch(() => {});
        }
        if (emp?.mobile) sendSMS(emp.mobile, `Revexy: ${msg}`).catch(() => {});
      }

      console.log(`[AutoCancel] ✅ Cancelled ${bookingIds.length} booking(s) for route "${route.route_name}" and notified employees.`);
    }

    // 5. Catch any CONFIRMED bookings for today that don't have a route_id
    // If it's after 10 PM today, cancel all remaining CONFIRMED bookings
    if (now.getHours() >= 22) {
      const { data: stale, error: staleErr } = await supabase
        .from('bookings')
        .select('id, employee_id')
        .eq('booking_date', today)
        .eq('status', 'CONFIRMED')
        .is('route_id', null);
      
      if (!staleErr && stale && stale.length > 0) {
        console.log(`[AutoCancel] End of day cleanup: Cancelling ${stale.length} un-routed bookings.`);
        const ids = stale.map(s => s.id);
        await supabase.from('bookings').update({ status: 'CANCELLED (Auto)' }).in('id', ids);
      }
    }
  } catch (err) {
    console.error('[AutoCancel] Job error:', err.message);
  }
}

/** Start the job — runs immediately on boot, then every 5 minutes */
function startAutoCancelJob() {
  console.log('[AutoCancel] Scheduled job started (runs every 5 minutes).');
  runAutoCancelJob(); // run once on startup
  setInterval(runAutoCancelJob, 5 * 60 * 1000);
}

module.exports = { startAutoCancelJob, runAutoCancelJob };
