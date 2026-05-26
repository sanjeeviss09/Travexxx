import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { API } from '../config/api.js';
import { 
  Car, Clock, Calendar as CalendarIcon, MapPin, CheckCircle, 
  AlertCircle, Users, Activity, X, Star, ThumbsUp, ThumbsDown,
  CheckCircle2, AlertTriangle, Bell, Info
} from 'lucide-react';



// Timezone-safe date helper functions
const parseDateString = (dateStr) => {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
};

const parsePickupPoint = (text) => {
  if (!text) return { location: '—', isRoundTrip: false, isSameVehicle: false, isOutbound: false, isReturn: false, isInBetween: false };
  
  let cleanText = text;
  
  const isRoundTrip = /\[ROUND TRIP\]/i.test(cleanText);
  const isSameVehicle = /\(Same Vehicle\)/i.test(cleanText) || /\(Same Cab\)/i.test(cleanText);
  const isOutbound = /\(Outbound\)/i.test(cleanText);
  const isReturn = /\(Return\)/i.test(cleanText);
  const isInBetween = /\[IN-BETWEEN\]/i.test(cleanText);
  
  // Clean all tag prefixes
  cleanText = cleanText
    .replace(/\[ROUND TRIP\]/gi, '')
    .replace(/\(Same Vehicle\)/gi, '')
    .replace(/\(Same Cab\)/gi, '')
    .replace(/\(Outbound\)/gi, '')
    .replace(/\(Return\)/gi, '')
    .replace(/\[IN-BETWEEN\]/gi, '')
    .trim();
    
  // If it's a JSON array or has quotes
  try {
    if (cleanText.startsWith('[') || cleanText.startsWith('"')) {
      const parsed = JSON.parse(cleanText);
      if (Array.isArray(parsed)) {
        cleanText = parsed.join(' → ');
      } else {
        cleanText = String(parsed);
      }
    }
  } catch (e) {
    // Keep it but remove quotes/brackets manually if parse fails
    cleanText = cleanText
      .replace(/\\"/g, '')
      .replace(/"/g, '')
      .replace(/\[/g, '')
      .replace(/\]/g, '');
  }

  // Final trim and cleanup
  cleanText = cleanText
    .replace(/\\"/g, '')
    .replace(/"/g, '')
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .trim();
    
  return {
    location: cleanText || '—',
    isRoundTrip,
    isSameVehicle,
    isOutbound,
    isReturn,
    isInBetween
  };
};

const renderPickupPoint = (text, compact = false) => {
  const { location, isRoundTrip, isSameVehicle, isOutbound, isReturn, isInBetween } = parsePickupPoint(text);
  
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-gray-600 dark:text-slate-300">
        <span className="flex items-center gap-0.5">
          {isRoundTrip && <span title="Round Trip" className="text-xs">🔄</span>}
          {isSameVehicle && <span title="Same Cab" className="text-xs">🚗</span>}
          {isOutbound && <span title="Outbound" className="text-[9px] px-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold uppercase tracking-wider">OUT</span>}
          {isReturn && <span title="Return" className="text-[9px] px-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-bold uppercase tracking-wider">RET</span>}
          {isInBetween && <span title="In-Between" className="text-xs">📍</span>}
        </span>
        <span className="font-semibold text-xs truncate max-w-[120px]">{location}</span>
      </span>
    );
  }
  
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-1 justify-start max-w-[200px]">
        {isRoundTrip && (
          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-bold text-[9px] uppercase tracking-wider flex items-center gap-0.5 border border-blue-100 dark:border-blue-800">
            🔄 Round Trip
          </span>
        )}
        {isSameVehicle && (
          <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-bold text-[9px] uppercase tracking-wider flex items-center gap-0.5 border border-indigo-100 dark:border-indigo-800">
            🚗 Same Cab
          </span>
        )}
        {isOutbound && (
          <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400 font-bold text-[9px] uppercase tracking-wider flex items-center gap-0.5 border border-sky-100 dark:border-sky-800">
            Outbound
          </span>
        )}
        {isReturn && (
          <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 font-bold text-[9px] uppercase tracking-wider flex items-center gap-0.5 border border-purple-100 dark:border-purple-800">
            Return
          </span>
        )}
        {isInBetween && (
          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 font-bold text-[9px] uppercase tracking-wider flex items-center gap-0.5 border border-amber-100 dark:border-amber-800">
            📍 In-Between
          </span>
        )}
      </div>
      <span className="font-semibold text-gray-700 dark:text-gray-200 text-xs text-left truncate max-w-[180px]" title={location}>
        {location}
      </span>
    </div>
  );
};

const getLocalDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function EmployeeDashboard() {
  const location = useLocation();
  const isMyBookings = location.pathname === '/my-bookings';
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [todayVehicles, setTodayVehicles] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [feedbackModal, setFeedbackModal] = useState({ show: false, bookingId: null, driverId: null });
  const [driverList, setDriverList] = useState([]);
  const [selectedDate, setSelectedDate] = useState(0);
  const [cancelConfirm, setCancelConfirm] = useState(null); // bookingId pending cancel
  const [cancelError, setCancelError] = useState(null);

  const fetchAll = React.useCallback(async () => {
      try {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + selectedDate);
        const dateStr = getLocalDateString(targetDate);

        // Fetch routes for selected date and drivers always
        const [routesRes, driversRes] = await Promise.all([
          axios.get(`${API}/routes?date=${dateStr}`),
          axios.get(`${API}/drivers`),
        ]);

        let bookingsData = [];
        let notifsData = [];
        
        if (user.id) {
          try {
            const bRes = await axios.get(`${API}/bookings?employee_id=${user.id}`);
            bookingsData = Array.isArray(bRes.data) ? bRes.data : [];
          } catch (e) { console.warn('Bookings fetch failed:', e.message); }
          
          try {
            const nRes = await axios.get(`${API}/bookings/notifications?user_id=${user.id}`);
            notifsData = Array.isArray(nRes.data) ? nRes.data : [];
          } catch (e) { console.warn('Notifications fetch failed:', e.message); }
        }

        // Build driver map keyed by assigned vehicle id
        const driversMap = {};
        driversRes.data.forEach(d => {
          if (d.assigned_vehicle) driversMap[d.assigned_vehicle] = d;
        });
        setDriverList(driversRes.data);

        // Build live vehicle status from routes
        const liveData = routesRes.data.map(route => {
          const vehicle = route.vehicles;
          if (!vehicle) return null;
          const driver = driversMap[vehicle.id];
          return {
            id: vehicle.vehicle_number,
            type: vehicle.vehicle_name,
            route: route.route_name,
            status: vehicle.vehicle_status || 'Active',
            capacity: vehicle.capacity || 1,
            occupied: route.occupied || 0,
            driver: driver ? driver.name : 'Unassigned',
            rating: driver ? (parseFloat(driver.ratings) || 'N/A') : 'N/A',
            vid: vehicle.id,
          };
        }).filter(Boolean);
        setTodayVehicles(liveData);

        // Sort bookings by id to ensure consistent seat assignment
        const sortedBookings = [...bookingsData].sort((a, b) => {
          if (!a?.id) return -1;
          if (!b?.id) return 1;
          return a.id.localeCompare(b.id);
        });

        // Map real bookings
        const mappedBookings = sortedBookings.map(bk => {
          const bkDate = parseDateString(bk.booking_date);
          const today = new Date(); today.setHours(0,0,0,0);
          const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
          const bkDay = new Date(bkDate); bkDay.setHours(0,0,0,0);
          let dateLabel = bkDay.getTime() === today.getTime() ? 'Today'
            : bkDay.getTime() === tomorrow.getTime() ? 'Tomorrow'
            : bkDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
          
          let displayStatus = bk.status;
          if (bk.status === 'CONFIRMED') displayStatus = 'Confirmed';
          else if (bk.status === 'WAITLISTED') displayStatus = 'Waitlisted';
          else if (bk.status === 'COMPLETED') displayStatus = 'Completed';
          else if (bk.status === 'ON ROUTE') displayStatus = 'On Route';
          else if (bk.status === 'CANCELLED') displayStatus = 'Cancelled';
          else if (bk.status?.startsWith('CANCELLED')) displayStatus = bk.status.replace('CANCELLED', 'Cancelled');

          const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);
          const bkDayCheck = parseDateString(bk.booking_date); bkDayCheck.setHours(0,0,0,0);
          const isPast = bkDayCheck.getTime() < todayMidnight.getTime();

          let finalTime = bk.vehicles?.estimated_time || bk.routes?.estimated_time;
          if (!finalTime && bk.pickup_point?.startsWith('[')) {
            const match = bk.pickup_point.match(/^\[(.*?)\]/);
            if (match) finalTime = match[1];
          }

          // Dynamically assign seat number if missing
          let calculatedSeat = '—';
          if (['CONFIRMED', 'ON ROUTE', 'COMPLETED'].includes(bk.status) && bk.vehicle_id) {
             const sameTripBookings = sortedBookings.filter(b => 
               b.booking_date === bk.booking_date && 
               b.vehicle_id === bk.vehicle_id &&
               b.route_id === bk.route_id &&
               ['CONFIRMED', 'ON ROUTE', 'COMPLETED'].includes(b.status)
             );
             const seatIndex = sameTripBookings.findIndex(b => b.id === bk.id);
             if (seatIndex >= 0) calculatedSeat = `S-${String(seatIndex + 1).padStart(2, '0')}`;
          }

          return {
            id: bk.id,
            rawDate: bk.booking_date,
            dateLabel,
            time: finalTime || '—',
            dest: bk.destination,
            status: displayStatus,
            vehicle: bk.vehicles ? bk.vehicles.vehicle_number : 'Pending',
            seat: bk.seat_number || calculatedSeat,
            pickup: bk.pickup_point,
            driverId: driversRes.data.find(d => d.assigned_vehicle === bk.vehicle_id)?.id || null,
            driverName: driversRes.data.find(d => d.assigned_vehicle === bk.vehicle_id)?.name || 'Unassigned',
            needsFeedback: bk.status === 'COMPLETED' && !bk.feedback_given,
            waitlist_pos: bk.waitlists && bk.waitlists.length > 0 ? bk.waitlists[0].waitlist_position : null,
            isPast,
          };
        });
        setUpcomingBookings(mappedBookings);

        // Notifications
        setNotifications(notifsData);
      } catch (err) {
        console.error('EmployeeDashboard fetch error:', err);
      }
  }, [user.id, selectedDate]);

  useEffect(() => {
    fetchAll();
    
    // Real-time listener for instant status updates
    let channel = supabase.channel('employee_realtime');
    
    if (user && user.id) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `employee_id=eq.${user.id}` }, fetchAll);
    }
    
    channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, fetchAll).subscribe();

    const interval = setInterval(fetchAll, 30000); // Polling backup
    
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchAll, user.id]);

  const unreadCount = notifications.filter(n => !n.read_status).length;

  const filteredBookings = upcomingBookings.filter(bk => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDate);
    const targetDateStr = getLocalDateString(d);
    // Some databases return Date types with time attached, extract just the YYYY-MM-DD part
    const bkDate = bk.rawDate ? bk.rawDate.split('T')[0] : '';
    return bkDate === targetDateStr;
  });

  const handleSubmitFeedback = async (rating, onTime) => {
    if (!feedbackModal.driverId) return;
    try {
      await axios.post(`${API}/drivers/${feedbackModal.driverId}/feedback`, { rating, onTime });
      setUpcomingBookings(prev => prev.map(bk => bk.id === feedbackModal.bookingId ? { ...bk, needsFeedback: false } : bk));
      setFeedbackModal({ show: false, bookingId: null, driverId: null });
    } catch (err) {
      console.error('Failed to submit feedback', err);
    }
  };

  const handleCancelTrip = async (bookingId) => {
    setCancelError(null);
    try {
      await axios.post(`${API}/bookings/${bookingId}/cancel`);
      setUpcomingBookings(prev => prev.map(bk =>
        bk.id === bookingId ? { ...bk, status: 'Cancelled (Self)' } : bk
      ));
      setCancelConfirm(null);
      setTimeout(() => fetchAll(), 1500);
    } catch (err) {
      console.error('Failed to cancel trip', err);
      setCancelError('Failed to cancel. Please try again.');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {!isMyBookings && (
        <>
          {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-900 rounded-2xl p-4 sm:p-6 3xl:p-8 text-white shadow-md flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl 3xl:text-3xl font-bold mb-1">Welcome back, {user.name}!</h1>
          <p className="text-blue-100 opacity-90 text-sm 3xl:text-base">Here is the transport status for today.</p>
        </div>
        {unreadCount > 0 && (
          <div className="flex-shrink-0 bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3 text-center">
            <p className="text-2xl font-black">{unreadCount}</p>
            <p className="text-xs text-blue-100">New Alert{unreadCount > 1 ? 's' : ''}</p>
          </div>
        )}
      </div>

      {/* Notifications Panel */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recent Notifications</h3>
            <div className="flex items-center space-x-3">
              {notifications.some(n => !n.read_status) && (
                <button
                  onClick={async () => {
                    const unread = notifications.filter(n => !n.read_status);
                    await Promise.all(unread.map(n => axios.patch(`${API}/bookings/notifications/${n.id}/read`)));
                    setNotifications(prev => prev.map(n => ({ ...n, read_status: true })));
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                >
                  Mark all as read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={async () => {
                    await axios.delete(`${API}/bookings/notifications/clear?user_id=${user.id}`);
                    setNotifications([]);
                  }}
                  className="text-xs text-gray-400 hover:text-red-500 font-semibold transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
          {notifications.slice(0, 5).map(n => {
            const isCancellation = n.message?.toLowerCase().includes('cancel');
            return (
              <div key={n.id} className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                isCancellation && !n.read_status
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                  : !n.read_status
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                  : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700'
              }`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  isCancellation && !n.read_status ? 'bg-red-500' : !n.read_status ? 'bg-blue-500' : 'bg-gray-300'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${
                    isCancellation && !n.read_status
                      ? 'font-semibold text-red-800 dark:text-red-200'
                      : !n.read_status
                      ? 'font-semibold text-blue-800 dark:text-blue-200'
                      : 'text-gray-700 dark:text-slate-300'
                  }`}>{n.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 3xl:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Left Column: Calendar & Today's Vehicles */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Today's Vehicle Status (General Dashboard) */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                <Activity className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                Live Vehicle Status
              </h2>
            </div>
            <div className="p-5 space-y-4">
              {todayVehicles.length === 0 ? (
                <div className="text-center py-6 text-gray-500">No live vehicles right now.</div>
              ) : todayVehicles.map(vehicle => (
                <div key={vehicle.vid} className="border border-gray-100 dark:border-slate-700 rounded-xl p-4 hover:shadow-md dark:hover:bg-slate-700/50 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">{vehicle.route}</h3>
                      <p className="text-sm text-gray-500 dark:text-slate-400 flex items-center mt-1">
                        <Car className="h-4 w-4 mr-1" /> {vehicle.id} • {vehicle.type}
                      </p>
                      <div className="flex items-center mt-2 space-x-3">
                        <div className="flex items-center text-xs bg-gray-50 dark:bg-slate-900 px-2 py-1 rounded border border-gray-100 dark:border-slate-700">
                          <Users className="h-3 w-3 mr-1 text-blue-500" />
                          <span className="text-gray-600 dark:text-slate-300">Driver: {vehicle.driver}</span>
                        </div>
                        <div className="flex items-center text-xs bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400">
                          ⭐ {vehicle.rating}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      vehicle.status === 'On Route' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    }`}>
                      {vehicle.status}
                    </span>
                  </div>
                  
                  {/* Seating Progress */}
                  <div>
                    <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">
                      <span>Seats Occupied</span>
                      <span>{vehicle.occupied} / {vehicle.capacity}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${vehicle.occupied === vehicle.capacity ? 'bg-red-500' : 'bg-blue-500 dark:bg-blue-400'}`} 
                        style={{ width: `${(vehicle.occupied / vehicle.capacity) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule Calendar */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                My Schedule
              </h2>
              <span className="text-xs text-gray-400">{new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'})}</span>
            </div>

            {/* 7-day strip */}
            <div className="px-5 pt-4 pb-2 flex gap-2 overflow-x-auto">
              {Array.from({length: 7}).map((_, i) => {
                const date = new Date();
                date.setDate(date.getDate() + i);
                const isSelected = selectedDate === i;
                const hasBooking = upcomingBookings.some(b => {
                   const bkDateStr = b.rawDate ? b.rawDate.split('T')[0] : '';
                   const currDateStr = getLocalDateString(date);
                   return bkDateStr === currDateStr;
                });
                return (
                  <div 
                    key={i} 
                    onClick={() => setSelectedDate(i)}
                    className={`flex flex-col items-center justify-center min-w-[56px] py-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-blue-600 text-white shadow-md scale-105' : 'bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-slate-600'}`}
                  >
                    <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'}`}>{date.toLocaleDateString('en-US',{weekday:'short'})}</span>
                    <span className="text-base font-black mt-0.5">{date.getDate()}</span>
                    {hasBooking && <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-yellow-300' : 'bg-blue-500'}`} />}
                  </div>
                );
              })}
            </div>

            {/* Bookings list */}
            <div className="p-5 space-y-3">
              {filteredBookings.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">No bookings for this date.</div>
              ) : filteredBookings.map(bk => (
                <div key={bk.id} className="flex items-center p-4 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-700 hover:shadow-sm transition-all">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center flex-shrink-0 mr-4">
                    <span className="text-[9px] font-bold text-gray-500 dark:text-slate-400 uppercase">{bk.dateLabel}</span>
                    <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">{new Date(bk.rawDate).getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate flex items-center text-sm">
                      <MapPin className="h-3.5 w-3.5 mr-1 text-gray-400 flex-shrink-0" /> {bk.dest}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 flex items-center">
                      <Clock className="h-3 w-3 mr-1" /> {bk.time}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                      Seat: <span className="font-bold text-gray-700 dark:text-slate-300 mr-2">{bk.seat}</span> 
                      Driver: <span className="font-bold text-gray-700 dark:text-slate-300">{bk.driverName}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-3">
                    <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${
                      bk.status === 'Confirmed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : bk.status === 'Completed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : bk.status === 'On Route' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                      : bk.status?.includes('Cancelled') ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    }`}>{bk.status === 'Waitlisted' && bk.waitlist_pos ? `Waitlist #${bk.waitlist_pos}` : bk.status}</span>
                    
                    {(bk.status === 'Confirmed' || bk.status === 'Waitlisted') && (
                      cancelConfirm === bk.id ? (
                        <div className="flex flex-col items-end gap-1">
                          <p className="text-[11px] text-gray-500 dark:text-slate-400 text-right leading-tight">Cancel your seat?<br/>Waitlist will be promoted.</p>
                          {cancelError && <p className="text-[10px] text-red-500">{cancelError}</p>}
                          <div className="flex gap-1.5">
                            <button onClick={() => { setCancelConfirm(null); setCancelError(null); }} className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 font-semibold">Keep</button>
                            <button onClick={() => handleCancelTrip(bk.id)} className="text-[11px] px-2.5 py-1 rounded-lg bg-red-600 text-white font-semibold">Yes, Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setCancelConfirm(bk.id); setCancelError(null); }} className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors border border-red-100 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                          Cancel Trip
                        </button>
                      )
                    )}

                    {bk.status === 'Completed' && bk.needsFeedback && (
                      <button
                        onClick={() => setFeedbackModal({ show: true, bookingId: bk.id, driverId: bk.driverId })}
                        className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                      >
                        ⭐ Rate Trip
                      </button>
                    )}
                    {bk.status === 'Completed' && !bk.needsFeedback && (
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Rated</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Mini Profile & Settings Teaser */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 text-center transition-colors">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-500/20 overflow-hidden shrink-0">
              {user?.profile_pic ? (
                <img src={user.profile_pic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.name?.[0] || 'A'
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-4">{user.name}</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">{user.designation} • {user.department}</p>
            <div className="pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-between text-sm">
              <span className="text-gray-500 dark:text-slate-400">Priority Level</span>
              <span className="font-semibold text-gray-900 dark:text-white px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded-md">Lvl {user.priority_level || 5}</span>
            </div>
          </div>
        </div>

      </div>
      </>
      )}

      {isMyBookings && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors">
          <div className="p-6 border-b border-gray-100 dark:border-slate-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Trip History</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">A detailed list of all your past and upcoming transport bookings.</p>
          </div>
          <div className="p-6">
            {upcomingBookings.length === 0 ? (
              <div className="text-center py-10 text-gray-500">No bookings found in your history.</div>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.map(bk => (
                  <div key={bk.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-700 hover:shadow-sm transition-all gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase">{bk.dateLabel}</span>
                        <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">{parseDateString(bk.rawDate).getDate()}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-base flex items-center mb-1">
                          <MapPin className="h-4 w-4 mr-1.5 text-blue-500" /> {bk.dest}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-slate-400">
                          <span className="flex items-center"><Clock className="h-3.5 w-3.5 mr-1" /> {bk.time}</span>
                          <span className="flex items-center"><Car className="h-3.5 w-3.5 mr-1" /> {bk.vehicle}</span>
                          <span className="flex items-center"><Users className="h-3.5 w-3.5 mr-1" /> Seat: <strong className="ml-1 text-gray-700 dark:text-slate-300">{bk.seat}</strong></span>
                          <span className="flex items-center gap-1">{renderPickupPoint(bk.pickup, true)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 border-t md:border-t-0 md:border-l border-gray-200 dark:border-slate-700 pt-4 md:pt-0 md:pl-6">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                        bk.status === 'Confirmed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : bk.status === 'Completed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : bk.status === 'On Route' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                        : bk.status?.includes('Cancelled') ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {bk.status === 'Waitlisted' && bk.waitlist_pos ? `Waitlist #${bk.waitlist_pos}` : bk.status}
                      </span>
                      
                      {(bk.status === 'Confirmed' || bk.status === 'Waitlisted') && !bk.isPast && (
                        cancelConfirm === bk.id ? (
                          <div className="flex flex-col items-end gap-1">
                            <p className="text-[11px] text-gray-500 dark:text-slate-400 text-right">Confirm cancellation?</p>
                            {cancelError && <p className="text-[10px] text-red-500">{cancelError}</p>}
                            <div className="flex gap-1.5">
                              <button onClick={() => { setCancelConfirm(null); setCancelError(null); }} className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 font-semibold">Keep</button>
                              <button onClick={() => handleCancelTrip(bk.id)} className="text-[11px] px-2.5 py-1 rounded-lg bg-red-600 text-white font-semibold">Yes, Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setCancelConfirm(bk.id); setCancelError(null); }} className="text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-100 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                            Cancel Trip
                          </button>
                        )
                      )}
                      
                      {bk.status === 'Completed' && bk.needsFeedback && (
                        <button
                          onClick={() => setFeedbackModal({ show: true, bookingId: bk.id, driverId: bk.driverId })}
                          className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-lg shadow-sm transition-colors"
                        >
                          ⭐ Rate Trip
                        </button>
                      )}
                      {bk.status === 'Completed' && !bk.needsFeedback && (
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center"><CheckCircle className="h-3.5 w-3.5 mr-1" /> Rated</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {feedbackModal.show && (
        <FeedbackModal 
          onClose={() => setFeedbackModal({ show: false, bookingId: null, driverId: null })}
          onSubmit={handleSubmitFeedback}
        />
      )}
    </div>
  );
}

function FeedbackModal({ onClose, onSubmit }) {
  const [rating, setRating] = useState(5);
  const [onTime, setOnTime] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSubmit(rating, onTime);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-700">
        <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
          <Star className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Trip Completed!</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">How was your experience with the driver today?</p>
        
        <div className="flex justify-center space-x-2 mb-6">
          {[1, 2, 3, 4, 5].map(star => (
            <button key={star} onClick={() => setRating(star)} className="focus:outline-none transition-transform hover:scale-110">
              <Star className={`h-8 w-8 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-slate-600'}`} />
            </button>
          ))}
        </div>

        <div className="mb-8">
          <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">Was the trip on time?</p>
          <div className="flex justify-center space-x-4">
            <button 
              onClick={() => setOnTime(true)}
              className={`flex items-center px-4 py-2 rounded-xl border-2 font-medium transition-colors ${onTime ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-400'}`}
            >
              <ThumbsUp className="h-4 w-4 mr-2" /> Yes
            </button>
            <button 
              onClick={() => setOnTime(false)}
              className={`flex items-center px-4 py-2 rounded-xl border-2 font-medium transition-colors ${!onTime ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-400'}`}
            >
              <ThumbsDown className="h-4 w-4 mr-2" /> No
            </button>
          </div>
        </div>

        <div className="flex space-x-3">
          <button onClick={onClose} disabled={submitting} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-bold rounded-xl transition-colors">Skip</button>
          <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-200 dark:shadow-none disabled:opacity-50">
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
