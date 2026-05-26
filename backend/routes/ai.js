const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const supabase = require('../db');

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY || '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',
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

// Helper to get platform diagnostics
async function getPlatformDiagnostics() {
  try {
    // 1. Check for unassigned confirmed bookings
    const { data: unassignedBookings } = await supabase
      .from('bookings')
      .select('id, employee_id, status, route_id, vehicle_id')
      .eq('status', 'confirmed')
      .is('vehicle_id', null);

    // 2. Check for active routes without a driver
    const { data: activeRoutesNoDriver } = await supabase
      .from('transport_routes')
      .select('id, name, status, driver_id, vehicle_id')
      .eq('status', 'active')
      .is('driver_id', null);
      
    // 3. Get pending bookings
    const { count: pendingBookingsCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // 4. Vehicles in maintenance
    const { data: maintenanceVehicles } = await supabase
      .from('vehicles')
      .select('id, registration_number, status')
      .eq('status', 'maintenance');

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      issues_detected: {
        unassigned_confirmed_bookings: unassignedBookings?.length || 0,
        unassigned_bookings_details: unassignedBookings,
        active_routes_missing_driver: activeRoutesNoDriver?.length || 0,
        routes_missing_driver_details: activeRoutesNoDriver,
        vehicles_in_maintenance: maintenanceVehicles?.length || 0,
        maintenance_vehicles_details: maintenanceVehicles,
        pending_bookings_count: pendingBookingsCount || 0
      },
      schema_context: "Tables available: bookings, transport_routes, vehicles, drivers, employees, users."
    });
  } catch (error) {
    console.error("Failed to fetch diagnostics:", error);
    return JSON.stringify({ error: "Could not fetch real-time DB state." });
  }
}

router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const platformState = await getPlatformDiagnostics();

    const systemPrompt = `You are the core intelligence (brain) of the Revexy Transport Dashboard (HR Travel Desk). 
You have direct read access to the live platform diagnostics.
Your job is to identify mistakes, debug issues, and help administrators resolve platform problems.

Here is the LIVE platform state and detected issues at this exact moment:
${platformState}

Use this data to answer the user's questions, point out errors (like unassigned drivers or vehicles in maintenance), and suggest solutions. Be concise and authoritative.`;

    const completion = await openai.chat.completions.create({
      model: "meta/llama-3.3-70b-instruct",
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.2,
      top_p: 0.7,
      max_tokens: 1024,
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

module.exports = router;
