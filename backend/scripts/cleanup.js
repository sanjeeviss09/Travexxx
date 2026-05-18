require('dotenv').config();
const supabase = require('../db');

async function run() {
  // 1. Clean stale waitlist entries first (FK dependency)
  const { error: ew } = await supabase.from('waitlists').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleaned waitlists:', ew || 'OK');

  // 2. Clean all stale bookings for today
  const { error: e1 } = await supabase.from('bookings').delete().eq('booking_date', '2026-05-15');
  console.log('Cleaned today bookings:', e1 || 'OK');

  // 3. Reset vehicle status to Available
  const { error: e2 } = await supabase.from('vehicles').update({ vehicle_status: 'Available' }).eq('id', '6c2a896d-a0a3-4a63-89f5-82ef298ecc5b');
  console.log('Reset vehicle status:', e2 || 'OK');

  // 3. Normalize route estimated_time to consistent format with leading zeros
  // Route 1: "6:00 AM - 7:00 AM" -> "06:00 AM - 07:00 AM"
  const { data: routes } = await supabase.from('routes').select('id, route_name, estimated_time');
  console.log('Current routes:', routes);

  for (const route of routes || []) {
    if (route.estimated_time && !route.estimated_time.match(/^\d{2}:/)) {
      // Normalize: add leading zero to single-digit hours
      const normalized = route.estimated_time.replace(/(\b)(\d:\d{2})/g, '0$2');
      const { error } = await supabase.from('routes').update({ estimated_time: normalized }).eq('id', route.id);
      console.log(`Normalized route "${route.route_name}": "${route.estimated_time}" -> "${normalized}"`, error || 'OK');
    }
  }

  // 4. Check if current_location column exists (it's not in schema.sql, so we skip updates to it)
  console.log('\nNOTE: vehicles.current_location does not exist in DB schema. Location tracking code needs to be removed from backend.');
  
  console.log('\nDone!');
}

run().catch(console.error);
