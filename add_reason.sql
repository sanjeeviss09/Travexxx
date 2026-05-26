-- Run this in your Supabase SQL Editor
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reason TEXT;
