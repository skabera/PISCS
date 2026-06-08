import React, { useState, useEffect } from 'react';
import {
  FileText,
  Filter,
  Calendar,
  MapPin,
  Activity,
  ChevronRight,
  CheckCircle2,
  Clock,
  FileDown,
  Search,
  Building,
  XCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../logo.jpeg';

const Reporting = ({ token, user }) => {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [preachers, setPreachers] = useState([]);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    fieldId: '',
    districtId: '',
    preacherId: '',
    serviceType: '',
  });

  useEffect(() => {
    fetchInitialData();
    fetchMissions();
  }, [token]);

  useEffect(() => {
    fetchMissions();
  }, [filters]);

  const fetchInitialData = async () => {
    const headers = { 'Authorization': `Bearer ${token}` };
    try {
      const [fRes, dRes, pRes] = await Promise.all([
        fetch('http://localhost:5000/api/fields', { headers }),
        fetch('http://localhost:5000/api/districts', { headers }),
        fetch('http://localhost:5000/api/users?role=preacher', { headers })
      ]);
      if (fRes.ok) setFields(await fRes.json());
      if (dRes.ok) setDistricts(await dRes.json());
      if (pRes.ok) setPreachers(await pRes.json());
    } catch (err) {
      console.error('Failed to fetch filter data:', err);
    }
  };

  const fetchMissions = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      const res = await fetch(`http://localhost:5000/api/reports/missions?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMissions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch missions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      status: '',
      fieldId: '',
      districtId: '',
      preacherId: '',
      serviceType: '',
    });
  };

  const logAudit = async (action, details) => {
    try {
      await fetch('http://localhost:5000/api/admin/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action, details })
      });
    } catch (err) {
      console.error('Audit logging failed:', err);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const ML = 15;
    const MR = 15;

    const dateStr = new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const total = missions.length;

    // ── HEADER SECTION ───────────────────────────────────────────────────────
    let y = 15;

    // Logo
    try {
      doc.addImage(logo, 'JPEG', ML, y, 20, 20);
    } catch {
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(ML, y, 20, 20, 1, 1, 'F');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('PISCS', ML + 5, y + 11);
    }

    // System Branding
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 93, 170);
    doc.text('Rwanda Union Mission of', ML + 25, y + 8);
    doc.text('Seventh-day Adventist Church', ML + 25, y + 14);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Preacher Invitation & Service Coordination System', ML + 25, y + 20);

    // Report Title Box
    const reportTitle = 'Title: INVITATION ANALYTICS REPORT';
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const titleWidth = doc.getTextWidth(reportTitle) + 10;
    doc.setFillColor(240, 246, 255);
    doc.rect(ML + 25, y + 24, titleWidth, 8, 'F');
    doc.setTextColor(22, 93, 170);
    doc.text(reportTitle, ML + 30, y + 29.5);

    // Right-side Info
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${dateStr}`, W - MR, y + 13, { align: 'right' });

    // Active filters summary in PDF
    const activeFilters = [];
    if (filters.serviceType) activeFilters.push(`Service Type: ${filters.serviceType}`);
    if (filters.status) activeFilters.push(`Status: ${filters.status}`);
    if (filters.startDate) activeFilters.push(`From: ${filters.startDate}`);
    if (filters.endDate) activeFilters.push(`To: ${filters.endDate}`);
    if (activeFilters.length > 0) {
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Filters: ${activeFilters.join('  |  ')}`, W - MR, y + 18, { align: 'right' });
    }

    y += 35;

    // ── DATA TABLE ───────────────────────────────────────────────────────────
    const tableData = missions.map((m, index) => [
      index + 1,
      m.preacher_name || '—',
      m.service_type || '—',
      m.preacher_district_name || '—',
      (m.status || 'pending').startsWith('pending') ? 'PENDING' : (m.status).replace(/_/g, ' ').toUpperCase(),
      new Date(m.service_date).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      }),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'PREACHER NAME', 'SERVICE TYPE', 'DISTRICT', 'STATUS', 'SERVICE DATE']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        font: 'helvetica',
        cellPadding: 4,
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [22, 93, 170],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'left',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 255],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 45, fontStyle: 'bold', textColor: [22, 93, 170] },
        2: { cellWidth: 40 },
        3: { cellWidth: 35 },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 25, halign: 'right' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const s = (data.cell.raw || '').toLowerCase();
          if (s.includes('approved') || s.includes('confirmed')) {
            data.cell.styles.textColor = [5, 150, 105];
          } else if (s.includes('pending')) {
            data.cell.styles.textColor = [217, 119, 6];
          } else if (s.includes('rejected')) {
            data.cell.styles.textColor = [220, 38, 38];
          }
        }
      },
      margin: { left: ML, right: MR },
    });

    // ── TOTALS SECTION ───────────────────────────────────────────────────────
    let finalY = doc.lastAutoTable.finalY + 8;

    const summaryW = 65;
    const summaryH = 10;
    const summaryX = W - MR - summaryW;

    doc.setFillColor(22, 93, 170);
    doc.rect(summaryX, finalY, summaryW, summaryH, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL INVITATIONS:', summaryX + 4, finalY + 6.5);

    doc.setFontSize(10);
    doc.text(`${total}`, W - MR - 4, finalY + 6.5, { align: 'right' });

    finalY += summaryH + 20;

    // ── SIGN-OFF ─────────────────────────────────────────────────────────────
    const sigW = 60;

    doc.setDrawColor(22, 93, 170);
    doc.setLineWidth(0.4);
    doc.line(ML, finalY, ML + sigW, finalY);

    finalY += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 93, 170);
    doc.text('PREPARED BY', ML, finalY);

    finalY += 6;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 93, 170);
    doc.text(user.name.toUpperCase(), ML, finalY);

    finalY += 4;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`${user.role.toUpperCase()} · Rwanda Union Mission`, ML, finalY);

    finalY += 4;
    doc.text(`Official System Stamp Date: ${new Date().toLocaleDateString('en-GB')}`, ML, finalY);

    // ── FOOTER ───────────────────────────────────────────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'Rwanda Union Mission of Seventh-day Adventist Church  ·  Mission Coordination Platform',
        W / 2, H - 10, { align: 'center' }
      );
    }

    doc.save(`PISCS_Report_${Date.now()}.pdf`);
    logAudit('REPORT_EXPORT', { type: 'PDF', filters, count: total });
  };

  const getStatusConfig = (status) => {
    const map = {
      pending_field1_secretary: { label: 'Sec 1 Review', color: 'bg-amber-50 text-amber-700 border-amber-200' },
      pending_field2_secretary: { label: 'Sec 2 Review', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      pending_preacher_confirmation: { label: 'Awaiting Preacher', color: 'bg-purple-50 text-purple-700 border-purple-200' },
      pending_district_pastor_approval: { label: 'District Review', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
      approved: { label: 'Confirmed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      rejected: { label: 'Declined', color: 'bg-rose-50 text-rose-700 border-rose-200' },
      completed: { label: 'Completed', color: 'bg-slate-50 text-slate-600 border-slate-200' },
      cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-500 border-slate-300' },
    };
    return map[status] || { label: status.replace(/_/g, ' '), color: 'bg-slate-50 text-slate-600 border-slate-200' };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Activity className="w-8 h-8 text-indigo-600" />
            Mission Intelligence
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1 uppercase tracking-widest">
            Strategic Coordination Reporting & Analytics
          </p>
        </div>
        <button
          onClick={exportPDF}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-slate-200"
        >
          <FileDown className="w-4 h-4" /> Export Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Missions', value: missions.length, color: 'text-slate-900', icon: <FileText className="w-5 h-5 text-slate-300" /> },
          { label: 'Confirmed', value: missions.filter(m => m.status === 'approved').length, color: 'text-emerald-600', icon: <CheckCircle2 className="w-5 h-5 text-emerald-200" /> },
          { label: 'Pending', value: missions.filter(m => m.status.includes('pending')).length, color: 'text-amber-600', icon: <Clock className="w-5 h-5 text-amber-200" /> },
          { label: 'Completed', value: missions.filter(m => m.status === 'completed').length, color: 'text-indigo-600', icon: <Activity className="w-5 h-5 text-indigo-200" /> },
          { label: 'Declined', value: missions.filter(m => m.status === 'rejected').length, color: 'text-rose-600', icon: <XCircle className="w-5 h-5 text-rose-200" /> },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{stat.label}</p>
            <div className="flex items-center justify-between">
              <span className={`text-3xl font-black ${stat.color}`}>{stat.value}</span>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Advanced Parameters</h3>
          <button
            onClick={resetFilters}
            className="ml-auto text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest"
          >
            Clear All
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
            <select name="status" value={filters.status} onChange={handleFilterChange}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none appearance-none">
              <option value="">All Statuses</option>
              <option value="pending">Pending Protocol</option>
              <option value="approved">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="rejected">Declined</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Date From */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date From</label>
            <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none" />
          </div>

          {/* Date To */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date To</label>
            <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none" />
          </div>

          {/* Field (admin only) */}
          {user.role === 'admin' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Field</label>
              <select name="fieldId" value={filters.fieldId} onChange={handleFilterChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none">
                <option value="">All Fields</option>
                {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}

          {/* District */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">District</label>
            <select name="districtId" value={filters.districtId} onChange={handleFilterChange}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none">
              <option value="">All Districts</option>
              {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {/* Preacher */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preacher</label>
            <select name="preacherId" value={filters.preacherId} onChange={handleFilterChange}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none">
              <option value="">All Preachers</option>
              {preachers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Service Type */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service Type</label>
            <select name="serviceType" value={filters.serviceType} onChange={handleFilterChange}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none appearance-none">
              <option value="">All Types</option>
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
          </div>

        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">#</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Guest Preacher</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Period</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Nature</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Coordination</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-8 py-20 text-center">
                    <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Analyzing Mission Registry...</p>
                  </td>
                </tr>
              ) : missions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Search className="w-12 h-12 text-slate-100" />
                      <p className="text-sm font-bold text-slate-400">No mission records matching your parameters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                missions.map((mission, index) => {
                  const statusCfg = getStatusConfig(mission.status);
                  return (
                    <tr key={mission.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <span className="font-mono text-xs text-slate-400">{(index + 1).toString().padStart(2, '0')}</span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">
                            {mission.preacher_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{mission.preacher_name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-indigo-400" />
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{mission.preacher_district_name || 'No District'}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs font-bold text-slate-600">
                            {new Date(mission.service_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <Building className="w-3.5 h-3.5 text-slate-300" />
                          <span className="text-xs font-bold text-slate-700">{mission.service_type}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            By {mission.pastor_name}
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {missions.length > 0 && (
          <div className="p-8 bg-slate-50/50 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
              Showing {missions.length} mission records
              {filters.serviceType && (
                <span className="ml-3 text-indigo-500">· Service Type: {filters.serviceType}</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="flex items-center justify-center py-10 opacity-30 grayscale contrast-125">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-slate-900 rounded-lg" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-900">Coordination Intelligence Protocol</span>
        </div>
      </div>
    </div>
  );
};

export default Reporting;