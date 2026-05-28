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
    // 1. Unassigned confirmed bookings
    const { data: unassignedBookings } = await supabase
      .from('bookings')
      .select('id, employee_id, booking_date, pickup_point, destination, status')
      .eq('status', 'CONFIRMED')
      .is('vehicle_id', null);

    // 2. Active routes without vehicles assigned
    const { data: routesNoVehicle } = await supabase
      .from('routes')
      .select('id, route_name, destination, estimated_time')
      .is('vehicle_id', null);

    // 3. Vehicles in maintenance
    const { data: maintenanceVehicles } = await supabase
      .from('vehicles')
      .select('id, vehicle_name, vehicle_number, vehicle_status')
      .ilike('vehicle_status', '%maintenance%');

    // 4. Get active vehicles and drivers to check for unassigned drivers
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, vehicle_name, vehicle_number, vehicle_status');
    const { data: drivers } = await supabase
      .from('drivers')
      .select('id, name, assigned_vehicle, status');

    const assignedVehicleIds = new Set(drivers?.map(d => d.assigned_vehicle).filter(Boolean) || []);
    const vehiclesWithoutDrivers = vehicles?.filter(v => !assignedVehicleIds.has(v.id) && v.vehicle_status !== 'MAINTENANCE' && v.vehicle_status !== 'Maintenance') || [];

    // 5. Pending external vehicle requests
    const { data: pendingExternal } = await supabase
      .from('external_vehicle_requests')
      .select('id, employee_id, vehicle_type, urgency, status')
      .eq('status', 'PENDING');

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      issues_detected: {
        unassigned_confirmed_bookings_count: unassignedBookings?.length || 0,
        unassigned_bookings: unassignedBookings || [],
        routes_without_vehicles_count: routesNoVehicle?.length || 0,
        routes_without_vehicles: routesNoVehicle || [],
        vehicles_in_maintenance_count: maintenanceVehicles?.length || 0,
        vehicles_in_maintenance: maintenanceVehicles || [],
        active_vehicles_without_drivers_count: vehiclesWithoutDrivers?.length || 0,
        vehicles_without_drivers: vehiclesWithoutDrivers || [],
        pending_external_vehicle_requests_count: pendingExternal?.length || 0,
        pending_external_requests: pendingExternal || []
      },
      schema_context: "Tables: bookings, routes, vehicles, drivers, employees, branches, waitlists, external_vehicle_requests, gate_passes, gate_pass_materials."
    });
  } catch (error) {
    console.error("Failed to fetch diagnostics:", error);
    return JSON.stringify({ error: "Could not fetch real-time DB state." });
  }
}

// Asynchronously extract and store insights to the database for self-learning
async function extractAndStoreInsight(userId, userRole, messages) {
  if (!userId) return;
  try {
    const recentMessages = messages.slice(-4);
    const analysisPrompt = `Analyze the following recent chat conversation on the Revexy transport dashboard.
User Role: ${userRole || 'EMPLOYEE'} (User ID: ${userId}).

Extract any specific user preference (e.g. favorite commute slots, destinations, pickup locations) or platform feedback/bottleneck complained about.
Write a single, clear, one-sentence summary of the learned insight (e.g. "User frequently requests gate passes for Returnable office chairs" or "User noted that afternoon vehicle relocation flags are causing delays").
If there is no new preference or platform feedback, write ONLY "NONE".

Conversation:
${recentMessages.map(m => `${m.role.toUpperCase()}: ${m.content || (m.tool_calls ? 'Tool Calls' : '')}`).join('\n')}`;

    const completion = await openai.chat.completions.create({
      model: "meta/llama-3.3-70b-instruct",
      messages: [{ role: 'user', content: analysisPrompt }],
      temperature: 0.1,
      max_tokens: 120,
    });

    const reply = completion.choices[0].message.content.trim();
    if (reply && reply !== 'NONE' && !reply.startsWith('NONE') && reply.length > 5) {
      await supabase.from('ai_learning_logs').insert([{
        user_id: userId,
        user_role: userRole || 'EMPLOYEE',
        user_message: messages[messages.length - 1]?.content || 'Action trigger',
        learned_insight: reply
      }]);
      console.log(`[AI Learning Feedback] Successfully learned: "${reply}"`);
    }
  } catch (err) {
    console.warn('[AI Learning Feedback] Error ignored (make sure SQL migrations are run):', err.message);
  }
}

// Define tools
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_available_routes',
      description: 'Get all transport routes for a given date, optionally filtering by destination.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD format date.' },
          destination: { type: 'string', description: 'Optional destination name.' }
        },
        required: ['date']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'book_trip',
      description: 'Request or book a trip on a specific transport route for the logged-in user.',
      parameters: {
        type: 'object',
        properties: {
          route_id: { type: 'string', description: 'The UUID of the route chosen.' },
          date: { type: 'string', description: 'YYYY-MM-DD format travel date.' },
          pickup_point: { type: 'string', description: 'Specific pickup location or base points.' },
          destination: { type: 'string', description: 'Travel destination.' },
          trip_type: { type: 'string', enum: ['one_way', 'round_trip'], description: 'Type of trip.' },
          reason: { type: 'string', description: 'Reason for booking (needed for external/special requests).' },
          mode: { type: 'string', enum: ['Regular', 'External'], description: 'Commute mode: Regular schedule or External/Special request.' }
        },
        required: ['route_id', 'date', 'pickup_point', 'destination']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_gate_pass',
      description: 'Create a new material gate pass request (either Returnable or Non-Returnable) with a list of items/materials.',
      parameters: {
        type: 'object',
        properties: {
          invoice_dc_no: { type: 'string', description: 'Optional invoice or delivery challan number.' },
          invoice_date: { type: 'string', description: 'Optional YYYY-MM-DD invoice date.' },
          dispatched_to: { type: 'string', description: 'Target destination branch or contact person.' },
          purpose: { type: 'string', description: 'Purpose of transfer (e.g. repair, transfer).' },
          mode_of_transfer_vehicle_no: { type: 'string', description: 'Optional vehicle number transporting goods.' },
          material_type: { type: 'string', enum: ['RETURNABLE', 'NON-RETURNABLE'], description: 'Material type.' },
          expected_return_date: { type: 'string', description: 'Expected return date (YYYY-MM-DD) for RETURNABLE items.' },
          materials: {
            type: 'array',
            description: 'List of materials included in the gate pass.',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string', description: 'Description of the item.' },
                quantity: { type: 'number', description: 'Quantity of the item.' },
                uom: { type: 'string', enum: ['Nos', 'Kgs', 'Ltrs', 'Mtrs', 'Boxes'], description: 'Unit of measurement.' },
                remarks: { type: 'string', description: 'Optional remarks.' }
              },
              required: ['description', 'quantity', 'uom']
            }
          }
        },
        required: ['dispatched_to', 'material_type', 'materials']
      }
    }
  }
];

// Tool executors
const toolHandlers = {
  get_available_routes: async (args) => {
    const { date, destination } = args;
    try {
      let query = supabase.from('routes').select(`
        id, route_name, pickup_points, destination, estimated_time, vehicle_id,
        vehicles(vehicle_number, capacity)
      `);
      const { data, error } = await query;
      if (error) throw error;

      let filtered = data || [];
      if (destination) {
        filtered = filtered.filter(r => r.destination.toLowerCase().includes(destination.toLowerCase()));
      }
      return { success: true, routes: filtered };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  },

  book_trip: async (args, user) => {
    const { route_id, date, pickup_point, destination, trip_type, reason, mode } = args;
    if (!user || !user.id) {
      return { success: false, error: "User session is required to perform bookings." };
    }
    try {
      let route = null;
      if (route_id) {
        const { data } = await supabase.from('routes').select('*').eq('id', route_id).single();
        route = data;
      }

      if (mode === 'External') {
        const { data, error } = await supabase.from('external_vehicle_requests').insert([{
          employee_id: user.role === 'DRIVER' ? null : user.id,
          vehicle_type: 'SUV/Sedan (External)',
          reason: reason || 'Special AI Assistant booking request',
          urgency: 'NORMAL',
          passenger_count: 1,
          status: 'PENDING'
        }]).select();
        if (error) throw error;
        return { success: true, message: "Special External Vehicle request created successfully (pending approval).", data: data[0] };
      }

      const payload = {
        employee_id: user.role === 'DRIVER' ? null : user.id,
        vehicle_id: route?.vehicle_id || null,
        route_id: route_id || null,
        booking_date: date,
        pickup_point: pickup_point || (route ? String(route.pickup_points) : ''),
        destination: destination || route?.destination || '',
        status: 'CONFIRMED',
        priority: user.role === 'ADMIN' ? 1 : 3
      };

      const { data, error } = await supabase.from('bookings').insert([payload]).select();
      if (error) throw error;

      return { success: true, message: "Trip booked and seat confirmed successfully!", booking: data[0] };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  },

  create_gate_pass: async (args, user) => {
    const { invoice_dc_no, invoice_date, dispatched_to, purpose, mode_of_transfer_vehicle_no, material_type, expected_return_date, materials } = args;
    if (!user || !user.id) {
      return { success: false, error: "User session is required to create gate passes." };
    }
    try {
      const year = new Date().getFullYear();
      const { count, error: countErr } = await supabase
        .from('gate_passes')
        .select('*', { count: 'exact', head: true })
        .like('gate_pass_number', `GP-${year}-%`);
      
      if (countErr) throw countErr;
      const nextSeq = String((count || 0) + 1).padStart(5, '0');
      const gate_pass_number = `GP-${year}-${nextSeq}`;

      const { data: gpData, error: gpErr } = await supabase
        .from('gate_passes')
        .insert([{
          gate_pass_number,
          employee_id: user.role === 'DRIVER' ? null : user.id,
          driver_id: user.role === 'DRIVER' ? user.id : null,
          invoice_dc_no,
          invoice_date: invoice_date || null,
          mode_of_transfer_vehicle_no,
          purpose,
          dispatched_to,
          material_type,
          expected_return_date: expected_return_date || null,
          status: 'PENDING'
        }])
        .select()
        .single();

      if (gpErr) throw gpErr;

      if (materials && materials.length > 0) {
        const materialsToInsert = materials.map((m, index) => ({
          gate_pass_id: gpData.id,
          s_no: index + 1,
          description: m.description,
          quantity: m.quantity,
          uom: m.uom,
          remarks: m.remarks
        }));

        const { error: matErr } = await supabase.from('gate_pass_materials').insert(materialsToInsert);
        if (matErr) throw matErr;
      }

      return { success: true, message: `Gate Pass ${gate_pass_number} created successfully!`, gate_pass: gpData };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  }
};

router.post('/chat', async (req, res) => {
  try {
    const { messages, user, isAdvisor } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const platformState = await getPlatformDiagnostics();

    // Fetch memory/learning logs from database
    let learnedMemory = "";
    try {
      const { data: insights } = await supabase
        .from('ai_learning_logs')
        .select('learned_insight')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (insights && insights.length > 0) {
        learnedMemory = `\nPreviously learned preferences/insights:\n` + insights.map(i => `- ${i.learned_insight}`).join('\n');
      }
    } catch (e) {
      console.warn("Could not query ai_learning_logs table:", e.message);
    }

    let systemPrompt = "";
    if (isAdvisor) {
      systemPrompt = `You are the senior Revexy Platform AI Advisor, specifically designed for HR Travel Desk administrators.
You have direct read access to live database metrics, vehicle occupancy data, and active route assignments.

Here is the LIVE platform diagnostic state:
${platformState}
${learnedMemory}

Analyze this data. Help the admin identify inefficiencies (unassigned vehicles, drivers with expired licenses, waitlists, etc.), recommend optimizations, and answer questions about how booking/priority rules work. Be professional, structured, and give actionable bullet points.`;
    } else {
      systemPrompt = `You are the Core AI Assistant of the Revexy Transport Platform, built to help employees and drivers.
The current logged-in user is: ${user ? `${user.name} (${user.role || 'EMPLOYEE'})` : 'Anonymous'}.
${user ? `User Details: Department: ${user.department || 'N/A'}, Designation: ${user.designation || 'N/A'}, ID: ${user.id}.` : ''}
${learnedMemory}

You can directly book transport trips or request material gate passes (goods on travel) for the user using your tools.
If they want to book a trip or create a gate pass, use the available tools. If details are missing, ask the user.
Be helpful, friendly, and concise.`;
    }

    let completion = await openai.chat.completions.create({
      model: "meta/llama-3.3-70b-instruct",
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      tools: isAdvisor ? undefined : tools,
      tool_choice: isAdvisor ? undefined : "auto",
      temperature: 0.2,
      max_tokens: 1024,
    });

    let choice = completion.choices[0];
    let assistantMessage = choice.message;

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolMessages = [...messages];
      toolMessages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        const { name, arguments: argsString } = toolCall.function;
        const args = JSON.parse(argsString);
        console.log(`[AI Chat] Executing tool: ${name} with args:`, args);

        const handler = toolHandlers[name];
        let result;
        if (handler) {
          result = await handler(args, user);
        } else {
          result = { success: false, error: `Tool ${name} not found.` };
        }

        toolMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: name,
          content: JSON.stringify(result)
        });
      }

      const finalCompletion = await openai.chat.completions.create({
        model: "meta/llama-3.3-70b-instruct",
        messages: [
          { role: 'system', content: systemPrompt },
          ...toolMessages
        ],
        temperature: 0.2,
        max_tokens: 1024,
      });

      const reply = finalCompletion.choices[0].message.content;
      res.json({ reply });

      extractAndStoreInsight(user?.id, user?.role, [...toolMessages, finalCompletion.choices[0].message]).catch(err => console.error(err));
    } else {
      res.json({ reply: assistantMessage.content });
      
      extractAndStoreInsight(user?.id, user?.role, [...messages, assistantMessage]).catch(err => console.error(err));
    }
  } catch (error) {
    console.error('AI Route Error:', error);
    res.status(500).json({ error: 'Failed to process AI chat request' });
  }
});

module.exports = router;
