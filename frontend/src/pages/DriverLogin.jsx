import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Truck, Eye, EyeOff, Shield, ArrowRight } from 'lucide-react';

export default function DriverLogin() {
  const navigate = useNavigate();
  const [driverId, setDriverId] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const loginUrl = window.location.origin.includes('5173') ? 'http://localhost:5000/api/auth/driver-login' : '/api/auth/driver-login';
      const res = await axios.post(loginUrl, { 
        driver_id: driverId, 
        pin_hash: pin 
      });
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify({ ...res.data.driver, role: 'DRIVER' }));
        navigate('/driver');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid Driver ID or PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-4 shadow-2xl">
            <Truck className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white">Revexy</h1>
          <p className="text-blue-200 mt-1 font-medium">Driver Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Driver Sign In</h2>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium border border-red-100 dark:border-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Driver ID</label>
              <input
                type="text"
                value={driverId}
                onChange={e => setDriverId(e.target.value)}
                placeholder="e.g. DRV-001"
                required
                className="w-full px-4 py-3.5 border-2 border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-blue-500 outline-none transition-colors text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">PIN (4 digits)</label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={e => setPin(e.target.value.slice(0, 4))}
                  placeholder="••••"
                  required
                  maxLength={4}
                  className="w-full px-4 py-3.5 pr-12 border-2 border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:border-blue-500 outline-none transition-colors text-base tracking-widest"
                />
                <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-base active:scale-95 transition-all shadow-lg shadow-blue-200 dark:shadow-none disabled:opacity-50 mt-2"
            >
              {loading ? 'Signing in...' : <><span>Sign In</span><ArrowRight className="h-5 w-5" /></>}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 dark:text-slate-500 mt-6">Your account is created by your admin.<br />Contact admin if you don't have credentials.</p>
        </div>

        <p className="text-center text-blue-200 text-xs mt-6">
          Employee? <a href="/login" className="text-white font-semibold hover:underline">Login here</a>
        </p>
      </div>
    </div>
  );
}
