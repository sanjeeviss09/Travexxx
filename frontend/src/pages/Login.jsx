import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Truck, Eye, EyeOff, ArrowRight, Shield } from 'lucide-react';

export default function Login() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const loginUrl = window.location.origin.includes('5173') ? 'http://localhost:5000/api/auth/login' : '/api/auth/login';
      const res = await axios.post(loginUrl, {
        employee_id: employeeId,
        password
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">

      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500 rounded-full opacity-10 blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-80 h-80 bg-indigo-500 rounded-full opacity-10 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-violet-500 rounded-full opacity-10 blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '48px 48px' }}
        />
      </div>

      {/* Left — Branding Panel (desktop) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Revexy</span>
        </div>

        {/* Hero text */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-full text-blue-200 text-sm font-medium border border-white/10">
            <div className="pulse-dot" />
            Transport Management Platform
          </div>
          <h1 className="text-5xl font-black text-white leading-tight">
            Smarter Fleet,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300">
              Seamless Travel.
            </span>
          </h1>
          <p className="text-blue-200/70 text-lg leading-relaxed max-w-md">
            Manage employee transport efficiently. Real-time tracking, smart allocation, and zero paperwork.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { label: 'Employees', value: '100+' },
              { label: 'Routes Daily', value: '15+' },
              { label: 'Uptime', value: '99.9%' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-blue-300/70 text-xs mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-blue-300/40 text-xs">© 2026 Revexy Transport · Internal Platform</p>
      </div>

      {/* Right — Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg">Revexy Transport</span>
          </div>

          {/* Card */}
          <div className="bg-white/[0.07] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-white mb-1">Welcome back</h2>
              <p className="text-blue-200/60 text-sm">Sign in to your employee account</p>
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-3 bg-red-500/10 border border-red-400/20 text-red-300 px-4 py-3.5 rounded-2xl text-sm">
                <span className="text-lg leading-none">⚠️</span>
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Employee ID */}
              <div>
                <label className="block text-sm font-semibold text-blue-100/80 mb-2">Employee ID</label>
                <input
                  type="text"
                  required
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                  placeholder="e.g. AXX-001"
                  className="w-full bg-white/[0.06] border border-white/10 text-white placeholder-blue-300/30 rounded-2xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:border-blue-400/50 focus:bg-white/[0.1] focus:ring-2 focus:ring-blue-400/20 transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-blue-100/80 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/[0.06] border border-white/10 text-white placeholder-blue-300/30 rounded-2xl px-4 py-3.5 pr-12 text-sm font-medium focus:outline-none focus:border-blue-400/50 focus:bg-white/[0.1] focus:ring-2 focus:ring-blue-400/20 transition-all"
                  />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300/50 hover:text-blue-200 transition-colors">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <>Sign In <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </form>

            {/* Footer links */}
            <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
              <p className="text-center text-sm text-blue-200/50">
                First time?{' '}
                <Link to="/activate" className="text-blue-300 hover:text-blue-200 font-semibold transition-colors">
                  Activate your account
                </Link>
              </p>
              <Link to="/driver-login"
                className="flex items-center justify-center gap-2.5 w-full py-3 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-blue-200 font-semibold rounded-2xl text-sm transition-all">
                <Truck className="h-4 w-4" />
                Driver Portal Login
              </Link>
            </div>
          </div>

          {/* Security note */}
          <p className="flex items-center justify-center gap-1.5 text-blue-300/30 text-xs mt-6">
            <Shield className="h-3 w-3" /> Secured · Internal access only
          </p>
        </div>
      </div>
    </div>
  );
}
