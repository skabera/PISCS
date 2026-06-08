import React, { useState, useEffect, useMemo } from 'react';
import {
  Home, FileText, Users, Settings, Bell, Search, Plus, MapPin,
  Inbox, Calendar, History, Send, FileDown, Building, Shield,
  LifeBuoy, BarChart2, UserPlus, Megaphone, ChevronRight,
  TrendingUp, CheckCircle, Clock, Activity, UserCheck, Sun, Moon, XCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import InvitationFlow from './InvitationFlow';
import UserManagement from './UserManagement';
import ProfileForm from './ProfileForm';
import SecretaryPortal from './SecretaryPortal';
import PastorPortal from './PastorPortal';
import PreacherPortal from './PreacherPortal';
import FieldManagement from './FieldManagement';
import NotificationPanel from './NotificationPanel';
import BroadcastModal from './BroadcastModal';
import SecurityAudit from './SecurityAudit';
import SupportManagement from './SupportManagement';
import Reporting from './Reporting';
import PreacherRegistration from './PreacherRegistration';
import PreacherAvailability from './PreacherAvailability';   // ← NEW
import ActivityFeed from './ActivityFeed';
import logo from '../logo.jpeg';

/* ─────────────────────────── tiny primitives ─────────────────────────── */

const NavItem = ({ icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 group ${active
      ? 'bg-[var(--accent)] text-white shadow-md shadow-indigo-200/20'
      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
      }`}
  >
    <span className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-white' : 'text-slate-400'}`}>
      {icon}
    </span>
    <span className="flex-1 text-left">{label}</span>
    {badge > 0 && (
      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-[var(--accent)]/10 text-[var(--accent)]'}`}>
        {badge}
      </span>
    )}
  </button>
);

const StatCard = ({ title, value, icon, gradient, subtitle, onClick, active }) => (
  <div
    onClick={onClick}
    className={`relative rounded-2xl p-6 overflow-hidden ${gradient} text-white shadow-lg transition-all duration-300
      ${onClick ? 'cursor-pointer hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]' : ''}
      ${active ? 'ring-4 ring-white/40 scale-[1.02] shadow-2xl' : ''}`}
  >
    <div className="absolute top-0 right-0 w-32 h-32 opacity-10 translate-x-8 -translate-y-8">
      <div className="w-full h-full rounded-full border-[24px] border-white" />
    </div>
    <div className="relative z-10">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner border border-white/10">
          {icon}
        </div>
        {onClick && (
          <span className="text-[10px] font-black bg-white/20 px-2.5 py-1 rounded-lg uppercase tracking-widest backdrop-blur-sm border border-white/10">
            {active ? 'Viewing' : 'Details'}
          </span>
        )}
      </div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80 mb-1.5">{title}</p>
      <p className="text-4xl font-black tracking-tighter drop-shadow-sm">{value}</p>
      {subtitle && <p className="text-[11px] text-white/70 mt-2 font-semibold flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
        {subtitle}
      </p>}
    </div>
  </div>
);

const ActionCard = ({ title, description, onClick, icon }) => (
  <button
    onClick={onClick}
    className="w-full text-left p-4 border border-slate-100 rounded-2xl hover:border-indigo-200 hover:bg-indigo-50/50 hover:shadow-md transition-all duration-200 group"
  >
    <div className="flex items-center gap-3">
      {icon && <span className="text-indigo-500 group-hover:scale-110 transition-transform duration-200">{icon}</span>}
      <div className="flex-1">
        <p className="text-sm font-bold text-slate-800">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
    </div>
  </button>
);

const SectionHeader = ({ title, description, action }) => (
  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
    <div>
      <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">{title}</h2>
      {description && <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">{description}</p>}
    </div>
    {action}
  </div>
);

/* ─────────────────────────── bar chart strip ─────────────────────────── */

const MiniBarChart = ({ data, color = 'bg-indigo-500' }) => {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="space-y-1.5">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-10 text-[11px] font-semibold text-slate-500 text-right">{item.label}</span>
          <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-4 ${color} rounded-full transition-all duration-700`}
              style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }}
            />
          </div>
          <span className="w-5 text-right text-[11px] font-black text-slate-700">{item.count}</span>
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────────── donut chart ─────────────────────────── */

const DonutChart = ({ segments }) => {
  const COLORS = {
    admin: '#6366F1',
    pastor: '#10B981',
    secretary: '#F59E0B',
    preacher: '#8B5CF6',
  };
  let offset = 0;
  const circumference = 2 * Math.PI * 32;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" width="110" height="110" className="flex-shrink-0">
        {segments.map((seg) => {
          const dash = (seg.percentage / 100) * circumference;
          const el = (
            <circle
              key={seg.role}
              cx="50" cy="50" r="32"
              fill="transparent"
              stroke={COLORS[seg.role] || '#94A3B8'}
              strokeWidth="20"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 50 50)"
            />
          );
          offset += dash;
          return el;
        })}
        <circle cx="50" cy="50" r="20" fill="white" />
      </svg>
      <div className="space-y-2 flex-1">
        {segments.map(seg => (
          <div key={seg.role} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[seg.role] || '#94A3B8' }} />
              <span className="text-xs font-semibold text-slate-600 capitalize">{seg.role}</span>
            </div>
            <span className="text-xs font-black text-slate-800">{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────── status donut ─────────────────────────── */

const StatusDonutChart = ({ segments }) => {
  let offset = 0;
  const circumference = 2 * Math.PI * 32;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" width="110" height="110" className="flex-shrink-0">
        {segments.map((seg) => {
          const dash = (seg.percentage / 100) * circumference;
          const el = (
            <circle
              key={seg.label}
              cx="50" cy="50" r="32"
              fill="transparent"
              stroke={seg.color}
              strokeWidth="20"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 50 50)"
            />
          );
          offset += dash;
          return el;
        })}
        <circle cx="50" cy="50" r="20" fill="white" />
      </svg>
      <div className="space-y-2 flex-1">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: seg.color }} />
              <span className="text-xs font-semibold text-slate-600 capitalize">{seg.label}</span>
            </div>
            <span className="text-xs font-black text-slate-800">{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════ MAIN DASHBOARD ═══════════════════════════ */

const Dashboard = ({ user, token, activePage, setActivePage, saveProfile, onCurrentUserUpdate }) => {
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, cancelled: 0 });
  const [invitations, setInvitations] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState(user.role === 'admin' ? 'overview' : 'dashboard');
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [churches, setChurches] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [fields, setFields] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState('');
  const [editingChurch, setEditingChurch] = useState(null);
  const [churchForm, setChurchForm] = useState({ name: '', address: '', phone: '', email: '', district_id: '', field_id: '' });
  const [showChurchModal, setShowChurchModal] = useState(false);
  const [selectedChurchForHistory, setSelectedChurchForHistory] = useState(null);
  const [churchAssignments, setChurchAssignments] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [churchPreachers, setChurchPreachers] = useState([]);
  const [newAssignmentForm, setNewAssignmentForm] = useState({ service_date: '', service_type: '', target_user_id: '', priority: 'Medium' });
  const [statusFilter, setStatusFilter] = useState(null); // null | 'pending' | 'approved' | 'total'

  useEffect(() => {
    const h = { Authorization: `Bearer ${token}` };

    fetch('http://localhost:5000/api/invitations', { headers: h })
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return;
        setInvitations(data);
        setStats({
          total: data.length,
          pending: data.filter(i => i.status.includes('pending')).length,
          approved: data.filter(i => i.status === 'approved').length,
          cancelled: data.filter(i => i.status === 'cancelled' || i.status === 'rejected').length,
        });
      }).catch(console.error);

    if (user.role === 'admin') {
      fetch('http://localhost:5000/api/users', { headers: h }).then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : [])).catch(() => setUsers([]));
      fetch('http://localhost:5000/api/churches', { headers: h }).then(r => r.json()).then(d => setChurches(Array.isArray(d) ? d : [])).catch(() => setChurches([]));
      fetch('http://localhost:5000/api/districts', { headers: h }).then(r => r.json()).then(d => setDistricts(Array.isArray(d) ? d : [])).catch(() => setDistricts([]));
      fetch('http://localhost:5000/api/fields', { headers: h }).then(r => r.json()).then(d => setFields(Array.isArray(d) ? d : [])).catch(() => setFields([]));
    }
  }, [token, user.role]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  /* ── PDF export ── */
  const exportPDF = () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    try { doc.addImage(logo, 'JPEG', 14, 12, 14, 14); } catch { /* skip */ }
    doc.setFontSize(18).setTextColor(15, 23, 42).text('Mission Coordination Report', 32, 22);
    doc.setDrawColor(226, 232, 240).line(14, 30, pw - 14, 30);
    doc.setFontSize(9).setTextColor(100, 116, 139).setFont('helvetica', 'normal');
    const name = user.name.startsWith('Pr.') ? user.name : `Pr. ${user.name}`;
    doc.text(`Prepared by: ${name}`, 14, 40);
    doc.text(`Date: ${new Date().toLocaleString()}`, 14, 46);
    const view = activeTab === 'outbound' ? 'Sent' : activeTab === 'inbound' ? 'Received' : 'Global';
    const subset = (activeTab === 'outbound' || activeTab === 'inbound')
      ? invitations.filter(i => activeTab === 'outbound' ? i.requesting_pastor_id == user.id : i.target_user_id == user.id)
      : invitations;
    doc.text(`Report type: ${view}`, 14, 52);
    autoTable(doc, {
      startY: 58,
      head: [['Ref #', 'Requesting Pastor', 'Invited Speaker', 'Service Date', 'Type', 'Priority', 'Status']],
      body: subset.map(i => [
        `#${i.id.toString().padStart(4, '0')}`,
        i.pastor_name || 'N/A', i.preacher_name || 'N/A',
        new Date(i.service_date).toLocaleDateString(),
        i.service_type || '—', i.priority || 'Medium',
        (i.status || '').replace(/_/g, ' ').toUpperCase()
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i).setFontSize(7).setTextColor(148, 163, 184)
        .text(`Page ${i} of ${pages}`, pw - 25, doc.internal.pageSize.getHeight() - 10);
    }
    doc.save(`PISCS_Report_${activeTab}_${Date.now()}.pdf`);
  };

  const exportDistrictReport = () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    try { doc.addImage(logo, 'JPEG', 14, 12, 14, 14); } catch { /* skip */ }
    doc.setFontSize(18).setTextColor(15, 23, 42).text('District-Level Report', 32, 22);
    doc.setDrawColor(226, 232, 240).line(14, 30, pw - 14, 30);
    doc.setFontSize(9).setTextColor(100, 116, 139).setFont('helvetica', 'normal');
    doc.text(`Generated by: ${user.name}  —  ${new Date().toLocaleString()}`, 14, 40);
    autoTable(doc, {
      startY: 50,
      head: [['District', 'Total Churches']],
      body: districts.map(d => [d.name, churches.filter(c => c.district_id === d.id).length]),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    doc.save(`District_Report_${Date.now()}.pdf`);
  };

  /* ── church CRUD ── */
  const handleAddChurch = () => { setEditingChurch(null); setChurchForm({ name: '', address: '', phone: '', district_id: '', field_id: '' }); setShowChurchModal(true); };
  const handleEditChurch = (c) => { setEditingChurch(c); setChurchForm({ name: c.name, address: c.address, phone: c.phone, district_id: c.district_id, field_id: c.field_id }); setShowChurchModal(true); };
  const handleDeleteChurch = async (id) => {
    if (!confirm('Delete this church?')) return;
    const res = await fetch(`http://localhost:5000/api/churches/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setChurches(churches.filter(c => c.id !== id));
    else alert('Error deleting church');
  };
  const handleSaveChurch = async () => {
    const method = editingChurch ? 'PUT' : 'POST';
    const url = editingChurch ? `http://localhost:5000/api/churches/${editingChurch.id}` : 'http://localhost:5000/api/churches';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(churchForm) });
    if (!res.ok) { alert('Error saving church'); return; }
    const saved = await res.json();
    setChurches(editingChurch ? churches.map(c => c.id === editingChurch.id ? saved : c) : [...churches, saved]);
    setShowChurchModal(false);
  };

  const handleViewHistory = async (church) => {
    setSelectedChurchForHistory(church);
    setNewAssignmentForm({ service_date: '', service_type: '', target_user_id: '', priority: 'Medium' });
    try {
      const [aRes, pRes] = await Promise.all([
        fetch(`http://localhost:5000/api/churches/${church.id}/assignments`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`http://localhost:5000/api/users?role=preacher&field_id=${church.field_id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setChurchAssignments(aRes.ok ? await aRes.json().then(d => Array.isArray(d) ? d : []) : []);
      setChurchPreachers(pRes.ok ? await pRes.json().then(d => Array.isArray(d) ? d : []) : []);
    } catch { setChurchAssignments([]); setChurchPreachers([]); }
    setShowHistoryModal(true);
  };

  const handleCreateAssignment = async (church) => {
    if (!newAssignmentForm.service_date || !newAssignmentForm.target_user_id) { alert('Please fill all required fields'); return; }
    const res = await fetch(`http://localhost:5000/api/churches/${church.id}/assignments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(newAssignmentForm)
    });
    if (!res.ok) { const e = await res.json(); alert(e.error || 'Error creating assignment'); return; }
    alert('Assignment created! Preacher notified.');
    const aRes = await fetch(`http://localhost:5000/api/churches/${church.id}/assignments`, { headers: { Authorization: `Bearer ${token}` } });
    setChurchAssignments(aRes.ok ? await aRes.json().then(d => Array.isArray(d) ? d : []) : []);
    setNewAssignmentForm({ service_date: '', service_type: '', target_user_id: '', priority: 'Medium' });
  };

  /* ── derived data ── */
  const getDatesArray = (n) => Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (n - 1 - i)); return d; });

  const dailyInvitations = useMemo(() => getDatesArray(7).map(d => ({
    label: `${d.getMonth() + 1}/${d.getDate()}`,
    count: invitations.filter(i => i.service_date === d.toISOString().split('T')[0]).length,
  })), [invitations]);

  const monthlyInvitations = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, idx) => {
      const m = new Date(now.getFullYear(), now.getMonth() - (11 - idx), 1);
      const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
      return { label: m.toLocaleString('default', { month: 'short' }), count: invitations.filter(i => (i.service_date || '').startsWith(key)).length };
    });
  }, [invitations]);

  const userRoleDistribution = useMemo(() => {
    const totals = { admin: 0, pastor: 0, secretary: 0, preacher: 0 };
    users.forEach(u => { if (totals[u.role] !== undefined) totals[u.role]++; });
    const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(totals).map(([role, count]) => ({ role, count, percentage: (count / sum) * 100 }));
  }, [users]);

  const filteredChurches = useMemo(() => churches.filter(c => {
    const s = searchTerm.toLowerCase();
    return (!s || c.name.toLowerCase().includes(s) || c.address?.toLowerCase().includes(s) || c.phone?.includes(s))
      && (!selectedDistrictFilter || c.district_id == selectedDistrictFilter);
  }), [churches, searchTerm, selectedDistrictFilter]);

  const filteredDistricts = useMemo(() => districts.filter(d => !searchTerm || d.name.toLowerCase().includes(searchTerm.toLowerCase())), [districts, searchTerm]);

  const topActivePastors = useMemo(() => {
    const counts = {};
    invitations.forEach(i => { if (i.pastor_name) counts[i.pastor_name] = (counts[i.pastor_name] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
  }, [invitations]);

  const upcomingServices = useMemo(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const nextWeek = new Date(now); nextWeek.setDate(nextWeek.getDate() + 7);
    return invitations
      .filter(i => { const d = new Date(i.service_date); return d >= now && d <= nextWeek; })
      .sort((a, b) => new Date(a.service_date) - new Date(b.service_date));
  }, [invitations]);

  const invitationStatusBreakdown = useMemo(() => {
    const colorMap = { approved: '#10B981', pending: '#F59E0B', pending_secretary: '#FBBF24', pending_pastor: '#F97316', cancelled: '#EF4444', rejected: '#6B7280', declined: '#6B7280' };
    const counts = {};
    invitations.forEach(i => { const s = i.status || 'unknown'; counts[s] = (counts[s] || 0) + 1; });
    const total = invitations.length || 1;
    return Object.entries(counts).map(([label, count]) => ({ label: label.replace(/_/g, ' '), count, percentage: (count / total) * 100, color: colorMap[label] || '#94A3B8' }));
  }, [invitations]);

  /* ── nav helpers ── */
  const go = (tab) => { setActiveTab(tab); setActivePage('dashboard'); };

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <div className={`h-full flex bg-[var(--bg-secondary)] text-[var(--text-primary)] overflow-hidden font-sans transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>

      {/* ─── Sidebar ─── */}
      <aside className="w-64 bg-[var(--sidebar-bg)] border-r border-[var(--border-color)] flex flex-col shadow-sm flex-shrink-0 z-20 transition-colors duration-300">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <img src={logo} alt="PISCS" className="w-6 h-6 object-contain" onError={e => { e.currentTarget.style.display = 'none'; }} />
            </div>
            <div>
              <p className="text-sm font-black tracking-tight text-[var(--text-primary)]">PISCS</p>
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-semibold">{user.role} Console</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-3 py-4 flex-1 overflow-y-auto space-y-0.5">
          {user.role === 'admin' && <>
            <NavItem icon={<Home className="w-4 h-4" />} label="Overview" active={activeTab === 'overview'} onClick={() => go('overview')} />
            <NavItem icon={<FileText className="w-4 h-4" />} label="Invitations" active={activeTab === 'invitations'} onClick={() => go('invitations')} badge={stats.pending} />
            <NavItem icon={<Users className="w-4 h-4" />} label="Users" active={activeTab === 'users'} onClick={() => go('users')} />
            {/* ── NEW: Preacher Availability nav item for admin ── */}
            <NavItem icon={<UserCheck className="w-4 h-4" />} label="Availability" active={activeTab === 'availability'} onClick={() => go('availability')} />
            <NavItem icon={<MapPin className="w-4 h-4" />} label="Manage Field" active={activeTab === 'fields'} onClick={() => go('fields')} />
            <NavItem icon={<Building className="w-4 h-4" />} label="Church & District" active={activeTab === 'church-district'} onClick={() => go('church-district')} />
            <NavItem icon={<Bell className="w-4 h-4" />} label="Notifications" active={activeTab === 'notifications'} onClick={() => go('notifications')} />
            <NavItem icon={<LifeBuoy className="w-4 h-4" />} label="Support" active={activeTab === 'support'} onClick={() => go('support')} />
            <NavItem icon={<Shield className="w-4 h-4" />} label="Security & Logs" active={activeTab === 'security'} onClick={() => go('security')} />
            <NavItem icon={<BarChart2 className="w-4 h-4" />} label="Reports" active={activeTab === 'reports'} onClick={() => go('reports')} />
            <NavItem icon={<Settings className="w-4 h-4" />} label="Settings" active={activeTab === 'settings'} onClick={() => go('settings')} />
          </>}

          {user.role === 'pastor' && <>
            <NavItem icon={<Home className="w-4 h-4" />} label="Overview" active={activeTab === 'dashboard'} onClick={() => go('dashboard')} />
            <NavItem icon={<Users className="w-4 h-4" />} label="Directory" active={activeTab === 'directory'} onClick={() => go('directory')} />
            {/* ── NEW: Preacher Availability nav item for pastor ── */}
            <NavItem icon={<UserCheck className="w-4 h-4" />} label="Availability" active={activeTab === 'availability'} onClick={() => go('availability')} />
            <NavItem icon={<FileText className="w-4 h-4" />} label="Sent" active={activeTab === 'outbound'} onClick={() => go('outbound')} />
            <NavItem icon={<Inbox className="w-4 h-4" />} label="Received" active={activeTab === 'inbound'} onClick={() => go('inbound')} />
            <NavItem icon={<Calendar className="w-4 h-4" />} label="Calendar" active={activeTab === 'calendar'} onClick={() => go('calendar')} />
            <NavItem icon={<LifeBuoy className="w-4 h-4" />} label="Support" active={activeTab === 'support'} onClick={() => go('support')} />
            <NavItem icon={<Bell className="w-4 h-4" />} label="Notifications" active={activeTab === 'notifications'} onClick={() => go('notifications')} />
            <NavItem icon={<BarChart2 className="w-4 h-4" />} label="Reports" active={activeTab === 'reports'} onClick={() => go('reports')} />
            <NavItem icon={<UserPlus className="w-4 h-4" />} label="Register Preacher" active={activeTab === 'register-preacher'} onClick={() => go('register-preacher')} />
            <NavItem icon={<Users className="w-4 h-4" />} label="My Profile" active={activePage === 'profile'} onClick={() => setActivePage('profile')} />
          </>}

          {user.role === 'preacher' && <>
            <NavItem icon={<Home className="w-4 h-4" />} label="Overview" active={activeTab === 'dashboard'} onClick={() => go('dashboard')} />
            <NavItem icon={<Inbox className="w-4 h-4" />} label="Received" active={activeTab === 'inbound'} onClick={() => go('inbound')} />
            <NavItem icon={<Calendar className="w-4 h-4" />} label="Calendar" active={activeTab === 'calendar'} onClick={() => go('calendar')} />
            <NavItem icon={<LifeBuoy className="w-4 h-4" />} label="Support" active={activeTab === 'support'} onClick={() => go('support')} />
            <NavItem icon={<Bell className="w-4 h-4" />} label="Notifications" active={activeTab === 'notifications'} onClick={() => go('notifications')} />
            <NavItem icon={<Users className="w-4 h-4" />} label="My Profile" active={activePage === 'profile'} onClick={() => setActivePage('profile')} />
          </>}

          {user.role === 'secretary' && <>
            <NavItem icon={<Home className="w-4 h-4" />} label="Overview" active={activeTab === 'dashboard'} onClick={() => go('dashboard')} />
            <NavItem icon={<Send className="w-4 h-4" />} label="Outgoing Queue" active={activeTab === 'outgoing'} onClick={() => go('outgoing')} />
            <NavItem icon={<Inbox className="w-4 h-4" />} label="Incoming Queue" active={activeTab === 'incoming'} onClick={() => go('incoming')} />
            <NavItem icon={<LifeBuoy className="w-4 h-4" />} label="Support" active={activeTab === 'support'} onClick={() => go('support')} />
            <NavItem icon={<Bell className="w-4 h-4" />} label="Notifications" active={activeTab === 'notifications'} onClick={() => go('notifications')} />
            <NavItem icon={<BarChart2 className="w-4 h-4" />} label="Reports" active={activeTab === 'reports'} onClick={() => go('reports')} />
            <NavItem icon={<Users className="w-4 h-4" />} label="My Profile" active={activePage === 'profile'} onClick={() => setActivePage('profile')} />
          </>}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs flex-shrink-0 shadow-md">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold truncate text-slate-800">{user.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          {(user.role === 'admin' || user.role === 'pastor') && (
            <button
              onClick={() => { user.role === 'admin' ? go('invitations') : go('directory'); }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[var(--accent)] text-white text-[11px] font-black rounded-xl hover:bg-[var(--accent-hover)] transition-all shadow-md shadow-indigo-200/20"
            >
              <Plus className="w-3.5 h-3.5" />
              New Invitation
            </button>
          )}
        </div>

        {/* Theme Toggle in Sidebar */}
        <div className="px-4 py-2 border-t border-[var(--border-color)]">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="bg-[var(--bg-primary)] border-b border-[var(--border-color)] px-8 py-5 flex items-center justify-between gap-4 flex-shrink-0 transition-colors duration-300">
          <div>
            <h1 className="text-xl font-black text-[var(--text-primary)] tracking-tight">
              {user.role === 'admin' ? 'Admin Dashboard' :
                user.role === 'pastor' ? 'Pastor Portal' :
                  user.role === 'preacher' ? 'Preacher Portal' : 'Secretary Portal'}
            </h1>
            <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">
              {user.role === 'admin' ? 'System-wide operations, users and invitation workflows' :
                user.role === 'pastor' ? 'Manage invitations and connect with guest preachers' :
                  user.role === 'preacher' ? 'Review and respond to ministry invitations' :
                    'Review and process invitation requests for your field'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                placeholder="Search…"
                className="pl-9 pr-4 py-2.5 w-64 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
              />
            </div>
            {(user.role === 'pastor' || user.role === 'preacher') && (activeTab === 'inbound' || activeTab === 'outbound') && (
              <button onClick={exportPDF} className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-sm">
                <FileDown className="w-4 h-4" />
                Export PDF
              </button>
            )}
            <button
              onClick={() => go('notifications')}
              className="relative p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-primary)] transition text-[var(--text-secondary)] shadow-sm"
            >
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">

            {/* ── Profile page ── */}
            {activePage === 'profile' && (
              <div className="max-w-xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Profile Settings</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Update your name, password and picture.</p>
                  </div>
                  <button onClick={() => setActivePage('dashboard')} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <ProfileForm user={user} token={token} onSave={async (u) => { await saveProfile(u); setActivePage('dashboard'); }} onCancel={() => setActivePage('dashboard')} />
                </div>
              </div>
            )}

            {activePage !== 'profile' && (
              <>
                {/* ── Notifications ── */}
                {activeTab === 'notifications' && <NotificationPanel token={token} />}

                {/* ── Support ── */}
                {activeTab === 'support' && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 min-h-[600px]">
                    <SupportManagement token={token} user={user} />
                  </div>
                )}

                {/* ── Reports ── */}
                {activeTab === 'reports' && <Reporting token={token} user={user} />}

                {/* ── Register Preacher ── */}
                {activeTab === 'register-preacher' && user.role === 'pastor' && <PreacherRegistration token={token} user={user} />}

                {/* ── Preacher Availability (shared tab for admin + pastor) ── */}
                {activeTab === 'availability' && (user.role === 'admin' || user.role === 'pastor') && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 min-h-[600px]">
                    <div className="mb-6">
                      <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-indigo-500" />
                        Preacher Availability
                      </h2>
                      <p className="text-sm text-slate-500 mt-1">
                        Select any date to see who is available, on leave, or already assigned to a mission.
                        Click the summary cards to filter the list.
                      </p>
                    </div>
                    <PreacherAvailability token={token} />
                  </div>
                )}

                {/* ════ ADMIN TABS ════ */}
                {user.role === 'admin' && !['notifications', 'support', 'reports', 'availability'].includes(activeTab) && (
                  <>
                    {/* Overview */}
                    {activeTab === 'overview' && (
                      <div className="space-y-8">

                        {/* ── Upcoming Services (top) ── */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-emerald-500" />
                              <h3 className="text-sm font-black text-slate-700">Upcoming Services</h3>
                            </div>
                            <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg border border-emerald-100">
                              Next 7 days · {upcomingServices.length} scheduled
                            </span>
                          </div>
                          {upcomingServices.length === 0 ? (
                            <div className="flex items-center justify-center gap-3 py-6 text-slate-300">
                              <Calendar className="w-8 h-8" />
                              <p className="text-sm font-semibold">No services scheduled this week</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              {upcomingServices.map(inv => (
                                <div key={inv.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-emerald-200 hover:shadow-sm transition-all cursor-pointer" onClick={() => go('invitations')} title="Click to view in Invitations">
                                  <div className="flex-shrink-0 bg-emerald-100 text-emerald-700 rounded-lg px-2 py-1 text-center min-w-[40px]">
                                    <p className="text-[9px] font-black uppercase">{new Date(inv.service_date).toLocaleString('default', { month: 'short' })}</p>
                                    <p className="text-sm font-black leading-none">{new Date(inv.service_date).getDate()}</p>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-800 truncate">{inv.preacher_name || 'TBD'}</p>
                                    <p className="text-[11px] text-slate-500 truncate">{inv.pastor_name} · {inv.service_type || 'Service'}</p>
                                  </div>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold flex-shrink-0 ${
                                    inv.priority === 'Urgent' ? 'bg-red-100 text-red-700' : inv.priority === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                                  }`}>{inv.priority || 'Med'}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Stat cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                          <StatCard
                            title="Total Invitations"
                            value={stats.total}
                            icon={<FileText className="w-5 h-5 text-white" />}
                            gradient="bg-gradient-to-br from-indigo-500 to-indigo-700"
                            subtitle="All time across all fields"
                            onClick={() => setStatusFilter(statusFilter === 'total' ? null : 'total')}
                            active={statusFilter === 'total'}
                          />
                          <StatCard
                            title="Pending Review"
                            value={stats.pending}
                            icon={<Clock className="w-5 h-5 text-white" />}
                            gradient="bg-gradient-to-br from-amber-400 to-orange-500"
                            subtitle="Awaiting approval"
                            onClick={() => setStatusFilter(statusFilter === 'pending' ? null : 'pending')}
                            active={statusFilter === 'pending'}
                          />
                          <StatCard
                            title="Approved"
                            value={stats.approved}
                            icon={<CheckCircle className="w-5 h-5 text-white" />}
                            gradient="bg-gradient-to-br from-emerald-400 to-teal-600"
                            subtitle="Successfully coordinated"
                            onClick={() => setStatusFilter(statusFilter === 'approved' ? null : 'approved')}
                            active={statusFilter === 'approved'}
                          />
                          <StatCard
                            title="Cancelled"
                            value={stats.cancelled}
                            icon={<XCircle className="w-5 h-5 text-white" />}
                            gradient="bg-gradient-to-br from-red-400 to-rose-600"
                            subtitle="Cancelled invitations"
                            onClick={() => setStatusFilter(statusFilter === 'cancelled' ? null : 'cancelled')}
                            active={statusFilter === 'cancelled'}
                          />
                        </div>

                        {/* Inline invitations drawer */}
                        {statusFilter && (() => {
                          const filtered = invitations.filter(inv => {
                            if (statusFilter === 'total') return true;
                            if (statusFilter === 'pending') return inv.status.includes('pending');
                            if (statusFilter === 'approved') return inv.status === 'approved';
                            if (statusFilter === 'cancelled') return inv.status === 'cancelled' || inv.status === 'rejected';
                            return false;
                          });
                          const drawerMeta = {
                            total: { label: 'All Invitations', color: 'indigo', bg: 'bg-indigo-50', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700' },
                            pending: { label: 'Pending Invitations', color: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' },
                            approved: { label: 'Approved Invitations', color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
                            cancelled: { label: 'Cancelled Invitations', color: 'red', bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700' },
                          }[statusFilter];
                          return (
                            <div className={`rounded-2xl border ${drawerMeta.border} ${drawerMeta.bg} shadow-sm overflow-hidden`}>
                              <div className="flex items-center justify-between px-6 py-4 border-b border-current border-opacity-10">
                                <div>
                                  <h3 className="text-sm font-black text-slate-800">{drawerMeta.label}</h3>
                                  <p className="text-xs text-slate-500 mt-0.5">{filtered.length} record{filtered.length !== 1 ? 's' : ''} found</p>
                                </div>
                                <button onClick={() => setStatusFilter(null)} className="text-slate-400 hover:text-slate-700 text-lg font-bold leading-none">✕</button>
                              </div>
                              {filtered.length === 0 ? (
                                <div className="px-6 py-10 text-center text-sm text-slate-400">No invitations in this category.</div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead className="bg-white/60">
                                      <tr>
                                        {['Ref #', 'Requesting Pastor', 'Invited Speaker', 'Service Date', 'Type', 'Priority', 'Status'].map(h => (
                                          <th key={h} className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/60">
                                      {filtered.map(inv => (
                                        <tr key={inv.id} className="hover:bg-white/50 transition-colors">
                                          <td className="py-3 px-4 font-mono text-xs text-slate-500">#{String(inv.id).padStart(4, '0')}</td>
                                          <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">{inv.pastor_name || '—'}</td>
                                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{inv.preacher_name || '—'}</td>
                                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{new Date(inv.service_date).toLocaleDateString()}</td>
                                          <td className="py-3 px-4 text-slate-600">{inv.service_type || '—'}</td>
                                          <td className="py-3 px-4">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${inv.priority === 'Urgent' ? 'bg-red-100 text-red-700' :
                                              inv.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                                                inv.priority === 'Low' ? 'bg-slate-100 text-slate-600' :
                                                  'bg-blue-100 text-blue-700'
                                              }`}>{inv.priority || 'Medium'}</span>
                                          </td>
                                          <td className="py-3 px-4">
                                            <span className={`text-xs px-2 py-1 rounded-lg font-bold ${drawerMeta.badge}`}>
                                              {(inv.status || '').replace(/_/g, ' ').toUpperCase()}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Charts row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <h3 className="text-sm font-black text-slate-700 mb-1">Daily Activity</h3>
                            <p className="text-xs text-slate-400 mb-5">Invitations per day — last 7 days</p>
                            <MiniBarChart data={dailyInvitations} color="bg-indigo-500" />
                          </div>

                          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <h3 className="text-sm font-black text-slate-700 mb-1">Monthly Trend</h3>
                            <p className="text-xs text-slate-400 mb-5">Rolling 12-month invitation volume</p>
                            <MiniBarChart data={monthlyInvitations} color="bg-emerald-500" />
                          </div>

                          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <h3 className="text-sm font-black text-slate-700 mb-1">User Distribution</h3>
                            <p className="text-xs text-slate-400 mb-5">Breakdown by role</p>
                            <DonutChart segments={userRoleDistribution} />
                          </div>
                        </div>

                        {/* Quick actions + Preacher Availability preview */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <SectionHeader title="Quick Actions" />
                            <div className="space-y-2">
                              <ActionCard title="New Invitation" description="Start a new coordination request" icon={<Plus className="w-4 h-4" />} onClick={() => go('invitations')} />
                              <ActionCard title="Broadcast Alert" description="Notify all users simultaneously" icon={<Megaphone className="w-4 h-4" />} onClick={() => setShowBroadcastModal(true)} />
                              <ActionCard title="Check Availability" description="See who is free on a date" icon={<UserCheck className="w-4 h-4" />} onClick={() => go('availability')} />
                              <ActionCard title="Manage Users" description="Update roles and permissions" icon={<Users className="w-4 h-4" />} onClick={() => go('users')} />
                              <ActionCard title="System Settings" description="Configure global policies" icon={<Settings className="w-4 h-4" />} onClick={() => go('settings')} />
                            </div>
                          </div>

                          {/* ── Preacher Availability inline preview on Overview ── */}
                          <div className="lg:col-span-2 bg-[var(--bg-primary)] rounded-3xl border border-[var(--border-color)] shadow-sm p-8 transition-colors duration-300">
                            <PreacherAvailability token={token} compact={true} />
                          </div>

                          {/* ── Activity Feed ── */}
                          <div className="bg-[var(--bg-primary)] rounded-3xl border border-[var(--border-color)] shadow-sm p-8 transition-colors duration-300">
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

                        {/* ── System KPI Row ── */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {[
                            { label: 'Total Users', value: users.length, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', icon: <Users className="w-5 h-5" /> },
                            { label: 'Churches', value: churches.length, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: <Building className="w-5 h-5" /> },
                            { label: 'Districts', value: districts.length, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: <MapPin className="w-5 h-5" /> },
                            { label: 'Fields', value: fields.length, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', icon: <BarChart2 className="w-5 h-5" /> },
                          ].map(kpi => (
                            <div key={kpi.label} className={`${kpi.bg} border ${kpi.border} rounded-2xl p-5 flex items-center gap-4`}>
                              <div className={`${kpi.color} opacity-60`}>{kpi.icon}</div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</p>
                                <p className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* ── Bottom Widgets: Top Pastors · Invitation Health ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                          {/* Top Active Pastors */}
                          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <h3 className="text-sm font-black text-slate-700 mb-1 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-indigo-500" /> Top Active Pastors
                            </h3>
                            <p className="text-xs text-slate-400 mb-5">Ranked by invitations sent</p>
                            {topActivePastors.length === 0 ? (
                              <p className="text-sm text-slate-400 text-center py-6">No invitation data yet</p>
                            ) : (
                              <div className="space-y-3">
                                {topActivePastors.map((p, i) => (
                                  <div key={p.name} className="flex items-center gap-3">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                                      i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-300 text-slate-700' : i === 2 ? 'bg-orange-300 text-white' : 'bg-slate-100 text-slate-500'
                                    }`}>{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                                      <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                        <div className="h-1.5 bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${(p.count / topActivePastors[0].count) * 100}%` }} />
                                      </div>
                                    </div>
                                    <span className="text-xs font-black text-slate-700 flex-shrink-0">{p.count}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Invitation Health Donut */}
                          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <h3 className="text-sm font-black text-slate-700 mb-1">Invitation Health</h3>
                            <p className="text-xs text-slate-400 mb-5">Pipeline status breakdown</p>
                            {invitationStatusBreakdown.length === 0 ? (
                              <p className="text-sm text-slate-400 text-center py-6">No data yet</p>
                            ) : (
                              <StatusDonutChart segments={invitationStatusBreakdown} />
                            )}
                          </div>

                        </div>

                      </div>
                    )}

                    {activeTab === 'invitations' && (
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
                        <InvitationFlow user={user} token={token} />
                      </div>
                    )}

                    {activeTab === 'users' && (
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
                        <UserManagement token={token} user={user} onCurrentUserUpdate={onCurrentUserUpdate} />
                      </div>
                    )}

                    {activeTab === 'fields' && (
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
                        <FieldManagement token={token} onNavigateToUsers={() => go('users')} />
                      </div>
                    )}

                    {activeTab === 'church-district' && (
                      <div className="space-y-6">
                        <SectionHeader
                          title="Church & District Management"
                          description="Manage church profiles, district coordination and regional oversight"
                          action={
                            <button onClick={handleAddChurch} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-200">
                              <Plus className="w-4 h-4" /> Add Church
                            </button>
                          }
                        />

                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex gap-4">
                          <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                            <input
                              type="text"
                              placeholder="Search by name, address or phone…"
                              value={searchTerm}
                              onChange={e => setSearchTerm(e.target.value)}
                              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            />
                          </div>
                          <select
                            value={selectedDistrictFilter}
                            onChange={e => setSelectedDistrictFilter(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                          >
                            <option value="">All Districts</option>
                            {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <h3 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
                              <Building className="w-4 h-4 text-indigo-500" /> Church Directory
                              <span className="ml-auto text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{filteredChurches.length}</span>
                            </h3>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-slate-100">
                                    <th className="text-left py-2 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                                    <th className="text-left py-2 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Address</th>
                                    <th className="text-left py-2 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {filteredChurches.map(church => (
                                    <tr key={church.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="py-2.5 px-2 font-semibold text-slate-800">{church.name}</td>
                                      <td className="py-2.5 px-2 text-slate-500 text-xs">{church.address}</td>
                                      <td className="py-2.5 px-2">
                                        <div className="flex gap-1">
                                          <button onClick={() => handleEditChurch(church)} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-semibold">Edit</button>
                                          <button onClick={() => handleDeleteChurch(church.id)} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-semibold">Del</button>
                                          <button onClick={() => handleViewHistory(church)} className="text-xs px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 font-semibold">History</button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                  {filteredChurches.length === 0 && (
                                    <tr><td colSpan={3} className="py-8 text-center text-sm text-slate-400">No churches found</td></tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <h3 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-emerald-500" /> District Grouping
                              <span className="ml-auto text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{filteredDistricts.length}</span>
                            </h3>
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                              {filteredDistricts.map(d => (
                                <div key={d.id} className="border border-slate-100 rounded-xl p-4 hover:border-indigo-100 transition-colors">
                                  <p className="font-bold text-slate-800 text-sm mb-2">{d.name}</p>
                                  <div className="space-y-1">
                                    {filteredChurches.filter(c => c.district_id === d.id).map(c => (
                                      <p key={c.id} className="text-xs text-slate-500 pl-3 border-l-2 border-indigo-200">{c.name}</p>
                                    ))}
                                    {filteredChurches.filter(c => c.district_id === d.id).length === 0 && (
                                      <p className="text-xs text-slate-300 italic">No churches yet</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black text-slate-700">District-Level Summary</h3>
                            <button onClick={exportDistrictReport} className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition">
                              <FileDown className="w-3.5 h-3.5" /> Export PDF
                            </button>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {districts.map(d => (
                              <div key={d.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <p className="text-xs font-bold text-slate-500 mb-1 truncate">{d.name}</p>
                                <p className="text-2xl font-black text-slate-900">{churches.filter(c => c.district_id === d.id).length}</p>
                                <p className="text-[10px] text-slate-400 font-semibold">churches</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'security' && (
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
                        <SecurityAudit token={token} />
                      </div>
                    )}

                    {activeTab === 'settings' && (
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
                          <Settings className="w-7 h-7 text-slate-300" />
                        </div>
                        <h3 className="text-base font-black text-slate-800 mb-2">System Configuration</h3>
                        <p className="text-sm text-slate-400 max-w-sm">Advanced settings for global coordination logic are under development.</p>
                      </div>
                    )}
                  </>
                )}

                {/* ════ ROLE PORTALS ════ */}
                {user.role === 'pastor' && !['support', 'reports', 'register-preacher', 'notifications', 'availability'].includes(activeTab) && (
                  <PastorPortal user={user} token={token} externalTab={activeTab} onTabChange={go} />
                )}
                {user.role === 'preacher' && !['support', 'reports', 'notifications'].includes(activeTab) && (
                  <PreacherPortal user={user} token={token} externalTab={activeTab} onTabChange={go} />
                )}
                {user.role === 'secretary' && !['support', 'reports', 'notifications'].includes(activeTab) && (
                  <SecretaryPortal user={user} token={token} externalTab={activeTab} onTabChange={go} />
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* ─── Broadcast Modal ─── */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <BroadcastModal token={token} onClose={() => setShowBroadcastModal(false)} onSuccess={() => setShowBroadcastModal(false)} />
        </div>
      )}

      {/* ─── Church Modal ─── */}
      {showChurchModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-7 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-black text-slate-900 mb-5">{editingChurch ? 'Edit Church' : 'Add New Church'}</h2>
            <div className="space-y-3">
              {[
                { placeholder: 'Church Name', key: 'name', type: 'text' },
                { placeholder: 'Address', key: 'address', type: 'text' },
                { placeholder: 'Phone Number', key: 'phone', type: 'tel' },
              ].map(f => (
                <input key={f.key} type={f.type} placeholder={f.placeholder} value={churchForm[f.key]}
                  onChange={e => setChurchForm({ ...churchForm, [f.key]: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              ))}
              <select value={churchForm.district_id} onChange={e => setChurchForm({ ...churchForm, district_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Select District</option>
                {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select value={churchForm.field_id} onChange={e => setChurchForm({ ...churchForm, field_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Select Field</option>
                {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowChurchModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition">Cancel</button>
              <button onClick={handleSaveChurch} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-200">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── History Modal ─── */}
      {showHistoryModal && selectedChurchForHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-7 w-full max-w-2xl my-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-slate-900">Assignments</h2>
                <p className="text-xs text-slate-400 mt-0.5">{selectedChurchForHistory.name}</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-black text-slate-700 mb-3">Assignment History</h3>
              {churchAssignments.length > 0 ? (
                <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        {['Date', 'Preacher', 'Type', 'Status'].map(h => (
                          <th key={h} className="text-left py-2.5 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {churchAssignments.map((a, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-slate-700">{new Date(a.service_date).toLocaleDateString()}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{a.preacher_name}</td>
                          <td className="py-2.5 px-3 text-slate-500">{a.service_type || '—'}</td>
                          <td className="py-2.5 px-3">
                            <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-bold">{a.status.replace(/_/g, ' ')}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-400 py-4 text-center bg-slate-50 rounded-xl">No assignments yet</p>
              )}
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h3 className="text-sm font-black text-slate-700 mb-4">Create New Assignment</h3>
              {churchPreachers.length === 0 ? (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600 font-medium">No preachers registered under this church's field. Please assign preachers first.</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={newAssignmentForm.service_date}
                    onChange={e => setNewAssignmentForm({ ...newAssignmentForm, service_date: e.target.value })}
                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 col-span-2 sm:col-span-1"
                  />
                  <input type="text" placeholder="Service Type" value={newAssignmentForm.service_type}
                    onChange={e => setNewAssignmentForm({ ...newAssignmentForm, service_type: e.target.value })}
                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 col-span-2 sm:col-span-1"
                  />
                  <select value={newAssignmentForm.target_user_id}
                    onChange={e => setNewAssignmentForm({ ...newAssignmentForm, target_user_id: e.target.value })}
                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 col-span-2 sm:col-span-1">
                    <option value="">Select Preacher</option>
                    {churchPreachers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select value={newAssignmentForm.priority}
                    onChange={e => setNewAssignmentForm({ ...newAssignmentForm, priority: e.target.value })}
                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 col-span-2 sm:col-span-1">
                    {['Low', 'Medium', 'High', 'Urgent'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowHistoryModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition">Close</button>
              <button
                onClick={() => handleCreateAssignment(selectedChurchForHistory)}
                disabled={churchPreachers.length === 0}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition ${churchPreachers.length === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200'}`}
              >
                Assign Preacher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;