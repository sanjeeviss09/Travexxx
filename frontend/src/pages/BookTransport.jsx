import React, { useState, useMemo, useEffect } from 'react';
import { Truck, Clock, MapPin, Calendar, CheckCircle, AlertCircle,
  ArrowRight, ArrowLeft, Car, Briefcase, Check, Navigation, Star, Home, Sunset } from 'lucide-react';
import axios from 'axios';

const API = window.location.origin.includes('5173') ? `http://${window.location.hostname}:5000/api` : '/api';

/** Parse pickup_points which can be JSON array string or plain string */
function formatPickup(raw) {
  if (!raw) return '—';
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.join(' → ');
    return String(parsed);
  } catch {
    return String(raw);
  }
}

const STEPS = [
  { num: 1, title: 'When', icon: Calendar },
  { num: 2, title: 'Route',  icon: MapPin },
  { num: 3, title: 'Type',  icon: Car },
  { num: 4, title: 'Confirm', icon: Check },
];


export default function BookTransport() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    timeSlot: '',
    route_id: '',
    pickup: '',
    tripType: 'one_way', // 'one_way' or 'round_trip'
    returnType: 'same_vehicle', // 'same_vehicle' or 'different_route'
    returnRouteId: '',
    returnTimeSlot: '',
    destination: '',
    inBetween: false,
    requestedPickup: '',
    type: 'Regular',
    reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [error, setError] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Fetch smart routes whenever date changes
  useEffect(() => {
    if (!formData.date) return;
    setRoutesLoading(true);
    axios.get(`${API}/bookings/smart-routes?date=${formData.date}`)
      .then(r => {
        if (Array.isArray(r.data)) {
          setRoutes(r.data);
        } else {
          setError('API returned invalid format (expected array)');
          setRoutes([]);
        }
      })
      .catch(err => {
        console.error('Error fetching routes:', err);
        setError('Failed to fetch available routes from server.');
        setRoutes([]);
      })
      .finally(() => setRoutesLoading(false));
  }, [formData.date]);

  const selectedRoute = routes.find(r => r.id === formData.route_id);
  // Return routes = routes whose pickup starts at the selected outbound route's destination
  const returnRoutes = useMemo(() => {
    if (!selectedRoute) return routes;
    return routes.filter(r =>
      r.route_start_base?.toLowerCase().trim() === selectedRoute.destination?.toLowerCase().trim()
    );
  }, [selectedRoute, routes]);



  const nextStep = () => {
    if (step === 1 && !formData.date) {
      setError('Please select a date.'); return;
    }
    if (step === 2 && !formData.route_id) {
      setError('Please select a transport route.'); return;
    }
    if (step === 2 && formData.inBetween && !formData.requestedPickup) {
      setError('Please specify your pickup point.'); return;
    }
    if (step === 2 && formData.tripType === 'round_trip' && formData.returnType === 'different_route' && !formData.returnRouteId) {
      setError('Please select a return route.'); return;
    }
    if (step === 3 && formData.type === 'External' && !formData.reason) {
      setError('Please provide a reason for the special request.'); return;
    }
    setError(null);
    setStep(p => p + 1);
  };

  const handleSubmit = async () => {
    setLoading(true); setError(null);
    try {
      let isRoundTripDiff = formData.tripType === 'round_trip' && formData.returnType === 'different_route';
      let tripLabel = '';
      if (formData.tripType === 'round_trip') {
        tripLabel = formData.returnType === 'same_vehicle' ? '[ROUND TRIP] (Same Vehicle) ' : '[ROUND TRIP] (Outbound) ';
      }

      const payload = {
        employee_id: user.id,
        route_id: formData.route_id,
        date: formData.date,
        timeSlot: selectedRoute?.estimated_time || formData.date,
        pickup: `${tripLabel}${formData.inBetween
          ? `[IN-BETWEEN] ${formData.requestedPickup}`
          : selectedRoute?.pickup_points}`,
        destination: selectedRoute?.destination,
        type: formData.type === 'External' ? 'OTHER' : 'REGULAR',
        reason: formData.type === 'External' ? formData.reason : null,
        passengerCount: 1,
        urgency: 'NORMAL',
        status: 'CONFIRMED',
      };
      
      const res = await axios.post(`${API}/bookings/request`, payload);

      if (isRoundTripDiff) {
        const returnRoute = routes.find(r => r.id === formData.returnRouteId);
        const payloadReturn = {
          employee_id: user.id,
          route_id: formData.returnRouteId,
          date: formData.date,
          timeSlot: formData.returnTimeSlot,
          pickup: `[ROUND TRIP] (Return) ${returnRoute?.pickup_points}`,
          destination: returnRoute?.destination,
          type: formData.type === 'External' ? 'OTHER' : 'REGULAR',
          reason: formData.type === 'External' ? formData.reason : null,
          passengerCount: 1,
          urgency: 'NORMAL',
          status: 'CONFIRMED',
        };
        await axios.post(`${API}/bookings/request`, payloadReturn);
      }

      setBookingResult(res.data);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to book transport. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── SUCCESS STATE ── */
  if (success) {
    const isWait = bookingResult?.status === 'WAITLISTED';
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="card p-10 text-center">
          <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
            isWait ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-green-50 dark:bg-green-900/20'
          }`}>
            {isWait
              ? <AlertCircle className="h-9 w-9 text-amber-500" />
              : <CheckCircle className="h-9 w-9 text-green-500" />}
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
            {isWait ? 'Added to Waitlist' : '🎉 Booking Confirmed!'}
          </h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
            {isWait
              ? `All seats are full. You're #${bookingResult?.waitlist_position || '?'} on the waitlist. We'll notify you when a seat opens.`
              : 'Your seat is reserved. Check your email for confirmation details.'}
          </p>
          {isWait && (
            <div className="mb-6 inline-flex items-center gap-2 px-5 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
              <span className="text-amber-600 dark:text-amber-400 font-black text-xl">#{bookingResult?.waitlist_position}</span>
              <span className="text-amber-500 text-sm font-medium">in queue</span>
            </div>
          )}
          <button
            onClick={() => { setSuccess(false); setStep(1); setBookingResult(null); setFormData({ ...formData, timeSlot: '', route_id: '', type: 'Regular', reason: '' }); }}
            className="btn-primary w-full"
          >
            Book Another Trip <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  /* ── MAIN FORM ── */
  return (
    <div className="max-w-2xl mx-auto">
      <div className="card overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Book Transport</h2>
              <p className="text-blue-100/70 text-xs">Step {step} of 4 — {STEPS[step-1].title}</p>
            </div>
          </div>

          {/* Progress steps */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => {
              const done = step > s.num;
              const active = step === s.num;
              const Icon = s.icon;
              return (
                <React.Fragment key={s.num}>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    done ? 'bg-green-400/20 text-green-200'
                    : active ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-blue-200/40'
                  }`}>
                    {done
                      ? <Check className="h-3 w-3" />
                      : <Icon className="h-3 w-3" />}
                    <span className="hidden sm:inline">{s.title}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 rounded-full ${done ? 'bg-green-400/40' : 'bg-white/10'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-6">
          {error && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 text-red-700 dark:text-red-300 px-4 py-3.5 rounded-2xl text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* ── STEP 1: Date ── */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">When are you traveling?</h3>
                <p className="text-sm text-gray-400 dark:text-slate-500">Choose your travel date. Available routes and their time slots will load automatically.</p>
              </div>

              {/* Date picker */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Travel Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    min={todayStr}
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value, route_id: '', returnRouteId: '' })}
                    className="input-field pl-12"
                  />
                </div>
              </div>

              {/* Info banner */}
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl">
                <Navigation className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Smart Route Matching</p>
                  <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5 leading-relaxed">
                    On the next step, we'll show you routes available from the vehicle's current base location for your chosen date — along with live seat availability and time slots.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Route Selection ── */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Select Your Route</h3>
                <p className="text-sm text-gray-400 dark:text-slate-500">Choose the transport route that fits your commute.</p>
              </div>

              <div className="space-y-2.5">
                {routesLoading ? (
                  <div className="py-8 text-center text-gray-400">
                    <div className="h-6 w-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading smart routes for {formData.date}…</p>
                  </div>
                ) : routes.length === 0 ? (
                  <div className="py-8 text-center text-gray-400">
                    <Navigation className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No routes available</p>
                  </div>
                ) : routes.map(route => {
                  const isSelected = formData.route_id === route.id;
                  const pickup = formatPickup(route.pickup_points);
                  const isMorning = route.slot_period === 'Morning';
                  const seatsLeft = route.available_seats ?? route.vehicles?.capacity ?? '?';
                  const seatsColor = seatsLeft === 0 ? 'text-red-500' : seatsLeft <= 2 ? 'text-amber-500' : 'text-green-600';
                  return (
                    <button key={route.id} type="button"
                      disabled={seatsLeft === 0}
                      onClick={() => setFormData({ ...formData, route_id: route.id })}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                        seatsLeft === 0
                          ? 'opacity-50 cursor-not-allowed border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/30'
                          : isSelected
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                          : 'border-gray-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 bg-white dark:bg-slate-800'
                      }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'bg-blue-600 text-white' : isMorning ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600'
                          }`}>
                            {isMorning ? <Clock className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`font-bold text-sm ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                                {route.route_name}
                              </p>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                isMorning ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                              }`}>{route.slot_period}</span>
                              {route.base_match === false && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">Vehicle relocating</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500 dark:text-slate-400">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{pickup}</span>
                              <ArrowRight className="h-3 w-3 flex-shrink-0" />
                              <span className="font-medium text-gray-700 dark:text-slate-300 truncate">{route.destination}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                              {route.estimated_time && (
                                <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
                                  <Clock className="h-3 w-3" />
                                  <span className="font-semibold">{route.estimated_time}</span>
                                </div>
                              )}
                              <div className={`flex items-center gap-1 text-xs font-semibold ${seatsColor}`}>
                                <span>{seatsLeft === 0 ? 'Full' : `${seatsLeft} seat${seatsLeft !== 1 ? 's' : ''} left`}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <Check className="h-3.5 w-3.5 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Trip Type (One Way / Round Trip) */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Trip Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button"
                      onClick={() => setFormData({ ...formData, tripType: 'one_way', returnRouteId: '', returnTimeSlot: '' })}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                        formData.tripType === 'one_way'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                      }`}
                    >
                      <ArrowRight className="h-4 w-4" />
                      <span className="text-sm font-bold">One Way</span>
                    </button>
                    <button type="button"
                      onClick={() => setFormData({ ...formData, tripType: 'round_trip', returnType: 'same_vehicle' })}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                        formData.tripType === 'round_trip'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                      }`}
                    >
                      <Truck className="h-4 w-4" />
                      <span className="text-sm font-bold">Round Trip</span>
                    </button>
                  </div>
                </div>

                {formData.tripType === 'round_trip' && (
                  <div className="p-4 bg-gray-50 dark:bg-slate-900/40 rounded-2xl border border-gray-100 dark:border-slate-700 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">Return Option</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button type="button"
                        onClick={() => setFormData({ ...formData, returnType: 'same_vehicle', returnRouteId: '', returnTimeSlot: '' })}
                        className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                          formData.returnType === 'same_vehicle'
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Return in Same Vehicle</p>
                        <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1 leading-relaxed">Outbound & return travel on the same vehicle/route.</p>
                      </button>
                      <button type="button"
                        onClick={() => setFormData({ ...formData, returnType: 'different_route' })}
                        className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                          formData.returnType === 'different_route'
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Select Return Route</p>
                        <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1 leading-relaxed">Choose a different route and time slot for returning.</p>
                      </button>
                    </div>

                    {formData.returnType === 'different_route' && (
                      <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div>
                          <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Select Return Route</label>
                          {returnRoutes.length === 0 ? (
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                              ⚠️ No return routes found starting from <strong>{selectedRoute?.destination}</strong>. The vehicle needs to be at that location to operate a return route.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {returnRoutes.map(r => {
                                const isRSel = formData.returnRouteId === r.id;
                                const rSeats = r.available_seats ?? '?';
                                return (
                                  <button key={r.id} type="button"
                                    disabled={rSeats === 0}
                                    onClick={() => setFormData({ ...formData, returnRouteId: r.id, returnTimeSlot: r.estimated_time })}
                                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                                      rSeats === 0 ? 'opacity-50 cursor-not-allowed border-gray-100 dark:border-slate-700' :
                                      isRSel ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' :
                                      'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                                    }`}>
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{r.route_name}</p>
                                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                                          {formatPickup(r.pickup_points)} → {r.destination} · <span className="font-semibold">{r.estimated_time}</span>
                                        </p>
                                      </div>
                                      <span className={`text-xs font-bold ${ rSeats === 0 ? 'text-red-500' : rSeats <= 2 ? 'text-amber-500' : 'text-green-600' }`}>
                                        {rSeats === 0 ? 'Full' : `${rSeats} left`}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* In-between pickup */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.inBetween}
                    onChange={e => setFormData({ ...formData, inBetween: e.target.checked, requestedPickup: '' })}
                    className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">Request an in-between pickup point</span>
                </label>
                {formData.inBetween && (
                  <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">Specify your pickup location — admin will confirm.</p>
                    <input type="text" placeholder="e.g. Gandhi Nagar Bus Stop"
                      value={formData.requestedPickup}
                      onChange={e => setFormData({ ...formData, requestedPickup: e.target.value })}
                      className="input-field text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3: Trip Type ── */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Trip Type</h3>
                <p className="text-sm text-gray-400 dark:text-slate-500">Choose the kind of transport you need.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: 'Regular', label: 'Regular Commute', desc: 'Standard company vehicle on a scheduled route.', Icon: Car, color: 'blue' },
                  { id: 'External', label: 'Special Request', desc: 'External vehicle for special needs. Requires approval.', Icon: Briefcase, color: 'purple' },
                ].map(opt => {
                  const active = formData.type === opt.id;
                  return (
                    <button key={opt.id} type="button" onClick={() => setFormData({ ...formData, type: opt.id })}
                      className={`text-left p-5 rounded-2xl border-2 transition-all ${
                        active
                          ? `border-${opt.color}-600 bg-${opt.color}-50 dark:bg-${opt.color}-900/20 shadow-md scale-[1.02]`
                          : 'border-gray-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 bg-white dark:bg-slate-800'
                      }`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500'}`}>
                          <opt.Icon className="h-5 w-5" />
                        </div>
                        {active && <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                      </div>
                      <p className="font-bold text-gray-900 dark:text-white text-sm mb-1">{opt.label}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>

              {formData.type === 'External' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Reason for Special Request</label>
                  <textarea rows={3} placeholder="Explain why you need a special vehicle..."
                    value={formData.reason}
                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                    className="input-field resize-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: Review & Confirm ── */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Review Your Booking</h3>
                <p className="text-sm text-gray-400 dark:text-slate-500">Double-check everything before confirming.</p>
              </div>

              <div className="bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                {[
                  { label: 'Date', value: new Date(formData.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
                  { label: 'Time Slot', value: formData.timeSlot },
                  { label: 'Route', value: selectedRoute?.route_name || '—' },
                  { label: 'From', value: formatPickup(selectedRoute?.pickup_points) },
                  { label: 'To', value: selectedRoute?.destination || '—' },
                  { label: 'Pickup', value: formData.inBetween ? `In-between: ${formData.requestedPickup}` : 'Route pickup point' },
                  { label: 'Commute Mode', value: formData.tripType === 'one_way' ? 'One Way' : `Round Trip (${formData.returnType === 'same_vehicle' ? 'Same Vehicle' : 'Different Route'})` },
                  ...(formData.tripType === 'round_trip' && formData.returnType === 'different_route' ? [
                    { label: 'Return Route', value: routes.find(r => r.id === formData.returnRouteId)?.route_name || '—' },
                    { label: 'Return Time', value: formData.returnTimeSlot || '—' }
                  ] : []),
                  { label: 'Trip Type', value: formData.type === 'Regular' ? 'Regular Commute' : 'Special Request' },
                ].map(({ label, value }, i) => (
                  <div key={i} className={`flex items-start justify-between gap-4 px-5 py-3.5 ${i < 6 || (formData.tripType === 'round_trip' && formData.returnType === 'different_route' && i < 8) ? 'border-b border-gray-100 dark:border-slate-800' : ''}`}>
                    <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide flex-shrink-0 pt-0.5">{label}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white text-right">{value}</span>
                  </div>
                ))}
              </div>

              {formData.type === 'External' && formData.reason && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/50 rounded-2xl">
                  <p className="text-xs font-bold text-purple-500 uppercase tracking-wide mb-1">Reason</p>
                  <p className="text-sm text-gray-700 dark:text-slate-300">{formData.reason}</p>
                </div>
              )}

              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                <Star className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  By confirming, your seat will be instantly reserved. You'll receive a confirmation email and in-app notification.
                </p>
              </div>
            </div>
          )}

          {/* ── Navigation ── */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-100 dark:border-slate-700">
            {step > 1 ? (
              <button type="button" onClick={() => { setError(null); setStep(p => p - 1); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-semibold rounded-2xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-sm">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            ) : <div />}

            {step < 4 ? (
              <button type="button" onClick={nextStep}
                className="btn-primary text-sm">
                Next <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={loading}
                className="btn-primary text-sm disabled:opacity-60">
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Confirming...</>
                ) : (
                  <><CheckCircle className="h-4 w-4" /> Confirm Booking</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
