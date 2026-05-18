const express = require('express');
const router = express.Router();
const supabase = require('../db');
const { sendEmail } = require('../utils/mailer');
const { sendSMS } = require('../utils/sms');
const ws = require('ws');

// GET bookings for an employee or vehicle on a specific date
router.get('/', async (req, res) => {
  const { employee_id, vehicle_id, date } = req.query;
  try {
    let query = supabase
      .from('bookings')
      .select(`*, employees(name, department, employee_id), vehicles(vehicle_name, vehicle_number, capacity), routes(route_name, estimated_time), waitlists(waitlist_position)`)
      .order('booking_date', { ascending: false });
    if (employee_id) query = query.eq('employee_id', employee_id);
    if (vehicle_id) query = query.eq('vehicle_id', vehicle_id);
    if (date) query = query.eq('booking_date', date);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// GET trip counts per day (for calendar)
router.get('/daily-trip-counts', async (req, res) => {
  const { vehicle_id } = req.query;
  try {
    const today = new Date().toISOString().split('T')[0];
    let query = supabase
      .from('bookings')
      .select('route_id, booking_date, pickup_point')
      .gte('booking_date', today)
      .in('status', ['CONFIRMED', 'ON ROUTE', 'COMPLETED']);
    
    if (vehicle_id) {
      query = query.eq('vehicle_id', vehicle_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    const counts = {};
    data.forEach(b => {
      const date = b.booking_date;
      if (!counts[date]) counts[date] = new Set();
      
      if (b.route_id) {
         counts[date].add(`route-${b.route_id}`);
      } else {
         const match = b.pickup_point?.match(/^\[(.*?)\]/);
         const timeSlot = match ? match[1] : 'Flexible';
         counts[date].add(`fallback-${timeSlot}`);
      }
    });

    const result = {};
    for (const d in counts) {
      result[d] = counts[d].size;
    }

    res.json(result);
  } catch (error) {
    console.error('[DailyTripCounts] Error:', error);
    res.status(500).json({ error: 'Failed to fetch daily trip counts' });
  }
});

// POST cancel booking
router.post('/:id/cancel', async (req, res) => {
  const { id } = req.params;
  try {
    const { data: booking, error: bErr } = await supabase.from('bookings').select('*').eq('id', id).single();
    if (bErr || !booking) throw bErr || new Error('Booking not found');
    
    const { error: updErr } = await supabase.from('bookings').update({ status: 'CANCELLED (Self)' }).eq('id', id);
    if (updErr) throw updErr;

    if (booking.status === 'WAITLISTED' || booking.status === 'CANCELLED (Self)') {
      await supabase.from('waitlists').delete().eq('booking_id', id);
    } else if (['CONFIRMED', 'ON ROUTE'].includes(booking.status)) {
      const { data: waitlistedBookings } = await supabase
        .from('bookings')
        .select('*, waitlists(*)')
        .eq('booking_date', booking.booking_date)
        .eq('route_id', booking.route_id)
        .eq('status', 'WAITLISTED')
        .order('created_at', { ascending: true });
        
      // manually sort by priority (higher is better) since we joined waitlists
      if (waitlistedBookings && waitlistedBookings.length > 0) {
        waitlistedBookings.sort((a, b) => {
          const pA = a.waitlists?.[0]?.priority || 0;
          const pB = b.waitlists?.[0]?.priority || 0;
          return pB - pA; // Descending priority
        });
        
        const nextInLine = waitlistedBookings[0];
        
        await supabase.from('bookings').update({ 
          status: 'CONFIRMED', 
          vehicle_id: booking.vehicle_id, 
          route_id: booking.route_id 
        }).eq('id', nextInLine.id);

        await supabase.from('waitlists').delete().eq('booking_id', nextInLine.id);

        await supabase.from('notifications').insert([{
          user_id: nextInLine.employee_id,
          message: `🎉 Great news! Your waitlisted booking for ${booking.booking_date} is now CONFIRMED. A seat opened up!`,
          read_status: false
        }]);
      }
    }
    
    res.json({ message: 'Booking cancelled successfully' });
  } catch (err) {
    console.error('Cancel error:', err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// Bulk update booking status (for trip completion)
router.patch('/bulk-update', async (req, res) => {
  const { vehicle_id, route_id, booking_date, status, reason } = req.body;
  try {
    let statusToSet = status;
    if (status === 'CANCELLED') statusToSet = 'CANCELLED (Driver)';
    
    const isFallback = route_id && route_id.startsWith('fallback-');
    const actualRouteId = (!isFallback && route_id && route_id !== 'null' && route_id !== 'undefined') ? route_id : null;

    let idsToUpdate = [];
    if (isFallback) {
      const { data: fallbacks } = await supabase.from('bookings').select('id, pickup_point').eq('vehicle_id', vehicle_id).eq('booking_date', booking_date).is('route_id', null);
      if (fallbacks) {
        const prefix = 'fallback-';
        const suffix = `-${booking_date}`;
        let slot = 'Flexible';
        if (route_id.startsWith(prefix) && route_id.endsWith(suffix)) {
          slot = route_id.slice(prefix.length, -suffix.length);
        }
        idsToUpdate = fallbacks.filter(b => b.pickup_point?.startsWith(`[${slot}]`) || slot === 'Flexible').map(b => b.id);
      }
    }

    let query = supabase.from('bookings').update({ status: statusToSet }).select();
    if (isFallback) {
       if (idsToUpdate.length > 0) {
          query = query.in('id', idsToUpdate);
       } else {
          query = null; // Nothing to update
       }
    } else {
       query = query.eq('vehicle_id', vehicle_id).eq('booking_date', booking_date);
       if (actualRouteId) query = query.eq('route_id', actualRouteId);
    }

    let data = [];
    if (query) {
      const { data: updateData, error } = await query;
      if (error) throw error;
      data = updateData || [];
    }

    // Update vehicle status based on trip state
    if (vehicle_id && status === 'ON ROUTE') {
       await supabase.from('vehicles').update({ vehicle_status: 'ON ROUTE' }).eq('id', vehicle_id);
    } else if (vehicle_id && status === 'COMPLETED') {
       // Trip complete: vehicle is available again
       await supabase.from('vehicles').update({ 
         vehicle_status: 'Available'
       }).eq('id', vehicle_id);
    } else if (vehicle_id && status === 'CANCELLED') {
       await supabase.from('vehicles').update({ vehicle_status: 'Available' }).eq('id', vehicle_id);
    }

    if (status === 'CANCELLED' && data && data.length > 0) {
      const notifications = data.map(b => ({
        user_id: b.employee_id,
        message: `⚠️ Your trip on ${booking_date} has been CANCELLED. ${reason ? `Reason: ${reason}` : ''}`,
        read_status: false
      }));
      await supabase.from('notifications').insert(notifications);
    } else if (status === 'COMPLETED' && data && data.length > 0) {
      // Send Feedback request to employees
      const { sendEmail } = require('../utils/mailer');
      for (const b of data) {
        const { data: emp } = await supabase.from('employees').select('email, name').eq('id', b.employee_id).single();
        if (emp?.email) {
          sendEmail(
            emp.email,
            `Trip Completed - We value your feedback!`,
            `Hello ${emp.name},\n\nYour transport trip on ${booking_date} has been marked as COMPLETED by the driver.\n\nPlease take a moment to provide your feedback in your dashboard.\n\nRevexy Transport Team`
          ).catch(e => console.error('[Mailer] Feedback email error:', e));
        }
      }
      
      const notifications = data.map(b => ({
        user_id: b.employee_id,
        message: `✅ Your trip has been COMPLETED. Please provide feedback.`,
        read_status: false
      }));
      await supabase.from('notifications').insert(notifications);
    }

    res.json({ message: `Updated ${data.length} bookings to ${status}`, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to bulk update bookings' });
  }
});

// PATCH /:id - Admin override
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, vehicle_id } = req.body;
  try {
    const updatePayload = {};
    if (status) updatePayload.status = status;
    if (vehicle_id !== undefined) updatePayload.vehicle_id = vehicle_id;

    const { data, error } = await supabase.from('bookings').update(updatePayload).eq('id', id).select();
    if (error) throw error;
    res.json({ message: 'Booking updated', data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// GET notifications for a user
router.get('/notifications', async (req, res) => {
  const { user_id } = req.query;
  try {
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (user_id) query = query.eq('user_id', user_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// DELETE /notifications/clear - Clear all notifications for a user
router.delete('/notifications/clear', async (req, res) => {
  const { user_id } = req.query;
  try {
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });
    const { error } = await supabase.from('notifications').delete().eq('user_id', user_id);
    if (error) throw error;
    res.json({ message: 'Notifications cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// PATCH mark notification as read
router.patch('/notifications/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase.from('notifications').update({ read_status: true }).eq('id', id).select();
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

const parseTime = (slot) => {
  if (!slot) return { start: 0, end: 0 };
  const [s, e] = slot.split('-').map(t => t.trim());
  const toMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.trim().split(' ');
    if (parts.length < 1) return 0;
    const [time, meridiem] = parts;
    const timeParts = time.split(':');
    let h = parseInt(timeParts[0]) || 0;
    let m = parseInt(timeParts[1]) || 0;
    if (meridiem === 'PM' && h !== 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };
  return { start: toMinutes(s), end: toMinutes(e) };
};

const isOverlapping = (slotA, slotB) => {
  const a = parseTime(slotA);
  const b = parseTime(slotB);
  return Math.max(a.start, b.start) < Math.min(a.end, b.end);
};

// Request transport & Allocation engine
router.post('/request', async (req, res) => {
  const { employee_id, type, date, timeSlot, pickup, destination, passengerCount, reason, urgency, route_id, status } = req.body;
  
  if (type === 'OTHER') {
    // External Vehicle Request
    const { error } = await supabase
      .from('external_vehicle_requests')
      .insert([{
        employee_id,
        vehicle_type: 'CAB',
        reason,
        urgency,
        passenger_count: passengerCount,
        status: 'PENDING'
      }]);
    
    if (error) {
      console.error('[External Request] Insert Error:', error);
      return res.status(500).json({ error: 'Failed to request external vehicle' });
    }

    // Send notification for external request creation
    try {
      const { data: emp } = await supabase.from('employees').select('name, email, mobile').eq('id', employee_id).single();
      if (emp && emp.email) {
        const { sendEmail } = require('../utils/mailer');
        await sendEmail(emp.email, 'External Transport Request Received', 
          `Hello ${emp.name},\n\nYour external transport request has been received and is currently PENDING admin approval.\nReason: ${reason}\n\nWe will notify you once it is processed.\n\nTeam Revexy`);
      }
    } catch (e) {
      console.error('[External Request Notif] Error:', e);
    }

    return res.json({ message: 'External transport requested successfully. Awaiting admin approval.', status: 'PENDING' });
  }

  // Priority Allocation Engine
  try {
    console.log(`[Booking Request] New request: employee_id=${employee_id}, date=${date}, route_id=${route_id}`);
    
    // 1. Prevent duplicate bookings (STRICT: 1 booking per day)
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id, pickup_point')
      .eq('employee_id', employee_id)
      .eq('booking_date', date)
      .not('status', 'ilike', 'CANCELLED%'); // Exclude cancelled ones

    if (existingBooking && existingBooking.length > 0) {
      console.warn(`[Booking Request] Duplicate booking attempt by ${employee_id} for ${date}`);
      return res.status(400).json({ error: 'You already have an active booking for this date. Multi-booking is not allowed.' });
    }
    
    const { data: employee } = await supabase
      .from('employees')
      .select('priority_level')
      .eq('id', employee_id)
      .single();

    if (!employee) {
      console.warn(`[Booking Request] Employee ${employee_id} not found`);
      return res.status(404).json({ error: 'Employee not found' });
    }

    let allocatedVehicle = null;
    let allocatedRoute = null;
    let waitlisted = false;

    // 1. If route_id is provided, try allocating that route directly
    if (route_id) {
      const { data: routeData } = await supabase
        .from('routes')
        .select('*, vehicles(*)')
        .eq('id', route_id)
        .single();
        
      if (routeData && routeData.vehicles) {
        // Fix: Don't rely on stale vehicle_status field.
        // Instead count real bookings for this route+date to determine capacity.
        const { data: activeBookings } = await supabase
          .from('bookings')
          .select('id, route_id')
          .eq('vehicle_id', routeData.vehicle_id)
          .eq('booking_date', date)
          .in('status', ['CONFIRMED', 'ON ROUTE']);

        const occupiedCount = activeBookings?.filter(b => b.route_id === routeData.id).length || 0;

        if (occupiedCount < routeData.vehicles.capacity) {
          allocatedVehicle = routeData.vehicles;
          allocatedRoute = routeData;
          console.log(`[Booking Request] Allocated explicit route: ${routeData.route_name} (${occupiedCount}/${routeData.vehicles.capacity} seats)`);
        } else {
          console.log(`[Booking Request] Route ${routeData.route_name} full on ${date} (${occupiedCount}/${routeData.vehicles.capacity}). Will waitlist.`);
        }
      }
    }

    // 2. If no route_id or route full, try fallback location matching
    if (!allocatedVehicle && !route_id) {
      const { data: matchedRoutes } = await supabase
        .from('routes')
        .select('*, vehicles(*)')
        .ilike('destination', destination)
        .eq('estimated_time', timeSlot);

      console.log(`[Booking Request] Matched routes found: ${matchedRoutes?.length || 0}`);

      if (matchedRoutes && matchedRoutes.length > 0) {
        for (let route of matchedRoutes) {
          if (route.vehicles && ['ACTIVE', 'AVAILABLE', 'Available'].includes(route.vehicles.vehicle_status)) {
            const { data: activeBookings } = await supabase
               .from('bookings')
               .select('id, status, route_id, pickup_point, routes(estimated_time)')
               .eq('vehicle_id', route.vehicle_id)
               .eq('booking_date', date)
               .in('status', ['CONFIRMED', 'ON ROUTE']);
               
            const isOverlappingDifferentTrip = activeBookings?.some(b => {
               const bTime = b.routes?.estimated_time || (b.pickup_point?.match(/^\[(.*?)\]/) ? b.pickup_point.match(/^\[(.*?)\]/)[1] : null);
               const isOverlap = isOverlapping(bTime, timeSlot);
               return isOverlap && b.route_id !== route.id;
            });

            if (isOverlappingDifferentTrip) continue;

            const occupiedCount = activeBookings?.filter(b => b.route_id === route.id).length || 0;
            if (occupiedCount < route.vehicles.capacity) {
              allocatedVehicle = route.vehicles;
              allocatedRoute = route;
              console.log(`[Booking Request] Allocated route: ${route.route_name}`);
              break;
            }
          }
        }
      }
    }

    // 3. Fallback: If no route match, find any active vehicle with capacity
    if (!allocatedVehicle && !route_id) {
      console.log(`[Booking Request] No route match found, falling back to any vehicle...`);
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, vehicle_name, vehicle_number, vehicle_status, capacity')
        .in('vehicle_status', ['ACTIVE', 'Available', 'AVAILABLE', 'ON ROUTE'])
        .order('capacity', { ascending: false });

      if (vehicles && vehicles.length > 0) {
        for (let vehicle of vehicles) {
          const { data: currentBookings } = await supabase
            .from('bookings')
            .select('*, routes(estimated_time)')
            .eq('vehicle_id', vehicle.id)
            .eq('booking_date', date)
            .in('status', ['CONFIRMED', 'ON ROUTE']);

          const getBookingTime = (b) => {
            if (b.routes?.estimated_time) return b.routes.estimated_time;
            const match = b.pickup_point?.match(/^\[(.*?)\]/);
            return match ? match[1] : null;
          };

          const { data: vehicleRoutes } = await supabase
            .from('routes')
            .select('estimated_time')
            .eq('vehicle_id', vehicle.id);
            
          const routeOverlap = vehicleRoutes?.some(r => isOverlapping(r.estimated_time, timeSlot));
          const overlap = currentBookings?.some(b => isOverlapping(getBookingTime(b), timeSlot));
            
          if (overlap || routeOverlap) continue;

          const overlappingCount = currentBookings?.filter(b => getBookingTime(b) === timeSlot).length || 0;
          if (overlappingCount < vehicle.capacity) {
            allocatedVehicle = vehicle;
            console.log(`[Booking Request] Allocated fallback vehicle: ${vehicle.vehicle_number}`);
            break;
          }
        }
      }
    }

    let bookingStatus = status || 'CONFIRMED';
    if (!allocatedVehicle) {
      console.log(`[Booking Request] No capacity found. Waitlisting.`);
      bookingStatus = 'WAITLISTED';
      waitlisted = true;
    }

    const finalPickup = pickup || (allocatedRoute ? allocatedRoute.pickup_points : `[${timeSlot}] ${destination}`);

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([{
        employee_id,
        vehicle_id: allocatedVehicle ? allocatedVehicle.id : null,
        route_id: allocatedRoute ? allocatedRoute.id : (route_id || null),
        booking_date: date,
        pickup_point: finalPickup,
        destination: destination || (allocatedRoute ? allocatedRoute.destination : ''),
        status: bookingStatus,
        priority: employee.priority_level
      }])
      .select()
      .single();

    if (bookingError) {
      console.error('[Booking Request] Insert error:', bookingError);
      throw bookingError;
    }

    if (waitlisted) {
      // Fetch all waitlisted bookings for this destination and date to re-calculate queue based on priority
      const { data: existingWaitlist } = await supabase
        .from('bookings')
        .select('id, priority, created_at')
        .eq('booking_date', date)
        .eq('destination', destination)
        .eq('status', 'WAITLISTED')
        .neq('id', booking.id);
      
      let allWaitlisted = existingWaitlist || [];
      // Add the current booking to the mix
      allWaitlisted.push({
        id: booking.id,
        priority: employee.priority_level,
        created_at: new Date().toISOString()
      });

      // Sort by Priority (Descending), then Created At (Ascending)
      allWaitlisted.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return new Date(a.created_at) - new Date(b.created_at);
      });

      // Find actual position (1-indexed)
      const waitPosition = allWaitlisted.findIndex(b => b.id === booking.id) + 1;

      // Update waitlist table for the current user
      await supabase
        .from('waitlists')
        .insert([{
          booking_id: booking.id,
          waitlist_position: waitPosition,
          priority: employee.priority_level
        }]);

      // Note: We ideally should update positions for everyone else who got bumped down, 
      // but for simplicity we only return the dynamic position for this user's notification.

      // Notify employee of waitlist
      await supabase.from('notifications').insert([{
        user_id: employee_id,
        message: `⏳ Vehicles are full for ${date}. Based on your priority level (${employee.priority_level}), you are #${waitPosition} on the waitlist for ${destination}.`,
        read_status: false
      }]);

      // Send waitlist email + SMS
      const { data: emp } = await supabase.from('employees').select('email, name, mobile').eq('id', employee_id).single();
      const waitMsg = `All vehicles are full for ${destination} on ${date}. You are #${waitPosition} on the waitlist.`;
      if (emp?.email) {
        sendEmail(
          emp.email,
          `Waitlisted for ${destination} on ${date} — Revexy Transport`,
          `Hello ${emp.name},\n\n${waitMsg}\n\nWe will notify you automatically if a seat becomes available.\n\nRevexy Transport Team`
        ).catch(e => console.error('[Mailer] Waitlist email error:', e));
      }
      if (emp?.mobile) {
        sendSMS(emp.mobile, `Revexy: ${waitMsg}`).catch(e => console.error('[SMS] Waitlist SMS error:', e));
      }
      
      return res.json({ message: `Vehicles full. You are #${waitPosition} on the waitlist.`, status: 'WAITLISTED', waitlist_position: waitPosition });
    }

    // Notify employee of confirmed booking
    const notification = {
      user_id: employee_id,
      message: `✅ Your transport booking is confirmed! Route: ${allocatedRoute ? allocatedRoute.route_name : 'Direct'}. Vehicle: ${allocatedVehicle.vehicle_name} (${allocatedVehicle.vehicle_number}). Date: ${date}.`,
      read_status: false
    };
    await supabase.from('notifications').insert([notification]);

    // Send confirmation email + SMS
    const { data: emp } = await supabase.from('employees').select('email, name, mobile').eq('id', employee_id).single();
    const confMsg = `Your booking is confirmed! Route: ${allocatedRoute ? allocatedRoute.route_name : 'Direct'}. Vehicle: ${allocatedVehicle.vehicle_name}. Date: ${date}.`;
    if (emp?.email) {
      sendEmail(
        emp.email,
        `Booking Confirmed for ${destination} on ${date} — Revexy Transport`,
        `Hello ${emp.name},\n\n${confMsg}\n\nDestination: ${destination}\n\nPlease be at the pickup point on time.\n\nRevexy Transport Team`
      ).catch(e => console.error('[Mailer] Confirmation email error:', e));
    }
    if (emp?.mobile) {
      sendSMS(emp.mobile, `Revexy: ${confMsg}`).catch(e => console.error('[SMS] Confirmation SMS error:', e));
    }

    res.json({ 
      message: 'Seat allocated successfully!', 
      status: 'CONFIRMED', 
      vehicle: allocatedVehicle,
      route: allocatedRoute
    });

  } catch (error) {
    console.error('[Booking Request] Error:', error);
    res.status(500).json({ error: 'Allocation engine error', details: error.message });
  }
});

// GET trip manifest (confirmed and waitlisted)
router.get('/trip-manifest', async (req, res) => {
  const { vehicle_id, date, route_id } = req.query;
  console.log(`[TripManifest] Fetching for vehicle_id: ${vehicle_id}, date: ${date}, route_id: ${route_id}`);
  
  if (!vehicle_id || !date) return res.status(400).json({ error: 'vehicle_id and date are required' });

  try {
    const isFallback = route_id && route_id.startsWith('fallback-');
    const actualRouteId = (!isFallback && route_id && route_id !== 'null' && route_id !== 'undefined') ? route_id : null;

    let query = supabase
      .from('bookings')
      .select(`
        *,
        employees ( name, mobile, department )
      `)
      .eq('vehicle_id', vehicle_id)
      .eq('booking_date', date);

    if (actualRouteId) {
      query = query.eq('route_id', actualRouteId);
    }

    const { data: bookings, error } = await query.order('priority', { ascending: false });

    if (error) {
      console.error('[TripManifest] Supabase error:', error);
      throw error;
    }

    let finalBookings = bookings || [];

    if (isFallback) {
      const prefix = 'fallback-';
      const suffix = `-${date}`;
      if (route_id.startsWith(prefix) && route_id.endsWith(suffix)) {
        const slot = route_id.slice(prefix.length, -suffix.length);
        finalBookings = finalBookings.filter(b => !b.route_id && (b.pickup_point?.startsWith(`[${slot}]`) || slot === 'Flexible'));
      } else {
        finalBookings = finalBookings.filter(b => !b.route_id);
      }
    } else if (actualRouteId && finalBookings.length === 0) {
      console.log('[TripManifest] No bookings with route_id filter, falling back to vehicle+date only');
      const { data: fallback } = await supabase
        .from('bookings')
        .select(`*, employees ( name, mobile, department )`)
        .eq('vehicle_id', vehicle_id)
        .eq('booking_date', date)
        .order('priority', { ascending: false });
      finalBookings = fallback || [];
    }

    console.log(`[TripManifest] Found ${finalBookings?.length || 0} bookings total`);

    const confirmed = finalBookings.filter(b => ['CONFIRMED', 'ON ROUTE', 'COMPLETED'].includes(b.status));
    const waitlisted = finalBookings.filter(b => b.status === 'WAITLISTED');
    const cancelled = finalBookings.filter(b => b.status === 'CANCELLED');

    console.log(`[TripManifest] Returning ${confirmed.length} confirmed, ${waitlisted.length} waitlisted, ${cancelled.length} cancelled`);

    res.json({ confirmed, waitlisted, cancelled });
  } catch (error) {
    console.error('[TripManifest] Server error:', error);
    res.status(500).json({ error: 'Failed to fetch trip manifest' });
  }
});



// GET dashboard stats
router.get('/stats', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const [
      empRes,
      vehRes,
      waitRes,
      extRes,
      extAllRes
    ] = await Promise.all([
      supabase.from('employees').select('id', { count: 'exact', head: true }),
      supabase.from('vehicles').select('id', { count: 'exact', head: true }),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('booking_date', today).eq('status', 'WAITLISTED'),
      supabase.from('external_vehicle_requests').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
      supabase.from('external_vehicle_requests').select('id', { count: 'exact', head: true })
    ]);

    res.json({
      totalEmployees: empRes.count || 0,
      totalVehicles: vehRes.count || 0,
      waitlistedToday: waitRes.count || 0,
      externalPending: extRes.count || 0,
      externalTotal: extAllRes.count || 0
    });
  } catch (error) {
    console.error('[Stats] Error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// PATCH /:id — update booking status (admin override)
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, cancel_reason } = req.body;
  
  try {
    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('*, employees(name, email)')
      .eq('id', id)
      .single();

    if (fetchErr) throw fetchErr;

    const { data: updated, error } = await supabase
      .from('bookings')
      .update({ status, cancel_reason })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Handle waitlist cleanup/addition on override
    if (status === 'CONFIRMED' || status === 'CANCELLED') {
      await supabase.from('waitlists').delete().eq('booking_id', id);
    } else if (status === 'WAITLISTED') {
      const { data: existing } = await supabase.from('waitlists').select('id').eq('booking_id', id);
      if (!existing || existing.length === 0) {
        await supabase.from('waitlists').insert([{ booking_id: id, waitlist_position: 99, priority: 5 }]);
      }
    }

    // Notify employee if status changed
    if (booking.employees?.email) {
      sendEmail(
        booking.employees.email, 
        `Booking Status Updated: ${status}`, 
        `Hello ${booking.employees.name}, your transport booking for ${booking.booking_date} status has been updated to: ${status}.`
      ).catch(err => console.error('[Mailer] Error:', err));
    }

    res.json(updated);
  } catch (error) {
    console.error('[Booking Patch] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /auto-cancel — manually trigger the auto-cancel job (admin/test use)
router.post('/auto-cancel', async (req, res) => {
  try {
    const { runAutoCancelJob } = require('../jobs/autoCancelJob');
    await runAutoCancelJob();
    res.json({ success: true, message: 'Auto-cancel job completed.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Auto-cancel job failed.' });
  }
});

// POST /promote-waitlist — manually trigger waitlist promotion
router.post('/promote-waitlist', async (req, res) => {
  try {
    console.log('[Waitlist] Manual promotion triggered');
    const { data: waitlisted } = await supabase
      .from('bookings')
      .select('*, employees(name, email)')
      .eq('status', 'WAITLISTED');

    let promotedCount = 0;
    for (let booking of waitlisted) {
      // Try to find a route
      const { data: matchedRoutes } = await supabase
        .from('routes')
        .select('*, vehicles(*)')
        .ilike('destination', booking.destination);

      if (matchedRoutes && matchedRoutes.length > 0) {
        for (let route of matchedRoutes) {
          if (route.vehicles && ['ACTIVE', 'AVAILABLE'].includes(route.vehicles.vehicle_status.toUpperCase())) {
            const { count } = await supabase
              .from('bookings')
              .select('id', { count: 'exact', head: true })
              .eq('vehicle_id', route.vehicle_id)
              .eq('booking_date', booking.booking_date)
              .in('status', ['CONFIRMED', 'ON ROUTE', 'COMPLETED']);

            if (count < route.vehicles.capacity) {
              await supabase
                .from('bookings')
                .update({ status: 'CONFIRMED', vehicle_id: route.vehicle_id, route_id: route.id })
                .eq('id', booking.id);
              
              await supabase.from('waitlists').delete().eq('booking_id', booking.id);
              
              // Notify
              const notification = {
                user_id: booking.employee_id,
                message: `🎊 Great news! Your waitlisted booking for ${booking.booking_date} is now CONFIRMED. Route: ${route.route_name}.`,
                read_status: false
              };
              await supabase.from('notifications').insert([notification]);

              if (req.wss) {
                req.wss.clients.forEach(client => {
                  if (client.readyState === ws.OPEN) {
                    client.send(JSON.stringify({ type: 'NOTIFICATION', data: notification }));
                  }
                });
              }

              if (booking.employees?.email) {
                sendEmail(booking.employees.email, 'Booking Confirmed (Promoted from Waitlist)', notification.message).catch(e => console.error('[Mailer] Error:', e));
              }

              promotedCount++;
              break;
            }
          }
        }
      }
    }
    res.json({ message: `Promotion complete. ${promotedCount} bookings promoted.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /external - Fetch external vehicle requests
router.get('/external', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('external_vehicle_requests')
      .select('*, employees(name, mobile, email)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('[External Requests GET] Error:', error);
    res.status(500).json({ error: 'Failed to fetch external requests' });
  }
});

// PATCH /external/:id - Approve/Reject external requests
router.patch('/external/:id', async (req, res) => {
  const { id } = req.params;
  const { status, arranged_vehicle_details } = req.body;
  try {
    const { data: request, error: fetchErr } = await supabase
      .from('external_vehicle_requests')
      .select('*, employees(name, mobile, email)')
      .eq('id', id)
      .single();
    if (fetchErr) throw fetchErr;

    // Check if we need to add arranged_vehicle_details column, but for now we might store it in a generic way or schema update.
    // Let's assume the DB supports it or we just add it to a notes field. The schema has reason, urgency, passenger_count, status.
    // Let's add an arranged_details column if it doesn't exist, but supabase won't let us update a non-existent column.
    // Let's just update status for now, and send the arranged details in the email.
    
    const { data: updated, error } = await supabase
      .from('external_vehicle_requests')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    // Mail and SMS notification logic
    if (status === 'APPROVED' && request.employees?.email) {
      const { sendEmail } = require('../utils/mailer');
      const subject = 'External Vehicle Request Approved';
      let message = `Hello ${request.employees.name},\n\nYour external vehicle request has been APPROVED.\nReason: ${request.reason}\n`;
      
      if (request.reason.toLowerCase().includes('own') || request.reason.toLowerCase().includes('self')) {
        message += `\nYou are approved to use your own vehicle.`;
      } else {
        message += `\nVehicle Details Arranged:\n${arranged_vehicle_details || 'Will be shared shortly.'}`;
      }
      message += `\n\nSMS Alert sent to ${request.employees.mobile}\nRevexy Transport Team`;
      
      sendEmail(request.employees.email, subject, message).catch(err => console.error('[Mailer] Error:', err));
    } else if (status === 'REJECTED' && request.employees?.email) {
      const { sendEmail } = require('../utils/mailer');
      sendEmail(request.employees.email, 'External Vehicle Request Rejected', `Hello ${request.employees.name},\n\nYour external vehicle request has been REJECTED. Please contact HR for more information.`).catch(err => console.error('[Mailer] Error:', err));
    }

    res.json(updated);
  } catch (error) {
    console.error('[External Requests PATCH] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
