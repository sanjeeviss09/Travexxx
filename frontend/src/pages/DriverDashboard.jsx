import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { supabase } from '../supabase';
import {
  Truck, MapPin, Users, CheckCircle2, Clock, AlertCircle,
  Bell, User, LogOut, ChevronRight, Play, Square, Navigation,
  Phone, X, LayoutDashboard, ClipboardList, Settings, Fuel,
  Droplet, Zap
} from 'lucide-react';

const API = window.location.origin.includes('5173') ? 'http://localhost:5000/api' : '/api';

/** Parse "6:00 AM - 7:00 AM" → end time as today's Date object. Returns null on failure. */
function parseRouteEndTime(estimatedTime) {
  if (!estimatedTime) return null;
  const parts = estimatedTime.split('-');
  const endStr = (parts[1] || parts[0]).trim();
  const [time, meridiem] = endStr.split(' ');
  if (!time) return null;
  let [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  if (meridiem && meridiem.toUpperCase() === 'PM' && hours !== 12) hours += 12;
  if (meridiem && meridiem.toUpperCase() === 'AM' && hours === 12) hours = 0;
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
}

const STATUS_COLORS = {
  Upcoming: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[status]}`}>
      {status}
    </span>
  );
}

function TripActionModal({ type, trip, onClose, onSubmit }) {
  const [meter, setMeter] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState(null);
  const [attendance, setAttendance] = useState({});

  // Use real confirmed passengers from manifest; fallback to empty list (no fake mock data)
  const passengers = (trip?.manifest?.confirmed || []).map((p, i) => ({
    name: p.employees?.name || `Passenger ${i + 1}`,
    seat: p.pickup_point || '—',
  }));

  const handleToggleAttendance = (name) => {
    setAttendance(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-300 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {type === 'start' ? '🚀 Start Trip' : type === 'end' ? '🏁 End Trip' : '⚠️ Cancel Trip'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"><X className="h-5 w-5 text-gray-400" /></button>
        </div>

        {type === 'cancel' ? (
          <>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Reason for Cancellation</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="Please explain why the trip is cancelled. (This will be sent to the employees)"
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-red-500 outline-none mb-4 text-sm transition-colors"
            />
          </>
        ) : (
          <>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
              {type === 'start' ? 'Start' : 'End'} Meter Reading (km)
            </label>
            <input
              type="number"
              value={meter}
              onChange={e => setMeter(e.target.value)}
              placeholder="Enter odometer reading"
              className="w-full px-4 py-3 text-lg border-2 border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-blue-500 outline-none mb-4 transition-colors"
            />

            {type === 'start' && (
              <>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Meter Photo Verification</label>
                <div className="w-full border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-4 mb-4 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <input type="file" accept="image/*" capture="environment" className="hidden" id="meter-photo" onChange={(e) => setPhoto(e.target.files[0])} />
                  <label htmlFor="meter-photo" className="cursor-pointer text-sm text-blue-600 dark:text-blue-400 font-medium">
                    {photo ? '📸 Photo Uploaded: ' + photo.name : '📸 Tap to Take Photo'}
                  </label>
                </div>

                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Employee Attendance</label>
                <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-2">
                  {passengers.map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg border border-gray-100 dark:border-slate-600">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</p>
                        <p className="text-xs text-gray-500">Seat: {p.seat}</p>
                      </div>
                      <button 
                        onClick={() => handleToggleAttendance(p.name)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${attendance[p.name] ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-slate-600 border border-gray-300 dark:border-slate-500'}`}
                      >
                        {attendance[p.name] && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {type === 'end' && (
              <>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Comments (optional)</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                  placeholder="Any notes about this trip..."
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-blue-500 outline-none mb-4 text-sm transition-colors"
                />
              </>
            )}
          </>
        )}

        <button
          onClick={() => { 
            if (type === 'cancel' && !note) return alert('Please provide a reason.');
            if (type !== 'cancel' && !meter) return alert('Please enter meter reading.');
            onSubmit({ meter, note, photo, attendance }); 
            onClose(); 
          }}
          className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all ${type === 'start' ? 'bg-blue-600 hover:bg-blue-700 active:scale-95' : type === 'end' ? 'bg-green-600 hover:bg-green-700 active:scale-95' : 'bg-red-600 hover:bg-red-700 active:scale-95'}`}
        >
          {type === 'start' ? 'Start Trip Now' : type === 'end' ? 'Complete Trip' : 'Confirm Cancellation'}
        </button>
      </div>
    </div>
  );
}

function TripCard({ trip, onSelect }) {
  return (
    <div
      onClick={() => onSelect(trip)}
      className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all duration-200 cursor-pointer active:scale-[0.99]"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">{trip.displayId}</p>
          <h3 className="font-bold text-gray-900 dark:text-white text-base">{trip.route}</h3>
        </div>
        <StatusBadge status={trip.status} />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5 min-w-fit"><Clock className="h-3.5 w-3.5 text-blue-500" />{trip.pickup}</div>
        <div className="flex items-center gap-1.5 min-w-fit"><Users className="h-3.5 w-3.5 text-indigo-500" />{trip.passengers}/{trip.capacity} riders</div>
        <div className="flex items-center gap-1.5 min-w-fit"><Truck className="h-3.5 w-3.5 text-gray-400" />{trip.vehicle}</div>
      </div>
      <div className="mt-3 flex items-center text-xs text-blue-600 dark:text-blue-400 font-medium">
        View details <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
      </div>
    </div>
  );
}

function TripDetailSheet({ trip, onClose, onStartTrip, onEndTrip }) {
  const [showMeter, setShowMeter] = useState(null);
  const PASSENGERS = trip.manifest?.confirmed?.map(p => ({
    name: p.employees?.name || 'Unknown',
    stop: p.pickup_point,
    seat: '—',
    status: p.status
  })) || [];
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{trip.displayId}</p>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{trip.route}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={trip.status} />
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-lg"><Clock className="h-4 w-4 text-blue-500" />{trip.pickup}</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-lg"><Users className="h-4 w-4 text-indigo-500" />{trip.passengers} riders</span>
          </div>

          <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Route Stops</h4>
            <div className="space-y-3">
              {trip.stops.map((stop, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-blue-600 text-white' : i === trip.stops.length - 1 ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-slate-300'}`}>{i + 1}</div>
                  <span className="text-sm font-medium text-gray-800 dark:text-slate-200">{stop}</span>
                  {i === 0 && <span className="text-xs text-blue-500">Start</span>}
                  {i === trip.stops.length - 1 && <span className="text-xs text-green-500">End</span>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Passengers</h4>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{trip.manifest?.confirmed?.length || 0} Confirmed</span>
            </div>
            
            <div className="space-y-4">
              {/* Confirmed List */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-green-600 uppercase flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Confirmed</p>
                {trip.manifest?.confirmed?.length === 0 ? (
                  <p className="text-xs text-gray-400 italic px-2">No confirmed passengers yet.</p>
                ) : trip.manifest?.confirmed?.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3 border border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">{p.employees?.name?.[0]}</div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.employees?.name}</p>
                        <p className="text-xs text-gray-400">
                          {(p.pickup_point?.startsWith('["') && p.pickup_point?.endsWith('"]')) 
                            ? p.pickup_point.slice(2, -2).replace(/"/g, '') 
                            : p.pickup_point} · Priority {p.priority}
                        </p>
                      </div>
                    </div>
                    <a href={`tel:${p.employees?.mobile}`} className="p-2 text-gray-400 hover:text-green-500 transition-colors"><Phone className="h-4 w-4" /></a>
                  </div>
                ))}
              </div>

              {/* Waitlist */}
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-orange-600 uppercase flex items-center gap-1"><Clock className="h-3 w-3" /> Waitlist</p>
                {trip.manifest?.waitlisted?.length === 0 ? (
                  <p className="text-xs text-gray-400 italic px-2">Waitlist is empty.</p>
                ) : trip.manifest?.waitlisted?.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-orange-50/50 dark:bg-orange-900/10 rounded-xl px-4 py-3 border border-orange-100 dark:border-orange-900/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-gray-500 text-xs font-bold">{p.employees?.name?.[0]}</div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white opacity-70">{p.employees?.name}</p>
                        <p className="text-xs text-gray-400">Position: {p.waitlist_position}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800">
          {trip.status === 'Upcoming' && (
            <div className="flex gap-3">
              <button onClick={() => setShowMeter('start')} className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-blue-200 dark:shadow-none">
                <Play className="h-5 w-5 fill-white" /> Start
              </button>
              <button onClick={() => setShowMeter('cancel')} className="flex-1 py-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-lg font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                Cancel
              </button>
            </div>
          )}
          {trip.status === 'Active' && (
            <button onClick={() => setShowMeter('end')} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white text-lg font-bold rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-green-200 dark:shadow-none">
              <Square className="h-5 w-5 fill-white" /> End Trip
            </button>
          )}
        </div>
      </div>
      {showMeter && (
        <TripActionModal
          type={showMeter}
          trip={trip}
          onClose={() => setShowMeter(null)}
          onSubmit={({ meter, note, photo, attendance }) => {
            if (showMeter === 'start') onStartTrip(trip.id, meter, photo, attendance);
            else if (showMeter === 'cancel') onEndTrip(trip.id, null, note, 'Cancelled');
            else onEndTrip(trip.id, meter, note, 'Completed');
            setShowMeter(null);
          }}
        />
      )}
    </>
  );
}

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const [trips, setTrips] = useState([]);
  const [historicalTrips, setHistoricalTrips] = useState([]);
  const [myVehicle, setMyVehicle] = useState(null);
  const [driver, setDriver] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [selectedDate, setSelectedDate] = useState(0);
  const [manifests, setManifests] = useState({}); // { [tripId]: { confirmed: [], waitlisted: [] } }
  const [globalStats, setGlobalStats] = useState({ active: 0, upcoming: 0, completed: 0, cancelled: 0 });
  const [dailyTripCounts, setDailyTripCounts] = useState({});
  const [fuelModal, setFuelModal] = useState(false);

  const [tripFilter, setTripFilter] = useState('All');
  const [stuckTrip, setStuckTrip] = useState(null); // ON ROUTE booking from a past date

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const rawDriver = JSON.parse(localStorage.getItem('user') || '{}');
        
        // Always fetch fresh driver record to get latest assigned_vehicle
        let freshDriver = rawDriver;
        if (rawDriver.id) {
          try {
            const driversRes = await axios.get(`${API}/drivers`);
            const found = driversRes.data.find(d => d.id === rawDriver.id);
            if (found) {
              freshDriver = { ...rawDriver, ...found };
              localStorage.setItem('user', JSON.stringify(freshDriver));
              setDriver(freshDriver);
            }
          } catch(e) { console.warn('Could not refresh driver:', e); }
        }

        if (!freshDriver.assigned_vehicle) {
          setLoading(false);
          setTrips([]);
          return;
        }

        const d = new Date();
        d.setDate(d.getDate() + selectedDate);
        const dateStr = d.toISOString().split('T')[0];

        const [vehiclesRes, routesRes, allBookingsRes] = await Promise.all([
          axios.get(`${API}/vehicles?date=${dateStr}`),
          axios.get(`${API}/routes?date=${dateStr}`),
          axios.get(`${API}/bookings?vehicle_id=${freshDriver.assigned_vehicle}`)
        ]);

        const assignedVeh = vehiclesRes.data.find(v => v.id === freshDriver.assigned_vehicle);
        setMyVehicle(assignedVeh);

        if (assignedVeh) {
          const myBackendRoutes = routesRes.data.filter(r => r.vehicle_id === assignedVeh.id);
          const allBookings = allBookingsRes.data || [];
          const dayBookings = allBookings.filter(b => b.booking_date === dateStr);

          // Detect any lingering ON ROUTE booking from a PAST date (driver forgot to end trip)
          const today = new Date().toISOString().split('T')[0];
          const stuckBookings = allBookings.filter(b =>
            b.status === 'ON ROUTE' && b.booking_date < today
          );
          if (stuckBookings.length > 0) {
            const sb = stuckBookings[0];
            const stuckRoute = myBackendRoutes.find(r => r.id === sb.route_id);
            setStuckTrip({
              bookingId: sb.id,
              routeName: stuckRoute?.route_name || 'Unknown Route',
              bookingDate: sb.booking_date,
              routeId: sb.route_id,
              vid: assignedVeh.id,
            });
          } else {
            setStuckTrip(null);
          }
          
          // Always only show routes if passengers actually booked (for today and all other dates)
          const routesToShow = myBackendRoutes.filter(r => 
            dayBookings.some(b => b.route_id === r.id && ['CONFIRMED', 'ON ROUTE', 'COMPLETED'].includes(b.status))
          );

          const mappedTrips = routesToShow.map(r => {
             let stops = ['Start Point', 'End Point'];
             if (r.pickup_points && Array.isArray(r.pickup_points)) stops = r.pickup_points;
             else if (typeof r.pickup_points === 'string') {
               try { stops = JSON.parse(r.pickup_points); } catch(e){}
             }

             // Status: derived from bookings. If no bookings → driver's route is still Upcoming (scheduled)
             const routeBookings = dayBookings.filter(b => b.route_id === r.id);
             let status = 'Upcoming';
             if (routeBookings.some(b => b.status === 'ON ROUTE')) status = 'Active';
             else if (routeBookings.length > 0 && routeBookings.every(b => b.status === 'COMPLETED')) status = 'Completed';
             else if (routeBookings.length > 0 && routeBookings.every(b => b?.status?.startsWith('CANCELLED'))) status = 'Cancelled';

             const activePassengers = routeBookings.filter(b => ['CONFIRMED', 'ON ROUTE'].includes(b.status)).length;

             return {
               id: r.id,
               routeId: r.id,
               displayId: 'T-' + r.id.substring(0,4).toUpperCase(),
               route: r.route_name,
               pickup: r.estimated_time,
               passengers: activePassengers,
               capacity: assignedVeh.capacity || 20,
               vehicle: assignedVeh.vehicle_number,
               vid: assignedVeh.id,
               status,
               stops,
               bookingDate: dateStr,
             };
          });
          // Extract ad-hoc (fallback) trips from bookings without a route_id
          const fallbackGroups = {};
          dayBookings.filter(b => !b.route_id && ['CONFIRMED', 'ON ROUTE', 'COMPLETED'].includes(b.status)).forEach(b => {
             const match = b.pickup_point?.match(/^\[(.*?)\]/);
             const timeSlot = match ? match[1] : 'Flexible';
             if (!fallbackGroups[timeSlot]) fallbackGroups[timeSlot] = [];
             fallbackGroups[timeSlot].push(b);
          });

          const mappedFallbackTrips = Object.entries(fallbackGroups).map(([timeSlot, bks], idx) => {
             let status = 'Upcoming';
             if (bks.some(b => b.status === 'ON ROUTE')) status = 'Active';
             else if (bks.length > 0 && bks.every(b => b.status === 'COMPLETED')) status = 'Completed';
             else if (bks.length > 0 && bks.every(b => b?.status?.startsWith('CANCELLED'))) status = 'Cancelled';

             const activePassengers = bks.filter(b => ['CONFIRMED', 'ON ROUTE'].includes(b.status)).length;
             // Assume a common destination or take the first one
             const dest = bks[0]?.destination || 'Sri City';

             return {
               id: 'fallback-' + timeSlot.replace(/\s+/g, '-'),
               routeId: null,
               displayId: 'F-' + String(idx + 1).padStart(3, '0'),
               route: 'Ad-Hoc / Direct',
               pickup: timeSlot,
               passengers: activePassengers,
               capacity: assignedVeh.capacity || 20,
               vehicle: assignedVeh.vehicle_number,
               vid: assignedVeh.id,
               status,
               stops: ['Multiple Pickups', dest],
               bookingDate: dateStr,
             };
          });

          const finalMappedTrips = [...mappedTrips, ...mappedFallbackTrips];
          setTrips(finalMappedTrips);

          setGlobalStats({
            active: finalMappedTrips.filter(t => t.status === 'Active').length,
            upcoming: finalMappedTrips.filter(t => t.status === 'Upcoming').length,
            completed: finalMappedTrips.filter(t => t.status === 'Completed').length,
            cancelled: finalMappedTrips.filter(t => t.status === 'Cancelled').length,
          });

          // Helper to determine status including expiration
          // NOTE: Handles all CANCELLED variants: 'CANCELLED (Auto)', 'CANCELLED (Driver)', 'CANCELLED (Self)'
          const getTripStatus = (bookings, timeSlot, dateStr) => {
             if (bookings.some(b => b.status === 'ON ROUTE')) return 'Active';
             if (bookings.length > 0 && bookings.every(b => b.status === 'COMPLETED')) return 'Completed';
             // Match any cancelled variant (Auto / Driver / Self)
             if (bookings.length > 0 && bookings.every(b => b.status?.startsWith('CANCELLED'))) return 'Cancelled';
             // Mix of some cancelled + some not = treat by majority
             if (bookings.some(b => b.status === 'COMPLETED')) return 'Completed';
             
             // Check expiration
             if (timeSlot && timeSlot !== 'Flexible') {
                const now = new Date();
                const localDateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
                if (dateStr < localDateStr) return 'Expired';
                if (dateStr === localDateStr) {
                  const parts = timeSlot.split('-');
                  const endStr = (parts[1] || parts[0]).trim();
                  const [time, meridiem] = endStr.split(' ');
                  if (time && meridiem) {
                    let [h, m] = time.split(':').map(Number);
                    if (meridiem.toUpperCase() === 'PM' && h !== 12) h += 12;
                    if (meridiem.toUpperCase() === 'AM' && h === 12) h = 0;
                    const tripEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
                    if (now > tripEnd) return 'Expired';
                  }
                }
             }
             return 'Upcoming';
          };

          // Process historical trips (Trips tab) — ALL routes that had ANY booking (including cancelled)
          // Previously this only showed CONFIRMED/ON ROUTE/COMPLETED, hiding auto-cancelled history entirely.
          const allDates = [...new Set(allBookings.filter(b => b.route_id).map(b => b.booking_date))];
          let allMapped = [];
          allDates.forEach(dStr => {
            const dateBookings = allBookings.filter(b => b.booking_date === dStr);
            
            // Show routes that had ANY passenger booking on that date (including cancelled)
            myBackendRoutes.forEach(r => {
               // Include all booking states so history is complete
               const routeBookings = dateBookings.filter(b => b.route_id === r.id);
               if (routeBookings.length === 0) return; // Skip routes with no bookings at all

               // Use only non-cancelled bookings for status derivation first
               const activeBookings = routeBookings.filter(b => !b.status?.startsWith('CANCELLED'));
               const bookingsForStatus = activeBookings.length > 0 ? activeBookings : routeBookings;
               const status = getTripStatus(bookingsForStatus, r.estimated_time, dStr);
               
               let stops = ['Start Point', 'End Point'];
               if (r.pickup_points && Array.isArray(r.pickup_points)) stops = r.pickup_points;
               else if (typeof r.pickup_points === 'string') {
                 try { stops = JSON.parse(r.pickup_points); } catch(e){}
               }

               allMapped.push({
                 id: `${r.id}-${dStr}`,
                 vid: assignedVeh.id,
                 routeId: r.id,
                 displayId: 'T-' + r.id.substring(0,4).toUpperCase(),
                 route: r.route_name,
                 pickup: r.estimated_time || 'Flexible',
                 passengers: routeBookings.filter(b => ['CONFIRMED', 'ON ROUTE'].includes(b.status)).length,
                 capacity: assignedVeh.capacity || 20,
                 vehicle: assignedVeh.vehicle_number,
                 status,
                 stops,
                 bookingDate: dStr,
               });
            });
            // NOTE: Fallback (no-route) bookings are intentionally excluded from driver history
          });
          setHistoricalTrips(allMapped.sort((a,b) => new Date(b.bookingDate) - new Date(a.bookingDate)));

          // Fetch daily trip counts for this driver's vehicle
          try {
            const countsRes = await axios.get(`${API}/bookings/daily-trip-counts?vehicle_id=${freshDriver.assigned_vehicle}`);
            setDailyTripCounts(countsRes.data);
          } catch(e) { console.warn('Could not fetch daily trip counts:', e); }
        }
      } catch (err) {
        console.error('Failed to sync backend data', err);
        setTrips([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();

    // Supabase Realtime for live updates
    const channel = supabase
      .channel('driver_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        console.log('[Realtime] Booking change detected, refreshing dashboard...');
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  const handleSelectTrip = async (trip) => {
    setSelectedTrip(trip);
    // Note: for historical trips, ID is routeId-date, we need to pass routeId
    const routeId = trip.routeId || trip.id;
    if (!manifests[trip.id]) {
      await fetchTripManifest(trip.id, trip.vid, routeId, trip.bookingDate);
    }
  };

  const fetchTripManifest = async (tripId, vehicleId, routeId, tripDateStr) => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDate);
    const dateStr = tripDateStr || d.toISOString().split('T')[0];
    try {
      const res = await axios.get(`${API}/bookings/trip-manifest?vehicle_id=${vehicleId}&date=${dateStr}&route_id=${routeId}`);
      setManifests(prev => ({ ...prev, [tripId]: res.data }));
    } catch (error) {

      console.error('Failed to fetch manifest', error);
    }
  };


  const unread = notifications.filter(n => !n.read_status).length;

  const handleStartTrip = async (id, meter, photo, attendance) => {
    const today = new Date().toISOString().split('T')[0];
    // Find the trip to get its routeId (for the bulk-update API)
    const trip = selectedTrip?.id === id ? selectedTrip : (trips.find(t => t.id === id) || historicalTrips.find(t => t.id === id));
    const routeId = trip?.routeId || id; // routeId is the actual DB route UUID
    const targetDate = trip?.bookingDate || today;
    
    if (myVehicle) {
      try {
        const payload = { ...myVehicle, vehicle_status: 'ON ROUTE' };
        await axios.put(`${API}/vehicles/${myVehicle.id}`, payload);
        
        // Sync bookings status to ON ROUTE for this specific route and DATE
        await axios.patch(`${API}/bookings/bulk-update`, {
          vehicle_id: myVehicle.id,
          route_id: routeId,
          booking_date: targetDate,
          status: 'ON ROUTE'
        });

        setMyVehicle(payload);
      } catch (e) {
        console.error('Failed to start trip:', e);
      }
    }
    setTrips(prev => prev.map(t => t.id === id ? { ...t, status: 'Active', startMeter: meter, attendance } : t));
    setSelectedTrip(prev => prev ? { ...prev, status: 'Active', startMeter: meter, attendance } : null);
  };

  const handleEndTrip = async (id, meter, note, finalStatus = 'Completed', bookingDate = null) => {
    const backendStatus = finalStatus === 'Completed' ? 'COMPLETED' : 'CANCELLED';
    // Find the trip to get its routeId
    const trip = selectedTrip?.id === id ? selectedTrip : (trips.find(t => t.id === id) || historicalTrips.find(t => t.id === id));
    const routeId = trip?.routeId || id;
    // Use provided bookingDate (for stuck/past trips) or trip's bookingDate or default to today
    const targetDate = bookingDate || trip?.bookingDate || new Date().toISOString().split('T')[0];

    if (myVehicle) {
      try {
        const addedKm = (finalStatus === 'Completed' && trip?.startMeter) ? (parseInt(meter) - parseInt(trip.startMeter)) : 0;

        const payload = { 
          ...myVehicle, 
          vehicle_status: 'Available',
          kilometers_driven: (myVehicle.kilometers_driven || 0) + (addedKm > 0 ? addedKm : 0)
        };
        await axios.put(`${API}/vehicles/${myVehicle.id}`, payload);
        
        // Sync bookings status using the real route UUID and correct date
        await axios.patch(`${API}/bookings/bulk-update`, {
          vehicle_id: myVehicle.id,
          route_id: routeId,
          booking_date: targetDate,
          status: backendStatus,
          reason: finalStatus === 'Cancelled' ? note : undefined
        });

        setMyVehicle(payload);
        
        if (finalStatus === 'Cancelled') {
           alert(`Trip Cancelled. Notification sent to employees with reason: ${note}`);
        }
      } catch (e) {
        console.error('Failed to end trip:', e);
      }
    }
    // Optimistically update local state
    setTrips(prev => prev.map(t => t.id === id ? { ...t, status: finalStatus, endMeter: meter, note } : t));
    
    // Full refresh from backend to sync all dashboards
    setTimeout(() => {
      window.location.reload();
    }, 1500);
    
    setSelectedTrip(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const stats = [
    { label: 'Active', value: globalStats.active, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: Navigation },
    { label: 'Upcoming', value: globalStats.upcoming, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', icon: Clock },
    { label: 'Completed', value: globalStats.completed, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', icon: CheckCircle2 },
    { label: 'Cancelled', value: globalStats.cancelled, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', icon: AlertCircle },
  ];


  const renderHome = () => (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 dark:shadow-none">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-blue-100 text-sm mb-1">Good {new Date().getHours() < 12 ? 'Morning' : 'Afternoon'} 👋</p>
            <h2 className="text-2xl font-bold mb-1">{driver.name || 'Driver'}</h2>
          </div>
          <button 
            onClick={() => setFuelModal(true)}
            className="flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold transition-all text-sm backdrop-blur-sm border border-white/30"
          >
            <Fuel className="h-4 w-4 mr-2" /> Log Fuel
          </button>
        </div>
        <div className="flex items-center gap-4 text-blue-100 text-sm mt-3">
          <span className="flex items-center gap-1.5"><Truck className="h-4 w-4" />{myVehicle ? myVehicle.vehicle_number : 'Unassigned'}</span>
          <span className="flex items-center gap-1.5"><ClipboardList className="h-4 w-4" />{trips.length} trips today</span>
        </div>
      </div>

      {/* ⚠️ Stuck Trip Alert — driver started a trip on a past date but never ended it */}
      {stuckTrip && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-800/40 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="font-bold text-red-800 dark:text-red-200 text-sm">Incomplete Trip Detected!</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-0.5">
                Trip <strong>{stuckTrip.routeName}</strong> from <strong>{stuckTrip.bookingDate}</strong> is still marked as <span className="font-mono bg-red-100 dark:bg-red-800/50 px-1 rounded">ON ROUTE</span>. You forgot to end it.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleEndTrip(stuckTrip.routeId, null, 'Trip ended retroactively by driver', 'Completed', stuckTrip.bookingDate)}
            className="flex-shrink-0 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-all active:scale-95 shadow-md"
          >
            ✅ End Trip Now
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div 
              key={s.label} 
              onClick={() => { setTripFilter(s.label); setActiveTab('trips'); }}
              className={`${s.bg} rounded-2xl p-4 flex flex-col gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-sm border border-transparent hover:border-${s.color.split('-')[1]}-200`}
            >
              <Icon className={`h-5 w-5 ${s.color}`} />
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Schedule Calendar Widget */}
      <div>
        <h3 className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Schedule Calendar</h3>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700 flex gap-2 overflow-x-auto custom-scrollbar">
          {Array.from({length: 14}).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const isSelected = selectedDate === i;
            const dateKey = date.toISOString().split('T')[0];
            return (
              <div 
                key={i} 
                onClick={() => setSelectedDate(i)}
                className={`flex flex-col items-center justify-center min-w-[70px] p-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-blue-600 text-white shadow-md scale-105' : 'bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-slate-600'}`}
              >
                <span className={`text-xs font-semibold ${isSelected ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className="text-lg font-bold mt-1">{date.getDate()}</span>
                <span className={`text-[10px] mt-1 font-medium ${isSelected ? 'text-blue-100' : 'text-gray-400 dark:text-slate-500'}`}>
                  {/* Today: show route count (driver's schedule). Future/past: show booking counts */}
                  {i === 0 ? `${trips.length} Routes` : `${dailyTripCounts[dateKey] || 0} Trips`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active & Upcoming Trips */}
      <div>
        <h3 className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          {selectedDate === 0 ? "Today's Trips" : `Trips on ${new Date(new Date().setDate(new Date().getDate() + selectedDate)).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`}
        </h3>
        {loading ? (
          <div className="flex justify-center p-8"><span className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" /></div>
        ) : trips.filter(t => ['Active', 'Upcoming'].includes(t.status)).length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center text-gray-500 shadow-sm border border-gray-100 dark:border-slate-700">
            <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="font-medium">{selectedDate === 0 ? 'No routes assigned' : 'No trips on this date'}</p>
            <p className="text-xs mt-1">{selectedDate === 0 ? 'Contact admin to assign routes to your vehicle.' : 'No confirmed bookings found for this date.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trips.filter(t => ['Active', 'Upcoming'].includes(t.status)).map(trip => (
              <TripCard 
                key={trip.id} 
                trip={{...trip, manifest: manifests[trip.id]}} 
                onSelect={handleSelectTrip} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Completed Trips */}
      {trips.filter(t => t.status === 'Completed').length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Completed Trips
          </h3>
          <div className="space-y-3">
            {trips.filter(t => t.status === 'Completed').map(trip => (
              <TripCard 
                key={trip.id} 
                trip={{...trip, manifest: manifests[trip.id]}} 
                onSelect={handleSelectTrip} 
              />
            ))}
          </div>
        </div>
      )}

      {/* Cancelled Trips */}
      {trips.filter(t => t.status === 'Cancelled').length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-red-500 dark:text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Cancelled Trips
          </h3>
          <div className="space-y-3 opacity-75">
            {trips.filter(t => t.status === 'Cancelled').map(trip => (
              <TripCard 
                key={trip.id} 
                trip={{...trip, manifest: manifests[trip.id]}} 
                onSelect={handleSelectTrip} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderTrips = () => {
    const filteredTrips = tripFilter === 'All' ? historicalTrips : historicalTrips.filter(t => t.status === tripFilter);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
            {tripFilter === 'All' ? 'All Assigned Trips' : `${tripFilter} Trips`}
          </h3>
          {tripFilter !== 'All' && (
            <button onClick={() => setTripFilter('All')} className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">View All</button>
          )}
        </div>
        {loading ? (
          <div className="flex justify-center p-8"><span className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" /></div>
        ) : filteredTrips.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center text-gray-500 shadow-sm border border-gray-100 dark:border-slate-700">No {tripFilter !== 'All' ? tripFilter.toLowerCase() : ''} trips found.</div>
        ) : filteredTrips.map(trip => (
          <TripCard 
            key={trip.id} 
            trip={{...trip, manifest: manifests[trip.id]}} 
            onSelect={handleSelectTrip} 
          />
        ))}
      </div>
    );
  };

  const renderNotifications = () => (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Notifications</h3>
      {notifications.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center text-gray-500 shadow-sm border border-gray-100 dark:border-slate-700">No notifications yet.</div>
      ) : notifications.map(n => (
        <div key={n.id} className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border shadow-sm transition-all ${!n.read_status ? 'border-blue-200 dark:border-blue-700' : 'border-gray-100 dark:border-slate-700'}`}>
          <div className="flex justify-between items-start">
            <h4 className={`font-semibold text-sm ${!n.read_status ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>{n.title || 'Notification'}</h4>
            {!n.read_status && <span className="w-2.5 h-2.5 bg-blue-500 rounded-full mt-1 shrink-0" />}
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{n.message || n.body}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">{n.created_at ? new Date(n.created_at).toLocaleString() : n.time}</p>
        </div>
      ))}
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-white text-3xl font-black">{(driver.name || 'D')[0]}</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{driver.name || 'Driver'}</h2>
        <p className="text-sm text-gray-400 dark:text-slate-400 mt-1">{driver.employee_id || 'DRV-001'}</p>
        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Active Driver
        </div>
      </div>

      {myVehicle ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="bg-gray-50 dark:bg-slate-900/50 px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-500" /> Assigned Vehicle Details
            </h3>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${myVehicle.vehicle_status === 'Active' || myVehicle.vehicle_status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{myVehicle.vehicle_status}</span>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide font-medium">Model / Name</p>
                <p className="font-bold text-gray-900 dark:text-white">{myVehicle.vehicle_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide font-medium">Reg Number</p>
                <p className="font-bold text-gray-900 dark:text-white">{myVehicle.vehicle_number}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide font-medium">Capacity</p>
                <p className="font-bold text-gray-900 dark:text-white">{myVehicle.capacity} Seats</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide font-medium">Odometer</p>
                <p className="font-bold text-gray-900 dark:text-white">{myVehicle.kilometers_driven || 0} km</p>
              </div>
            </div>
            
            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-slate-700">
              <h4 className="text-sm font-bold text-gray-700 dark:text-slate-300 mb-3">Maintenance Status</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-600 dark:text-slate-400">Service Limit</span>
                    <span className="font-bold text-gray-900 dark:text-white">{myVehicle.kilometers_driven || 0} / {myVehicle.maintenance_km || 50000} km</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, ((myVehicle.kilometers_driven || 0)/(myVehicle.maintenance_km || 50000))*100)}%` }}></div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide font-medium">Insurance Expiry</p>
                  <p className={`font-bold ${new Date(myVehicle.insurance_expiry) < new Date() ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                    {myVehicle.insurance_expiry ? new Date(myVehicle.insurance_expiry).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-8 text-center shadow-sm">
          <Truck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-gray-900 dark:text-white font-bold mb-1">No Vehicle Assigned</h3>
          <p className="text-sm text-gray-500">Contact admin to get a vehicle assignment.</p>
        </div>
      )}

      {[
        { label: 'Mobile', value: driver.mobile || 'N/A', icon: Phone },
        { label: 'License No', value: driver.license_number || 'N/A', icon: ClipboardList },
        { label: 'Total Trips', value: driver.total_trips || '0', icon: CheckCircle2 },
      ].map(item => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="bg-white dark:bg-slate-800 rounded-2xl px-5 py-4 border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-slate-500">{item.label}</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.value}</p>
            </div>
          </div>
        );
      })}

      <button onClick={handleLogout} className="w-full py-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-95 transition-all border border-red-100 dark:border-red-800">
        <LogOut className="h-5 w-5" /> Logout
      </button>
    </div>
  );

  const tabs = [
    { id: 'home', label: 'Home', icon: LayoutDashboard },
    { id: 'trips', label: 'Trips', icon: ClipboardList },
    { id: 'notifications', label: 'Alerts', icon: Bell, badge: unread },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row">
      {/* Top Bar for Mobile */}
      <header className="md:hidden bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 px-5 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow">
            <Truck className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black text-gray-900 dark:text-white leading-none">Revexy</h1>
            <p className="text-[10px] text-gray-400 dark:text-slate-500">Driver Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveTab('notifications')} className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <Bell className="h-5 w-5 text-gray-500 dark:text-slate-400" />
            {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">{unread}</span>}
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-black">{(driver.name || 'D')[0]}</span>
          </div>
        </div>
      </header>

      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-gray-100 dark:border-slate-700 h-screen sticky top-0 z-40 shrink-0">
        <div className="px-6 py-5 flex items-center gap-3 border-b border-gray-100 dark:border-slate-700">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow">
            <Truck className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black text-gray-900 dark:text-white leading-none">Revexy</h1>
            <p className="text-xs text-gray-400 dark:text-slate-500">Driver Portal</p>
          </div>
        </div>
        <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white text-sm font-black">{(driver.name || 'D')[0]}</span>
          </div>
          <div className="flex-1 min-w-0">
             <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{driver.name || 'Driver'}</p>
             <p className="text-xs text-blue-500 font-medium">Online • Vehicle active</p>
          </div>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${active ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:text-gray-900 dark:hover:text-white font-medium'}`}
              >
                <div className="relative shrink-0">
                  <Icon className={`h-5 w-5 transition-colors ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-slate-300'}`} />
                  {tab.badge > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold border-2 border-white dark:border-slate-800">{tab.badge}</span>}
                </div>
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto w-full relative">
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-8 pb-28 md:pb-8">
          <div className="md:px-2 lg:px-4">
            {activeTab === 'home' && renderHome()}
            {activeTab === 'trips' && renderTrips()}
            {activeTab === 'notifications' && renderNotifications()}
            {activeTab === 'profile' && renderProfile()}
          </div>
        </div>
      </main>

      {/* Bottom Nav for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 z-30 pb-safe shrink-0">
        <div className="flex px-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center py-3.5 gap-1 relative transition-colors ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'}`}
              >
                {tab.badge > 0 && <span className="absolute top-2 left-1/2 ml-2 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">{tab.badge}</span>}
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold">{tab.label}</span>
                {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Trip Detail Sheet */}
      {selectedTrip && (
        <TripDetailSheet
          trip={{...selectedTrip, manifest: manifests[selectedTrip.id]}}
          onClose={() => setSelectedTrip(null)}
          onStartTrip={handleStartTrip}
          onEndTrip={handleEndTrip}
        />
      )}

      {fuelModal && (
        <FuelLogModal 
          driver={driver}
          onClose={() => setFuelModal(false)}
        />
      )}

    </div>
  );
}

// Fuel Log Modal Component
function FuelLogModal({ driver, onClose }) {
  const [fuelType, setFuelType] = React.useState('Petrol');
  const [quantity, setQuantity] = React.useState('');
  const [cost, setCost] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quantity || !cost) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/analytics/fuel`, {
        driverId: driver.id,
        driverName: driver.name,
        vehicleId: driver.assigned_vehicle,
        fuelType,
        quantity: parseFloat(quantity),
        cost: parseFloat(cost)
      });
      setSuccess(true);
      setTimeout(() => { onClose(); }, 1500);
    } catch (err) {
      console.error('Failed to log fuel', err);
      alert('Failed to log fuel.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
            <Fuel className="h-5 w-5 mr-2 text-orange-500" /> Log Fuel/Charge
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Fuel Logged!</h4>
            <p className="text-sm text-gray-500">Record saved successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Fuel Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setFuelType('Petrol')} className={`py-2 rounded-xl border-2 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${fuelType === 'Petrol' ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' : 'border-gray-100 dark:border-slate-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                  <Droplet className="h-4 w-4" /> Petrol
                </button>
                <button type="button" onClick={() => setFuelType('Diesel')} className={`py-2 rounded-xl border-2 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${fuelType === 'Diesel' ? 'border-gray-800 bg-gray-100 text-gray-900 dark:border-gray-500 dark:bg-slate-700 dark:text-white' : 'border-gray-100 dark:border-slate-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                  <Droplet className="h-4 w-4" /> Diesel
                </button>
                <button type="button" onClick={() => setFuelType('Gas')} className={`py-2 rounded-xl border-2 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${fuelType === 'Gas' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'border-gray-100 dark:border-slate-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                  <Fuel className="h-4 w-4" /> Gas
                </button>
                <button type="button" onClick={() => setFuelType('EV')} className={`py-2 rounded-xl border-2 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${fuelType === 'EV' ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'border-gray-100 dark:border-slate-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                  <Zap className="h-4 w-4" /> EV Charge
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Quantity {fuelType === 'EV' ? '(kWh)' : (fuelType === 'Gas' ? '(kg)' : '(Liters)')}</label>
              <input 
                type="number" step="0.1" required value={quantity} onChange={e => setQuantity(e.target.value)}
                placeholder="e.g. 20.5"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Total Cost (₹)</label>
              <input 
                type="number" required value={cost} onChange={e => setCost(e.target.value)}
                placeholder="e.g. 2500"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 dark:text-white"
              />
            </div>

            <button disabled={submitting} className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 mt-4 disabled:opacity-50">
              {submitting ? 'Saving...' : 'Save Fuel Record'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
