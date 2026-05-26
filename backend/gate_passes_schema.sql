-- Run this in your Supabase SQL Editor to create the Gate Pass tables

CREATE TABLE IF NOT EXISTS gate_passes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gate_pass_number TEXT UNIQUE NOT NULL,
  booking_id UUID REFERENCES bookings(id),
  employee_id UUID REFERENCES employees(id),
  invoice_dc_no TEXT,
  invoice_date DATE,
  mode_of_transfer_vehicle_no TEXT,
  purpose TEXT,
  dispatched_to TEXT,
  material_type TEXT, -- 'RETURNABLE' or 'NON-RETURNABLE'
  expected_return_date DATE,
  status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, DENIED
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gate_pass_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gate_pass_id UUID REFERENCES gate_passes(id) ON DELETE CASCADE,
  s_no INTEGER,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  uom TEXT NOT NULL,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
