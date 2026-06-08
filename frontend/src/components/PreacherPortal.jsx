import React, { useState, useEffect } from 'react';
import { Send, Calendar, CheckCircle2, XCircle, History, AlertCircle, Inbox, Users, FileText, Download, FileDown, ChevronRight, Clock, AlertTriangle, MessageSquare, Star, CalendarRange, MapPin, Building, User, ChevronDown, Shield, Eye, Activity } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../logo.jpeg';
import PastorCalendar from './PastorCalendar';
import FeedbackModal from './FeedbackModal';
import ActivityFeed from './ActivityFeed';

const API_BASE = 'http://localhost:5000';

const MULTI_DAY_TYPES = [
  'Evangelistic Campaign', 'Prayer Week', 'Health Week', 'Camp Meeting',
  'Youth Seminar', 'Family Seminar', 'Leadership Training', 'Community Outreach',
];

// ── Insurance Documents Viewer for Preacher ──────────────────────────────────
const InsuranceDocumentsViewer = ({ invitationId, token }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/insurance/invitation/${invitationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setDocuments(await res.json());
      } catch (err) {
        console.error('Failed to fetch insurance docs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, [invitationId, token]);

  const getFileIcon = (fileName) => {
    if (!fileName) return '📄';
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️';
    if (ext === 'pdf') return '📋';
    if (['doc', 'docx'].includes(ext)) return '📝';
    return '📄';
  };

  const getDocLabel = (type) => {
    const map = { insurance: 'Insurance Certificate', health: 'Health Report', liability: 'Liability Coverage' };
    return map[type] || type;
  };

  if (loading) return (
    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
      <div className="flex items-center gap-2 text-slate-400">
        <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
        <span className="text-[10px] font-black uppercase tracking-widest">Loading insurance documents...</span>
      </div>
    </div>
  );

  return (
    <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-emerald-600" />
        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Insurance Documents</p>
        {documents.length > 0 && (
          <span className="ml-auto px-2 py-0.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black">{documents.length}</span>
        )}
      </div>

      {documents.length === 0 ? (
        <p className="text-[11px] text-slate-400 italic">No insurance documents uploaded yet by the hosting pastor.</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            // Build a fully qualified URL so the browser can open it
            const fileUrl = doc.document_url?.startsWith('http')
              ? doc.document_url
              : `${API_BASE}${doc.document_url}`;

            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.file_name || '');

            return (
              <div key={doc.id} className="bg-white border border-emerald-100 rounded-xl overflow-hidden">
                {/* Image preview */}
                {isImage && (
                  <div className="w-full max-h-48 overflow-hidden bg-slate-100 border-b border-emerald-100">
                    <img
                      src={fileUrl}
                      alt={doc.file_name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between p-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg flex-shrink-0">{getFileIcon(doc.file_name)}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">{doc.file_name || 'Document'}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                        {getDocLabel(doc.document_type)} · {new Date(doc.uploaded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* View — opens in new tab (works for images, PDFs, etc.) */}
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors"
                      title="View document"
                    >
                      <Eye className="w-3 h-3" /> View
                    </a>

                    {/* Download — forces download */}
                    <a
                      href={fileUrl}
                      download={doc.file_name || 'document'}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors"
                      title="Download document"
                    >
                      <Download className="w-3 h-3" /> Download
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const PreacherPortal = ({ user, token, externalTab, onTabChange }) => {
  const [activeTab, setActiveTabState] = useState('dashboard');

  useEffect(() => {
    if (externalTab) setActiveTabState(externalTab);
  }, [externalTab]);

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    if (onTabChange) onTabChange(tab);
  };

  const [myRequests, setMyRequests] = useState([]);
  const [incomingInvitations, setIncomingInvitations] = useState([]);
  const [districtPastor, setDistrictPastor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState(null);

  useEffect(() => {
    fetchData();
    fetchDistrictPastor();
  }, [token]);

  const fetchDistrictPastor = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/preacher/my-pastor`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) { setDistrictPastor(null); return; }
      setDistrictPastor(await res.json());
    } catch (err) {
      console.error('Failed to load district pastor:', err);
      setDistrictPastor(null);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/preacher/invitations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch invitations');
      const data = await res.json();
      const allRequests = Array.isArray(data) ? data : [];
      setIncomingInvitations(allRequests);
      setMyRequests(allRequests.filter(inv => inv.requesting_pastor_id == user.id));
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const respondToInvitation = async (invitationId, status, note = '') => {
    try {
      const res = await fetch(`${API_BASE}/api/invitations/${invitationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status, note })
      });
      if (res.ok) { await fetchData(); setExpandedId(null); }
    } catch (err) { console.error('Failed to respond:', err); }
  };

  const handleReject = async (invitationId) => {
    const reason = window.prompt('Please enter the reason for rejecting this invitation:');
    if (reason === null) return;
    await respondToInvitation(invitationId, 'rejected', reason.trim() || 'No reason provided');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const dateStr = new Date().toLocaleString();
    const currentItems = activeTab === 'outbound' ? myRequests : incomingInvitations;
    const reportTitle = activeTab === 'outbound' ? "Sent Ministry Invitations Report" : "Received Ministry Invitations Report";

    doc.setFillColor(37, 99, 235);
    doc.roundedRect(14, 14, 12, 12, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("PISCS", 15, 21.5);
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    doc.text(reportTitle, 32, 23);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 30, pageWidth - 14, 30);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text(`System: Preacher Invitation and Service Coordination System`, 14, 40);
    doc.text(`Prepared By: Pr. ${user.name}`, 14, 46);
    doc.text(`Date & Time: ${dateStr}`, 14, 52);

    const headers = [['#ID', activeTab === 'outbound' ? 'Guest Preacher' : 'Hosting Pastor', 'Service Date', 'Nature of Service', 'Field/Region', 'Priority', 'Status']];
    const data = currentItems.map(item => {
      const dateDisplay = item.service_end_date
        ? `${new Date(item.service_date).toLocaleDateString('en-GB')} – ${new Date(item.service_end_date).toLocaleDateString('en-GB')}`
        : new Date(item.service_date).toLocaleDateString('en-GB');
      return [
        `#${item.id.toString().padStart(4, '0')}`,
        activeTab === 'outbound' ? (item.preacher_name || item.invited_guest_name || 'N/A') : (item.pastor_name || 'N/A'),
        dateDisplay,
        item.service_type || 'General Service',
        activeTab === 'outbound' ? (item.preacher_field_name || '—') : (item.church_name || '—'),
        item.priority || 'Medium',
        (item.status || 'PENDING').replace(/_/g, ' ').toUpperCase()
      ];
    });

    autoTable(doc, {
      startY: 60, head: headers, body: data, theme: 'grid',
      styles: { fontSize: 8, font: 'helvetica', cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`PISCS Official Document - Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }
    doc.save(`PISCS_PreacherReport_${activeTab}_${Date.now()}.pdf`);
  };

  const exportSinglePDF = (inv) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const dateStr = new Date().toLocaleString();
    const refId = `#${inv.id.toString().padStart(4, '0')}`;
    try { doc.addImage(logo, 'JPEG', 14, 12, 14, 14); }
    catch (e) {
      doc.setFillColor(37, 99, 235); doc.roundedRect(14, 14, 12, 12, 3, 3, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.text("PISCS", 15, 21.5);
    }
    doc.setFontSize(18); doc.setTextColor(15, 23, 42); doc.text("Official Mission Request", 32, 23);
    doc.setDrawColor(226, 232, 240); doc.line(14, 30, pageWidth - 14, 30);
    const preparedBy = user.name.startsWith('Pr.') ? user.name : `Pr. ${user.name}`;
    doc.setFontSize(9); doc.setTextColor(100, 116, 139);
    doc.text(`Reference ID: ${refId}`, 14, 40);
    doc.text(`Prepared By: ${preparedBy}`, 14, 46);
    doc.text(`Date and Time: ${dateStr}`, 14, 52);
    const dateDisplay = inv.service_end_date
      ? `${new Date(inv.service_date).toLocaleDateString('en-GB')} → ${new Date(inv.service_end_date).toLocaleDateString('en-GB')}`
      : new Date(inv.service_date).toLocaleDateString('en-GB');
    doc.setFontSize(14); doc.setTextColor(15, 23, 42); doc.text("Mission Logistics Summary", 14, 64);
    autoTable(doc, {
      startY: 70,
      head: [['Property', 'Details']],
      body: [
        ['Requesting Pastor', inv.requesting_pastor_name || inv.pastor_name || 'N/A'],
        ['Invited Guest', inv.preacher_name || inv.invited_guest_name || inv.target_user_name || 'N/A'],
        ['Service Date', dateDisplay],
        ['Nature of Service', inv.service_type || '—'],
        ['Hosting Field', inv.pastor_field_name || inv.pastor_field || '—'],
        ['Hosting Church', inv.pastor_church_name || inv.pastor_church || '—'],
        ['Target Field/Region', inv.preacher_field_name || '—'],
        ['Mission Priority', inv.priority || 'Medium'],
        ['Current Authorization', (inv.status || 'PENDING').replace(/_/g, ' ').toUpperCase()],
        ['Pastoral Notes', inv.pastor_note || 'No additional notes provided'],
        ['Preacher Rating', inv.preacher_rating ? `${inv.preacher_rating} / 5` : 'Not rated yet'],
        ['Experience Note', inv.preacher_experience_note || 'No experience note provided'],
        ['Pastor Comment', inv.pastor_return_comment || 'No pastoral feedback provided']
      ],
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    });
    doc.setFontSize(8); doc.setTextColor(148, 163, 184);
    doc.text("This is an official ministry document generated by PISCS.", 14, doc.internal.pageSize.getHeight() - 15);
    doc.save(`Mission_Request_${refId}.pdf`);
  };

  const getStats = () => {
    const all = [...myRequests, ...incomingInvitations];
    const pending = all.filter(i => i.status.includes('pending')).length;
    const approved = all.filter(i => i.status === 'approved');
    const cancelled = all.filter(i => i.status === 'rejected' || i.status === 'cancelled').length;
    return {
      total: all.length, approved: approved.length, pending,
      cancelled,
      pendingMyResponse: incomingInvitations.filter(i => i.status === 'pending_preacher_confirmation').length
    };
  };

  const stats = getStats();

  const statusBadge = (status) => {
    const map = {
      pending_field1_secretary: { label: 'Sec 1 Review', color: 'bg-amber-50 text-amber-700 border-amber-200' },
      pending_field2_secretary: { label: 'Sec 2 Review', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      pending_preacher_confirmation: { label: 'Your Approval', color: 'bg-purple-50 text-purple-700 border-purple-200' },
      pending_district_pastor_approval: { label: 'District Review', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
      approved: { label: 'Confirmed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      rejected: { label: 'Declined', color: 'bg-rose-50 text-rose-700 border-rose-200' },
      completed: { label: 'Completed', color: 'bg-slate-50 text-slate-600 border-slate-200' },
    };
    const cfg = map[status] || { label: status.replace(/_/g, ' '), color: 'bg-slate-50 text-slate-600 border-slate-200' };
    return <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${cfg.color}`}>{cfg.label}</span>;
  };

  if (loading) return (
    <div className="p-20 text-center">
      <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Syncing Portal Data...</p>
    </div>
  );

  // ── RequestCard ──────────────────────────────────────────────────────────────
  const RequestCard = ({ item, type }) => {
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
    }[item.priority] || 'bg-amber-50 text-amber-600 border-amber-200';

    const counterpartName = item.requesting_pastor_name || item.pastor_name;
    const counterpartField = item.pastor_field_name || item.pastor_field;

    // Show insurance docs when approved or completed
    const showInsurance = ['approved', 'completed'].includes(item.status);

    return (
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all">

        {/* ── Collapsed Header ── */}
        <div className="p-6 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : item.id)}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-lg font-black flex-shrink-0">
                {counterpartName?.charAt(0) || '?'}
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-slate-900 text-base leading-tight truncate">{counterpartName || '—'}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3 h-3 text-blue-400 flex-shrink-0" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">{counterpartField || '—'}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {statusBadge(item.status)}
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); exportSinglePDF(item); }} title="Download PDF"
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-700">
                  <FileDown className="w-4 h-4" />
                </button>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </div>

          {/* Quick info pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl">
              {isMultiDay
                ? <CalendarRange className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                : <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
              <span className="text-[11px] font-bold text-slate-700">
                {new Date(item.service_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                {item.service_end_date && <> → {new Date(item.service_end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</>}
              </span>
              {durationDays && <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-lg">{durationDays}d</span>}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl">
              <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-[11px] font-bold text-slate-700">{item.service_type}</span>
            </div>
            <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${priorityColor}`}>
              {item.priority || 'Medium'}
            </span>
            {item.attachment_url && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                <FileText className="w-3 h-3" /> Attachment
              </span>
            )}
            {showInsurance && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-50 border border-teal-100 rounded-xl text-[10px] font-black text-teal-600 uppercase tracking-widest">
                <Shield className="w-3 h-3" /> Insurance Docs
              </span>
            )}
            {item.status === 'pending_preacher_confirmation' && item.target_user_id == user.id && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-xl text-[10px] font-black text-purple-700 uppercase tracking-widest animate-pulse">
                ⚡ Action Required
              </span>
            )}
          </div>

          {(item.pastor_church_name || item.pastor_church) && (
            <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <Building className="w-3 h-3" />
              <span className="font-black text-slate-700">{item.pastor_church_name || item.pastor_church}</span>
            </div>
          )}
        </div>

        {/* ── Expanded Detail Panel ── */}
        {isExpanded && (
          <div className="border-t border-slate-100 bg-slate-50/50 p-6 space-y-5">

            {/* Multi-day period block */}
            {isMultiDay && item.service_end_date && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-4">
                <CalendarRange className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Event Period</p>
                  <p className="text-sm font-black text-slate-800">
                    {new Date(item.service_date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}
                    {' '}<ChevronRight className="inline w-3.5 h-3.5 text-slate-400" />{' '}
                    {new Date(item.service_end_date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex-shrink-0">
                  {durationDays} {durationDays === 1 ? 'day' : 'days'}
                </div>
              </div>
            )}

            {/* Detail grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Requesting Pastor', value: item.requesting_pastor_name || item.pastor_name, icon: <User className="w-3 h-3 text-slate-400" /> },
                { label: 'Hosting Church', value: item.pastor_church_name || item.pastor_church, icon: <Building className="w-3 h-3 text-slate-400" /> },
                { label: 'Hosting Field', value: item.pastor_field_name || item.pastor_field, icon: <MapPin className="w-3 h-3 text-blue-400" /> },
                { label: 'Hosting District', value: item.pastor_district_name || '—', icon: <MapPin className="w-3 h-3 text-slate-400" /> },
                { label: 'Service Type', value: item.service_type, icon: <FileText className="w-3 h-3 text-slate-400" /> },
                { label: 'Priority', value: item.priority || 'Medium', icon: <AlertTriangle className="w-3 h-3 text-amber-400" /> },
              ].map(({ label, value, icon }) => (
                <div key={label} className="p-3 bg-white border border-slate-100 rounded-2xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">{icon} {label}</p>
                  <p className="text-xs font-black text-slate-800">{value || '—'}</p>
                </div>
              ))}
            </div>

            {/* ── Insurance Documents (visible when approved or completed) ── */}
            {showInsurance && (
              <InsuranceDocumentsViewer invitationId={item.id} token={token} />
            )}

            {/* Status trail */}
            <div className="p-4 bg-white border border-slate-100 rounded-2xl space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Trail</p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
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
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Your Note</p>
                  <p className="text-xs text-slate-700">{item.preacher_note}</p>
                </div>
              )}
              {item.district_pastor_note && (
                <div className="p-3 bg-cyan-50 border border-cyan-100 rounded-xl">
                  <p className="text-[9px] font-black text-cyan-500 uppercase tracking-widest mb-1">District Pastor Note</p>
                  <p className="text-xs text-cyan-800">{item.district_pastor_note}</p>
                </div>
              )}
            </div>

            {/* Attachment */}
            {item.attachment_url && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <FileText className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Mission Attachment</p>
                      <p className="text-xs font-black text-slate-700">Official Program Document</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {/* View attachment */}
                    <a
                      href={item.attachment_url.startsWith('http') ? item.attachment_url : `${API_BASE}${item.attachment_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </a>
                    {/* Download attachment */}
                    <a
                      href={item.attachment_url.startsWith('http') ? item.attachment_url : `${API_BASE}${item.attachment_url}`}
                      download
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  </div>
                </div>

                {/* Image preview for image attachments */}
                {/\.(jpg|jpeg|png|gif|webp)$/i.test(item.attachment_url) && (
                  <div className="rounded-xl overflow-hidden border border-emerald-100 bg-white">
                    <img
                      src={item.attachment_url.startsWith('http') ? item.attachment_url : `${API_BASE}${item.attachment_url}`}
                      alt="Attachment preview"
                      className="w-full max-h-64 object-contain"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Feedback summary */}
            {(item.preacher_rating || item.preacher_experience_note || item.pastor_return_comment) && (
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Mission Evaluation</p>
                  {item.preacher_rating && (
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} className={`w-3.5 h-3.5 ${star <= item.preacher_rating ? 'text-amber-500 fill-current' : 'text-slate-300'}`} />
                      ))}
                    </div>
                  )}
                </div>
                {item.preacher_experience_note && (
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Your Experience</p>
                    <p className="text-xs text-slate-700 italic">"{item.preacher_experience_note}"</p>
                  </div>
                )}
                {item.pastor_return_comment && (
                  <div className="pt-2 border-t border-blue-100">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Host Pastor's Feedback</p>
                    <p className="text-xs text-slate-700 italic">"{item.pastor_return_comment}"</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Action Buttons ── */}
            {type === 'inbound' && item.status === 'pending_preacher_confirmation' && item.target_user_id == user.id && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <button onClick={() => respondToInvitation(item.id, 'pending_district_pastor_approval', 'Accepted')}
                  className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Accept Call
                </button>
                <button onClick={() => handleReject(item.id)}
                  className="py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 flex items-center justify-center gap-2">
                  <XCircle className="w-4 h-4" /> Decline
                </button>
              </div>
            )}

            {type === 'inbound' && item.status === 'approved' && new Date(item.service_date) <= new Date() && (
              <div className="pt-2 border-t border-slate-100">
                <button onClick={() => { setSelectedInvitation(item); setShowFeedbackModal(true); }}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Mark as Completed & Rate
                </button>
              </div>
            )}

            {item.status === 'completed' && (
              <div className="pt-2 border-t border-slate-100">
                <button onClick={() => { setSelectedInvitation(item); setShowFeedbackModal(true); }}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-100 flex items-center justify-center gap-2">
                  <MessageSquare className="w-4 h-4" /> View / Update Feedback
                </button>
              </div>
            )}

            {item.status === 'rejected' && (
              <div className="pt-2 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">This invitation was declined — no further action required</p>
              </div>
            )}

            {['pending_field1_secretary', 'pending_field2_secretary', 'pending_district_pastor_approval'].includes(item.status) && (
              <div className="pt-2 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                  {item.status === 'pending_district_pastor_approval'
                    ? 'Awaiting district pastor approval — no action needed from you'
                    : 'In review by secretaries — no action needed from you'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-500">

            {/* ── Upcoming Services (Top) ── */}
            {(() => {
              const now = new Date(); now.setHours(0, 0, 0, 0);
              const nextWeek = new Date(now); nextWeek.setDate(nextWeek.getDate() + 7);
              const upcoming = incomingInvitations
                .filter(inv => { const d = new Date(inv.service_date); return d >= now && d <= nextWeek; })
                .sort((a, b) => new Date(a.service_date) - new Date(b.service_date));
              return (
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-500" /> Upcoming Services — Next 7 Days
                    </h3>
                    <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg border border-emerald-100">
                      {upcoming.length} service{upcoming.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {upcoming.length === 0 ? (
                    <div className="flex items-center justify-center gap-3 py-6 text-slate-300">
                      <Calendar className="w-8 h-8" />
                      <p className="text-sm font-semibold">No services scheduled this week</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {upcoming.map(inv => (
                        <div key={inv.id}
                          className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-sm transition-all cursor-pointer"
                          onClick={() => {
                            setActiveTab('inbound');
                            setExpandedId(inv.id);
                          }}
                          title="Click to view full details"
                        >
                          <div className="flex-shrink-0 bg-emerald-100 text-emerald-700 rounded-xl px-2.5 py-1.5 text-center min-w-[44px]">
                            <p className="text-[9px] font-black uppercase">{new Date(inv.service_date).toLocaleString('default', { month: 'short' })}</p>
                            <p className="text-base font-black leading-none">{new Date(inv.service_date).getDate()}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-800 truncate">{inv.requesting_pastor_name || inv.pastor_name || 'Pastor'}</p>
                            <p className="text-[11px] text-slate-500 truncate">{inv.service_type || 'Service'} · {inv.pastor_church_name || inv.pastor_church || '—'}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-lg font-black flex-shrink-0 ${
                            inv.priority === 'Urgent' ? 'bg-red-100 text-red-700' : inv.priority === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                          }`}>{inv.priority || 'Med'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Requests', value: stats.total, color: 'text-slate-900', icon: <FileText className="w-5 h-5 text-slate-200" /> },
                { label: 'Approved', value: stats.approved, color: 'text-emerald-500', icon: <CheckCircle2 className="w-5 h-5 text-emerald-100" /> },
                { label: 'Pending Protocol', value: stats.pending, color: 'text-amber-500', icon: <Clock className="w-5 h-5 text-amber-100" /> },
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

            {/* District Pastor card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-3">Your District Pastor</p>
              {districtPastor ? (
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-2xl font-black flex-shrink-0">
                    {districtPastor.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xl font-black text-slate-900">{districtPastor.name}</p>
                    <p className="text-sm text-slate-500">{districtPastor.district_name ? `${districtPastor.district_name} District` : 'No district linked'}</p>
                    <div className="flex gap-4 mt-1">
                      {districtPastor.phone && <p className="text-xs text-slate-400">📞 {districtPastor.phone}</p>}
                      {districtPastor.email && <p className="text-xs text-slate-400">✉️ {districtPastor.email}</p>}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No district pastor assigned yet</p>
              )}
            </div>

            <div className="bg-blue-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-blue-200">
              <div className="relative z-10">
                <h2 className="text-3xl font-black tracking-tight uppercase">Welcome back, Preacher {user.name}</h2>
                <p className="text-blue-100 mt-2 font-medium max-w-lg">
                  You have {stats.pendingMyResponse} incoming invitations waiting for your confirmation.
                </p>
                <div className="flex gap-4 mt-6">
                  <button onClick={() => setActiveTab('inbound')}
                    className="px-8 py-3 bg-white text-blue-600 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-blue-50 transition-all active:scale-95">
                    View Calls
                  </button>
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 opacity-10"><Users className="w-64 h-64" /></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Strategic Quick Actions</h3>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { tab: 'inbound', icon: <Inbox className="w-6 h-6" />, title: 'Manage New Requests', sub: 'Review Incoming Invitations', hoverColor: 'hover:border-blue-200 hover:bg-blue-50/30', iconHover: 'group-hover:bg-blue-600 group-hover:text-white', textHover: 'group-hover:text-blue-700', iconColor: 'text-blue-600' },
                    { tab: 'calendar', icon: <Calendar className="w-6 h-6" />, title: 'Ministry Calendar', sub: 'View Scheduled Missions', hoverColor: 'hover:border-emerald-200 hover:bg-emerald-50/30', iconHover: 'group-hover:bg-emerald-600 group-hover:text-white', textHover: 'group-hover:text-emerald-700', iconColor: 'text-emerald-600' },
                  ].map(({ tab, icon, title, sub, hoverColor, iconHover, textHover, iconColor }) => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 ${hoverColor} transition-all group active:scale-[0.98]`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 bg-white rounded-2xl flex items-center justify-center ${iconColor} shadow-sm border border-slate-50 ${iconHover} transition-all`}>{icon}</div>
                        <div className="text-left">
                          <p className={`font-black text-slate-900 ${textHover} transition-colors`}>{title}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{sub}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity Feed for Preacher */}
              <div className="bg-white dark:bg-[var(--bg-primary)] rounded-[2.5rem] p-8 border border-slate-100 dark:border-[var(--border-color)] shadow-sm">
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

        {activeTab === 'outbound' && (
          <div className="text-center py-20 bg-gradient-to-br from-slate-50 to-blue-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <AlertCircle className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-black text-slate-700 uppercase tracking-tighter mb-2">Invitation Creation Restricted</h3>
            <p className="text-slate-600 font-medium max-w-md mx-auto">As a preacher, you can only respond to invitations sent by pastors.</p>
            <p className="text-slate-500 text-sm italic mt-4">Visit the "Received" tab to review and respond to ministry calls.</p>
          </div>
        )}

        {activeTab === 'inbound' && (
          <div className="space-y-4">
            {incomingInvitations.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                <AlertCircle className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No incoming mission calls found</p>
              </div>
            ) : incomingInvitations.map(item => <RequestCard key={item.id} item={item} type="inbound" />)}
          </div>
        )}

        {activeTab === 'calendar' && <PastorCalendar token={token} role="preacher" />}
      </div>

      {showFeedbackModal && selectedInvitation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[70] p-4">
          <FeedbackModal
            invitation={selectedInvitation}
            user={user}
            token={token}
            onClose={() => setShowFeedbackModal(false)}
            onSuccess={async () => {
              if (selectedInvitation.status === 'approved') {
                await respondToInvitation(selectedInvitation.id, 'completed', 'Completed with feedback');
              } else { await fetchData(); }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default PreacherPortal;