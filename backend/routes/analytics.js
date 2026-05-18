const express = require('express');
const router = express.Router();
const supabase = require('../db');
const fs = require('fs');
const path = require('path');

const FUEL_FILE = path.join(__dirname, '../data/fuel_logs.json');

// Helper to read fuel logs
const getFuelLogs = () => {
  if (!fs.existsSync(FUEL_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(FUEL_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
};

router.get('/', async (req, res) => {
  try {
    const { timeRange = 'All', employee = 'All', driver = 'All', route = 'All' } = req.query;

    // 1. Fetch bookings for trips and route analysis
    const { data: bookings, error: bookingsErr } = await supabase
      .from('bookings')
      .select('*, vehicles(vehicle_name, vehicle_number), routes(route_name), employees(name)');

    if (bookingsErr) throw bookingsErr;

    // 2. Fetch drivers
    const { data: drivers, error: driversErr } = await supabase.from('drivers').select('*');
    if (driversErr) throw driversErr;

    // 3. Fetch Vehicles
    const { data: vehicles, error: vehiclesErr } = await supabase.from('vehicles').select('*');
    if (vehiclesErr) throw vehiclesErr;

    // --- Analytics Processing ---

    let filteredBookings = bookings;

    // Time Range Filter
    if (timeRange !== 'All') {
      const now = new Date();
      filteredBookings = filteredBookings.filter(b => {
        if (!b.booking_date) return false;
        const bDate = new Date(b.booking_date);
        if (timeRange === 'Month') {
          return bDate.getMonth() === now.getMonth() && bDate.getFullYear() === now.getFullYear();
        } else if (timeRange === 'Quarter') {
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const bQuarter = Math.floor(bDate.getMonth() / 3);
          return bQuarter === currentQuarter && bDate.getFullYear() === now.getFullYear();
        } else if (timeRange === 'Year') {
          return bDate.getFullYear() === now.getFullYear();
        } else if (timeRange === 'YTD') {
          return bDate.getFullYear() === now.getFullYear() && bDate <= now;
        }
        return true;
      });
    }

    // Filters
    if (employee !== 'All') {
      filteredBookings = filteredBookings.filter(b => b.employees?.name === employee);
    }
    if (route !== 'All') {
      filteredBookings = filteredBookings.filter(b => b.destination === route);
    }
    if (driver !== 'All') {
      const driverObj = drivers.find(d => d.name === driver);
      if (driverObj && driverObj.assigned_vehicle) {
        filteredBookings = filteredBookings.filter(b => b.vehicle_id === driverObj.assigned_vehicle);
      }
    }

    // Trips (Completed vs Total)
    const totalTrips = filteredBookings.length;
    const completedTrips = filteredBookings.filter(b => b.status === 'COMPLETED').length;

    // Route Analysis (Most frequent areas)
    const routeCounts = {};
    filteredBookings.forEach(b => {
      const dest = b.destination || 'Unknown';
      routeCounts[dest] = (routeCounts[dest] || 0) + 1;
    });
    const topRoutes = Object.entries(routeCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Vehicle Analysis
    const activeVehicles = vehicles.filter(v => v.vehicle_status === 'ACTIVE').length;
    const vehicleUsage = {};
    filteredBookings.forEach(b => {
        if (b.vehicles) {
            const vName = b.vehicles.vehicle_number;
            vehicleUsage[vName] = (vehicleUsage[vName] || 0) + 1;
        }
    });

    // Employee Analysis
    const employeeTrips = {};
    filteredBookings.forEach(b => {
      if (b.employees) {
          const eName = b.employees.name;
          employeeTrips[eName] = (employeeTrips[eName] || 0) + 1;
      }
    });
    const topEmployees = Object.entries(employeeTrips)
      .map(([name, trips]) => ({ name, trips }))
      .sort((a, b) => b.trips - a.trips);

    // Fuel Analysis
    const fuelLogs = getFuelLogs();
    const fuelByType = { PETROL: 0, DIESEL: 0, GAS: 0, EV: 0 };
    let totalFuelCost = 0;
    
    fuelLogs.forEach(log => {
      const type = log.fuelType.toUpperCase();
      if (fuelByType[type] !== undefined) {
        fuelByType[type] += Number(log.quantity) || 0;
      }
      totalFuelCost += Number(log.cost) || 0;
    });

    res.json({
      overview: {
        totalTrips,
        completedTrips,
        totalVehicles: vehicles.length,
        activeVehicles,
        totalDrivers: drivers.length,
        totalFuelCost
      },
      topRoutes,
      topEmployees,
      vehicleUsage: Object.entries(vehicleUsage).map(([name, trips]) => ({ name, trips })),
      fuelStats: fuelByType,
      recentFuelLogs: fuelLogs.slice(-5).reverse(),
      trips: filteredBookings.sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date))
    });

  } catch (err) {
    console.error('Analytics Error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// POST new fuel log
router.post('/fuel', (req, res) => {
  const { driverId, driverName, vehicleId, fuelType, quantity, cost, date } = req.body;
  try {
    const logs = getFuelLogs();
    const newLog = {
      id: Date.now().toString(),
      driverId,
      driverName,
      vehicleId,
      fuelType,
      quantity,
      cost,
      date: date || new Date().toISOString(),
      timestamp: new Date().getTime()
    };
    logs.push(newLog);
    
    // Ensure dir exists
    const dir = path.join(__dirname, '../data');
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(FUEL_FILE, JSON.stringify(logs, null, 2));
    res.json({ success: true, log: newLog });
  } catch (err) {
    console.error('Fuel Log Error:', err);
    res.status(500).json({ error: 'Failed to save fuel log' });
  }
});

module.exports = router;
