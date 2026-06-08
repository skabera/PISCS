import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck, ExternalLink } from 'lucide-react';

const NotificationBell = ({ token, onNavigate }) => {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [token]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  };

  const markRead = async (id) => {
    await fetch(`http://localhost:5000/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
  };

  const markAllRead = async () => {
    await fetch('http://localhost:5000/api/notifications/read-all', {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        className="relative p-2.5 rounded-2xl hover:bg-white/10 transition-all active:scale-95"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-slate-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-3 w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 z-[100] overflow-hidden animate-in slide-in-from-top-4 fade-in duration-200">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="font-black text-slate-900 text-sm">Notifications</h4>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{unreadCount} unread</p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black text-blue-600 hover:bg-blue-50 rounded-xl transition-colors uppercase tracking-wider"
                >
                  <CheckCheck className="w-3 h-3" /> All Read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-8 h-8 mx-auto text-slate-200 mb-2" />
                <p className="text-xs text-slate-400 font-bold">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`px-5 py-4 flex items-start gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${!n.is_read ? 'bg-blue-50/40' : ''}`}
                  onClick={() => markRead(n.id)}
                >
                  {/* Unread indicator */}
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? 'bg-blue-500' : 'bg-slate-200'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-black leading-tight ${!n.is_read ? 'text-slate-900' : 'text-slate-600'}`}>
                      {n.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                      className="p-1 hover:bg-white rounded-lg transition-colors flex-shrink-0"
                      title="Mark as read"
                    >
                      <Check className="w-3 h-3 text-blue-400" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <p className="text-[10px] text-slate-400 text-center font-medium">
                Showing last {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
