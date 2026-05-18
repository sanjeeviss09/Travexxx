// Fix WebSocket for Node.js < 22
const ws = require('ws');
global.WebSocket = ws;

const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use service role key to bypass RLS for seeding
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function seedAdmin() {
  const ADMIN_ID = 'AXX09';
  const ADMIN_PASS = 'AXX09';

  console.log('Seeding admin account...');

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(ADMIN_PASS, salt);

  const { data: existing } = await supabase
    .from('employees')
    .select('id')
    .eq('employee_id', ADMIN_ID)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('employees')
      .update({ password_hash, account_status: 'ACTIVE', role: 'ADMIN' })
      .eq('employee_id', ADMIN_ID);

    if (error) {
      console.error('Error updating admin:', error.message);
    } else {
      console.log('✅ Admin account updated! Login with AXX09 / AXX09');
    }
  } else {
    const { error } = await supabase
      .from('employees')
      .insert([{
        employee_id: ADMIN_ID,
        name: 'Revexy Admin',
        email: 'admin@revexy.com',
        mobile: '9999999999',
        department: 'Administration',
        designation: 'Director',
        priority_level: 1,
        password_hash,
        account_status: 'ACTIVE',
        role: 'ADMIN'
      }]);

    if (error) {
      console.error('❌ Error creating admin:', error.message);
    } else {
      console.log('✅ Admin account created!');
      console.log('   Employee ID: AXX09');
      console.log('   Password:    AXX09');
    }
  }

  process.exit(0);
}

seedAdmin();
