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


// Create a route
router.post('/', async (req, res) => {
  const { route_name, pickup_points, destination, estimated_time, branch_id, vehicle_id } = req.body;
  try {
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
