const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const bcrypt = require('bcrypt');
const supabase = require('../db');

const upload = multer({ dest: 'uploads/' });
const memoryUpload = multer({ storage: multer.memoryStorage() });

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

// Admin: Upload HR Excel (Legacy)
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

// Admin: Upload pre-parsed JSON array
router.post('/import-json', express.json({ limit: '10mb' }), async (req, res) => {
  const { employees } = req.body;
  
  if (!employees || !Array.isArray(employees)) {
    return res.status(400).json({ error: 'Invalid payload. Expected array of employees.' });
  }

  let imported = 0;
  let updated = 0;
  let failed = 0;

  for (const row of employees) {
    try {
      if (!row.employee_id || !row.name || !row.email) { failed++; continue; }
      const priority = row.priority || 5;

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
});

// Admin: Manual add employee
router.post('/manual', async (req, res) => {
  const { employee_id, name, email, mobile, department, designation, role } = req.body;
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
        role: role || 'EMPLOYEE',
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
  const { employee_id, name, email, mobile, department, designation, role } = req.body;

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
        role: role || 'EMPLOYEE',
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

// Admin: Reset employee password to default
router.post('/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash('Revexy@123', salt);

    const { error } = await supabase
      .from('employees')
      .update({ password_hash })
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Password reset to Revexy@123 successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: err.message || 'Failed to reset password' });
  }
});

// Employee: Upload profile picture
router.post('/:id/profile-pic', memoryUpload.single('file'), async (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
      
    const publicUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from('employees')
      .update({ profile_pic: publicUrl })
      .eq('id', id);

    if (updateError) throw updateError;

    res.json({ message: 'Profile picture updated', profile_pic: publicUrl });
  } catch (err) {
    console.error('Profile pic upload error:', err);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

module.exports = router;
