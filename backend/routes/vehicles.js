const express = require('express');
const router = express.Router();
const supabase = require('../db');

// Get all vehicles with occupancy, driver and route info for a specific date
router.get('/', async (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  try {
    // We select vehicles and join drivers (who have assigned_vehicle = vehicles.id) 
    // and routes (who have vehicle_id = vehicles.id)
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select(`
        *,
        drivers!drivers_assigned_vehicle_fkey (
          id, name, driver_id, mobile, status
        ),
        routes (
          id, route_name, estimated_time
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Optimize: Fetch all relevant bookings for the date in ONE query
    const { data: allBookings, error: bError } = await supabase
      .from('bookings')
      .select('*, routes(estimated_time)')
      .eq('booking_date', targetDate)
      .in('status', ['CONFIRMED', 'ON ROUTE']);
      
    if (bError) throw bError;

    const now = new Date();
    
    const enriched = vehicles.map(v => {
      // Filter bookings for this vehicle
      const vehicleBookings = allBookings.filter(b => b.vehicle_id === v.id);

      // Filter out stale bookings (if confirmed but time passed by > 1 hour)
      const activeBookings = vehicleBookings.filter(b => {
        if (b.status === 'ON ROUTE') return true;
        
        let timeRange = b.routes?.estimated_time;
        if (!timeRange) {
          const match = b.pickup_point?.match(/^\[(.*?)\]/);
          timeRange = match ? match[1] : null;
        }

        if (!timeRange) return true; // Keep if no time slot info at all
        
        try {
          // Parse end time (e.g., "6:00 AM - 7:00 AM" -> "7:00 AM")
          const parts = timeRange.split('-');
          const endStr = (parts[1] || parts[0]).trim();
          const [time, meridiem] = endStr.split(' ');
          let [hours, minutes] = time.split(':').map(Number);
          if (meridiem?.toUpperCase() === 'PM' && hours !== 12) hours += 12;
          if (meridiem?.toUpperCase() === 'AM' && hours === 12) hours = 0;
          
          const [year, month, day] = targetDate.split('-').map(Number);
          const endTime = new Date(year, month - 1, day, hours, minutes, 0);
          // If more than 1 hour has passed since end time, don't count as occupied in current live view
          return (now.getTime() - endTime.getTime()) < (60 * 60 * 1000);
        } catch (e) {
          return true; // Fallback to keeping it if parsing fails
        }
      });

      // Group by time slot so we don't aggregate passengers from different trips on the same day
      const slotCounts = {};
      activeBookings.forEach(b => {
        let timeRange = b.routes?.estimated_time;
        if (!timeRange) {
          const match = b.pickup_point?.match(/^\[(.*?)\]/);
          timeRange = match ? match[1] : 'Flexible';
        }
        if (!slotCounts[timeRange]) slotCounts[timeRange] = 0;
        slotCounts[timeRange]++;
      });
      const currentOccupancy = activeBookings.length > 0 ? Math.max(...Object.values(slotCounts)) : 0;
      
      // Flatten the driver and route if they exist
      const driver = v.drivers && v.drivers.length > 0 ? v.drivers[0] : null;
      const route = v.routes && v.routes.length > 0 ? v.routes[0] : null;
      
      return { 
        ...v, 
        occupied: currentOccupancy,
        assigned_driver: driver,
        active_route: route
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error('[Vehicles GET] Error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});



// Create a vehicle
router.post('/', async (req, res) => {
  const { vehicle_name, vehicle_number, capacity, branch_id, insurance_expiry, maintenance_km, kilometers_driven, vehicle_status } = req.body;
  try {
    const { data, error } = await supabase.from('vehicles').insert([{
      vehicle_name, 
      vehicle_number, 
      capacity: parseInt(capacity) || 0, 
      branch_id: branch_id || null, 
      insurance_expiry: insurance_expiry || null, 
      maintenance_km: parseInt(maintenance_km) || 50000, 
      kilometers_driven: kilometers_driven || 0, 
      vehicle_status: vehicle_status || 'ACTIVE'
    }]).select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create vehicle', details: error.message });
  }
});

// Update a vehicle
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { vehicle_name, vehicle_number, capacity, branch_id, insurance_expiry, maintenance_km, kilometers_driven, vehicle_status } = req.body;
  try {
    const { data, error } = await supabase.from('vehicles').update({
      vehicle_name, 
      vehicle_number, 
      capacity: parseInt(capacity) || 0, 
      branch_id: branch_id || null, 
      insurance_expiry: insurance_expiry || null, 
      maintenance_km: parseInt(maintenance_km) || 50000, 
      kilometers_driven: kilometers_driven || 0, 
      vehicle_status: vehicle_status || 'ACTIVE'
    }).eq('id', id).select();

    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(data[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update vehicle', details: error.message });
  }
});

// Delete a vehicle
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase.from('vehicles').delete().eq('id', id).select();
    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete vehicle', details: error.message });
  }
});

module.exports = router;
