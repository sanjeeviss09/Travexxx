import { downloadGatePassPDF } from '../utils/pdfGenerator';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, Plus, Trash2, Calendar, ClipboardList, CheckCircle, 
  AlertCircle, RefreshCw, ChevronDown, ChevronUp, ArrowRight, Truck, Download 
} from 'lucide-react';

const API = window.location.origin.includes('5173') ? `http://${window.location.hostname}:5000/api` : '/api';

const getLocalDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatWhatsAppLink = (mobile, message) => {
  let cleaned = mobile ? mobile.replace(/\D/g, '') : '';
  if (cleaned && cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned ? `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};

const getWhatsAppMessage = (gp) => {
  const statusEmoji = gp.status === 'APPROVED' ? '✅' : gp.status === 'DENIED' ? '❌' : '⏳';
  const name = gp.employees?.name || gp.drivers?.name || '—';
  const dept = gp.employees?.department || (gp.drivers ? 'Driver' : '—');
  const materials = (gp.gate_pass_materials || []).map(m => `• ${m.quantity} ${m.uom} of ${m.description}`).join('\n') || 'None';
  
  return `*REVEXY TRANSPORT LOGISTICS*
*MATERIAL GATE PASS REPORT*

*Pass No:* ${gp.gate_pass_number}
*Status:* ${gp.status} ${statusEmoji}
*Requestor:* ${name} (${dept})
*Dispatched To:* ${gp.dispatched_to}
*Purpose:* ${gp.purpose || '—'}
*Material Type:* ${gp.material_type}
${gp.expected_return_date ? `*Expected Return:* ${new Date(gp.expected_return_date).toLocaleDateString('en-IN')}\n` : ''}
*Materials:*
${materials}

Generated via ReVexy Transport Platform.`;
};

export default function GatePass() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [activeTab, setActiveTab] = useState('request'); // 'request' or 'history'
  
  // Request Form States
  const [formData, setFormData] = useState({
    invoice_dc_no: '',
    invoice_date: getLocalDateString(new Date()),
    mode_of_transfer_vehicle_no: '',
    purpose: '',
    dispatched_to: '',
    material_type: 'RETURNABLE',
    expected_return_date: '',
    materials: [{ description: '', quantity: 1, uom: 'Nos', remarks: '' }]
  });
  
  // Loading & Error States
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resultPass, setResultPass] = useState(null);
  const [error, setError] = useState(null);

  // History States
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedPassId, setExpandedPassId] = useState(null);

  // Fetch employee gate passes history
  const fetchHistory = async () => {
    if (!user.id) return;
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API}/gate-passes?employee_id=${user.id}`);
      setHistory(res.data || []);
    } catch (err) {
      console.error('Failed to fetch gate passes history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const handleAddMaterialRow = () => {
    setFormData({
      ...formData,
      materials: [...formData.materials, { description: '', quantity: 1, uom: 'Nos', remarks: '' }]
    });
  };

  const handleRemoveMaterialRow = (index) => {
    setFormData({
      ...formData,
      materials: formData.materials.filter((_, idx) => idx !== index)
    });
  };

  const handleMaterialChange = (index, field, value) => {
    const updated = [...formData.materials];
    updated[index][field] = value;
    setFormData({ ...formData, materials: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.dispatched_to) {
      setError('Please specify where the materials are dispatched to.');
      return;
    }
    if (formData.materials.some(m => !m.description || !m.quantity)) {
      setError('Please provide description and quantity for all materials.');
      return;
    }
    if (formData.material_type === 'RETURNABLE' && !formData.expected_return_date) {
      setError('Please specify an expected return date.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        employee_id: user.role === 'DRIVER' ? null : user.id,
        driver_id: user.role === 'DRIVER' ? user.id : null,
        invoice_dc_no: formData.invoice_dc_no,
        invoice_date: formData.invoice_date,
        mode_of_transfer_vehicle_no: formData.mode_of_transfer_vehicle_no,
        purpose: formData.purpose,
        dispatched_to: formData.dispatched_to,
        material_type: formData.material_type,
        expected_return_date: formData.material_type === 'RETURNABLE' ? formData.expected_return_date : null,
        materials: formData.materials
      };

      const res = await axios.post(`${API}/gate-passes`, payload);
      setResultPass(res.data.data);
      setSuccess(true);
      
      // Reset form
      setFormData({
        invoice_dc_no: '',
        invoice_date: getLocalDateString(new Date()),
        mode_of_transfer_vehicle_no: '',
        purpose: '',
        dispatched_to: '',
        material_type: 'RETURNABLE',
        expected_return_date: '',
        materials: [{ description: '', quantity: 1, uom: 'Nos', remarks: '' }]
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request gate pass. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandPass = (id) => {
    setExpandedPassId(expandedPassId === id ? null : id);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* ── Page Navigation Tabs ── */}
      <div className="flex border-b border-gray-200 dark:border-slate-700/60 pb-px">
        <button
          onClick={() => { setActiveTab('request'); setSuccess(false); setError(null); }}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-bold transition-all ${
            activeTab === 'request'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
          }`}
        >
          <Box className="h-4 w-4" />
          New Gate Pass
        </button>
        <button
          onClick={() => { setActiveTab('history'); setSuccess(false); setError(null); }}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-bold transition-all ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          My History
        </button>
      </div>

      {/* ── Tab Content: New Request ── */}
      {activeTab === 'request' && (
        <div className="card overflow-hidden transition-colors duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                <Box className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Material Gate Pass</h2>
                <p className="text-blue-100/70 text-xs">Create a gate pass request for carrying goods or materials.</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            
            {error && (
              <div className="mb-5 flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 text-red-700 dark:text-red-300 px-4 py-3.5 rounded-2xl text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {success ? (
              <div className="max-w-md mx-auto py-8 text-center animate-in fade-in zoom-in-95 duration-200">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                  <CheckCircle className="h-9 w-9 text-green-500" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Gate Pass Generated!</h2>
                <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
                  Your gate pass request has been submitted and is currently pending Admin approval.
                </p>
                <div className="mb-6 inline-flex flex-col items-center justify-center gap-1.5 px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Gate Pass ID</span>
                  <span className="text-blue-600 dark:text-blue-400 font-black text-2xl tracking-wider">{resultPass?.gate_pass_number}</span>
                </div>
                <button
                  onClick={() => setSuccess(false)}
                  className="btn-primary w-full"
                >
                  Create Another Gate Pass <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Auto-filled details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-slate-900/40 rounded-2xl border border-gray-100 dark:border-slate-700/60 text-xs">
                  <div>
                    <span className="font-bold text-gray-400 uppercase tracking-wide">
                      {user.role === 'DRIVER' ? 'Driver' : 'Employee'}
                    </span>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{user.name}</p>
                  </div>
                  <div>
                    <span className="font-bold text-gray-400 uppercase tracking-wide">
                      {user.role === 'DRIVER' ? 'Role' : 'Department'}
                    </span>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                      {user.role === 'DRIVER' ? 'DRIVER' : (user.department || '—')}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-gray-400 uppercase tracking-wide">Date</span>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{new Date().toLocaleDateString('en-IN')}</p>
                  </div>
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Invoice / DC No.</label>
                    <input 
                      type="text" 
                      className="input-field text-sm" 
                      placeholder="e.g. INV-123 (Optional)"
                      value={formData.invoice_dc_no} 
                      onChange={e => setFormData({...formData, invoice_dc_no: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Invoice Date</label>
                    <input 
                      type="date" 
                      className="input-field text-sm" 
                      value={formData.invoice_date} 
                      onChange={e => setFormData({...formData, invoice_date: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Dispatched To <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      className="input-field text-sm" 
                      placeholder="Destination Branch or Contact Person"
                      value={formData.dispatched_to} 
                      onChange={e => setFormData({...formData, dispatched_to: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Purpose</label>
                    <input 
                      type="text" 
                      className="input-field text-sm" 
                      placeholder="e.g. Internal Transfer, Demonstration, Repair"
                      value={formData.purpose} 
                      onChange={e => setFormData({...formData, purpose: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Mode of Transfer / Vehicle No.</label>
                    <input 
                      type="text" 
                      className="input-field text-sm" 
                      placeholder="e.g. AP-03-TD-1234 (Optional)"
                      value={formData.mode_of_transfer_vehicle_no} 
                      onChange={e => setFormData({...formData, mode_of_transfer_vehicle_no: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Material Type</label>
                    <select 
                      className="input-field text-sm"
                      value={formData.material_type} 
                      onChange={e => setFormData({...formData, material_type: e.target.value})}
                    >
                      <option value="RETURNABLE">Returnable</option>
                      <option value="NON-RETURNABLE">Non-Returnable</option>
                    </select>
                  </div>
                  {formData.material_type === 'RETURNABLE' && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Expected Return Date <span className="text-red-500">*</span></label>
                      <input 
                        type="date" 
                        required
                        className="input-field text-sm border-amber-350 focus:border-amber-500 bg-amber-50/40 dark:bg-amber-900/10 dark:border-amber-800" 
                        value={formData.expected_return_date} 
                        onChange={e => setFormData({...formData, expected_return_date: e.target.value})} 
                      />
                    </div>
                  )}
                </div>

                {/* Materials List */}
                <div className="pt-4 border-t border-gray-100 dark:border-slate-700/60">
                  <label className="block text-sm font-semibold text-gray-750 dark:text-slate-200 mb-3">Materials Breakdown</label>
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/40">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-100 dark:bg-slate-700 text-xs font-bold text-gray-500 dark:text-slate-300 uppercase">
                        <tr>
                          <th className="px-4 py-3.5 w-12 text-center">S.No</th>
                          <th className="px-4 py-3.5">Material Description <span className="text-red-500">*</span></th>
                          <th className="px-4 py-3.5 w-24">Qty <span className="text-red-500">*</span></th>
                          <th className="px-4 py-3.5 w-28">UOM</th>
                          <th className="px-4 py-3.5">Remarks</th>
                          <th className="px-4 py-3.5 w-12 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                        {formData.materials.map((m, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-750/30">
                            <td className="px-4 py-3 font-semibold text-gray-400 text-center">{idx + 1}</td>
                            <td className="px-4 py-3">
                              <input 
                                type="text" 
                                required
                                className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 dark:border-slate-650 focus:border-blue-500 focus:ring-0 p-0 text-sm font-medium" 
                                value={m.description} 
                                onChange={e => handleMaterialChange(idx, 'description', e.target.value)} 
                                placeholder="e.g. Lenovo Laptop, Office Chair" 
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input 
                                type="number" 
                                min="1" 
                                required
                                className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 dark:border-slate-650 focus:border-blue-500 focus:ring-0 p-0 text-sm font-medium text-center" 
                                value={m.quantity} 
                                onChange={e => handleMaterialChange(idx, 'quantity', e.target.value)} 
                              />
                            </td>
                            <td className="px-4 py-3">
                              <select 
                                className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 dark:border-slate-650 focus:border-blue-500 focus:ring-0 p-0 text-sm font-semibold"
                                value={m.uom} 
                                onChange={e => handleMaterialChange(idx, 'uom', e.target.value)}
                              >
                                <option>Nos</option>
                                <option>Kgs</option>
                                <option>Ltrs</option>
                                <option>Mtrs</option>
                                <option>Boxes</option>
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input 
                                type="text" 
                                className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 dark:border-slate-650 focus:border-blue-500 focus:ring-0 p-0 text-sm" 
                                value={m.remarks} 
                                onChange={e => handleMaterialChange(idx, 'remarks', e.target.value)} 
                                placeholder="Optional"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              {formData.materials.length > 1 && (
                                <button 
                                  type="button" 
                                  onClick={() => handleRemoveMaterialRow(idx)} 
                                  className="text-red-400 hover:text-red-600 transition-colors p-1"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button 
                    type="button" 
                    onClick={handleAddMaterialRow} 
                    className="mt-3 flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Add Material Row
                  </button>
                </div>

                {/* Submit */}
                <div className="pt-4 border-t border-gray-150 dark:border-slate-700/60 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="btn-primary px-6 py-3 text-sm disabled:opacity-60"
                  >
                    {loading ? (
                      <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Requesting...</>
                    ) : (
                      'Request Gate Pass'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Tab Content: History ── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-800 dark:text-white">Gate Pass Submissions</h3>
            <button 
              onClick={fetchHistory} 
              disabled={loadingHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700/60 text-xs font-semibold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${loadingHistory ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loadingHistory ? (
            <div className="flex justify-center items-center py-16">
              <RefreshCw className="h-7 w-7 animate-spin text-blue-500" />
            </div>
          ) : history.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">
              <Box className="h-10 w-10 mx-auto mb-3 opacity-40 text-gray-450" />
              <p className="text-sm font-semibold">No gate passes created yet.</p>
              <p className="text-xs text-gray-450 dark:text-slate-500 mt-1">Select "New Gate Pass" to submit your first request.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map(gp => {
                const isExpanded = expandedPassId === gp.id;
                const dateStr = gp.created_at ? new Date(gp.created_at).toLocaleDateString('en-IN') : '—';
                const retDateStr = gp.expected_return_date ? new Date(gp.expected_return_date).toLocaleDateString('en-IN') : null;

                return (
                  <div key={gp.id} className="card overflow-hidden border border-gray-150 dark:border-slate-750/70 hover:border-gray-350 transition-all duration-300">
                    <div 
                      onClick={() => toggleExpandPass(gp.id)}
                      className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between cursor-pointer hover:bg-gray-50/50 dark:hover:bg-slate-750/20 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-gray-900 dark:text-white tracking-wide">{gp.gate_pass_number}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            gp.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' :
                            gp.status === 'DENIED' ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400' :
                            'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                          }`}>{gp.status}</span>
                          <span className="text-[9px] font-black uppercase bg-gray-100 dark:bg-slate-700/60 text-gray-500 dark:text-slate-350 px-1.5 py-0.5 rounded">{gp.material_type}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                          <span>Date: <strong className="font-semibold text-gray-700 dark:text-slate-300">{dateStr}</strong></span>
                          <span>·</span>
                          <span>Dispatched To: <strong className="font-semibold text-gray-700 dark:text-slate-300">{gp.dispatched_to}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <button 
                          onClick={(e) => { e.stopPropagation(); downloadGatePassPDF(gp); }}
                          className="flex items-center gap-1.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-650 dark:text-slate-200 px-3 py-1.5 rounded-xl transition-all shadow-sm flex-shrink-0"
                          title="Download Gate Pass Slip"
                        >
                          <Download className="h-3.5 w-3.5" /> Download PDF
                        </button>
                        <a
                          href={formatWhatsAppLink(null, getWhatsAppMessage(gp))}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-[10px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-xl transition-all shadow-sm flex-shrink-0"
                          title="Share via WhatsApp"
                        >
                          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.019-5.116-2.877-6.974C16.596 1.906 14.12 1.88 11.482 1.88c-5.442 0-9.867 4.42-9.871 9.863-.001 1.737.453 3.424 1.316 4.922L1.87 22.082l5.777-1.513c-.02-.13-.01-.01-.01-.01zm9.643-6.522c.288-.144.288-.48.288-.48s-.576-.288-.96-.48c-.384-.192-.48-.288-.576-.288s-.192 0-.288.144c-.096.144-.48.576-.576.672s-.192.096-.384 0a5.617 5.617 0 0 1-1.587-.98c-.624-.556-1.045-1.243-1.167-1.45-.122-.208-.013-.32.093-.425.096-.095.192-.224.288-.336.096-.112.128-.192.192-.32.064-.128.032-.24-.016-.336-.048-.096-.432-1.04-.592-1.424-.156-.374-.316-.324-.432-.33-.112-.006-.24-.006-.368-.006-.128 0-.336.048-.512.24-.176.192-.672.656-.672 1.6s.688 1.856.784 2c.096.144 1.354 2.068 3.28 2.9c.458.197.815.316 1.093.404.46.146.879.125 1.21.076.369-.055 1.137-.464 1.296-.912z"/>
                          </svg>
                          WhatsApp
                        </a>
                        {gp.booking_id && (
                          <div className="flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 px-2 py-1 rounded-xl">
                            <Truck className="h-3 w-3" /> Linked to Cab
                          </div>
                        )}
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-5 pt-3 border-t border-gray-100 dark:border-slate-700/60 bg-gray-50/30 dark:bg-slate-850/10 space-y-4 animate-in slide-in-from-top-1 duration-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                          {gp.invoice_dc_no && (
                            <div>
                              <span className="text-gray-400 font-semibold uppercase tracking-wider block">Invoice/DC No.</span>
                              <span className="font-bold text-gray-700 dark:text-slate-300">{gp.invoice_dc_no}</span>
                            </div>
                          )}
                          {gp.invoice_date && (
                            <div>
                              <span className="text-gray-400 font-semibold uppercase tracking-wider block">Invoice Date</span>
                              <span className="font-bold text-gray-700 dark:text-slate-300">{new Date(gp.invoice_date).toLocaleDateString('en-IN')}</span>
                            </div>
                          )}
                          {gp.purpose && (
                            <div>
                              <span className="text-gray-400 font-semibold uppercase tracking-wider block">Purpose</span>
                              <span className="font-bold text-gray-700 dark:text-slate-300">{gp.purpose}</span>
                            </div>
                          )}
                          {gp.mode_of_transfer_vehicle_no && (
                            <div>
                              <span className="text-gray-400 font-semibold uppercase tracking-wider block">Vehicle No. / Transfer Mode</span>
                              <span className="font-bold text-gray-700 dark:text-slate-300">{gp.mode_of_transfer_vehicle_no}</span>
                            </div>
                          )}
                          {retDateStr && (
                            <div>
                              <span className="text-gray-400 font-semibold uppercase tracking-wider block text-amber-600 dark:text-amber-500">Expected Return</span>
                              <span className="font-bold text-amber-700 dark:text-amber-400">{retDateStr}</span>
                            </div>
                          )}
                        </div>

                        {/* Material Items */}
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-gray-450 dark:text-slate-400 uppercase tracking-wider">Materials Breakdown:</p>
                          <div className="overflow-hidden rounded-xl border border-gray-150 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs">
                            <table className="w-full text-left">
                              <thead className="bg-gray-50 dark:bg-slate-750 text-[10px] font-bold text-gray-400 uppercase">
                                <tr>
                                  <th className="px-3 py-2 w-10 text-center">S.No</th>
                                  <th className="px-3 py-2">Description</th>
                                  <th className="px-3 py-2 w-16 text-center">Qty</th>
                                  <th className="px-3 py-2 w-20">UOM</th>
                                  <th className="px-3 py-2">Remarks</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60 font-medium">
                                {gp.gate_pass_materials?.map((mat, mIdx) => (
                                  <tr key={mat.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-750/30">
                                    <td className="px-3 py-2 text-center text-gray-400">{mIdx + 1}</td>
                                    <td className="px-3 py-2 text-gray-800 dark:text-slate-200 font-semibold">{mat.description}</td>
                                    <td className="px-3 py-2 text-center font-bold text-gray-700 dark:text-slate-350">{mat.quantity}</td>
                                    <td className="px-3 py-2 text-gray-600 dark:text-slate-400">{mat.uom}</td>
                                    <td className="px-3 py-2 text-gray-500 dark:text-slate-500">{mat.remarks || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
