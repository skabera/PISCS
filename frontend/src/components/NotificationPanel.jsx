import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, Clock, Inbox, Trash2, AlertCircle, RefreshCw, Megaphone } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const configs = {
    pending_field1_secretary: { label: 'Sec 1 Review', color: 'bg-amber-50 text-amber-600 border-amber-100' },
    pending_field2_secretary: { label: 'Sec 2 Review', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    pending_preacher_confirmation: { label: 'Awaiting Preacher', color: 'bg-purple-50 text-purple-600 border-purple-100' },
    approved: { label: 'Confirmed', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    rejected: { label: 'Declined', color: 'bg-rose-50 text-rose-600 border-rose-100' },
    cancelled: { label: 'Cancelled', color: 'bg-slate-50 text-slate-500 border-slate-100' },
  };
  const config = configs[status] || { label: status, color: 'bg-slate-50 text-slate-500 border-slate-100' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${config.color} whitespace-nowrap`}>
      {config.label}
    </span>
  );
};

const NotificationPanel = ({ token }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch('http://localhost:5000/api/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 animate-pulse">
        <RefreshCw className="w-10 h-10 text-blue-200 animate-spin mb-4" />
        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Loading alerts...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-5 duration-700">
      {/* Header */}
      <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
            <Bell className="w-6 h-6 text-blue-600" />
            Inbox & Alerts
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Stay updated on your mission coordination protocols.
          </p>
        </div>
        <button
          onClick={markAllRead}
          disabled={notifications.every(n => n.is_read)}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-blue-100"
        >
          Mark all as read
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-10 space-y-4">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-inner">
              <Inbox className="w-8 h-8 text-slate-200" />
            </div>
            <h3 className="text-lg font-black text-slate-400 uppercase tracking-tight">Your inbox is empty</h3>
            <p className="text-sm text-slate-500 max-w-xs mt-2">No active alerts or reminders at this time. All mission workflows are up to date.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`group relative p-6 rounded-3xl border transition-all duration-300 ${n.is_read ? 'bg-slate-50 border-slate-100' : 'bg-white border-blue-200 shadow-xl shadow-blue-50'}`}
              onClick={() => !n.is_read && markAsRead(n.id)}
            >
              <div className="flex gap-5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  n.is_read ? 'bg-slate-200 text-slate-400' : 
                  (!n.invitation_status ? 'bg-indigo-100 text-indigo-600' :
                  (n.title.includes('Remind') || n.title.includes('Declined') ? 'bg-rose-100 text-rose-600' : 
                  'bg-blue-100 text-blue-600'))
                }`}>
                  {!n.invitation_status ? <Megaphone className="w-6 h-6" /> :
                   n.title.includes('Remind') ? <Clock className="w-6 h-6" /> : 
                   n.is_read ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3 min-w-0">
                      <h4 className={`text-sm font-black uppercase tracking-tight truncate ${n.is_read ? 'text-slate-500' : 'text-slate-900'}`}>
                        {n.title}
                      </h4>
                      {n.invitation_status && <StatusBadge status={n.invitation_status} />}
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap ml-4">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className={`text-xs leading-relaxed ${n.is_read ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                    {n.message}
                  </p>
                  {!n.is_read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="mt-4 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                    >
                      Dismiss & Mark Read
                    </button>
                  )}
                </div>
              </div>
              {!n.is_read && (
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
