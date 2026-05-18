const supabase = require('./db');

async function main() {
  console.log("Adding seat_number column...");
  // Using supabase JS client, you can't run arbitrary DDL directly unless using an RPC.
  // But wait, there is no generic RPC for this. I will use the 'pg' library with connection string from env.
  
  const { Client } = require('pg');
  require('dotenv').config();

  // Parse Supabase URL to connection string (usually available via connection pooling)
  // Let's see if we have DATABASE_URL
  if (process.env.DATABASE_URL) {
      const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      await client.connect();
      await client.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS seat_number TEXT;');
      console.log('Added seat_number column via pg');
      await client.end();
  } else {
      console.log('DATABASE_URL not found, cannot run DDL. Please add seat_number manually.');
  }
}

main().catch(console.error);
