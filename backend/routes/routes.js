const express = require('express');
const router = express.Router();
const supabase = require('../db');

// Get all routes with occupancy for a specific date (defaults to today)
router.get('/', async (req, res) => {
  const { date } = req.query;
  try {
    const { data, error } = await supabase.from('routes').select(`
      *,
      vehicles ( id, vehicle_name, vehicle_number, capacity, vehicle_status, kilometers_driven )
    `).order('created_at', { ascending: false });
    if (error) throw error;

    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Optimize: Fetch all relevant bookings for this date in ONE query
    const { data: allBookings, error: bError } = await supabase
      .from('bookings')
      .select('id, vehicle_id, route_id')
      .eq('booking_date', targetDate)
      .in('status', ['CONFIRMED', 'ON ROUTE', 'COMPLETED']);
    
    if (bError) throw bError;

    const enriched = data.map(route => {
      if (!route.vehicle_id) return { ...route, occupied: 0 };
      
      // Calculate occupancy from the fetched bookings
      const count = allBookings.filter(b => 
        b.vehicle_id === route.vehicle_id && b.route_id === route.id
      ).length;
      
      return { ...route, occupied: count };
    });

    res.json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error', details: error.message });
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

// Create a route
router.post('/', async (req, res) => {
  const { route_name, pickup_points, destination, estimated_time, branch_id, vehicle_id } = req.body;
  try {
    if (vehicle_id && estimated_time) {
      const { data: existingRoutes } = await supabase
        .from('routes')
        .select('id, route_name, estimated_time')
        .eq('vehicle_id', vehicle_id);
      
      if (existingRoutes && existingRoutes.length > 0) {
        const overlap = existingRoutes.find(r => isOverlapping(r.estimated_time, estimated_time));
        if (overlap) {
          return res.status(400).json({ 
            error: `Scheduling Conflict: Vehicle is already assigned to route "${overlap.route_name}" during the overlapping slot: ${overlap.estimated_time}.` 
          });
        }
      }
    }

    const { data, error } = await supabase.from('routes').insert([{
      route_name,
      pickup_points: pickup_points || '[]',
      destination,
      estimated_time,
      branch_id: branch_id || null,
      vehicle_id: vehicle_id || null
    }]).select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create route', details: error.message });
  }
});

// Update a route
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { route_name, pickup_points, destination, estimated_time, branch_id, vehicle_id } = req.body;
  try {
    if (vehicle_id && estimated_time) {
      const { data: existingRoutes } = await supabase
        .from('routes')
        .select('id, route_name, estimated_time')
        .eq('vehicle_id', vehicle_id)
        .neq('id', id);
      
      if (existingRoutes && existingRoutes.length > 0) {
        const overlap = existingRoutes.find(r => isOverlapping(r.estimated_time, estimated_time));
        if (overlap) {
          return res.status(400).json({ 
            error: `Scheduling Conflict: Vehicle is already assigned to route "${overlap.route_name}" during the overlapping slot: ${overlap.estimated_time}.` 
          });
        }
      }
    }

    const { data, error } = await supabase.from('routes').update({
      route_name,
      pickup_points: pickup_points || '[]',
      destination,
      estimated_time,
      branch_id: branch_id || null,
      vehicle_id: vehicle_id || null
    }).eq('id', id).select();

    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ error: 'Route not found' });
    res.json(data[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update route', details: error.message });
  }
});

// Delete a route
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase.from('routes').delete().eq('id', id).select();
    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ error: 'Route not found' });
    res.json({ message: 'Route deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete route', details: error.message });
  }
});

module.exports = router;
