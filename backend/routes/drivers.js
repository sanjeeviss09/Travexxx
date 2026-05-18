const express = require('express');
const router = express.Router();
const supabase = require('../db');

// Get all drivers
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('drivers').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a driver
router.post('/', async (req, res) => {
  const { driver_id, name, mobile, age, license_number, license_expiry, ratings, pin_hash, assigned_vehicle, status, total_trips, on_time_percentage } = req.body;
  try {
    const { data, error } = await supabase.from('drivers').insert([{
      driver_id, 
      name, 
      mobile, 
      age: parseInt(age) || null, 
      license_number: license_number || null, 
      license_expiry: license_expiry || null, 
      ratings: parseFloat(ratings) || 5.0, 
      pin_hash: pin_hash || '1234', 
      assigned_vehicle: assigned_vehicle || null, 
      status: status || 'ACTIVE',
      total_trips: parseInt(total_trips) || 0,
      on_time_percentage: parseFloat(on_time_percentage) || 100.0
    }]).select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create driver', details: error.message });
  }
});

// Update a driver (partial update supported)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const body = req.body;
  
  // Build update object only from provided fields
  const updateData = {};
  if (body.driver_id !== undefined) updateData.driver_id = body.driver_id;
  if (body.name !== undefined) updateData.name = body.name;
  if (body.mobile !== undefined) updateData.mobile = body.mobile;
  if (body.age !== undefined) updateData.age = parseInt(body.age) || null;
  if (body.license_number !== undefined) updateData.license_number = body.license_number || null;
  if (body.license_expiry !== undefined) updateData.license_expiry = body.license_expiry || null;
  if (body.ratings !== undefined) updateData.ratings = parseFloat(body.ratings) || 5.0;
  if (body.pin_hash !== undefined) updateData.pin_hash = body.pin_hash;
  if (body.assigned_vehicle !== undefined) updateData.assigned_vehicle = body.assigned_vehicle || null;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.total_trips !== undefined) updateData.total_trips = parseInt(body.total_trips) || 0;
  if (body.on_time_percentage !== undefined) updateData.on_time_percentage = parseFloat(body.on_time_percentage) || 100.0;

  try {
    const { data, error } = await supabase.from('drivers').update(updateData).eq('id', id).select();
    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ error: 'Driver not found' });
    res.json(data[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update driver', details: error.message });
  }
});

// Delete a driver
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase.from('drivers').delete().eq('id', id).select();
    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ error: 'Driver not found' });
    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete driver', details: error.message });
  }
});

// Submit driver feedback
router.post('/:id/feedback', async (req, res) => {
  const { id } = req.params;
  const { rating, onTime } = req.body;
  try {
    const { data: driver, error: getError } = await supabase.from('drivers').select('*').eq('id', id).single();
    if (getError || !driver) return res.status(404).json({ error: 'Driver not found' });

    const newTotalTrips = (driver.total_trips || 0) + 1;
    
    // Calculate new on-time percentage
    const currentOnTimeCount = ((driver.on_time_percentage || 100) / 100) * (driver.total_trips || 0);
    const newOnTimeCount = currentOnTimeCount + (onTime ? 1 : 0);
    const newOnTimePercentage = (newOnTimeCount / newTotalTrips) * 100;

    // Calculate new rating
    const currentRating = parseFloat(driver.ratings || 5.0);
    const newRating = ((currentRating * (driver.total_trips || 0)) + parseFloat(rating)) / newTotalTrips;

    const { data, error } = await supabase.from('drivers').update({
      total_trips: newTotalTrips,
      on_time_percentage: newOnTimePercentage.toFixed(1),
      ratings: newRating.toFixed(1)
    }).eq('id', id).select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

module.exports = router;
