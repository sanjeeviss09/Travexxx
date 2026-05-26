const express = require('express');
const router = express.Router();
const supabase = require('../db');
const { sendEmail } = require('../utils/mailer');

// GET all gate passes (optionally filtered by employee_id, vehicle_no, or vehicle_id)
router.get('/', async (req, res) => {
  const { employee_id, vehicle_no, vehicle_id } = req.query;
  try {
    let query = supabase
      .from('gate_passes')
      .select(`
        *,
        gate_pass_materials(*),
        employees(name, department, employee_id, mobile),
        bookings(id, vehicle_id, booking_date, pickup_point, destination)
      `);
    
    if (employee_id) {
      query = query.eq('employee_id', employee_id);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;

    let filteredData = data || [];

    if (vehicle_no || vehicle_id) {
      filteredData = filteredData.filter(gp => {
        // Only show APPROVED gate passes to drivers
        if (gp.status !== 'APPROVED') return false;

        // Match by vehicle number
        if (vehicle_no && gp.mode_of_transfer_vehicle_no && 
            gp.mode_of_transfer_vehicle_no.toLowerCase().trim() === vehicle_no.toLowerCase().trim()) {
          return true;
        }

        // Match by booking's vehicle_id
        if (vehicle_id && gp.bookings && gp.bookings.vehicle_id === vehicle_id) {
          return true;
        }

        return false;
      });
    }
    
    res.json(filteredData);
  } catch (err) {
    console.error('Fetch Gate Passes Error:', err);
    res.status(500).json({ error: 'Failed to fetch gate passes' });
  }
});

// PATCH /:id/status (Accept / Deny)
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'APPROVED' or 'DENIED'

  try {
    // 1. Update the status
    const { data: updated, error } = await supabase
      .from('gate_passes')
      .update({ status })
      .eq('id', id)
      .select('*, employees(email, name)')
      .single();

    if (error) throw error;

    // 2. Send notification to the employee
    if (updated && updated.employees) {
      const emp = updated.employees;
      
      // In-app notification
      await supabase.from('notifications').insert([{
        user_id: updated.employee_id,
        message: `Your Gate Pass (${updated.gate_pass_number}) has been ${status}.`,
        read_status: false
      }]);

      // Email notification
      if (emp.email) {
        let msg = `Your Gate Pass request (${updated.gate_pass_number}) has been ${status} by the Admin.`;
        sendEmail(
          emp.email,
          `Gate Pass ${status} - ${updated.gate_pass_number}`,
          `Hello ${emp.name},\n\n${msg}\n\nTeam Revexy`
        ).catch(e => console.error('[Mailer] Gate Pass update email error:', e));
      }
    }

    res.json({ message: 'Gate pass updated successfully', data: updated });
  } catch (err) {
    console.error('Update Gate Pass Status Error:', err);
    res.status(500).json({ error: 'Failed to update gate pass status' });
  }
});

// POST / (Create a new Gate Pass)
router.post('/', async (req, res) => {
  const { 
    booking_id, employee_id, invoice_dc_no, invoice_date, mode_of_transfer_vehicle_no, 
    purpose, dispatched_to, material_type, expected_return_date, materials 
  } = req.body;

  try {
    // Generate Gate Pass Number: GP-YYYY-XXXXX
    const year = new Date().getFullYear();
    const { count, error: countErr } = await supabase
      .from('gate_passes')
      .select('*', { count: 'exact', head: true })
      .like('gate_pass_number', `GP-${year}-%`);
    
    if (countErr) throw countErr;
    
    const nextSeq = String((count || 0) + 1).padStart(5, '0');
    const gate_pass_number = `GP-${year}-${nextSeq}`;

    // 1. Insert Gate Pass
    const { data: gpData, error: gpErr } = await supabase
      .from('gate_passes')
      .insert([{
        gate_pass_number,
        booking_id,
        employee_id,
        invoice_dc_no,
        invoice_date: invoice_date || null,
        mode_of_transfer_vehicle_no,
        purpose,
        dispatched_to,
        material_type,
        expected_return_date: expected_return_date || null,
        status: 'PENDING'
      }])
      .select()
      .single();

    if (gpErr) throw gpErr;

    // 2. Insert Materials
    if (materials && materials.length > 0) {
      const materialsToInsert = materials.map((m, index) => ({
        gate_pass_id: gpData.id,
        s_no: index + 1,
        description: m.description,
        quantity: m.quantity,
        uom: m.uom,
        remarks: m.remarks
      }));

      const { error: matErr } = await supabase
        .from('gate_pass_materials')
        .insert(materialsToInsert);

      if (matErr) throw matErr;
    }

    res.json({ message: 'Gate Pass created successfully', data: gpData });
  } catch (err) {
    console.error('Create Gate Pass Error:', err);
    res.status(500).json({ error: 'Failed to create gate pass' });
  }
});

module.exports = router;
