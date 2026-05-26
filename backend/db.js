// Fix WebSocket for Node.js < 22
const ws = require('ws');
global.WebSocket = ws;
const fetch = require('node-fetch');

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
// Use service key on backend to bypass RLS — keep this server-side only
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { fetch: fetch },
  realtime: { transport: ws }
});

module.exports = supabase;
