import React, { useState, useEffect } from 'react';
import { Shield, Clock, User, Activity, Search, RefreshCw, AlertTriangle, ShieldCheck, Mail, Database } from 'lucide-react';

const SecurityAudit = ({ token }) => {
  const [activeSubTab, setActiveSubTab] = useState('logs');
  const [logs, setLogs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsRes, sessionsRes] = await Promise.all([
        fetch('http://localhost:5000/api/admin/audit-logs', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/admin/sessions', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const logsData = await logsRes.json();
      const sessionsData = await sessionsRes.json();
      setLogs(Array.isArray(logsData) ? logsData : []);
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
    } catch (err) {
      console.error('Security fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.user_name?.toLowerCase().includes(filter.toLowerCase()) ||
    log.action?.toLowerCase().includes(filter.toLowerCase()) ||
    log.details?.toLowerCase().includes(filter.toLowerCase())
  );

  const filteredSessions = sessions.filter(s => 
    s.name?.toLowerCase().includes(filter.toLowerCase()) ||
    s.email?.toLowerCase().includes(filter.toLowerCase())
  );

  const getActionColor = (action) => {
    switch(action) {
      case 'LOGIN': return 'text-emerald-600 bg-emerald-50';
      case 'INVITATION_CREATE': return 'text-blue-600 bg-blue-50';
      case 'INVITATION_STATUS_CHANGE': return 'text-amber-600 bg-amber-50';
      case 'USER_UPDATE': return 'text-purple-600 bg-purple-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const getRelativeTime = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit">
          <button
            onClick={() => setActiveSubTab('logs')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'logs' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Activity Stream
          </button>
          <button
            onClick={() => setActiveSubTab('sessions')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'sessions' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Login Sessions
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1-2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter activities..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all w-64"
            />
          </div>
          <button 
            onClick={fetchData}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-600"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          {activeSubTab === 'logs' ? (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-md z-10">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">Timestamp</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">Personnel</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">Action Event</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-bold text-slate-600">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">
                          {log.user_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900">{log.user_name || 'System'}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{log.user_role || 'Auto-Process'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${getActionColor(log.action)}`}>
                        {log.action?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-500 font-medium max-w-md truncate hover:whitespace-normal transition-all cursor-help">
                        {log.details.length > 50 ? `${log.details.substring(0, 50)}...` : log.details}
                      </p>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Database className="w-12 h-12 text-slate-100" />
                        <p className="text-sm font-bold text-slate-400">No activity logs found for the current audit period.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-md z-10">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">Personnel Name</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">System Role</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">Last Heartbeat</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">Access Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSessions.map(session => (
                  <tr key={session.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-xs border border-blue-100 shadow-sm">
                          {session.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900">{session.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{session.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 px-2 py-0.5 bg-slate-100 rounded-md">
                        {session.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{getRelativeTime(session.last_login)}</span>
                        {session.last_login && <span className="text-[9px] text-slate-400">{new Date(session.last_login).toLocaleString()}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {session.is_archived ? (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Access Revoked</span>
                          </>
                        ) : (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active System Token</span>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Security Footer */}
      <div className="flex items-center gap-6 p-6 bg-slate-900 rounded-3xl text-white shadow-xl shadow-slate-200">
        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white backdrop-blur-md border border-white/10">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-black tracking-tight uppercase">Encryption & Data Audit Protection Active</h4>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Real-time session monitoring and action tracing is enabled for all administrative and ministry personal accounts.</p>
        </div>
        <div className="hidden md:flex flex-col items-end">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Policy v2.1</p>
          <div className="flex items-center gap-1.5 mt-1 text-emerald-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">System Secured</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityAudit;
