-- Run this in your Supabase SQL Editor to apply updates:

-- 1. Add driver_id column referencing drivers(id) to gate_passes table
ALTER TABLE gate_passes 
ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES drivers(id);

-- 2. Create ai_learning_logs table for AI persistent memory & self-learning
CREATE TABLE IF NOT EXISTS ai_learning_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_role TEXT,
  user_message TEXT,
  learned_insight TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
