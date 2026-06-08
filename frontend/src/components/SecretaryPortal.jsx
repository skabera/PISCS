import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, History, AlertCircle, Send, MessageSquare, ChevronDown, FileText, Download, Bell, Users, Clock, AlertTriangle, Inbox, Home, ChevronRight, ShieldCheck, CalendarRange, MapPin, Building, User, Calendar, Activity } from 'lucide-react';
import ActivityFeed from './ActivityFeed';

// Multi-day types — keep in sync with InvitationForm
const MULTI_DAY_TYPES = [
  'Evangelistic Campaign', 'Prayer Week', 'Health Week', 'Camp Meeting',
  'Youth Seminar', 'Family Seminar', 'Leadership Training', 'Community Outreach',
];

const SecretaryPortal = ({ user, token, externalTab, onTabChange }) => {
  const [activeTab, setActiveTabState] = useState('outgoing');

  useEffect(() => {
    if (externalTab && ['outgoing', 'incoming', 'dashboard'].includes(externalTab)) {
      setActiveTabState(externalTab);
    }
  }, [externalTab]);

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    if (onTabChange) onTabChange(tab);
  };

  const [outgoingQueue, setOutgoingQueue] = useState([]);
  const [incomingQueue, setIncomingQueue] = useState([]);
  const [historyQueue, setHistoryQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [noteInput, setNoteInput] = useState({});

  useEffect(() => { fetchQueues(); }, [token]);

  const fetchQueues = async () => {
    setLoading(true);
    try {
      const [outRes, inRes, histRes] = await Promise.all([
        fetch('http://localhost:5000/api/secretary/outgoing-queue', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/secretary/incoming-queue', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/secretary/history', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const outData = await outRes.json();
      const inData = await inRes.json();
      const histData = await histRes.json();
      setOutgoingQueue(Array.isArray(outData) ? outData : []);
      setIncomingQueue(Array.isArray(inData) ? inData : []);
      setHistoryQueue(Array.isArray(histData) ? histData : []);
    } catch (err) {
      console.error('Failed to fetch queues:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStats = () => {
    const all = [...outgoingQueue, ...incomingQueue, ...historyQueue];
    const pending = all.filter(i => i.status.includes('pending')).length;
    const approved = all.filter(i => i.status === 'approved').length;
    const cancelled = all.filter(i => i.status === 'rejected' || i.status === 'cancelled').length;
    return { total: all.length, approved, pending, cancelled };
  };

  const stats = getStats();

  const updateStatus = async (invitationId, newStatus, note = '') => {
    try {
      const res = await fetch(`http://localhost:5000/api/invitations/${invitationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus, note })
      });
      if (res.ok) { await fetchQueues(); setExpandedId(null); setNoteInput({}); }
    } catch (err) { console.error('Failed to update status:', err); }
  };

  const statusBadge = (status) => {
    const map = {
      pending_field1_secretary: { label: 'Awaiting Field 1', color: 'bg-amber-50 text-amber-700 border-amber-200' },
      pending_field2_secretary: { label: 'Sent to Field 2', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      pending_preacher_confirmation: { label: 'Awaiting Preacher', color: 'bg-purple-50 text-purple-700 border-purple-200' },
      approved: { label: 'Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      rejected: { label: 'Rejected', color: 'bg-rose-50 text-rose-700 border-rose-200' },
      completed: { label: 'Completed', color: 'bg-slate-50 text-slate-600 border-slate-200' },
    };
    const cfg = map[status] || { label: status.replace(/_/g, ' '), color: 'bg-slate-50 text-slate-600 border-slate-200' };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  };

  // ── Redesigned Queue Card ───────────────────────────────────────────────
  const QueueItem = ({ item, isOutgoing }) => {
    const isExpanded = expandedId === item.id;
    const isMultiDay = MULTI_DAY_TYPES.includes(item.service_type);
    const durationDays = isMultiDay && item.service_end_date
      ? Math.round((new Date(item.service_end_date) - new Date(item.service_date)) / (1000 * 60 * 60 * 24)) + 1
      : null;

    const priorityColor = {
      Urgent: 'bg-rose-50 text-rose-600 border-rose-200',
      High: 'bg-orange-50 text-orange-600 border-orange-200',
      Medium: 'bg-amber-50 text-amber-600 border-amber-200',
      Normal: 'bg-slate-50 text-slate-500 border-slate-200',
      Low: 'bg-slate-50 text-slate-400 border-slate-200',
    }[item.priority] || 'bg-slate-50 text-slate-500 border-slate-200';

    return (
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all">
        {/* ── Card Header ── */}
        <div
          className="p-6 cursor-pointer"
          onClick={() => setExpandedId(isExpanded ? null : item.id)}
        >
          <div className="flex items-start justify-between gap-4">
            {/* Avatar + name */}
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-lg font-black flex-shrink-0">
                {item.preacher_name?.charAt(0)}
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-slate-900 text-base leading-tight truncate">{item.preacher_name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3 h-3 text-blue-400 flex-shrink-0" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">{item.preacher_field_name}</span>
                </div>
              </div>
            </div>

            {/* Status + chevron */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {statusBadge(item.status)}
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          </div>

          {/* Quick info row */}
          <div className="mt-4 flex flex-wrap gap-3">
            {/* Date */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl">
              {isMultiDay
                ? <CalendarRange className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                : <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              }
              <span className="text-[11px] font-bold text-slate-700">
                {new Date(item.service_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                {item.service_end_date && (
                  <> → {new Date(item.service_end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</>
                )}
              </span>
              {durationDays && (
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-lg">{durationDays}d</span>
              )}
            </div>

            {/* Service type */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl">
              <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-[11px] font-bold text-slate-700">{item.service_type}</span>
            </div>

            {/* Priority */}
            <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${priorityColor}`}>
              {item.priority || 'Medium'}
            </span>

            {/* Attachment indicator */}
            {item.attachment_url && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                <FileText className="w-3 h-3" /> Attachment
              </span>
            )}
          </div>

          {/* Requester row */}
          <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5"><User className="w-3 h-3" /> Requester: <span className="font-black text-slate-700">{item.pastor_name}</span></span>
            {item.church_name && (
              <span className="flex items-center gap-1.5"><Building className="w-3 h-3" /> {item.church_name}</span>
            )}
          </div>
        </div>

        {/* ── Expanded Detail Panel ── */}
        {isExpanded && (
          <div className="border-t border-slate-100 bg-slate-50/50 p-6 space-y-6">

            {/* Full date block for multi-day */}
            {isMultiDay && item.service_end_date && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-4">
                <CalendarRange className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Event Period</p>
                  <p className="text-sm font-black text-slate-800">
                    {new Date(item.service_date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}
                    {' '}<ChevronRight className="inline w-3.5 h-3.5 text-slate-400" />{' '}
                    {new Date(item.service_end_date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="ml-auto px-4 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                  {durationDays} {durationDays === 1 ? 'day' : 'days'}
                </div>
              </div>
            )}

            {/* Detail grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Requesting Pastor', value: item.pastor_name, icon: <User className="w-3 h-3 text-slate-400" /> },
                { label: 'Invited Preacher', value: item.preacher_name, icon: <User className="w-3 h-3 text-blue-400" /> },
                { label: "Preacher's Field", value: item.preacher_field_name, icon: <MapPin className="w-3 h-3 text-blue-400" /> },
                { label: 'Pastor Field', value: item.pastor_field_name, icon: <MapPin className="w-3 h-3 text-slate-400" /> },
                { label: 'Service Type', value: item.service_type, icon: <FileText className="w-3 h-3 text-slate-400" /> },
                { label: 'Priority', value: item.priority || 'Medium', icon: <AlertTriangle className="w-3 h-3 text-amber-400" /> },
              ].map(({ label, value, icon }) => (
                <div key={label} className="p-3 bg-white border border-slate-100 rounded-2xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">{icon} {label}</p>
                  <p className="text-xs font-black text-slate-800">{value || '—'}</p>
                </div>
              ))}
            </div>

            {/* Status trail */}
            <div className="p-4 bg-white border border-slate-100 rounded-2xl space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Status Trail</p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Created: <span className="font-bold text-slate-700">{new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></span>
                </div>
                {item.pastor_note && (
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Pastor's Note</p>
                    <p className="text-xs text-blue-800 italic">"{item.pastor_note}"</p>
                  </div>
                )}
                {item.field1_secretary_note && (
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Field 1 Secretary</p>
                    <p className="text-xs text-amber-800">{item.field1_secretary_note}</p>
                  </div>
                )}
                {item.field2_secretary_note && (
                  <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl">
                    <p className="text-[9px] font-black text-purple-500 uppercase tracking-widest mb-1">Field 2 Secretary</p>
                    <p className="text-xs text-purple-800">{item.field2_secretary_note}</p>
                  </div>
                )}
                {item.preacher_note && (
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Preacher's Note</p>
                    <p className="text-xs text-slate-700">{item.preacher_note}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Attachment */}
            {item.attachment_url && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <FileText className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Mission Attachment</p>
                    <p className="text-xs font-black text-slate-700">Official Program Document</p>
                  </div>
                </div>
                <a
                  href={`http://localhost:5000${item.attachment_url}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              </div>
            )}

            {/* ── Action Area ── */}
            {isOutgoing && item.status === 'pending_field1_secretary' && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Decision</p>
                <textarea
                  placeholder="Add approval note (optional)..."
                  value={noteInput[item.id] || ''}
                  onChange={(e) => setNoteInput({ ...noteInput, [item.id]: e.target.value })}
                  className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl text-sm text-slate-700 outline-none focus:border-blue-500 transition-all resize-none min-h-[80px]"
                />
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => updateStatus(item.id, 'pending_field2_secretary', noteInput[item.id] || '')}
                    className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve & Forward
                  </button>
                  <button
                    onClick={() => updateStatus(item.id, 'rejected', noteInput[item.id] || 'Rejected by Field 1 Secretary')}
                    className="py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            )}

            {!isOutgoing && item.status === 'pending_field2_secretary' && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Decision</p>
                <textarea
                  placeholder="Add verification note (optional)..."
                  value={noteInput[item.id] || ''}
                  onChange={(e) => setNoteInput({ ...noteInput, [item.id]: e.target.value })}
                  className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl text-sm text-slate-700 outline-none focus:border-blue-500 transition-all resize-none min-h-[80px]"
                />
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => updateStatus(item.id, 'pending_preacher_confirmation', noteInput[item.id] || '')}
                    className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Authorize & Forward
                  </button>
                  <button
                    onClick={() => updateStatus(item.id, 'rejected', noteInput[item.id] || 'Rejected by Field 2 Secretary')}
                    className="py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            )}

            {/* Read-only history items — no actions */}
            {(item.status === 'approved' || item.status === 'rejected' || item.status === 'completed') && (
              <div className="pt-2 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">This record is closed — no further action required</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) return (
    <div className="p-20 text-center">
      <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Synchronizing queues...</p>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── Dashboard Tab ── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Registry', value: stats.total, color: 'text-slate-900', icon: <FileText className="w-5 h-5 text-slate-200" /> },
              { label: 'Approved', value: stats.approved, color: 'text-emerald-500', icon: <CheckCircle2 className="w-5 h-5 text-emerald-100" /> },
              { label: 'Pending Review', value: stats.pending, color: 'text-amber-500', icon: <Clock className="w-5 h-5 text-amber-100" /> },
              { label: 'Cancelled', value: stats.cancelled, color: 'text-rose-500', icon: <XCircle className="w-5 h-5 text-rose-100" /> },
            ].map(({ label, value, color, icon }) => (
              <div key={label} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{label}</p>
                <div className="flex items-center justify-between">
                  <p className={`text-3xl font-black ${color}`}>{value}</p>
                  {icon}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-blue-200">
            <div className="relative z-10">
              <h2 className="text-3xl font-black tracking-tight uppercase">Secretary Command Center</h2>
              <p className="text-blue-100 mt-2 font-medium max-w-lg">
                Monitoring {stats.total} coordination requests. You have {stats.pending} items awaiting secretarial action.
              </p>
              <div className="flex gap-4 mt-6">
                <button onClick={() => setActiveTab('incoming')} className="px-8 py-3 bg-white text-blue-600 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-blue-50 transition-all active:scale-95">Incoming Queue</button>
                <button onClick={() => setActiveTab('outgoing')} className="px-8 py-3 bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-blue-400 transition-all active:scale-95 border border-blue-400">Outgoing Queue</button>
                <button onClick={() => setActiveTab('history')} className="px-8 py-3 bg-blue-700/60 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 transition-all active:scale-95">History</button>
              </div>
            </div>
            <div className="absolute -right-10 -bottom-10 opacity-10"><ShieldCheck className="w-64 h-64" /></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Latest Mission History</h3>
                <button onClick={() => setActiveTab('history')} className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1 transition-all">
                  View Full Archive <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-3">
                {historyQueue.slice(0, 3).map(item => (
                  <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 font-black text-xs">
                        {item.preacher_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900">{item.preacher_name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          📅 {new Date(item.service_date).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.status.replace(/_/g, ' ')}</span>
                  </div>
                ))}
                {historyQueue.length === 0 && <p className="text-xs text-slate-400 text-center py-4 italic">No recent mission history found.</p>}
              </div>
            </div>

            {/* Activity Feed for Secretary */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black text-[var(--text-primary)] mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  Recent Activity
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-full border border-indigo-100 dark:border-indigo-800">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                  <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Live</span>
                </div>
              </h3>
              <ActivityFeed token={token} user={user} />
            </div>
          </div>
        </div>
      )}

      {/* ── Queue Tabs ── */}
      <div className="space-y-4">
        {activeTab === 'outgoing' && (
          outgoingQueue.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-3xl border border-slate-200">
              <CheckCircle2 className="w-12 h-12 mx-auto text-slate-200 mb-3" />
              <p className="text-slate-400 font-black text-xs uppercase tracking-widest">No pending outgoing requests</p>
            </div>
          ) : (
            outgoingQueue.map(item => <QueueItem key={item.id} item={item} isOutgoing={true} />)
          )
        )}

        {activeTab === 'incoming' && (
          incomingQueue.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-3xl border border-slate-200">
              <Inbox className="w-12 h-12 mx-auto text-slate-200 mb-3" />
              <p className="text-slate-400 font-black text-xs uppercase tracking-widest">No pending incoming requests</p>
            </div>
          ) : (
            incomingQueue.map(item => <QueueItem key={item.id} item={item} isOutgoing={false} />)
          )
        )}

        {activeTab === 'history' && (
          historyQueue.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-3xl border border-slate-200">
              <History className="w-12 h-12 mx-auto text-slate-200 mb-3" />
              <p className="text-slate-400 font-black text-xs uppercase tracking-widest">No mission history recorded yet</p>
            </div>
          ) : (
            historyQueue.map(item => <QueueItem key={item.id} item={item} isOutgoing={false} />)
          )
        )}
      </div>
    </div>
  );
};

export default SecretaryPortal;