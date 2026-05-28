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

// ── CORS configuration ──────────────────────────────────────────────────────
// Allow web browsers, Electron desktop, and Capacitor Android/iOS origins
const allowedOrigins = [
  // Local development
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  // Production web deployments
  'https://revexy-backend.onrender.com',
  'https://revexy.vercel.app',
  'https://travexxx.vercel.app',
  // Capacitor Android / iOS (native WebView)
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  // Electron (file:// protocol or custom scheme)
  'file://',
  'app://.',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

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
const aiRoutes = require('./routes/ai');
const gatePassRoutes = require('./routes/gatePasses');

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/routes', transportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/gate-passes', gatePassRoutes);

const fs = require('fs');
const path = require('path');

// Serve static files from the React frontend app build directory if it exists
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  // For all other requests (except API and static files), send back React's index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  // Safe landing page for split deployments (e.g. Vercel frontend + Render backend)
  app.get('/', (req, res) => {
    res.status(200).json({
      status: 'ok',
      message: '🚀 Revexy Transport API Server is fully operational!',
      deployment: 'Render.com (Backend Services)',
      healthCheck: '/health'
    });
  });
}

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
  const { startNotificationListener } = require('./services/notificationListener');

  startAutoCancelJob();
  startNotificationListener();

  // ── Keep-alive self-ping every 5 min to prevent Render free tier sleep ──
  const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  setInterval(() => {
    http.get(`${SELF_URL}/health`, (res) => {
      console.log(`🔔 Keep-alive ping → ${res.statusCode}`);
    }).on('error', (err) => {
      console.warn(`⚠️  Keep-alive ping failed: ${err.message}`);
    });
  }, 5 * 60 * 1000); // every 5 minutes
});
