const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const supabase = require('../db');

const upload = multer({ dest: 'uploads/' });

// GET all employees (admin)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('id, employee_id, name, email, mobile, department, designation, priority_level, account_status, role, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Admin: Upload HR Excel
router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    let imported = 0;
    let updated = 0;
    let failed = 0;

    const priorityMap = {
      'Director': 1, 'Senior Manager': 2, 'Manager': 3,
      'Team Lead': 4, 'Employee': 5, 'Intern': 6
    };

    for (const row of data) {
      try {
        if (!row.employee_id || !row.name || !row.email) { failed++; continue; }
        const priority = priorityMap[row.designation] || 5;

        const { data: existing } = await supabase
          .from('employees')
          .select('id')
          .eq('employee_id', String(row.employee_id))
          .single();

        if (existing) {
          const { error } = await supabase
            .from('employees')
            .update({
              name: row.name,
              email: row.email,
              mobile: String(row.mobile || ''),
              department: row.department || '',
              designation: row.designation || '',
              priority_level: priority
            })
            .eq('id', existing.id);
          if (error) throw error;
          updated++;
        } else {
          const { error } = await supabase
            .from('employees')
            .insert([{
              employee_id: String(row.employee_id),
              name: row.name,
              email: row.email,
              mobile: String(row.mobile || ''),
              department: row.department || '',
              designation: row.designation || '',
              priority_level: priority,
              account_status: 'INACTIVE'
            }]);
          if (error) throw error;
          imported++;
        }
      } catch (err) {
        failed++;
      }
    }

    res.json({ message: 'Import complete', results: { imported, updated, failed } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse Excel file' });
  }
});

// Admin: Manual add employee
router.post('/manual', async (req, res) => {
  const { employee_id, name, email, mobile, department, designation } = req.body;
  if (!employee_id || !name || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const priorityMap = {
      'Director': 1, 'Senior Manager': 2, 'Manager': 3,
      'Team Lead': 4, 'Employee': 5, 'Intern': 6
    };
    const priority = priorityMap[designation] || 5;

    const { error } = await supabase
      .from('employees')
      .insert([{
        employee_id: String(employee_id),
        name,
        email,
        mobile: String(mobile || ''),
        department: department || '',
        designation: designation || '',
        priority_level: priority,
        account_status: 'INACTIVE'
      }]);

    if (error) throw error;
    res.json({ message: 'Employee added successfully' });
  } catch (err) {
    console.error('Add employee error:', err);
    res.status(500).json({ error: err.message || 'Failed to add employee' });
  }
});

// Admin: Update employee
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { employee_id, name, email, mobile, department, designation } = req.body;

  try {
    const priorityMap = {
      'Director': 1, 'Senior Manager': 2, 'Manager': 3,
      'Team Lead': 4, 'Employee': 5, 'Intern': 6
    };
    const priority = priorityMap[designation] || 5;

    const { error } = await supabase
      .from('employees')
      .update({
        employee_id: String(employee_id),
        name,
        email,
        mobile: String(mobile || ''),
        department: department || '',
        designation: designation || '',
        priority_level: priority
      })
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Employee updated successfully' });
  } catch (err) {
    console.error('Update employee error:', err);
    res.status(500).json({ error: err.message || 'Failed to update employee' });
  }
});

// Admin: Delete employee
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    console.error('Delete employee error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete employee' });
  }
});

module.exports = router;
