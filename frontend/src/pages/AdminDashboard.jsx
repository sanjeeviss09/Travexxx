import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
  Users, Car, Truck, ClipboardList, AlertCircle, TrendingUp,
  Upload, FileSpreadsheet, CheckCircle2, XCircle, Eye, Edit2, Trash2,
  MoreVertical, Search, Filter, Plus, RefreshCw, X, MapPin, ChevronRight,
  ChevronLeft, Calendar as CalendarIcon, Clock, ChevronDown, Download, Fuel,
  AlertTriangle, Mail
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

const API = window.location.origin.includes('5173') ? 'http://localhost:5000/api' : '/api';

function StatCard({ title, value, sub, icon: Icon, color, onClick }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  };
  return (
    <div 
      onClick={onClick}
      className={`bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all duration-300 ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${colors[color] || colors.blue}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

// ---- Excel Import Modal ----
function ImportModal({ onClose, onSuccess, onDownloadTemplate }) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const handleFile = (f) => {
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
      setFile(f);
      setResult(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API}/employees/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setResult({ success: true, count: res.data.count, message: 'Employees imported successfully' });
      setTimeout(onSuccess, 2000);
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.error || 'Import failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-700 transition-colors" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Import HR Excel Data</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          {!result ? (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-800'}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                {file ? (
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                    <button onClick={() => setFile(null)} className="text-red-500 text-xs mt-2 hover:underline">Remove file</button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-slate-400">Drag and drop your Excel file here, or</p>
                    <div className="flex flex-col items-center gap-1 mt-1">
                      <button onClick={() => fileRef.current?.click()} className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">browse files</button>
                      <button onClick={onDownloadTemplate} className="text-gray-500 text-xs hover:text-blue-600 flex items-center transition-colors">
                        <Download className="h-3 w-3 mr-1" />
                        Download sample format
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">Supports .xlsx, .xls</p>
                  </div>
                )}
                <input type="file" ref={fileRef} className="hidden" accept=".xlsx, .xls" onChange={e => handleFile(e.target.files[0])} />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs p-3 rounded-lg flex items-start border border-blue-100 dark:border-blue-900/50">
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                <p>The Excel file must contain: <b>Employee ID, Name, Email, Mobile, Department, Designation, Priority.</b></p>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-slate-400 text-sm font-medium hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
                <button
                  onClick={handleImport}
                  disabled={!file || loading}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center"
                >
                  {loading ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Importing...</> : <><Upload className="h-4 w-4 mr-2" />Import</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${result.success ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                {result.success ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{result.success ? 'Import Successful!' : 'Import Failed'}</h4>
              <p className="text-sm text-gray-600 dark:text-slate-400">{result.message}</p>
              {result.success && <p className="text-sm font-medium text-green-700 dark:text-green-400 mt-2">{result.count} employees added.</p>}
              <button onClick={onClose} className="mt-6 w-full py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-white rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">Close</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Main Admin Dashboard ----

function AddVehicleModal({ onClose, onSuccess, editData, driversList = [] }) {
  const [formData, setFormData] = useState({
    name: editData?.name || '',
    reg: editData?.reg || '',
    capacity: editData?.capacity || '',
    maxKm: editData?.maxKm || 50000,
    ins: editData?.ins || '',
    assigned_driver_id: driversList.find(d => d.vehicle === editData?.id)?.id || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSuccess(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-700 transition-colors" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editData ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Vehicle Name (e.g. Bus, Van)</label><input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Registration Number</label><input type="text" required value={formData.reg} onChange={e => setFormData({...formData, reg: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Capacity (Seats)</label><input type="number" required value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Max Km (Maintenance)</label><input type="number" required value={formData.maxKm} onChange={e => setFormData({...formData, maxKm: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors" /></div>
          </div>
          <ModernDatePicker 
            label="Insurance Expiry Date"
            required
            value={formData.ins}
            onChange={val => setFormData({...formData, ins: val})}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Assign Driver</label>
            <select 
              value={formData.assigned_driver_id} 
              onChange={e => setFormData({...formData, assigned_driver_id: e.target.value})} 
              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
            >
              <option value="">-- No Driver Assigned --</option>
              {driversList.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.driver_id})</option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg">{editData ? 'Update Vehicle' : 'Save Vehicle'}</button>
        </form>
      </div>
    </div>
  );
}

function AddDriverModal({ onClose, onSuccess, editData, vehiclesList = [] }) {
  const [formData, setFormData] = useState({
    driver_id: editData?.driver_id || '',
    pin_hash: editData?.pin_hash || '',
    name: editData?.name || '',
    dob: editData?.age ? '' : '', // Since we don't store dob directly right now, leave blank if not provided
    mobile: editData?.mobile || '',
    license: editData?.license || '',
    exp: editData?.exp || '',
    experience: '',
    bloodGroup: '',
    vehicle: editData?.vehicle && editData.vehicle !== 'Unassigned' ? editData.vehicle : '',
    totalTrips: editData?.totalTrips || 0,
    onTimePercentage: editData?.onTimePercentage || 100.0
  });

  const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSuccess({...formData, age: calculateAge(formData.dob)});
  };

  const age = calculateAge(formData.dob);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-700 transition-colors" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editData ? 'Edit Driver' : 'Add New Driver'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Driver ID</label>
              <div className="flex space-x-2">
                <input type="text" required value={formData.driver_id} onChange={e => setFormData({...formData, driver_id: e.target.value})} className="flex-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors" placeholder="e.g. DRV-123" />
                <button type="button" onClick={() => setFormData({...formData, driver_id: 'DRV-' + Math.floor(1000 + Math.random() * 9000)})} className="px-3 py-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-semibold rounded-lg text-xs hover:bg-blue-200 transition-colors">Auto</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Login PIN</label>
              <div className="flex space-x-2">
                <input type="text" required value={formData.pin_hash} onChange={e => setFormData({...formData, pin_hash: e.target.value})} className="flex-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors" placeholder="e.g. 1234" />
                <button type="button" onClick={() => setFormData({...formData, pin_hash: Math.floor(1000 + Math.random() * 9000).toString()})} className="px-3 py-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-semibold rounded-lg text-xs hover:bg-blue-200 transition-colors">Auto</button>
              </div>
            </div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Full Name</label><input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors" /></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Assign Vehicle</label>
            <select value={formData.vehicle} onChange={e => setFormData({...formData, vehicle: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors">
              <option value="">-- No Vehicle Assigned --</option>
              {vehiclesList.map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.reg})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ModernDatePicker 
              label="Date of Birth"
              required
              value={formData.dob}
              onChange={val => setFormData({...formData, dob: val})}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Calculated Age</label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-slate-400 text-sm h-[42px] flex items-center">
                {age !== null ? `${age} years` : 'Select DOB'}
              </div>
            </div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Mobile Number</label><input type="text" required value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Experience (Years)</label><input type="number" required value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors" /></div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Blood Group</label>
              <select required value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors">
                <option value="">Select...</option>
                <option value="A+">A+</option><option value="A-">A-</option>
                <option value="B+">B+</option><option value="B-">B-</option>
                <option value="O+">O+</option><option value="O-">O-</option>
                <option value="AB+">AB+</option><option value="AB-">AB-</option>
              </select>
            </div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">License Number</label><input type="text" required value={formData.license} onChange={e => setFormData({...formData, license: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors" /></div>
          <ModernDatePicker 
            label="License Expiry Date"
            required
            value={formData.exp}
            onChange={val => setFormData({...formData, exp: val})}
          />
          <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg">{editData ? 'Update Driver' : 'Save Driver'}</button>
        </form>
      </div>
    </div>
  );
}

function AddEmployeeModal({ onClose, onSuccess, editData }) {
  const [formData, setFormData] = useState(editData || {
    employee_id: '',
    name: '',
    email: '',
    mobile: '',
    department: '',
    designation: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (editData) {
        await axios.put(`${API}/employees/${editData.id}`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post(`${API}/employees/manual`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${editData ? 'update' : 'add'} employee`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-700" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editData ? 'Edit Employee' : 'Add New Employee'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Employee ID</label>
              <input 
                type="text" 
                required
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                value={formData.employee_id}
                onChange={e => setFormData({...formData, employee_id: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Full Name</label>
              <input 
                type="text" 
                required
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Mobile</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                value={formData.mobile}
                onChange={e => setFormData({...formData, mobile: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Department</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                value={formData.department}
                onChange={e => setFormData({...formData, department: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Designation</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
              value={formData.designation}
              onChange={e => setFormData({...formData, designation: e.target.value})}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? (editData ? 'Updating...' : 'Adding...') : (editData ? 'Update Employee' : 'Add Employee')}
          </button>
        </form>
      </div>
    </div>

  );
}

function AddRouteModal({ onClose, onSuccess, editData, vehiclesList }) {
  const [formData, setFormData] = useState(editData || {
    name: '',
    pickup: 'R&D',
    destination: 'Sri City',
    vehicle_id: '',
    pickup_points: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSuccess(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-700 transition-colors" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editData ? 'Edit Route' : 'Add Route'}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Route Name</label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors" 
              placeholder="e.g. Morning Shift A" 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Pickup Location</label>
              <select 
                value={formData.pickup} 
                onChange={e => setFormData({...formData, pickup: e.target.value})} 
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
              >
                <option value="R&D">R&D</option>
                <option value="T Nagar Corporate">T Nagar Corporate</option>
                <option value="Sri City">Sri City</option>
                <option value="Others">Others</option>
              </select>
              {formData.pickup === 'Others' && (
                <input 
                  type="text" 
                  placeholder="Type location manually" 
                  onChange={e => setFormData({...formData, pickup: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none mt-2 transition-colors" 
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Destination</label>
              <select 
                value={formData.destination} 
                onChange={e => setFormData({...formData, destination: e.target.value})} 
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
              >
                <option value="R&D">R&D</option>
                <option value="T Nagar Corporate">T Nagar Corporate</option>
                <option value="Sri City">Sri City</option>
                <option value="Others">Others</option>
              </select>
              {formData.destination === 'Others' && (
                <input 
                  type="text" 
                  placeholder="Type destination manually" 
                  onChange={e => setFormData({...formData, destination: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none mt-2 transition-colors" 
                />
              )}
            </div>
          </div>

          {/* Time Slot removed as per user request */}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Assigned Vehicle</label>
            <select 
              value={formData.vehicle_id}
              onChange={e => setFormData({...formData, vehicle_id: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
            >
              <option value="">-- No vehicle assigned --</option>
              {vehiclesList.map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.reg})</option>
              ))}
            </select>
          </div>

          <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 mt-2 transition-colors shadow-lg">Save Route</button>
        </form>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [showImport, setShowImport] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingCredentials, setEditingCredentials] = useState(null);
  const [credForm, setCredForm] = useState({ driver_id: '', pin_hash: '' });
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editingDriver, setEditingDriver] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editingRoute, setEditingRoute] = useState(null);
  const [expandedVehicle, setExpandedVehicle] = useState(null);
  const [expandedDriver, setExpandedDriver] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });
  const [search, setSearch] = useState('');
  const [manifests, setManifests] = useState({}); // { [vehicleId]: { confirmed: [], waitlisted: [] } }
  const [loadingManifest, setLoadingManifest] = useState({});
  const [stats, setStats] = useState({ totalEmployees: 0, totalVehicles: 0, waitlistedToday: 0, externalPending: 0 });
  const [dailyTripCounts, setDailyTripCounts] = useState({});
  const [allBookings, setAllBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsFilters, setAnalyticsFilters] = useState({
    timeRange: 'All', // 'All', 'Month', 'Quarter', 'Year', 'YTD'
    employee: 'All',
    driver: 'All',
    route: 'All'
  });
  const [expandedBooking, setExpandedBooking] = useState(null);
  const [bookingFilter, setBookingFilter] = useState('All');
  
  const [externalRequests, setExternalRequests] = useState([]);
  const [loadingExternal, setLoadingExternal] = useState(false);

  const handleDownloadTemplate = () => {
    const data = [
      {
        employee_id: 'AXX001',
        name: 'John Doe',
        email: 'john.doe@revexy.com',
        mobile: '9876543210',
        department: 'Operations',
        designation: 'Manager'
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    XLSX.writeFile(workbook, "Employee_Import_Template.xlsx");
  };

  const token = localStorage.getItem('token');
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab based on URL path
  const pathParts = location.pathname.split('/');
  const activeTab = pathParts.length > 2 ? pathParts[2] : 'overview';

  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedDate, setSelectedDate] = useState(0);

  const fetchRoutes = async () => {
    try {
      const res = await axios.get(`${API}/routes`);
      const mapped = res.data.map(r => {
        let pickupPts = '';
        try { pickupPts = JSON.parse(r.pickup_points).join(', '); } catch (e) { pickupPts = r.pickup_points; }
        
        return {
          id: r.id,
          name: r.route_name,
          pickup: pickupPts || 'N/A', // Using the first pickup point roughly, or just display raw
          destination: r.destination,
          time: r.estimated_time,
          vehicle_id: r.vehicle_id,
          vehicle: r.vehicles ? `${r.vehicles.vehicle_name} (${r.vehicles.vehicle_number})` : 'Unassigned',
        }
      });
      setRoutes(mapped);
    } catch (error) {
      console.error('Failed to fetch routes', error);
    }
  };

  const fetchVehicles = async (dateStr) => {
    try {
      const url = dateStr ? `${API}/vehicles?date=${dateStr}` : `${API}/vehicles`;
      const res = await axios.get(url);
      // Transform keys to match UI if necessary, or just map them
      const mapped = res.data.map(v => ({
        id: v.id,
        name: v.vehicle_name,
        reg: v.vehicle_number,
        capacity: v.capacity,
        occupied: v.occupied || 0,
        status: v.vehicle_status,
        ins: v.insurance_expiry ? v.insurance_expiry.split('T')[0] : '',
        insAlert: v.insurance_expiry && new Date(v.insurance_expiry) < new Date(),
        km: v.kilometers_driven,
        maxKm: v.maintenance_km,
        maintAlert: v.kilometers_driven >= v.maintenance_km,
        driver: v.assigned_driver?.name || 'Unassigned',
        route: v.active_route?.route_name || 'N/A'
      }));
      setVehicles(mapped);
    } catch (error) {
      console.error('Failed to fetch vehicles', error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await axios.get(`${API}/drivers`);
      const mapped = res.data.map(d => ({
        id: d.id,
        driver_id: d.driver_id,
        pin_hash: d.pin_hash,
        name: d.name,
        dob: '', // not in db, but maybe age is
        age: d.age,
        mobile: d.mobile,
        license: d.license_number,
        exp: d.license_expiry ? d.license_expiry.split('T')[0] : '',
        expiryAlert: d.license_expiry && new Date(d.license_expiry) < new Date(),
        vehicle: d.assigned_vehicle,
        rating: d.ratings,
        experience: '', // Not in DB
        bloodGroup: '', // Not in DB
        totalTrips: d.total_trips || 0,
        onTimePercentage: d.on_time_percentage || 100.0
      }));
      setDrivers(mapped);
    } catch (error) {
      console.error('Failed to fetch drivers', error);
    }
  };

  const fetchExternalRequests = async () => {
    setLoadingExternal(true);
    try {
      const res = await axios.get(`${API}/bookings/external`);
      setExternalRequests(res.data);
    } catch (error) {
      console.error('Failed to fetch external requests', error);
    } finally {
      setLoadingExternal(false);
    }
  };

  const handleExternalAction = async (id, status, reason) => {
    let arranged_vehicle_details = null;
    
    if (status === 'APPROVED' && !reason.toLowerCase().includes('own') && !reason.toLowerCase().includes('self')) {
      arranged_vehicle_details = prompt('Please enter the arranged vehicle details (e.g. Cab number, Driver info):');
      if (arranged_vehicle_details === null) return; // cancelled prompt
    }

    try {
      await axios.patch(`${API}/bookings/external/${id}`, { status, arranged_vehicle_details });
      fetchExternalRequests();
      fetchStats(); // Update pending counts
    } catch (error) {
      console.error('Action failed', error);
      alert('Failed to process request');
    }
  };

  React.useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDate);
    const dateStr = d.toISOString().split('T')[0];

    if (activeTab === 'overview') {
      fetchVehicles(dateStr);
      fetchDrivers();
      fetchStats();
      fetchDailyTripCounts();
      if (employees.length === 0) fetchEmployees();
    }

    if (activeTab === 'vehicles') fetchVehicles(dateStr);
    if (activeTab === 'drivers') fetchDrivers();
    if (activeTab === 'routes') {
      fetchRoutes();
      if (vehicles.length === 0) fetchVehicles(dateStr);
    }
    if (activeTab === 'bookings') {
      fetchAllBookings();
    }
    if (activeTab === 'analytics') {
      fetchAnalytics();
    }
    if (activeTab === 'external') {
      fetchExternalRequests();
    }
  }, [activeTab, selectedDate, analyticsFilters]);

  React.useEffect(() => {
    const fetchRelevantData = () => {
      const d = new Date();
      d.setDate(d.getDate() + selectedDate);
      const dateStr = d.toISOString().split('T')[0];
      // Always refresh stats and vehicles (overview counters)
      fetchStats();
      fetchVehicles(dateStr);
      // Refresh tab-specific data
      if (activeTab === 'bookings') fetchAllBookings();
      if (activeTab === 'employees') { /* employees are fetched on tab change */ }
    };

    const channel = supabase
      .channel('admin_realtime_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchRelevantData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, fetchRelevantData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, fetchRelevantData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, fetchRelevantData)
      .subscribe((status) => {
        console.log('[Admin Realtime] channel status:', status);
      });

    const interval = setInterval(fetchRelevantData, 5000); // Poll every 5s as fallback

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [activeTab, selectedDate]);


  const handleDeleteVehicle = (id) => {
    setConfirmModal({
      show: true,
      title: 'Delete Vehicle',
      message: 'Are you sure you want to remove this vehicle? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await axios.delete(`${API}/vehicles/${id}`);
          fetchVehicles();
        } catch (error) {
          console.error(error);
        }
      }
    });
  };

  const handleDeleteDriver = (id) => {
    setConfirmModal({
      show: true,
      title: 'Delete Driver',
      message: 'Are you sure you want to remove this driver profile from the system?',
      onConfirm: async () => {
        try {
          await axios.delete(`${API}/drivers/${id}`);
          fetchDrivers();
        } catch (error) {
          console.error(error);
        }
      }
    });
  };

  const handleDeleteRoute = (id) => {
    setConfirmModal({
      show: true,
      title: 'Delete Route',
      message: 'Are you sure you want to delete this transport route?',
      onConfirm: async () => {
        try {
          await axios.delete(`${API}/routes/${id}`);
          fetchRoutes();
        } catch (error) {
          console.error(error);
        }
      }
    });
  };

  const handleDeleteEmployee = (id) => {
    setConfirmModal({
      show: true,
      title: 'Delete Employee',
      message: 'Are you sure you want to remove this employee? This will delete their profile and history.',
      onConfirm: async () => {
        try {
          await axios.delete(`${API}/employees/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          fetchEmployees();
        } catch (error) {
          console.error('Failed to delete employee', error);
        }
      }
    });
  };

  const handleUpdateRoute = async (data) => {
    const payload = {
      route_name: data.name,
      pickup_points: JSON.stringify([data.pickup]), // Simply store array string for now
      destination: data.destination,
      estimated_time: data.time,
      vehicle_id: data.vehicle_id || null
    };
    try {
      if (editingRoute) {
        await axios.put(`${API}/routes/${editingRoute.id}`, payload);
      } else {
        await axios.post(`${API}/routes`, payload);
      }
      fetchRoutes();
      setShowAddRoute(false);
      setEditingRoute(null);
    } catch (error) {
      console.error('Failed to update route', error);
    }
  };

  const fetchManifest = async (vehicleId) => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDate);
    const dateStr = d.toISOString().split('T')[0];
    
    setLoadingManifest(prev => ({ ...prev, [vehicleId]: true }));
    try {
      const res = await axios.get(`${API}/bookings/trip-manifest?vehicle_id=${vehicleId}&date=${dateStr}`);
      setManifests(prev => ({ ...prev, [vehicleId]: res.data }));
    } catch (error) {
      console.error('Failed to fetch manifest', error);
    } finally {
      setLoadingManifest(prev => ({ ...prev, [vehicleId]: false }));
    }
  };

  const handleOverrideBooking = async (id, currentStatus) => {
    const action = prompt(`Type new status for booking (CONFIRMED, WAITLISTED, CANCELLED) or leave empty to abort.\nCurrent Status: ${currentStatus}`);
    if (!action) return;
    const newStatus = action.trim().toUpperCase();
    if (!['CONFIRMED', 'WAITLISTED', 'CANCELLED'].includes(newStatus)) {
      alert('Invalid status. Override aborted.');
      return;
    }
    
    if (newStatus === 'CANCELLED' && currentStatus !== 'CANCELLED') {
      try {
        await axios.post(`${API}/bookings/${id}/cancel`);
        fetchAllBookings();
        return;
      } catch (err) {
        console.error('Failed to cancel booking', err);
        alert('Failed to override booking status.');
        return;
      }
    }

    try {
      await axios.patch(`${API}/bookings/${id}`, { status: newStatus });
      fetchAllBookings();
    } catch (err) {
      console.error('Failed to override booking', err);
      alert('Failed to override booking status.');
    }
  };

  const handleApproveBooking = async (id) => {
    try {
      await axios.patch(`${API}/bookings/${id}`, { status: 'CONFIRMED' });
      // Show instant visual alert/feedback
      fetchAllBookings();
    } catch (err) {
      console.error('Failed to approve booking', err);
      alert('Failed to approve booking.');
    }
  };

  const handleResendNotification = async (id) => {
    try {
      const res = await axios.post(`${API}/bookings/${id}/resend-email`);
      alert(res.data.message || 'Notification email resent successfully.');
    } catch (err) {
      console.error('Failed to resend notification', err);
      alert(err.response?.data?.error || 'Failed to resend notification email.');
    }
  };


  const handleUpdateVehicle = async (data) => {

    const payload = {
      vehicle_name: data.name,
      vehicle_number: data.reg,
      capacity: data.capacity,
      insurance_expiry: data.ins,
      maintenance_km: data.maxKm
    };
    try {
      let vehicleId;
      if (editingVehicle) {
        await axios.put(`${API}/vehicles/${editingVehicle.id}`, payload);
        vehicleId = editingVehicle.id;
      } else {
        const res = await axios.post(`${API}/vehicles`, payload);
        vehicleId = res.data.id;
      }

      // Handle driver assignment
      if (data.assigned_driver_id) {
        await axios.put(`${API}/drivers/${data.assigned_driver_id}`, {
          assigned_vehicle: vehicleId
        });
      }

      fetchVehicles();
      fetchDrivers(); // Refresh drivers to reflect assignment
      setShowAddVehicle(false);
      setEditingVehicle(null);
    } catch (error) {
      console.error('Failed to update vehicle', error);
    }
  };

  const handleUpdateDriver = async (data) => {
    const payload = {
      driver_id: data.driver_id,
      pin_hash: data.pin_hash,
      name: data.name,
      mobile: data.mobile,
      age: data.age,
      license_number: data.license,
      license_expiry: data.exp,
      assigned_vehicle: data.vehicle || null,
      total_trips: data.totalTrips,
      on_time_percentage: data.onTimePercentage
    };
    try {
      if (editingDriver) {
        await axios.put(`${API}/drivers/${editingDriver.id}`, payload);
      } else {
        await axios.post(`${API}/drivers`, payload);
      }
      fetchDrivers();
      setShowAddDriver(false);
      setEditingDriver(null);
    } catch (error) {
      console.error('Failed to update driver', error);
    }
  };

  const handleSaveCredentials = async (driverId) => {
    try {
      const existingDriver = drivers.find(d => d.id === driverId);
      if (!existingDriver) return;

      const payload = {
        driver_id: credForm.driver_id,
        pin_hash: credForm.pin_hash,
        name: existingDriver.name,
        mobile: existingDriver.mobile,
        age: existingDriver.age,
        license_number: existingDriver.license,
        license_expiry: existingDriver.exp,
        ratings: existingDriver.rating,
        total_trips: existingDriver.totalTrips,
        on_time_percentage: existingDriver.onTimePercentage
      };

      await axios.put(`${API}/drivers/${driverId}`, payload);
      fetchDrivers();
      setEditingCredentials(null);
    } catch (error) {
      console.error('Failed to update credentials', error);
      alert('Failed to update credentials. The Driver ID might already be in use.');
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/bookings/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch stats', error);
    }
  };

  const fetchDailyTripCounts = async () => {
    try {
      const res = await axios.get(`${API}/bookings/daily-trip-counts`);
      setDailyTripCounts(res.data);
    } catch (error) {
      console.error('Failed to fetch daily trip counts', error);
    }
  };

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const res = await axios.get(`${API}/employees`, { headers: { Authorization: `Bearer ${token}` } });
      setEmployees(res.data || []);
    } catch {
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchAllBookings = async () => {
    setLoadingBookings(true);
    try {
      const res = await axios.get(`${API}/bookings`);
      setAllBookings(res.data || []);
    } catch (error) {
      console.error('Failed to fetch all bookings', error);
      setAllBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const { timeRange, employee, driver, route } = analyticsFilters;
      const res = await axios.get(`${API}/analytics?timeRange=${timeRange}&employee=${employee}&driver=${driver}&route=${route}`);
      setAnalyticsData({ trips: [], ...res.data });
    } catch (error) {
      console.error('Failed to fetch analytics', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleTabChange = (tabId) => {
    const newPath = tabId === 'overview' ? '/admin' : `/admin/${tabId}`;
    navigate(newPath);
    if (tabId === 'employees' && employees.length === 0) fetchEmployees();
  };

  React.useEffect(() => {
    // Fetch stats regardless of tab so the header cards are always correct
    fetchStats();
    const interval = setInterval(fetchStats, 60000);

    if (activeTab === 'employees' && employees.length === 0) {
      fetchEmployees();
    }
    if (activeTab === 'bookings') {
      fetchAllBookings();
      const bInterval = setInterval(fetchAllBookings, 30000);
      return () => {
        clearInterval(interval);
        clearInterval(bInterval);
      };
    }
    if (activeTab === 'external') {
      fetchExternalRequests();
      const eInterval = setInterval(fetchExternalRequests, 30000);
      return () => {
        clearInterval(interval);
        clearInterval(eInterval);
      };
    }
    
    return () => clearInterval(interval);
  }, [activeTab]);

  const filtered = employees.filter(e =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'employees', label: 'Employees' },
    { id: 'vehicles', label: 'Vehicles' },
    { id: 'drivers', label: 'Drivers' },
    { id: 'bookings', label: 'Bookings' },
    { id: 'external', label: 'External Requests' },
    { id: 'routes', label: 'Routes' },
  ];

  return (
    <div className="space-y-6">
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); if (activeTab === 'employees') fetchEmployees(); }}
          onDownloadTemplate={handleDownloadTemplate}
        />
      )}
      {showAddEmployee && (
        <AddEmployeeModal 
          onClose={() => { setShowAddEmployee(false); setEditingEmployee(null); }}
          onSuccess={() => { setShowAddEmployee(false); setEditingEmployee(null); fetchEmployees(); }}
          editData={editingEmployee}
        />
      )}
      {showAddVehicle && (
        <AddVehicleModal 
          onClose={() => { setShowAddVehicle(false); setEditingVehicle(null); }} 
          onSuccess={handleUpdateVehicle}
          editData={editingVehicle} 
          driversList={drivers}
        />
      )}
      {showAddDriver && (
        <AddDriverModal 
          onClose={() => { setShowAddDriver(false); setEditingDriver(null); }} 
          onSuccess={handleUpdateDriver}
          editData={editingDriver} 
          vehiclesList={vehicles}
        />
      )}
      {showAddRoute && (
        <AddRouteModal 
          onClose={() => { setShowAddRoute(false); setEditingRoute(null); }} 
          onSuccess={handleUpdateRoute}
          editData={editingRoute}
          vehiclesList={vehicles}
        />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Employees" value={loadingEmployees ? '...' : stats.totalEmployees} sub="Across all branches" icon={Users} color="blue" onClick={() => handleTabChange('employees')} />
        <StatCard title="Active Vehicles" value={stats.totalVehicles} sub="Fleet status" icon={Car} color="green" onClick={() => handleTabChange('vehicles')} />
        <StatCard title="Waitlisted" value={stats.waitlistedToday} sub="Pending allocation" icon={AlertCircle} color="yellow" onClick={() => handleTabChange('bookings')} />
        <StatCard title="Ext. Requests" value={`${stats.externalPending} / ${stats.externalTotal}`} sub="Awaiting approval" icon={TrendingUp} color="red" onClick={() => handleTabChange('external')} />
      </div>


      {/* Tab Panel */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">

        {/* ── Tab Bar (scrollable) ── */}
        <div className="border-b border-gray-100 dark:border-slate-700 overflow-x-auto tabs-scroll">
          <nav className="flex space-x-1 px-4 min-w-max">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`py-4 px-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-700 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Action Button Bar (below tabs, wraps on mobile) ── */}
        {activeTab === 'employees' && (
          <div className="flex flex-wrap gap-2 px-4 py-3 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700">
            <button onClick={handleDownloadTemplate} className="flex items-center px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
              <Download className="h-4 w-4 mr-1.5" />Format
            </button>
            <button onClick={() => setShowImport(true)} className="flex items-center px-3 py-2 bg-white dark:bg-slate-800 border border-blue-600 text-blue-600 dark:text-blue-400 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors">
              <FileSpreadsheet className="h-4 w-4 mr-1.5" />Import HR Excel
            </button>
            <button onClick={() => setShowAddEmployee(true)} className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
              <Plus className="h-4 w-4 mr-1.5" />Add Employee
            </button>
          </div>
        )}
        {(activeTab === 'vehicles' || activeTab === 'drivers') && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700">
            <button onClick={() => activeTab === 'vehicles' ? setShowAddVehicle(true) : setShowAddDriver(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="h-4 w-4 mr-2" />Add {activeTab === 'vehicles' ? 'Vehicle' : 'Driver'}
            </button>
          </div>
        )}

        <div className="p-4 lg:p-6">
          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Schedule Calendar Widget */}
              <div className="border border-gray-100 dark:border-slate-700 rounded-xl p-5">
                <h3 className="font-semibold text-gray-800 dark:text-slate-100 mb-4 flex items-center"><CalendarIcon className="h-4 w-4 mr-2 text-blue-500" />Master Schedule Calendar</h3>
                <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                  {Array.from({length: 14}).map((_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() + i);
                    const isSelected = selectedDate === i;
                    return (
                      <div 
                        key={i} 
                        onClick={() => setSelectedDate(i)}
                        className={`flex flex-col items-center justify-center min-w-[70px] p-3 rounded-xl transition-all cursor-pointer ${isSelected ? 'bg-blue-600 text-white shadow-md scale-105' : 'bg-gray-50 dark:bg-slate-800/50 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-slate-700'}`}
                      >
                        <span className={`text-xs font-semibold ${isSelected ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                        <span className="text-lg font-bold mt-1">{date.getDate()}</span>
                        <span className="text-[10px] mt-1 opacity-80">{dailyTripCounts[date.toISOString().split('T')[0]] || 0} Trips</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-100 dark:border-slate-700 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-800 dark:text-slate-100 mb-4 flex items-center"><Car className="h-4 w-4 mr-2 text-blue-500" />Fleet Status</h3>
                  <div className="space-y-3">
                    {vehicles.map((v, i) => (
                      <div key={i} className="flex flex-col space-y-2 py-3 border-b border-gray-50 dark:border-slate-700 last:border-0">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{v.name} – {v.reg}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5 flex items-center">
                              <Users className="h-3 w-3 mr-1" /> {v.occupied}/{v.capacity} seats filled
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-full font-bold ${
                            v.status === 'Ongoing' 
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' 
                              : v.status === 'Reached'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400'
                          }`}>
                            {v.status}
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${v.status === 'Ongoing' ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}
                            style={{ width: `${(v.occupied / v.capacity) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border border-gray-100 dark:border-slate-700 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-800 dark:text-slate-100 mb-4 flex items-center"><AlertCircle className="h-4 w-4 mr-2 text-red-500" />Alerts & Notifications</h3>
                  <div className="space-y-3">
                    {drivers.some(d => d.expiryAlert) && (
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 rounded-full mt-1.5 bg-red-500 flex-shrink-0"></div>
                        <div>
                          <p className="text-sm text-gray-700 dark:text-slate-200">Driver License Expiring</p>
                          <p className="text-xs text-gray-400 dark:text-slate-400">Some drivers have licenses expiring soon.</p>
                        </div>
                      </div>
                    )}
                    {vehicles.some(v => v.maintAlert) && (
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 rounded-full mt-1.5 bg-orange-500 flex-shrink-0"></div>
                        <div>
                          <p className="text-sm text-gray-700 dark:text-slate-200">Vehicle Maintenance Required</p>
                          <p className="text-xs text-gray-400 dark:text-slate-400">Kilometers limit reached on a vehicle.</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 rounded-full mt-1.5 bg-blue-500 flex-shrink-0"></div>
                      <div>
                        <p className="text-sm text-gray-700 dark:text-slate-200">Platform initialized</p>
                        <p className="text-xs text-gray-400 dark:text-slate-400">Today</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 border border-blue-100 dark:border-blue-900/40">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">Quick Actions</h3>
                <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">Get started by importing employees and setting up vehicles.</p>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => { handleTabChange('employees'); setShowImport(true); }} className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />Import Employees
                  </button>
                  <button onClick={() => handleTabChange('vehicles')} className="flex items-center px-4 py-2 bg-white text-blue-700 text-sm rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors">
                    <Car className="h-4 w-4 mr-2" />Manage Vehicles
                  </button>
                  <button onClick={() => handleTabChange('drivers')} className="flex items-center px-4 py-2 bg-white text-blue-700 text-sm rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors">
                    <Truck className="h-4 w-4 mr-2" />Manage Drivers
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Platform Analytics</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <select 
                    value={analyticsFilters.timeRange}
                    onChange={e => setAnalyticsFilters({...analyticsFilters, timeRange: e.target.value})}
                    className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none font-medium text-gray-700 dark:text-slate-200"
                  >
                    <option value="All">All Time</option>
                    <option value="Month">This Month</option>
                    <option value="Quarter">This Quarter</option>
                    <option value="Year">This Year</option>
                    <option value="YTD">YTD</option>
                  </select>

                  <select 
                    value={analyticsFilters.employee}
                    onChange={e => setAnalyticsFilters({...analyticsFilters, employee: e.target.value})}
                    className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none font-medium text-gray-700 dark:text-slate-200 max-w-[120px] truncate"
                  >
                    <option value="All">All Employees</option>
                    {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                  </select>

                  <select 
                    value={analyticsFilters.driver}
                    onChange={e => setAnalyticsFilters({...analyticsFilters, driver: e.target.value})}
                    className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none font-medium text-gray-700 dark:text-slate-200 max-w-[120px] truncate"
                  >
                    <option value="All">All Drivers</option>
                    {drivers.map(drv => <option key={drv.id} value={drv.name}>{drv.name}</option>)}
                  </select>

                  <select 
                    value={analyticsFilters.route}
                    onChange={e => setAnalyticsFilters({...analyticsFilters, route: e.target.value})}
                    className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none font-medium text-gray-700 dark:text-slate-200 max-w-[120px] truncate"
                  >
                    <option value="All">All Routes</option>
                    {routes.map(rt => <option key={rt.id} value={rt.route_name}>{rt.route_name}</option>)}
                  </select>

                  <button onClick={fetchAnalytics} className="p-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-500 transition-colors bg-white dark:bg-slate-800">
                    <RefreshCw className={`h-4 w-4 ${loadingAnalytics ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {loadingAnalytics && !analyticsData ? (
                <div className="flex justify-center p-12">
                  <span className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
                </div>
              ) : analyticsData ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
                      <p className="text-blue-100 text-sm font-medium mb-1">Total Trips Done</p>
                      <h3 className="text-3xl font-black">{analyticsData.overview.completedTrips} <span className="text-sm font-normal opacity-80">/ {analyticsData.overview.totalTrips}</span></h3>
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                      <p className="text-gray-500 dark:text-slate-400 text-sm font-medium mb-1">Total Fuel Cost</p>
                      <h3 className="text-3xl font-black text-gray-900 dark:text-white">₹{analyticsData.overview.totalFuelCost}</h3>
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                      <p className="text-gray-500 dark:text-slate-400 text-sm font-medium mb-1">Active Vehicles</p>
                      <h3 className="text-3xl font-black text-gray-900 dark:text-white">{analyticsData.overview.activeVehicles} <span className="text-sm font-normal text-gray-400">/ {analyticsData.overview.totalVehicles}</span></h3>
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                      <p className="text-gray-500 dark:text-slate-400 text-sm font-medium mb-1">Total Drivers</p>
                      <h3 className="text-3xl font-black text-gray-900 dark:text-white">{analyticsData.overview.totalDrivers}</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Fuel Analysis */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center"><Fuel className="h-4 w-4 mr-2 text-orange-500" /> Fuel Consumption</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1"><span className="text-gray-600 dark:text-slate-400">Petrol</span><span className="font-bold">{analyticsData.fuelStats.PETROL} L</span></div>
                          <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-orange-500" style={{ width: `${Math.min(100, analyticsData.fuelStats.PETROL / 10)}%` }}></div></div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1"><span className="text-gray-600 dark:text-slate-400">Diesel</span><span className="font-bold">{analyticsData.fuelStats.DIESEL} L</span></div>
                          <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-gray-800 dark:bg-gray-400" style={{ width: `${Math.min(100, analyticsData.fuelStats.DIESEL / 10)}%` }}></div></div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1"><span className="text-gray-600 dark:text-slate-400">EV Charging</span><span className="font-bold">{analyticsData.fuelStats.EV} kWh</span></div>
                          <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${Math.min(100, analyticsData.fuelStats.EV / 10)}%` }}></div></div>
                        </div>
                      </div>
                    </div>

                    {/* Route Analysis */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm lg:col-span-2">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center"><MapPin className="h-4 w-4 mr-2 text-blue-500" /> Top Destinations (Route Analysis)</h3>
                      <div className="space-y-4 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                        {analyticsData.topRoutes.length === 0 ? <p className="text-sm text-gray-500">No route data yet.</p> : analyticsData.topRoutes.map((r, i) => (
                          <div key={i} className="flex items-center">
                            <span className="w-6 text-sm font-bold text-gray-400">#{i + 1}</span>
                            <div className="flex-1 ml-2">
                              <div className="flex justify-between text-sm mb-1"><span className="font-medium text-gray-800 dark:text-slate-200">{r.name}</span><span className="font-bold text-blue-600 dark:text-blue-400">{r.count} trips</span></div>
                              <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${(r.count / analyticsData.overview.totalTrips) * 100}%` }}></div></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Vehicle Utilization */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center"><Car className="h-4 w-4 mr-2 text-indigo-500" /> Vehicle Utilization</h3>
                      <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                        {analyticsData.vehicleUsage.length === 0 ? <p className="text-sm text-gray-500">No vehicle usage data yet.</p> : analyticsData.vehicleUsage.map((v, i) => (
                          <div key={i} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-700">
                            <span className="font-medium text-gray-800 dark:text-slate-200">{v.name}</span>
                            <span className="text-sm font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 rounded-md">{v.trips} trips</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top Employees */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center"><Users className="h-4 w-4 mr-2 text-teal-500" /> Most Frequent Travelers</h3>
                      <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                        {analyticsData.topEmployees.length === 0 ? <p className="text-sm text-gray-500">No employee travel data yet.</p> : analyticsData.topEmployees.map((e, i) => (
                          <div key={i} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xs font-bold shrink-0">{e.name[0]}</div>
                              <span className="font-medium text-gray-800 dark:text-slate-200">{e.name}</span>
                            </div>
                            <span className="text-sm font-bold bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 px-2.5 py-1 rounded-md">{e.trips} trips</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Trip History */}
                  <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center"><ClipboardList className="h-4 w-4 mr-2 text-blue-500" /> Trip History ({analyticsFilters.timeRange})</h3>
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700">
                        <thead>
                          <tr className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            <th className="pb-3 px-2">Date</th>
                            <th className="pb-3 px-2">Employee</th>
                            <th className="pb-3 px-2">Route / Dest</th>
                            <th className="pb-3 px-2">Vehicle</th>
                            <th className="pb-3 px-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-700 text-sm">
                          {(analyticsData.trips?.length === 0 || !analyticsData.trips) ? (
                            <tr><td colSpan={5} className="py-8 text-center text-gray-500">No trips found for this period.</td></tr>
                          ) : analyticsData.trips.map((t, i) => (
                            <tr key={t.id || i} className="hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors">
                              <td className="py-3 px-2 font-medium text-gray-700 dark:text-slate-300">{new Date(t.booking_date).toLocaleDateString()}</td>
                              <td className="py-3 px-2 text-gray-600 dark:text-slate-400">{t.employees?.name}</td>
                              <td className="py-3 px-2">
                                <p className="font-medium text-gray-700 dark:text-slate-300">{t.routes?.route_name || 'Direct'}</p>
                                <p className="text-[10px] text-gray-400">{t.destination}</p>
                              </td>
                              <td className="py-3 px-2 text-gray-600 dark:text-slate-400">{t.vehicles?.vehicle_number || '—'}</td>
                              <td className="py-3 px-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  t.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                                  t.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {t.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-12 text-gray-500">Failed to load analytics data.</div>
              )}
            </div>
          )}

          {/* EMPLOYEES */}
          {activeTab === 'employees' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, ID or department..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <button onClick={fetchEmployees} className="p-2 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors">
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              {/* ── Mobile Cards ── */}
              <div className="sm:hidden space-y-3">
                {loadingEmployees ? (
                  <div className="py-8 text-center text-sm text-gray-500">Loading employees...</div>
                ) : filtered.length === 0 ? (
                  <div className="py-10 text-center"><Users className="h-8 w-8 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">No employees yet.</p></div>
                ) : filtered.map((emp) => (
                  <div key={emp.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-bold">{emp.name?.[0]}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{emp.name}</p>
                          <p className="text-xs text-gray-400">{emp.employee_id}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingEmployee(emp); setShowAddEmployee(true); }} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => handleDeleteEmployee(emp.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Department</p>
                        <p className="text-xs font-semibold text-gray-800 dark:text-slate-200 mt-0.5 truncate">{emp.department || '—'}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Designation</p>
                        <p className="text-xs font-semibold text-gray-800 dark:text-slate-200 mt-0.5 truncate">{emp.designation || '—'}</p>
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${emp.account_status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {emp.account_status === 'ACTIVE' ? '● Active' : '○ Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {/* ── Desktop Table ── */}
              <div className="hidden sm:block overflow-hidden rounded-xl border border-gray-100 dark:border-slate-700">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-900/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Designation</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-50 dark:divide-slate-700">
                    {loadingEmployees ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">Loading employees...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-12 text-center"><Users className="h-8 w-8 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">No employees yet. Import from HR Excel to get started.</p></td></tr>
                    ) : filtered.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors duration-150">
                        <td className="px-4 py-3"><div className="flex items-center space-x-3"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0"><span className="text-white text-xs font-bold">{emp.name?.[0]}</span></div><div><p className="text-sm font-medium text-gray-900 dark:text-slate-100">{emp.name}</p><p className="text-xs text-gray-400 dark:text-slate-500">{emp.employee_id}</p></div></div></td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">{emp.department}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">{emp.designation}</td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${emp.account_status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{emp.account_status === 'ACTIVE' ? '● Active' : '○ Inactive'}</span></td>
                        <td className="px-4 py-3 text-right"><div className="flex justify-end space-x-2"><button onClick={() => { setEditingEmployee(emp); setShowAddEmployee(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"><Edit2 className="h-4 w-4" /></button><button onClick={() => handleDeleteEmployee(emp.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button><button className="p-1.5 text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors"><Eye className="h-4 w-4" /></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VEHICLES */}
          {activeTab === 'vehicles' && (
            <div className="space-y-4">
              {/* ── Mobile Vehicle Cards ── */}
              <div className="sm:hidden space-y-3">
                {Array.isArray(vehicles) && vehicles.length === 0 ? (
                  <div className="py-10 text-center"><Car className="h-8 w-8 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">No vehicles added yet.</p></div>
                ) : Array.isArray(vehicles) && vehicles.map((v, i) => (
                  <div key={v.id || i} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><p className="text-sm font-bold text-gray-900 dark:text-white">{v.name}</p><p className="text-xs text-gray-400 mt-0.5">{v.reg}</p></div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${v.status === 'ON ROUTE' || v.status === 'On Route' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{v.status || 'Available'}</span>
                        <button onClick={() => { setEditingVehicle(v); setShowAddVehicle(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-xl"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => handleDeleteVehicle(v.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5"><p className="text-[10px] text-gray-400 uppercase font-bold">Driver</p><p className="text-xs font-semibold text-gray-800 dark:text-slate-200 mt-0.5 truncate">{v.driver}</p></div>
                      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5"><p className="text-[10px] text-gray-400 uppercase font-bold">Seats</p><p className="text-xs font-semibold text-gray-800 dark:text-slate-200 mt-0.5">{v.occupied}/{v.capacity} filled</p></div>
                      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5"><p className="text-[10px] text-gray-400 uppercase font-bold">Insurance</p><p className={`text-xs font-semibold mt-0.5 ${v.insAlert ? 'text-red-500' : 'text-green-600'}`}>{v.insAlert ? '⚠ Expiring' : '✓ Valid'}</p></div>
                      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5"><p className="text-[10px] text-gray-400 uppercase font-bold">Route</p><p className="text-xs font-semibold text-gray-800 dark:text-slate-200 mt-0.5 truncate">{v.route}</p></div>
                    </div>
                    <button onClick={() => { setExpandedVehicle(expandedVehicle === v.id ? null : v.id); if(expandedVehicle !== v.id) fetchManifest(v.id); }} className="mt-3 w-full py-2 text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 transition-colors">
                      {expandedVehicle === v.id ? '▲ Hide Manifest' : '▼ View Manifest'}
                    </button>
                    {expandedVehicle === v.id && (
                      <div className="mt-3 space-y-1.5">
                        {loadingManifest[v.id] && <p className="text-xs text-center text-gray-400 animate-pulse">Loading...</p>}
                        {!manifests[v.id] && !loadingManifest[v.id] && <button onClick={() => fetchManifest(v.id)} className="w-full py-2 text-xs text-gray-400 border border-dashed rounded-lg">Tap to load passenger list</button>}
                        {manifests[v.id] && (<>
                          <p className="text-[10px] font-bold text-green-600 uppercase">✓ Confirmed ({manifests[v.id]?.confirmed?.length || 0})</p>
                          {manifests[v.id]?.confirmed?.map(b => (<div key={b.id} className="flex justify-between text-xs bg-green-50 dark:bg-green-900/10 rounded-lg px-2.5 py-1.5"><span className="font-medium">{b.employees?.name}</span><span className="text-gray-400">{b.pickup_point}</span></div>))}
                          <p className="text-[10px] font-bold text-orange-600 uppercase mt-2">⏳ Waitlisted ({manifests[v.id]?.waitlisted?.length || 0})</p>
                          {manifests[v.id]?.waitlisted?.map(b => (<div key={b.id} className="flex justify-between text-xs bg-orange-50 dark:bg-orange-900/10 rounded-lg px-2.5 py-1.5"><span className="font-medium">{b.employees?.name}</span><span className="text-orange-500">#{b.waitlist_position}</span></div>))}
                        </>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* ── Desktop Table ── */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-700">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-900/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Vehicle</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Current Location</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Occupancy</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Insurance Exp</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Assigned Route</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Assigned Driver</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-50 dark:divide-slate-700">
                    {Array.isArray(vehicles) && vehicles.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-12 text-center">
                        <Car className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No vehicles added yet. Click "Add Vehicle" to begin.</p>
                      </td></tr>
                    ) : Array.isArray(vehicles) && vehicles.map((v, i) => (
                      <React.Fragment key={v.id || i}>
                        <tr 
                          onClick={() => setExpandedVehicle(expandedVehicle === v.id ? null : v.id)}
                          className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors duration-150 cursor-pointer ${expandedVehicle === v.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${expandedVehicle === v.id ? 'rotate-90 text-blue-500' : ''}`} />
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{v.name}</p>
                                <p className="text-xs text-gray-500 dark:text-slate-400">{v.reg}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              v.status === 'ON ROUTE' || v.status === 'On Route' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {v.status || 'Available'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">
                            <div className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1 text-red-500" />
                              {v.current_location || 'Base (R&D)'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 h-1.5 w-16 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className={`h-full ${v.occupied >= v.capacity ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${(v.occupied/v.capacity)*100}%` }}></div>
                              </div>
                              <span className="text-gray-500 text-[10px]">{v.occupied}/{v.capacity}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={v.insAlert ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-600 dark:text-slate-300'}>{v.ins}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">{v.route}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">{v.driver}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end space-x-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setEditingVehicle(v); setShowAddVehicle(true); }} 
                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title="Edit Vehicle"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteVehicle(v.id); }} 
                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title="Delete Vehicle"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedVehicle === v.id && (
                          <tr className="bg-gray-50 dark:bg-slate-900/40 animate-in fade-in slide-in-from-top-2 duration-300">
                            <td colSpan={7} className="px-6 py-6 border-b border-gray-100 dark:border-slate-700">
                              <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Trip Manifest for {new Date(new Date().setDate(new Date().getDate() + selectedDate)).toLocaleDateString()}</h4>
                                <button 
                                  onClick={() => fetchManifest(v.id)}
                                  className="text-xs flex items-center gap-1 text-blue-600 hover:underline font-medium"
                                >
                                  <RefreshCw className={`h-3 w-3 ${loadingManifest[v.id] ? 'animate-spin' : ''}`} /> Refresh Passenger List
                                </button>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Confirmed List */}
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                                  <h5 className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-3 flex items-center">
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Confirmed Passengers ({manifests[v.id]?.confirmed?.length || 0})
                                  </h5>
                                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {!manifests[v.id] && !loadingManifest[v.id] && (
                                      <button onClick={() => fetchManifest(v.id)} className="w-full py-4 text-xs text-gray-400 border border-dashed rounded-lg">Click to load passenger list</button>
                                    )}
                                    {loadingManifest[v.id] && <div className="py-4 text-center text-xs text-gray-400 animate-pulse">Loading...</div>}
                                    {manifests[v.id]?.confirmed?.length === 0 && <p className="text-xs text-gray-400 py-2">No confirmed passengers.</p>}
                                    {manifests[v.id]?.confirmed?.map(b => (
                                      <div key={b.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-slate-900/50 rounded-lg text-xs">
                                        <div>
                                          <p className="font-bold text-gray-900 dark:text-white">{b.employees?.name}</p>
                                          <p className="text-gray-500">{b.employees?.department}</p>
                                        </div>
                                        <div className="text-right text-gray-400">
                                          <p>{b.pickup_point}</p>
                                          <p className="font-medium text-blue-500">Pri: {b.priority}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                
                                {/* Waitlist */}
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                                  <h5 className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase mb-3 flex items-center">
                                    <Clock className="h-3 w-3 mr-1" /> Waitlisted ({manifests[v.id]?.waitlisted?.length || 0})
                                  </h5>
                                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {loadingManifest[v.id] && <div className="py-4 text-center text-xs text-gray-400 animate-pulse">Loading...</div>}
                                    {manifests[v.id]?.waitlisted?.length === 0 && <p className="text-xs text-gray-400 py-2">No passengers in waitlist.</p>}
                                    {manifests[v.id]?.waitlisted?.map(b => (
                                      <div key={b.id} className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-900/10 rounded-lg text-xs">
                                        <div>
                                          <p className="font-bold text-gray-900 dark:text-white">{b.employees?.name}</p>
                                          <p className="text-gray-500">{b.employees?.department}</p>
                                        </div>
                                        <div className="text-right text-orange-600">
                                          <p>Waitlist Pos: {b.waitlist_position || 'N/A'}</p>
                                          <p className="font-medium">Pri: {b.priority}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-100 dark:border-slate-700">
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                                  <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase mb-3">Vehicle Specifications</h4>
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Model</span><span className="font-medium text-gray-900 dark:text-white">{v.name}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Reg No</span><span className="font-medium text-gray-900 dark:text-white">{v.reg}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Total Seats</span><span className="font-medium text-gray-900 dark:text-white">{v.capacity}</span></div>
                                  </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                                  <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase mb-3">Operational Status</h4>
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Current Trip</span><span className="font-medium text-blue-600">{v.status}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Occupancy</span><span className="font-medium text-gray-900 dark:text-white">{Math.round((v.occupied/v.capacity)*100)}% ({v.occupied}/{v.capacity})</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Driver</span><span className="font-medium text-gray-900 dark:text-white">{v.driver}</span></div>
                                  </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                                  <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase mb-3">Health & Compliance</h4>
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Insurance</span><span className={v.insAlert ? 'text-red-500 font-bold' : 'text-green-600'}>{v.insAlert ? 'Expiring' : 'Valid'}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Service Due</span><span className={v.maintAlert ? 'text-orange-500 font-bold' : 'text-gray-900 dark:text-white'}>{v.maxKm - v.km} km left</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Maintenance</span><div className="w-20 h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden"><div className={`h-full ${v.maintAlert ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${(v.km/v.maxKm)*100}%` }}></div></div></div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DRIVERS */}
          {activeTab === 'drivers' && (
            <div className="space-y-4">
              {/* ── Mobile Driver Cards ── */}
              <div className="sm:hidden space-y-3">
                {drivers.length === 0 ? (
                  <div className="py-10 text-center"><Truck className="h-8 w-8 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">No drivers added yet.</p></div>
                ) : drivers.map((d, i) => (
                  <div key={d.id || i} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><p className="text-sm font-bold text-gray-900 dark:text-white">{d.name}</p><p className="text-xs text-gray-400 mt-0.5">Age: {d.age} · {d.mobile}</p></div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => { setEditingDriver(d); setShowAddDriver(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-xl"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => handleDeleteDriver(d.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5"><p className="text-[10px] text-gray-400 uppercase font-bold">License</p><p className="text-xs font-semibold text-gray-800 dark:text-slate-200 mt-0.5">{d.license || '—'}</p></div>
                      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5"><p className="text-[10px] text-gray-400 uppercase font-bold">Expiry</p><p className={`text-xs font-semibold mt-0.5 ${d.expiryAlert ? 'text-red-500' : 'text-gray-800 dark:text-slate-200'}`}>{d.exp || '—'}</p></div>
                      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5"><p className="text-[10px] text-gray-400 uppercase font-bold">Vehicle</p><p className="text-xs font-semibold text-gray-800 dark:text-slate-200 mt-0.5">{d.vehicle ? (vehicles.find(v => v.id === d.vehicle)?.reg || 'Assigned') : 'Unassigned'}</p></div>
                      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5"><p className="text-[10px] text-gray-400 uppercase font-bold">Rating</p><p className="text-xs font-semibold text-blue-600 mt-0.5">⭐ {d.rating}</p></div>
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5"><p className="text-[10px] text-gray-400 uppercase font-bold">Driver ID</p><p className="text-xs font-mono font-semibold text-gray-800 dark:text-slate-200 mt-0.5">{d.driver_id || '—'}</p></div>
                      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5"><p className="text-[10px] text-gray-400 uppercase font-bold">Login PIN</p><p className="text-xs font-mono font-semibold text-gray-800 dark:text-slate-200 mt-0.5">{d.pin_hash || '—'}</p></div>
                      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5"><p className="text-[10px] text-gray-400 uppercase font-bold">Total Trips</p><p className="text-xs font-semibold text-gray-800 dark:text-slate-200 mt-0.5">{d.totalTrips || 0}</p></div>
                      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5"><p className="text-[10px] text-gray-400 uppercase font-bold">On-Time %</p><p className="text-xs font-semibold text-green-600 mt-0.5">{d.onTimePercentage || 100}%</p></div>
                    </div>
                  </div>
                ))}
              </div>
              {/* ── Desktop Table ── */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-700">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-900/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Driver Info</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">License & Expiry</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Assigned Vehicle</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Rating</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-50 dark:divide-slate-700">
                    {drivers.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-12 text-center">
                        <Truck className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No drivers added yet. Click "Add Driver" to begin.</p>
                      </td></tr>
                    ) : drivers.map((d, i) => (
                      <React.Fragment key={d.id || i}>
                        <tr 
                          onClick={() => setExpandedDriver(expandedDriver === d.id ? null : d.id)}
                          className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors duration-150 cursor-pointer ${expandedDriver === d.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${expandedDriver === d.id ? 'rotate-90 text-blue-500' : ''}`} />
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{d.name}</p>
                                <p className="text-xs text-gray-500 dark:text-slate-400">DOB: {d.dob} | Age: {d.age} | Ph: {d.mobile}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <p className="text-gray-900 dark:text-slate-200">{d.license}</p>
                            <p className={`text-xs ${d.expiryAlert ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-500 dark:text-slate-400'}`}>Exp: {d.exp}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">
                            {d.vehicle ? (vehicles.find(v => v.id === d.vehicle)?.reg || 'Unassigned') : 'Unassigned'}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-blue-600">⭐ {d.rating}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end space-x-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setEditingDriver(d); setShowAddDriver(true); }} 
                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title="Edit Driver"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteDriver(d.id); }} 
                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title="Delete Driver"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedDriver === d.id && (
                          <tr className="bg-gray-50 dark:bg-slate-900/40 animate-in fade-in slide-in-from-top-2 duration-300">
                            <td colSpan={5} className="px-6 py-6 border-b border-gray-100 dark:border-slate-700">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                                  <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase mb-3">Driver Profile</h4>
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Experience</span><span className="font-medium text-gray-900 dark:text-white">{d.experience || 'N/A'} Years</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Blood Group</span><span className="font-medium text-gray-900 dark:text-white">{d.bloodGroup || 'N/A'} Positive</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Verification</span><span className="text-green-600 font-medium">Verified</span></div>
                                  </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                                  <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase">Driver Credentials</h4>
                                    {editingCredentials !== d.id && (
                                      <button 
                                        onClick={() => {
                                          setEditingCredentials(d.id);
                                          setCredForm({ driver_id: d.driver_id || '', pin_hash: d.pin_hash || '' });
                                        }}
                                        className="text-blue-500 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                  
                                  {editingCredentials === d.id ? (
                                    <div className="space-y-3">
                                      <div>
                                        <label className="text-xs text-gray-500">Driver ID</label>
                                        <input 
                                          type="text" 
                                          value={credForm.driver_id} 
                                          onChange={e => setCredForm({...credForm, driver_id: e.target.value})}
                                          className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-500">Login PIN</label>
                                        <div className="flex space-x-2">
                                          <input 
                                            type="text" 
                                            value={credForm.pin_hash} 
                                            onChange={e => setCredForm({...credForm, pin_hash: e.target.value})}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white"
                                          />
                                          <button 
                                            onClick={() => setCredForm({...credForm, pin_hash: Math.floor(1000 + Math.random() * 9000).toString()})}
                                            className="px-2 py-1 bg-gray-200 dark:bg-slate-700 rounded text-xs font-medium hover:bg-gray-300 transition-colors"
                                          >Auto</button>
                                        </div>
                                      </div>
                                      <div className="flex space-x-2 pt-1">
                                        <button onClick={() => handleSaveCredentials(d.id)} className="flex-1 py-1.5 bg-green-500 text-white text-xs font-bold rounded shadow hover:bg-green-600 transition-colors">Save</button>
                                        <button onClick={() => setEditingCredentials(null)} className="flex-1 py-1.5 bg-gray-200 text-gray-700 text-xs font-bold rounded hover:bg-gray-300 transition-colors">Cancel</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <div className="flex justify-between text-sm"><span className="text-gray-500">Driver ID</span><span className="font-medium font-mono text-gray-900 dark:text-white">{d.driver_id || 'N/A'}</span></div>
                                      <div className="flex justify-between text-sm"><span className="text-gray-500">Login PIN</span><span className="font-medium font-mono text-gray-900 dark:text-white">{d.pin_hash || 'N/A'}</span></div>
                                      <div className="flex justify-between text-sm"><span className="text-gray-500">Portal Access</span><span className="text-green-600 font-medium">Granted</span></div>
                                    </div>
                                  )}
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                                  <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase mb-3">License & Compliance</h4>
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">License No</span><span className="font-medium text-gray-900 dark:text-white">{d.license}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Status</span><span className={d.expiryAlert ? 'text-red-500 font-bold' : 'text-green-600 font-medium'}>{d.expiryAlert ? 'Expiring Soon' : 'Active'}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Expiry Date</span><span className="font-medium text-gray-900 dark:text-white">{d.exp}</span></div>
                                  </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                                  <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase mb-3">Performance metrics</h4>
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Rating</span><span className="font-medium text-blue-600">⭐ {d.rating} / 5.0</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Total Trips</span><span className="font-medium text-gray-900 dark:text-white">{d.totalTrips || 0} Trips</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">On-Time %</span><span className="font-medium text-green-600">{d.onTimePercentage || 100}%</span></div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* BOOKINGS */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 bg-white dark:bg-slate-800/50 p-3 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
                <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search employee, route or point..."
                      className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 transition-colors"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                </div>
                  <select 
                    value={bookingFilter}
                    onChange={e => setBookingFilter(e.target.value)}
                    className="px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-700 dark:text-white outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-colors flex-shrink-0"
                  >
                    <option value="All">All Status</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="WAITLISTED">Waitlisted</option>
                    <option value="ON ROUTE">On Route</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                <button onClick={fetchAllBookings} className="p-2 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors flex-shrink-0">
                  <RefreshCw className={`h-4 w-4 ${loadingBookings ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* ── Mobile Booking Cards ── */}
              <div className="sm:hidden space-y-3">
                {(() => {
                  const filtered2 = allBookings.filter(b => {
                    const ms = !search || b.employees?.name?.toLowerCase().includes(search.toLowerCase()) || b.routes?.route_name?.toLowerCase().includes(search.toLowerCase()) || b.destination?.toLowerCase().includes(search.toLowerCase());
                    return ms && (bookingFilter === 'All' || b.status === bookingFilter);
                  });
                  if (loadingBookings) return <div className="py-8 text-center text-sm text-gray-500">Fetching bookings...</div>;
                  if (filtered2.length === 0) return <div className="py-10 text-center"><ClipboardList className="h-8 w-8 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">No bookings found.</p></div>;
                  return filtered2.map(bk => (
                    <div key={bk.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{bk.employees?.name?.[0] || 'E'}</div>
                          <div className="min-w-0"><p className="text-sm font-bold text-gray-900 dark:text-white truncate">{bk.employees?.name}</p><p className="text-[10px] text-gray-400 truncate">{bk.employees?.department}</p></div>
                        </div>
                        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${bk.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : bk.status === 'ON ROUTE' ? 'bg-blue-100 text-blue-700' : bk.status === 'WAITLISTED' ? 'bg-orange-100 text-orange-700' : bk.status === 'COMPLETED' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'}`}>{bk.status}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5"><p className="text-[10px] text-gray-400 uppercase font-bold">Date</p><p className="text-xs font-semibold text-gray-800 dark:text-slate-200 mt-0.5">{new Date(bk.booking_date).toLocaleDateString()}</p></div>
                        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5"><p className="text-[10px] text-gray-400 uppercase font-bold">Route</p><p className="text-xs font-semibold text-gray-800 dark:text-slate-200 mt-0.5 truncate">{bk.routes?.route_name || 'Direct'}</p></div>
                        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5"><p className="text-[10px] text-gray-400 uppercase font-bold">Destination</p><p className="text-xs font-semibold text-gray-800 dark:text-slate-200 mt-0.5 truncate">{bk.destination}</p></div>
                        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5"><p className="text-[10px] text-gray-400 uppercase font-bold">Vehicle</p><p className="text-xs font-semibold text-gray-800 dark:text-slate-200 mt-0.5">{bk.vehicles?.vehicle_number || '—'}</p></div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        {bk.status === 'PENDING_APPROVAL' && (
                          <button onClick={() => handleApproveBooking(bk.id)} className="flex-1 py-2 text-xs font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Approve
                          </button>
                        )}
                        <button onClick={() => handleResendNotification(bk.id)} className="flex-1 py-2 text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-1">
                          <Mail className="h-3 w-3" /> Resend Mail
                        </button>
                        <button onClick={() => handleOverrideBooking(bk.id, bk.status)} className="px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-1">
                          Override
                        </button>
                      </div>
                    </div>
                  ));
                })()}
              </div>
              {/* ── Desktop Table ── */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-900/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Date & Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Route / Dest</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Vehicle</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-50 dark:divide-slate-700">
                    {loadingBookings ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">Fetching bookings...</td></tr>
                    ) : allBookings.filter(b => {
                      const matchesSearch = !search || 
                        b.employees?.name?.toLowerCase().includes(search.toLowerCase()) ||
                        b.routes?.route_name?.toLowerCase().includes(search.toLowerCase()) ||
                        b.destination?.toLowerCase().includes(search.toLowerCase()) ||
                        b.pickup_point?.toLowerCase().includes(search.toLowerCase());
                      const matchesFilter = bookingFilter === 'All' || b.status === bookingFilter;
                      return matchesSearch && matchesFilter;
                    }).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                          <ClipboardList className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                          <p className="text-sm">No bookings found for the selected criteria.</p>
                        </td>
                      </tr>
                    ) : allBookings.filter(b => {
                      const matchesSearch = !search || 
                        b.employees?.name?.toLowerCase().includes(search.toLowerCase()) ||
                        b.routes?.route_name?.toLowerCase().includes(search.toLowerCase()) ||
                        b.destination?.toLowerCase().includes(search.toLowerCase()) ||
                        b.pickup_point?.toLowerCase().includes(search.toLowerCase());
                      const matchesFilter = bookingFilter === 'All' || b.status === bookingFilter;
                      return matchesSearch && matchesFilter;
                    }).map((bk) => (
                      <React.Fragment key={bk.id}>
                        <tr 
                          onClick={() => setExpandedBooking(expandedBooking === bk.id ? null : bk.id)}
                          className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${expandedBooking === bk.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {bk.employees?.name?.[0] || 'E'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{bk.employees?.name}</p>
                                <p className="text-[10px] text-gray-400 truncate">{bk.employees?.department}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <p className="text-gray-900 dark:text-slate-200 font-medium">{new Date(bk.booking_date).toLocaleDateString()}</p>
                            <p className="text-xs text-gray-400">{bk.routes?.estimated_time || bk.vehicles?.estimated_time || (bk.pickup_point?.match(/^\[(.*?)\]/)?.[1] || '—')}</p>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <p className="text-gray-900 dark:text-slate-200 truncate max-w-[150px] font-medium">{bk.routes?.route_name || 'Direct'}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[150px]">{bk.destination}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              bk.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                              bk.status === 'ON ROUTE' ? 'bg-blue-100 text-blue-700' :
                              bk.status === 'WAITLISTED' ? 'bg-orange-100 text-orange-700' :
                              bk.status === 'COMPLETED' ? 'bg-gray-100 text-gray-600' :
                              bk.status?.startsWith('CANCELLED') ? 'bg-red-100 text-red-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {bk.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {bk.vehicles ? (
                              <div>
                                <p className="text-gray-900 dark:text-white font-medium">{bk.vehicles.vehicle_number}</p>
                                <p className="text-[10px] text-gray-500">{bk.vehicles.vehicle_name}</p>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              bk.priority <= 2 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              Lvl {bk.priority}
                            </span>
                          </td>
                        </tr>
                        {expandedBooking === bk.id && (
                          <tr className="bg-gray-50 dark:bg-slate-900/40 animate-in fade-in slide-in-from-top-2 duration-300">
                            <td colSpan={6} className="px-6 py-6 border-b border-gray-100 dark:border-slate-700">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                                  <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase mb-3">Trip Details</h4>
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Employee</span><span className="font-medium text-gray-900 dark:text-white">{bk.employees?.name || 'N/A'}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Department</span><span className="font-medium text-gray-900 dark:text-white">{bk.employees?.department || 'N/A'}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Urgency</span><span className="font-medium text-gray-900 dark:text-white">{bk.urgency}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Created At</span><span className="font-medium text-gray-900 dark:text-white">{new Date(bk.created_at).toLocaleString()}</span></div>
                                  </div>
                                </div>
                                
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                                  <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase mb-3">Vehicle Status</h4>
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Assigned Vehicle</span><span className="font-medium text-gray-900 dark:text-white">{bk.vehicles?.vehicle_number || 'None'}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Trip Meter</span><span className="font-medium text-gray-900 dark:text-white">{bk.status === 'COMPLETED' ? 'Logged' : 'Pending'}</span></div>
                                  </div>
                                </div>

                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                                  <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase mb-3">Fuel Logs (Day of Trip)</h4>
                                  <div className="space-y-2">
                                    {(() => {
                                      let tripDate = '';
                                      try {
                                        if (bk.booking_date) {
                                          const d = new Date(bk.booking_date);
                                          if (!isNaN(d.getTime())) {
                                            tripDate = d.toISOString().split('T')[0];
                                          }
                                        }
                                      } catch (e) {}

                                      const logsOnDay = analyticsData?.recentFuelLogs?.filter(log => tripDate && log.date?.startsWith(tripDate) && String(log.vehicleId) === String(bk.vehicle_id)) || [];
                                      if (logsOnDay.length > 0) {
                                        return logsOnDay.map((log, idx) => (
                                          <div key={idx} className="flex justify-between text-sm border-b border-gray-100 dark:border-slate-700 pb-1 mb-1 last:border-0">
                                            <span className="text-gray-500">{log.fuelType}</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{log.quantity} units (₹{log.cost})</span>
                                          </div>
                                        ));
                                      } else {
                                        return <p className="text-sm text-gray-500 italic">No fuel logs found for this vehicle on {bk.booking_date ? new Date(bk.booking_date).toLocaleDateString() : 'this date'}.</p>;
                                      }
                                    })()}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
                                {bk.status === 'PENDING_APPROVAL' && (
                                  <button
                                    onClick={() => handleApproveBooking(bk.id)}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center shadow-sm"
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Approve Booking
                                  </button>
                                )}
                                <button
                                  onClick={() => handleResendNotification(bk.id)}
                                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 text-sm font-semibold rounded-lg border border-blue-100 dark:border-blue-800 transition-colors flex items-center shadow-sm"
                                >
                                  <Mail className="w-4 h-4 mr-2" /> Resend Email
                                </button>
                                <button
                                  onClick={() => handleOverrideBooking(bk.id, bk.status)}
                                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 text-sm font-semibold rounded-lg border border-red-100 dark:border-red-800 transition-colors flex items-center"
                                >
                                  <AlertCircle className="w-4 h-4 mr-2" /> Override Status
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* EXTERNAL */}
          {activeTab === 'external' && (
            <div className="space-y-4">
              {/* ── Mobile External Cards ── */}
              <div className="sm:hidden space-y-3">
                {loadingExternal ? (
                  <div className="py-8 text-center text-sm text-gray-500">Loading...</div>
                ) : externalRequests.length === 0 ? (
                  <div className="py-10 text-center"><AlertCircle className="h-8 w-8 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">No external requests yet.</p></div>
                ) : externalRequests.map(req => (
                  <div key={req.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0">{req.employees?.name?.[0] || 'E'}</div>
                        <div className="min-w-0"><p className="text-sm font-bold text-gray-900 dark:text-white truncate">{req.employees?.name}</p><p className="text-xs text-gray-400">{req.employees?.mobile}</p></div>
                      </div>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{req.status}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5"><p className="text-[10px] text-gray-400 uppercase font-bold">Type</p><p className="text-xs font-semibold text-gray-800 dark:text-slate-200 mt-0.5">{req.vehicle_type}</p></div>
                      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5"><p className="text-[10px] text-gray-400 uppercase font-bold">Passengers</p><p className="text-xs font-semibold text-gray-800 dark:text-slate-200 mt-0.5">{req.passenger_count}</p></div>
                      <div className="col-span-2 bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5"><p className="text-[10px] text-gray-400 uppercase font-bold">Reason</p><p className="text-xs font-semibold text-gray-800 dark:text-slate-200 mt-0.5">{req.reason}</p></div>
                    </div>
                    {req.status === 'PENDING' && (
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => handleExternalAction(req.id, 'APPROVED', req.reason)} className="flex-1 py-2 bg-green-50 text-green-700 rounded-xl text-xs font-bold hover:bg-green-100 transition-colors">Approve</button>
                        <button onClick={() => handleExternalAction(req.id, 'REJECTED', req.reason)} className="flex-1 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors">Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* ── Desktop Table ── */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-900/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type & Passengers</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reason & Urgency</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-50 dark:divide-slate-700">
                    {loadingExternal ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">Loading external requests...</td></tr>
                    ) : externalRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                          <AlertCircle className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                          <p className="text-sm">No external transport requests yet.</p>
                        </td>
                      </tr>
                    ) : externalRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">{req.employees?.name?.[0] || 'E'}</div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{req.employees?.name}</p>
                              <p className="text-xs text-gray-500">{req.employees?.mobile}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                          <p className="font-medium">{req.vehicle_type}</p>
                          <p className="text-xs text-gray-500">{req.passenger_count} passengers</p>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <p className="text-gray-900 dark:text-slate-200 truncate max-w-xs" title={req.reason}>{req.reason}</p>
                          <p className="text-xs text-red-500 font-medium mt-0.5">{req.urgency}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                            req.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {req.status === 'PENDING' ? (
                            <div className="flex justify-end space-x-2">
                              <button onClick={() => handleExternalAction(req.id, 'APPROVED', req.reason)} className="px-3 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs font-semibold transition-colors">Approve</button>
                              <button onClick={() => handleExternalAction(req.id, 'REJECTED', req.reason)} className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-semibold transition-colors">Reject</button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

           {/* ROUTES */}
          {activeTab === 'routes' && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap bg-white dark:bg-slate-800/50 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                  <div className="relative flex-1 min-w-0">
                    <Search className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
                    <input type="text" placeholder="Search routes..." className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 w-full transition-colors" />
                  </div>
                </div>

              {/* ── Mobile Route Cards ── */}
              <div className="sm:hidden space-y-3">
                {Array.isArray(routes) && routes.length === 0 ? (
                  <div className="py-10 text-center"><MapPin className="h-8 w-8 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">No routes yet.</p></div>
                ) : Array.isArray(routes) && routes.map((route, i) => (
                  <div key={route.id || i} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><p className="text-sm font-bold text-gray-900 dark:text-white">{route.name}</p><p className="text-xs text-blue-600 mt-0.5 truncate">{route.vehicle}</p></div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => { setEditingRoute(route); setShowAddRoute(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-xl"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => handleDeleteRoute(route.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5"><p className="text-[10px] text-gray-400 uppercase font-bold">Pickup</p><p className="text-xs font-semibold text-gray-800 dark:text-slate-200 mt-0.5 truncate">{route.pickup}</p></div>
                      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2.5"><p className="text-[10px] text-gray-400 uppercase font-bold">Destination</p><p className="text-xs font-semibold text-gray-800 dark:text-slate-200 mt-0.5 truncate">{route.destination}</p></div>
                    </div>
                  </div>
                ))}
              </div>
              {/* ── Desktop Table ── */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-900/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Route Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Pickup Location</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Destination</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Time Slot</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Assigned Vehicle</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                   <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-50 dark:divide-slate-700">
                    {Array.isArray(routes) && routes.map((route, i) => {
                      const hasConflict = routes.some(r => r && route && r.id !== route.id && r.vehicle === route.vehicle && r.time === route.time);
                      return (
                        <tr key={route.id || i} className={`hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors duration-150 ${hasConflict ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-slate-100">{route.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">{route.pickup}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">{route.destination}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">
                            <div className="flex items-center gap-1.5">
                              {route.time}
                              {hasConflict && <AlertTriangle className="h-4 w-4 text-red-500" title="Time slot conflict! Multiple routes assigned to this vehicle at the same time." />}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {route.vehicle}
                            </span>
                          </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <div className="flex justify-end space-x-2">
                            <button onClick={() => { setEditingRoute(route); setShowAddRoute(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Route">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDeleteRoute(route.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete Route">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <ConfirmModal 
        isOpen={confirmModal.show} 
        onClose={() => setConfirmModal({ ...confirmModal, show: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
}

function ModernDatePicker({ value, onChange, label, required }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [pickerMode, setPickerMode] = useState('day'); // 'day' | 'month' | 'year'
  const [yearRangeStart, setYearRangeStart] = useState(Math.floor((value ? new Date(value).getFullYear() : new Date().getFullYear()) / 12) * 12);
  const triggerRef = useRef(null);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthsShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const handleOpen = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const calH = 350;
      const top = (window.innerHeight - r.bottom) > calH ? r.bottom + 6 : r.top - calH - 6;
      setPos({ top, left: r.left });
    }
    setIsOpen(v => !v);
  };

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const firstDay = (y, m) => new Date(y, m, 1).getDay();

  const renderDays = () => {
    const total = daysInMonth(viewDate.getFullYear(), viewDate.getMonth());
    const start = firstDay(viewDate.getFullYear(), viewDate.getMonth());
    const cells = [];
    for (let i = 0; i < start; i++) cells.push(<div key={'e'+i} className="h-9 w-9" />);
    for (let d = 1; d <= total; d++) {
      const iso = `${viewDate.getFullYear()}-${String(viewDate.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isToday = new Date().toDateString() === new Date(viewDate.getFullYear(), viewDate.getMonth(), d).toDateString();
      const sel = value === iso;
      cells.push(
        <button key={d} type="button" onClick={() => { onChange(iso); setIsOpen(false); }}
          className={`h-9 w-9 rounded-xl text-sm font-medium transition-all duration-150 flex items-center justify-center
            ${sel ? 'bg-blue-600 text-white shadow-lg scale-110' : isToday ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-300' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
        >{d}</button>
      );
    }
    return cells;
  };

  const fmtValue = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
    : null;

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label}</label>
      <button ref={triggerRef} type="button" onClick={handleOpen}
        className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-between focus:ring-2 focus:ring-blue-500 outline-none transition-all group"
      >
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
          <span className={`text-sm ${fmtValue ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{fmtValue || 'Select date'}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && ReactDOM.createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
          <div
            className="fixed z-[9999] w-[304px] bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-2xl p-4"
            style={{ top: pos.top, left: pos.left }}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-3">
              <button type="button"
                onClick={() => {
                  if (pickerMode === 'day') setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth()-1));
                  else if (pickerMode === 'year') setYearRangeStart(y => y - 12);
                }}
                className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${pickerMode === 'month' ? 'invisible' : ''}`}>
                <ChevronLeft className="h-4 w-4 text-gray-500" />
              </button>

              <div className="flex items-center gap-1">
                {/* Month button */}
                <button type="button"
                  onClick={() => setPickerMode(m => m === 'month' ? 'day' : 'month')}
                  className={`px-2 py-1 rounded-lg text-sm font-bold transition-colors
                    ${pickerMode === 'month' ? 'bg-blue-600 text-white' : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
                  {monthsShort[viewDate.getMonth()]}
                </button>
                {/* Year button */}
                <button type="button"
                  onClick={() => { setYearRangeStart(Math.floor(viewDate.getFullYear()/12)*12); setPickerMode(m => m === 'year' ? 'day' : 'year'); }}
                  className={`px-2 py-1 rounded-lg text-sm font-bold transition-colors
                    ${pickerMode === 'year' ? 'bg-blue-600 text-white' : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
                  {viewDate.getFullYear()}
                </button>
              </div>

              <button type="button"
                onClick={() => {
                  if (pickerMode === 'day') setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth()+1));
                  else if (pickerMode === 'year') setYearRangeStart(y => y + 12);
                }}
                className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${pickerMode === 'month' ? 'invisible' : ''}`}>
                <ChevronRight className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* ── Month Picker ── */}
            {pickerMode === 'month' && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {monthsShort.map((m, i) => (
                  <button key={m} type="button"
                    onClick={() => { setViewDate(new Date(viewDate.getFullYear(), i, 1)); setPickerMode('day'); }}
                    className={`py-2 rounded-xl text-sm font-medium transition-all
                      ${viewDate.getMonth() === i ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'}`}>
                    {m}
                  </button>
                ))}
              </div>
            )}

            {/* ── Year Picker ── */}
            {pickerMode === 'year' && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {Array.from({length: 12}, (_, i) => yearRangeStart + i).map(yr => (
                  <button key={yr} type="button"
                    onClick={() => { setViewDate(new Date(yr, viewDate.getMonth(), 1)); setPickerMode('day'); }}
                    className={`py-2 rounded-xl text-sm font-medium transition-all
                      ${viewDate.getFullYear() === yr ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'}`}>
                    {yr}
                  </button>
                ))}
              </div>
            )}
            {pickerMode === 'day' && (
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                  <div key={d} className="h-8 flex items-center justify-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{d}</div>
                ))}
                {renderDays()}
              </div>
            )}
            <div className="mt-2 pt-3 border-t border-gray-100 dark:border-slate-700 flex justify-between">
              <button type="button" onClick={() => { onChange(''); setIsOpen(false); }}
                className="text-xs text-red-500 hover:text-red-600 font-medium">Clear</button>
              <button type="button" onClick={() => { onChange(new Date().toISOString().split('T')[0]); setIsOpen(false); }}
                className="text-xs text-blue-600 dark:text-blue-400 font-medium">Today</button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-700" onClick={e => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
          <p className="text-gray-500 dark:text-slate-400 mb-6">{message}</p>
          <div className="flex space-x-3">
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => { if(onConfirm) onConfirm(); onClose(); }}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-200 dark:shadow-none"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
