-- Enable Realtime for relevant tables in Supabase
-- Run this in your Supabase SQL Editor

-- Ensure the supabase_realtime publication exists (it usually does by default)
-- Then add the tables to it:

begin;
  -- Remove tables if they are already there (optional, to avoid errors)
  -- alter publication supabase_realtime drop table bookings;
  
  -- Add the tables for real-time streaming
  alter publication supabase_realtime add table bookings;
  alter publication supabase_realtime add table vehicles;
  alter publication supabase_realtime add table employees;
  alter publication supabase_realtime add table drivers;
commit;
