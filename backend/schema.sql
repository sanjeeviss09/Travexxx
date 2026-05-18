-- schema.sql
CREATE TABLE IF NOT EXISTS branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_name TEXT NOT NULL,
  location TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  mobile TEXT NOT NULL,
  department TEXT NOT NULL,
  designation TEXT NOT NULL,
  priority_level INTEGER NOT NULL,
  branch_id UUID REFERENCES branches(id),
  password_hash TEXT,
  account_status TEXT DEFAULT 'INACTIVE',
  role TEXT DEFAULT 'EMPLOYEE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_name TEXT NOT NULL,
  vehicle_number TEXT UNIQUE NOT NULL,
  capacity INTEGER NOT NULL,
  branch_id UUID REFERENCES branches(id),
  insurance_expiry DATE,
  maintenance_km INTEGER DEFAULT 50000,
  kilometers_driven INTEGER DEFAULT 0,
  vehicle_status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_name TEXT NOT NULL,
  pickup_points JSONB NOT NULL,
  destination TEXT NOT NULL,
  estimated_time TEXT NOT NULL,
  branch_id UUID REFERENCES branches(id),
  vehicle_id UUID REFERENCES vehicles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  age INTEGER,
  license_number TEXT,
  license_expiry DATE,
  ratings NUMERIC DEFAULT 5.0,
  pin_hash TEXT NOT NULL,
  assigned_vehicle UUID REFERENCES vehicles(id),
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  vehicle_id UUID REFERENCES vehicles(id),
  route_id UUID REFERENCES routes(id),
  booking_date DATE NOT NULL,
  pickup_point TEXT NOT NULL,
  destination TEXT NOT NULL,
  status TEXT DEFAULT 'CONFIRMED',
  priority INTEGER NOT NULL,
  request_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS waitlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id),
  waitlist_position INTEGER NOT NULL,
  priority INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS external_vehicle_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  vehicle_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  urgency TEXT NOT NULL,
  passenger_count INTEGER NOT NULL,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  read_status BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
