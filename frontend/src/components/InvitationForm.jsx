import React, { useState, useEffect } from 'react';
import { Calendar, Church, AlertCircle, CheckCircle2, Send, X, FileText, Info, Users, MapPin, CalendarRange } from 'lucide-react';

// Service types that span multiple days — show start + end date instead of single date
const MULTI_DAY_TYPES = [
  'Evangelistic Campaign',
  'Prayer Week',
  'Health Week',
  'Camp Meeting',
  'Youth Seminar',
  'Family Seminar',
  'Leadership Training',
  'Community Outreach',
];

const InvitationForm = ({ user, token, targetPastor, onCancel, onSuccess }) => {
  const [churches, setChurches] = useState([]);
  const [pastors, setPastors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [fieldSecretary, setFieldSecretary] = useState(null);
  const [requesterSecretary, setRequesterSecretary] = useState(null);
  const [targetLeaveDates, setTargetLeaveDates] = useState([]);

  // Coordination State
  const [requestingPastorId, setRequestingPastorId] = useState(user.role === 'pastor' ? user.id : '');
  const [targetUserId, setTargetUserId] = useState(targetPastor?.id || '');
  const [selectedFile, setSelectedFile] = useState(null);

  const [formData, setFormData] = useState({
    church_name: user.church_name || '',
    service_date: '',
    service_end_date: '',
    service_type: 'Sabbath Service',
    priority: 'Medium',
    pastor_note: '',
    attachment_url: ''
  });

  const isMultiDay = MULTI_DAY_TYPES.includes(formData.service_type);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Reset end date when switching away from multi-day type
  useEffect(() => {
    if (!isMultiDay) {
      setFormData(prev => ({ ...prev, service_end_date: '' }));
    }
  }, [formData.service_type]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const directoryRes = await fetch('http://localhost:5000/api/directory/pastors', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const directoryData = await directoryRes.json();
      setPastors(Array.isArray(directoryData) ? directoryData : []);

      if (user.role === 'pastor') {
        const filterParam = user.district_id ? `district_id=${user.district_id}` : `field_id=${user.field_id}`;
        const churchRes = await fetch(`http://localhost:5000/api/churches?${filterParam}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const churchData = await churchRes.json();
        setChurches(Array.isArray(churchData) ? churchData : []);

        const secRes = await fetch(`http://localhost:5000/api/fields/${user.field_id}/secretaries`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const secData = await secRes.json();
        setRequesterSecretary(Array.isArray(secData) && secData.length > 0 ? secData[0] : null);
      }
    } catch (err) {
      console.error('Data fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.role === 'admin' && requestingPastorId) {
      const pastor = pastors.find(p => p.id === parseInt(requestingPastorId));
      if (pastor) {
        setFormData(prev => ({ ...prev, church_name: pastor.display_church || pastor.church_name || '' }));

        const filterParam = pastor.district_id ? `district_id=${pastor.district_id}` : `field_id=${pastor.field_id}`;
        fetch(`http://localhost:5000/api/churches?${filterParam}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => setChurches(Array.isArray(data) ? data : []));

        fetch(`http://localhost:5000/api/fields/${pastor.field_id}/secretaries`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => setRequesterSecretary(Array.isArray(data) && data.length > 0 ? data[0] : null))
          .catch(() => setRequesterSecretary(null));
      }
    } else if (user.role === 'admin' && !requestingPastorId) {
      setRequesterSecretary(null);
      setChurches([]);
    }
  }, [requestingPastorId, pastors, user.role, token]);

  useEffect(() => {
    setFieldSecretary(null);
    setTargetLeaveDates([]);
    if (!targetUserId) return;

    const selectedTarget = pastors.find(p => String(p.id) === String(targetUserId));

    if (selectedTarget?.field_id) {
      fetch(`http://localhost:5000/api/fields/${selectedTarget.field_id}/secretaries`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setFieldSecretary(Array.isArray(data) && data.length > 0 ? data[0] : null))
        .catch(() => setFieldSecretary(null));
    }

    fetch(`http://localhost:5000/api/pastor/leave-dates?user_id=${targetUserId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setTargetLeaveDates(Array.isArray(data) ? data : []))
      .catch(() => setTargetLeaveDates([]));

  }, [targetUserId, pastors, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetUserId || !formData.service_date) return;

    if (user.role === 'admin' && !requestingPastorId) {
      alert('Strategic error: You must identify the Requesting Pastor.');
      return;
    }

    // Validate end date for multi-day events
    if (isMultiDay && formData.service_end_date && formData.service_end_date < formData.service_date) {
      alert('End date cannot be before the start date.');
      return;
    }

    setFormLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('target_user_id', parseInt(targetUserId));
      formDataToSend.append('requesting_pastor_id', user.role === 'admin' ? parseInt(requestingPastorId) : user.id);
      formDataToSend.append('church_name', formData.church_name);
      formDataToSend.append('service_date', formData.service_date);
      if (isMultiDay && formData.service_end_date) {
        formDataToSend.append('service_end_date', formData.service_end_date);
      }
      formDataToSend.append('service_type', formData.service_type);
      formDataToSend.append('priority', formData.priority);
      formDataToSend.append('pastor_note', formData.pastor_note);
      if (selectedFile) {
        formDataToSend.append('attachment', selectedFile);
      }

      const res = await fetch('http://localhost:5000/api/invitations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataToSend
      });

      if (res.ok) {
        onSuccess(await res.json());
      } else {
        const err = await res.json();
        alert(err.error || 'Submission failed');
      }
    } catch (err) {
      console.error('Submit failed:', err);
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-20 bg-white rounded-3xl text-center animate-pulse">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Synchronizing Strategic Directory...</p>
      </div>
    );
  }

  const selectedTarget = pastors.find(p => String(p.id) === String(targetUserId));
  const isDateUnavailable = formData.service_date
    ? targetLeaveDates.find(l => l.leave_date === formData.service_date)
    : null;

  // Duration in days for multi-day preview
  const durationDays = isMultiDay && formData.service_date && formData.service_end_date
    ? Math.round((new Date(formData.service_end_date) - new Date(formData.service_date)) / (1000 * 60 * 60 * 24)) + 1
    : null;

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 animate-in fade-in zoom-in-95 duration-500 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div className="px-10 py-8 border-b border-gray-50 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Mission Invitation Protocol</h2>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Secure pastor-to-preacher coordination</p>
          </div>
        </div>
        <button onClick={onCancel} className="p-2.5 text-gray-300 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* ── Left: Target Identification ── */}
          <div className="lg:col-span-5 space-y-8">
            {user.role === 'admin' && (
              <div className="space-y-3 p-5 bg-blue-50/50 rounded-3xl border border-blue-100 shadow-inner">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" /> Requester Assignment
                </label>
                <select
                  className="w-full bg-white border-2 border-white rounded-2xl px-5 py-3.5 text-sm font-bold text-gray-900 outline-none focus:border-blue-500 transition-all shadow-sm"
                  value={requestingPastorId}
                  onChange={(e) => setRequestingPastorId(e.target.value)}
                  required
                >
                  <option value="">Identify Requesting Pastor...</option>
                  {pastors.filter(p => p.role === 'pastor').map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.field_name})</option>
                  ))}
                </select>

                {requestingPastorId && (
                  requesterSecretary ? (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-blue-100">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 text-xs font-black flex-shrink-0">
                        {requesterSecretary.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest">Requester Secretary</p>
                        <p className="text-xs font-black text-blue-900 truncate">{requesterSecretary.name}</p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-auto" />
                    </div>
                  ) : (
                    <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 text-[9px] text-rose-500 font-bold">
                      ⚠️ No secretary found for requester's field
                    </div>
                  )
                )}
              </div>
            )}

            {user.role === 'pastor' && requesterSecretary && (
              <div className="flex items-center gap-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <div className="w-9 h-9 bg-white border border-emerald-200 rounded-xl flex items-center justify-center text-emerald-700 text-xs font-black flex-shrink-0">
                  {requesterSecretary.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">Validating Secretary</p>
                  <p className="text-sm font-black text-emerald-900 truncate">{requesterSecretary.name}</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-auto" />
              </div>
            )}

            <div className="space-y-6">
              <label className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" /> Target Preacher
              </label>
              <select
                className="w-full bg-white border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 outline-none focus:border-gray-900 transition-all cursor-pointer shadow-sm"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                required
              >
                <option value="">Select Target Preacher...</option>
                {pastors
                  .filter(p => p.role === 'preacher' && String(p.id) !== String(requestingPastorId))
                  .map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.field_name})</option>
                  ))
                }
              </select>

              {selectedTarget && (
                <div className="space-y-3 animate-in slide-in-from-top-4 duration-300">
                  <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100 rounded-full -mr-12 -mt-12 group-hover:bg-blue-200 transition-colors" />
                    <div className="relative flex items-center gap-4">
                      <div className="w-14 h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center text-gray-900 text-2xl font-black shadow-sm flex-shrink-0">
                        {selectedTarget.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-black text-gray-900 leading-none truncate">{selectedTarget.name}</p>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                            <MapPin className="w-3 h-3 text-blue-500" /> {selectedTarget.field_name}
                          </div>
                          {selectedTarget.district_name && (
                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest ml-4">
                              ↳ {selectedTarget.district_name} District
                            </div>
                          )}
                          {selectedTarget.display_church && (
                            <div className="text-[9px] text-blue-600 font-black uppercase tracking-widest ml-4">
                              ⛪ {selectedTarget.display_church}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {fieldSecretary ? (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-4">
                      <div className="w-10 h-10 bg-white border border-amber-200 rounded-xl flex items-center justify-center text-amber-600 text-sm font-black flex-shrink-0">
                        {fieldSecretary.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest">Regional Contact (Secretary)</p>
                        <p className="text-sm font-black text-amber-900 truncate">{fieldSecretary.name}</p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-amber-400 ml-auto" />
                    </div>
                  ) : (
                    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 text-[10px] text-rose-500 font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> No secretary assigned to target field
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Church className="w-4 h-4 text-gray-400" /> Hosting Congregation
              </label>
              <select
                className="w-full bg-white border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 outline-none focus:border-gray-900 transition-all shadow-sm"
                value={formData.church_name}
                onChange={(e) => setFormData({ ...formData, church_name: e.target.value })}
                required
              >
                <option value="">Select Congregation...</option>
                {churches.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                {!churches.length && <option value={user.church_name}>{user.church_name || 'My Local Church'}</option>}
                <option value="District Convention">District Convention / Office</option>
              </select>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest pl-1">
                {churches.length > 0 ? `${churches.length} churches available in your district` : 'Manual selection active'}
              </p>
            </div>
          </div>

          {/* ── Right: Mission Details ── */}
          <div className="lg:col-span-7 space-y-10">

            {/* Service Type — full width so badge has room */}
            <div className="space-y-4">
              <label className="text-xs font-black text-gray-900 uppercase tracking-widest">Service Type</label>
              <select
                className="w-full bg-white border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 outline-none focus:border-gray-900 transition-all shadow-sm"
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                required
              >
                <option value="">Select Service Type...</option>
                <optgroup label="Single Day">
                  <option value="Sabbath Service">Sabbath Service</option>
                  <option value="Midweek Service">Midweek Service</option>
                  <option value="Baptism Service">Baptism Service</option>
                  <option value="Harvest Festival">Harvest Festival</option>
                </optgroup>
                <optgroup label="Multi-Day Event">
                  <option value="Evangelistic Campaign">Evangelistic Campaign</option>
                  <option value="Prayer Week">Prayer Week</option>
                  <option value="Health Week">Health Week</option>
                  <option value="Camp Meeting">Camp Meeting</option>
                  <option value="Youth Seminar">Youth Seminar</option>
                  <option value="Family Seminar">Family Seminar</option>
                  <option value="Leadership Training">Leadership Training</option>
                  <option value="Community Outreach">Community Outreach</option>
                </optgroup>
              </select>

              {/* Multi-day badge */}
              {isMultiDay && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl animate-in slide-in-from-top-2 duration-300">
                  <CalendarRange className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">
                    Multi-day event — set a start and end date below
                  </p>
                </div>
              )}
            </div>

            {/* Date fields — single or range depending on type */}
            {isMultiDay ? (
              <div className="space-y-4">
                <label className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <CalendarRange className="w-4 h-4 text-gray-400" /> Event Period
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</p>
                    <input
                      type="date"
                      className={`w-full bg-white border-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-gray-900 outline-none transition-all shadow-sm ${isDateUnavailable ? 'border-rose-400 focus:border-rose-600' : 'border-gray-100 focus:border-gray-900'}`}
                      value={formData.service_date}
                      onChange={(e) => setFormData({ ...formData, service_date: e.target.value })}
                      required
                    />
                  </div>
                  {/* End Date */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</p>
                    <input
                      type="date"
                      className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-gray-900 outline-none focus:border-gray-900 transition-all shadow-sm"
                      value={formData.service_end_date}
                      min={formData.service_date || undefined}
                      onChange={(e) => setFormData({ ...formData, service_end_date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Duration pill */}
                {durationDays !== null && durationDays > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl animate-in slide-in-from-top-2 duration-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <p className="text-[10px] text-emerald-700 font-black uppercase tracking-widest">
                      Duration: {durationDays} {durationDays === 1 ? 'day' : 'days'}
                    </p>
                  </div>
                )}

                {isDateUnavailable && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-rose-600 font-bold leading-tight">
                      Preacher is unavailable on the start date ({isDateUnavailable.reason})
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <label className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" /> Service Date
                </label>
                <input
                  type="date"
                  className={`w-full bg-white border-2 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 outline-none transition-all shadow-sm ${isDateUnavailable ? 'border-rose-400 focus:border-rose-600' : 'border-gray-100 focus:border-gray-900'}`}
                  value={formData.service_date}
                  onChange={(e) => setFormData({ ...formData, service_date: e.target.value })}
                  required
                />
                {isDateUnavailable && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 animate-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-rose-600 font-bold leading-tight">
                      Preacher is unavailable on this date ({isDateUnavailable.reason})
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Priority + Attachment */}
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-xs font-black text-gray-900 uppercase tracking-widest">Priority</label>
                <div className="flex gap-2 p-1.5 bg-gray-50 rounded-2xl border border-gray-100">
                  {['Normal', 'Medium', 'High', 'Urgent'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: p })}
                      className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all ${formData.priority === p ? 'bg-white shadow-sm text-blue-600 border border-blue-100' : 'text-gray-400'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-black text-gray-900 uppercase tracking-widest">Mission Program (Optional)</label>
                <div className="relative">
                  <input
                    type="file"
                    id="mission-attachment"
                    className="hidden"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                  />
                  <label
                    htmlFor="mission-attachment"
                    className={`flex items-center gap-3 w-full bg-white border-2 border-dashed rounded-2xl px-6 py-3.5 cursor-pointer transition-all ${selectedFile ? 'border-blue-400 bg-blue-50/50' : 'border-gray-100 hover:border-blue-200'}`}
                  >
                    <FileText className={`w-4 h-4 ${selectedFile ? 'text-blue-500' : 'text-gray-400'}`} />
                    <p className={`text-[10px] font-bold uppercase truncate flex-1 ${selectedFile ? 'text-blue-700' : 'text-gray-400'}`}>
                      {selectedFile ? selectedFile.name : 'Upload Document'}
                    </p>
                    {selectedFile && (
                      <button onClick={(e) => { e.preventDefault(); setSelectedFile(null); }} className="text-blue-500">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </label>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <label className="text-xs font-black text-gray-900 uppercase tracking-widest">Mission Briefing / Coordination Note</label>
              <textarea
                className="w-full bg-white border-2 border-gray-100 rounded-3xl px-8 py-6 text-sm font-medium text-gray-700 outline-none focus:border-gray-900 transition-all min-h-[160px] shadow-sm"
                placeholder="Detail the expectations and requirements for this mission..."
                value={formData.pastor_note}
                onChange={(e) => setFormData({ ...formData, pastor_note: e.target.value })}
                required
              />
            </div>
          </div>
        </div>

        <div className="mt-12 pt-10 border-t border-gray-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="px-8 py-4 text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-gray-900 transition-colors"
          >
            Cancel Protocol
          </button>
          <button
            type="submit"
            disabled={formLoading || !targetUserId || !formData.service_date || !!isDateUnavailable}
            className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-blue-600 shadow-xl shadow-slate-200 transition-all disabled:opacity-30 flex items-center gap-3"
          >
            {formLoading ? 'Transmitting...' : (
              <>
                <Send className="w-4 h-4" /> Initiate Mission Invitation
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvitationForm;