// Fix WebSocket for Node.js < 22
const ws = require('ws');
global.WebSocket = ws;

const http = require('http');
const { WebSocketServer } = require('ws');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const supabase = require('./db');

dotenv.config();
const app = express();
const server = http.createServer(app);
// Express setup
app.use(cors());
app.use(express.json());

// Basic health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Revexy API is running' });
});

// Import routes (after global.WebSocket is set)
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const bookingRoutes = require('./routes/bookings');
const vehicleRoutes = require('./routes/vehicles');
const driverRoutes = require('./routes/drivers');
const transportRoutes = require('./routes/routes');
const analyticsRoutes = require('./routes/analytics');

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/routes', transportRoutes);
app.use('/api/analytics', analyticsRoutes);

const path = require('path');

// Serve static files from the React frontend app build directory
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// For all other requests (except API and static files), send back React's index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Revexy Backend running on http://localhost:${PORT}`);

  // Start background jobs
  const { startAutoCancelJob } = require('./jobs/autoCancelJob');
  const { startEmailListener } = require('./services/emailListener');
  
  startAutoCancelJob();
  startEmailListener();
});
