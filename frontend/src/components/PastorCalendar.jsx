import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, MapPin, CheckCircle, AlertCircle, History as HistoryIcon, ShieldOff, Plus, Trash2, FileText, Download, Star } from 'lucide-react';

const PastorCalendar = ({ token, role = 'pastor' }) => {
  const [activeTab, setActiveTab] = useState('missions'); // missions, history, leave
  const [events, setEvents] = useState([]);
  const [history, setHistory] = useState([]);
  const [leaveDates, setLeaveDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newLeaveDate, setNewLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const baseUrl = role === 'preacher' ? 'http://localhost:5000/api/preacher' : 'http://localhost:5000/api/pastor';
      const [calRes, histRes, leaveRes] = await Promise.all([
        fetch(`${baseUrl}/calendar`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${baseUrl}/history`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${baseUrl}/leave-dates`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const calData = await calRes.json();
      const histData = await histRes.json();
      const leaveData = await leaveRes.json();
      
      setEvents(Array.isArray(calData) ? calData : []);
      setHistory(Array.isArray(histData) ? histData : []);
      setLeaveDates(Array.isArray(leaveData) ? leaveData : []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleLeaveDate = async (e) => {
    e.preventDefault();
    if (!newLeaveDate) return;
    try {
      const baseUrl = role === 'preacher' ? 'http://localhost:5000/api/preacher' : 'http://localhost:5000/api/pastor';
      const res = await fetch(`${baseUrl}/leave-dates`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newLeaveDate, reason: leaveReason })
      });
      if (res.ok) {
        setNewLeaveDate('');
        setLeaveReason('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'rejected': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'completed': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'cancelled': return 'bg-slate-50 text-slate-500 border-slate-100';
      case 'pending_field1_secretary':
      case 'pending_field2_secretary':
      case 'pending_preacher_confirmation':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-blue-50 text-blue-600 border-blue-100';
    }
  };

  if (loading) {
    return (
      <div className="p-20 text-center">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Syncing Mission Timeline...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">📅 Calendar & Availability</h2>
          <p className="text-slate-500 text-sm mt-1">Manage scheduled missions and set your leave dates</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100/50 rounded-2xl w-fit border border-slate-200 backdrop-blur-sm">
        <button
          onClick={() => setActiveTab('missions')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-300 ${activeTab === 'missions' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
        >
          <CalendarIcon className="w-4 h-4" /> Missions Track
        </button>
        <button
          onClick={() => setActiveTab('leave')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-300 ${activeTab === 'leave' ? 'bg-white text-rose-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
        >
          <ShieldOff className="w-4 h-4" /> Manage Leave
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-300 ${activeTab === 'history' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
        >
          <HistoryIcon className="w-4 h-4" /> Service History
        </button>
      </div>

      {/* MISSIONS TAB */}
      {activeTab === 'missions' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2">
          {events.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
              <CalendarIcon className="w-16 h-16 mx-auto text-slate-300 mb-6" />
              <h3 className="text-lg font-black text-slate-900">No scheduled missions yet</h3>
              <p className="text-slate-500 mt-2 max-w-sm mx-auto text-sm">Use the Preacher Directory to find and invite leaders from other fields to your church services.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {events.map((event) => (
                <div key={event.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 hover:shadow-xl transition-all group overflow-hidden relative">
                  <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl text-[10px] font-black uppercase tracking-[0.1em] border-l border-b ${getStatusColor(event.status)}`}>
                    {event.status.replace(/_/g, ' ')}
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">{event.service_type}</h3>
                      <div className="flex items-center gap-3 text-sm text-slate-400 font-bold mt-2">
                        <Clock className="w-4 h-4" />
                        {new Date(event.service_date).toLocaleDateString('en-RW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {event.requesting_pastor_id === JSON.parse(localStorage.getItem('user'))?.id ? (
                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:border-blue-100 transition-colors">
                          <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600 text-lg font-black italic">
                            {event.preacher_name?.charAt(0) || 'P'}
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.1em]">Invited Guest Preacher</p>
                            <p className="text-sm font-black text-slate-800">{event.preacher_name}</p>
                            <p className="text-[10px] text-slate-500 font-bold italic">{event.preacher_specialty || 'Guest Speaker'}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 p-4 bg-blue-50/30 rounded-2xl border border-blue-100 group-hover:border-blue-200 transition-colors">
                          <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-600 text-lg font-black italic">
                            {event.hosting_pastor_name?.charAt(0) || 'H'}
                          </div>
                          <div>
                            <p className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.1em]">Hosting Church / Pastor</p>
                            <p className="text-sm font-black text-slate-800">{event.hosting_pastor_name}</p>
                            <p className="text-[10px] text-slate-500 font-bold italic">You are the Guest Speaker</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:border-blue-100 transition-colors">
                        <MapPin className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.1em]">Mailing / Service Location</p>
                          <p className="text-sm font-black text-slate-800">
                            {event.requesting_pastor_id === JSON.parse(localStorage.getItem('user'))?.id ? event.preacher_field : event.hosting_field}
                          </p>
                        </div>
                      </div>
                    </div>

                    {event.pastor_note && (
                      <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 italic text-xs text-blue-700 font-medium">
                        " {event.pastor_note} "
                      </div>
                    )}

                    {event.attachment_url && (
                      <div className="bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between border-dashed">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-50">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="text-left overflow-hidden">
                            <p className="text-[9px] text-emerald-600 font-black uppercase tracking-widest leading-none mb-1">Mission Attachment</p>
                            <p className="text-[10px] text-slate-500 font-bold truncate max-w-[120px]">Official Program/Detail</p>
                          </div>
                        </div>
                        <a 
                          href={`http://localhost:5000${event.attachment_url}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100"
                        >
                          <Download className="w-3 h-3" /> Get File
                        </a>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${event.priority === 'High' ? 'bg-rose-500 animate-pulse' : 'bg-blue-400'}`} />
                        <span className="text-[10px] font-black uppercase text-slate-400">Priority: {event.priority}</span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-400">
                        Ref #: PISCS-{event.id.toString().padStart(4, '0')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LEAVE TAB */}
      {activeTab === 'leave' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2">
          {/* Add Form */}
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
            <h3 className="text-lg font-black tracking-tight mb-4 flex items-center gap-2">
              <ShieldOff className="w-5 h-5 text-rose-500" /> Mark Unavailable Date
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-6">Select specific dates where you are out of office, on sabbatical, or unable to coordinate services.</p>
            <form onSubmit={toggleLeaveDate} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block">Leave Date</label>
                <input 
                  type="date"
                  required
                  value={newLeaveDate}
                  onChange={(e) => setNewLeaveDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-rose-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block">Reason (Optional)</label>
                <input 
                  type="text"
                  placeholder="e.g. Vacation, Sabbatical, Sick leave"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-rose-200 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!newLeaveDate}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-200"
              >
                Mark Date As Leave
              </button>
            </form>
          </div>

          {/* List */}
          <div className="bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 p-8">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center justify-between">
              Registered Leave Dates
              <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{leaveDates.length}</span>
            </h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {leaveDates.length === 0 ? (
                <div className="text-center py-10 opacity-50">
                  <ShieldOff className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-slate-500">No leave dates marked</p>
                </div>
              ) : (
                leaveDates.map(ld => (
                  <div key={ld.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{new Date(ld.leave_date).toLocaleDateString('en-RW', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{ld.reason || 'Unavailable'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setNewLeaveDate(ld.leave_date); toggleLeaveDate(new Event('submit')); }}
                      className="text-rose-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove leave"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2">
          {history.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-emerald-100">
              <HistoryIcon className="w-16 h-16 mx-auto text-emerald-200 mb-6" />
              <h3 className="text-lg font-black text-slate-900">No past services recorded</h3>
              <p className="text-slate-500 mt-2 max-w-sm mx-auto text-sm">Completed missions where you served as a guest preacher will appear here automatically.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map((event) => (
                <div key={event.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-50 rounded-full opacity-0 group-hover:opacity-50 transition-opacity" />
                  
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-black">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${event.status === 'completed' ? 'text-blue-600 bg-blue-50' : 'text-emerald-600 bg-emerald-50'}`}>
                      {event.status === 'completed' ? '🏁 Completed' : '✅ Past Mission'}
                    </span>
                  </div>
                  
                  <h3 className="font-black text-lg text-slate-900 leading-tight mb-2 uppercase">{event.service_type}</h3>
                  <p className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(event.service_date).toLocaleDateString()}
                  </p>
                  
                  <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Served At</p>
                    <p className="text-sm font-black text-slate-800">{event.pastor_field_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Invited by Pr. {event.pastor_name}</p>
                  </div>

                  {(event.preacher_rating || event.preacher_experience_note) && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      {event.preacher_rating && (
                        <div className="flex gap-0.5 mb-2">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} className={`w-3 h-3 ${star <= event.preacher_rating ? 'text-amber-500 fill-current' : 'text-slate-200'}`} />
                          ))}
                        </div>
                      )}
                      {event.preacher_experience_note && (
                        <p className="text-[11px] text-slate-500 italic line-clamp-2">"{event.preacher_experience_note}"</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default PastorCalendar;
