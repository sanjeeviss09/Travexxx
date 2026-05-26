const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const supabase = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'revexy_super_secret';

// Employee activation
router.post('/activate', async (req, res) => {
  const { employee_id, password } = req.body;
  try {
    const { data: employee, error } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_id', employee_id)
      .single();

    if (error || !employee) {
      return res.status(400).json({ error: 'Employee not found or not imported by HR' });
    }

    if (employee.account_status === 'ACTIVE') {
      return res.status(400).json({ error: 'Account already active' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const { error: updateError } = await supabase
      .from('employees')
      .update({ password_hash, account_status: 'ACTIVE' })
      .eq('employee_id', employee_id);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to activate account' });
    }

    res.status(200).json({ message: 'Account activated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Employee Login
router.post('/login', async (req, res) => {
  const { employee_id, password } = req.body;
  try {
    const { data: employee, error } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_id', employee_id)
      .single();

    if (error || !employee) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    if (employee.account_status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Account not active. Please activate first.' });
    }

    const isMatch = await bcrypt.compare(password, employee.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: employee.id, role: employee.role, employee_id: employee.employee_id }, JWT_SECRET, { expiresIn: '1d' });
    
    // Don't send hash back
    delete employee.password_hash;
    
    res.json({ token, user: employee });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Driver Login
router.post('/driver-login', async (req, res) => {
  const { driver_id, pin_hash } = req.body;
  try {
    const { data: driver, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('driver_id', driver_id)
      .single();

    if (error || !driver) {
      return res.status(400).json({ error: 'Invalid Driver ID' });
    }

    if (driver.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Driver account is inactive' });
    }

    // Direct comparison for PIN as per requirements
    if (driver.pin_hash !== pin_hash) {
      return res.status(400).json({ error: 'Invalid PIN' });
    }

    const token = jwt.sign({ id: driver.id, role: 'DRIVER', driver_id: driver.driver_id }, JWT_SECRET, { expiresIn: '1d' });
    
    res.json({ token, driver });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Forgot Password (Reset to default)
router.post('/forgot-password', async (req, res) => {
  const { employee_id } = req.body;
  try {
    const { data: employee, error } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_id', employee_id)
      .single();

    if (error || !employee) {
      return res.status(400).json({ error: 'Employee not found' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash('Revexy@123', salt);

    const { error: updateError } = await supabase
      .from('employees')
      .update({ password_hash })
      .eq('employee_id', employee_id);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to reset password' });
    }

    res.status(200).json({ message: 'Password has been reset to default: Revexy@123' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
