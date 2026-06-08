import React, { useState, useEffect } from 'react';
import { Activity, Clock, User, CheckCircle, XCircle, AlertCircle, Shield, Bell, ArrowRight } from 'lucide-react';

const ActivityFeed = ({ token, user }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const endpoint = user.role === 'admin' 
          ? 'http://localhost:5000/api/admin/audit-logs' 
          : 'http://localhost:5000/api/notifications';
        
        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (Array.isArray(data)) {
          const normalized = data.slice(0, 10).map(item => ({
            id: item.id,
            title: item.action || item.title || 'System Activity',
            details: formatDetails(item.details || item.message),
            timestamp: item.timestamp || item.created_at,
            user_name: item.user_name || 'System',
            type: item.action ? 'audit' : 'notification',
            status: inferStatus(item.action || item.title || '')
          }));
          setActivities(normalized);
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [token, user.role]);

  const formatDetails = (details) => {
    if (!details) return 'No details provided';
    if (typeof details === 'string') {
      try {
        const parsed = JSON.parse(details);
        return Object.entries(parsed)
          .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
          .join(', ');
      } catch {
        return details;
      }
    }
    return JSON.stringify(details);
  };

  const inferStatus = (title) => {
    const t = title.toLowerCase();
    if (t.includes('approve') || t.includes('success') || t.includes('login')) return 'success';
    if (t.includes('reject') || t.includes('decline') || t.includes('fail') || t.includes('error')) return 'error';
    if (t.includes('create') || t.includes('update') || t.includes('invitation')) return 'warning';
    return 'info';
  };

  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = Math.floor((now - then) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return then.toLocaleDateString();
  };

  const getStatusStyles = (status) => {
    const map = {
      success: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      error: 'bg-rose-50 text-rose-600 border-rose-100',
      warning: 'bg-amber-50 text-amber-600 border-amber-100',
      info: 'bg-blue-50 text-blue-600 border-blue-100'
    };
    return map[status] || map.info;
  };

  const getIcon = (type, title, status) => {
    if (status === 'success') return <CheckCircle className="w-4 h-4" />;
    if (status === 'error') return <XCircle className="w-4 h-4" />;
    if (type === 'audit') return <Shield className="w-4 h-4" />;
    return <Bell className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="space-y-5">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            <div className="flex-1 space-y-3 py-1">
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Activity className="w-6 h-6 text-slate-300" />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No activity found</p>
        </div>
      ) : (
        activities.map((activity, idx) => (
          <div 
            key={activity.id || idx} 
            className="group flex gap-4 p-4 rounded-2xl transition-all duration-300 hover:bg-[var(--bg-secondary)] hover:shadow-sm border border-transparent hover:border-[var(--border-color)]"
          >
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${getStatusStyles(activity.status)}`}>
              {getIcon(activity.type, activity.title, activity.status)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-[13px] font-black text-[var(--text-primary)] truncate uppercase tracking-tight">
                  {activity.title.replace(/_/g, ' ')}
                </p>
                <span className="text-[10px] font-black text-[var(--text-secondary)] opacity-60 whitespace-nowrap bg-[var(--bg-secondary)] px-2 py-0.5 rounded-lg border border-[var(--border-color)]">
                  {getRelativeTime(activity.timestamp)}
                </span>
              </div>
              
              <p className="text-[11px] font-medium text-[var(--text-secondary)] line-clamp-1 group-hover:line-clamp-none transition-all duration-500 opacity-80">
                {activity.details}
              </p>
              
              <div className="flex items-center justify-between mt-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-[9px] font-black text-indigo-600 dark:text-indigo-400">
                    {activity.user_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] opacity-70">{activity.user_name}</span>
                </div>
                
                <button className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                  View <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
      
      {activities.length > 0 && (
        <button className="w-full mt-4 py-3 text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-[0.2em] transition-colors border-t border-[var(--border-color)] border-dashed">
          View full activity history
        </button>
      )}
    </div>
  );
};

export default ActivityFeed;
