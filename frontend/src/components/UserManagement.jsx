import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../logo.jpeg';

const UserManagement = ({ token, user: currentUser, onCurrentUserUpdate }) => {
  const [users, setUsers] = useState([]);
  const [fields, setFields] = useState([]);
  const [unions, setUnions] = useState([]);
  const [churches, setChurches] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [districtLoading, setDistrictLoading] = useState(false);
  const [churchLoading, setChurchLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [logoBase64, setLogoBase64] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'pastor',
    field_id: '',
    district_id: '',
    church_id: '',
    church_name: '',
    phone: '',
    specialty: '',
    availability_status: 'available'
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showViewPassword, setShowViewPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const selectedChurch = churches.find(c => String(c.id) === String(formData.church_id));

  useEffect(() => {
    if (!token) return;
    fetchData();

    // Convert logo to base64 for PDF
    const img = new Image();
    img.src = logo;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      setLogoBase64(canvas.toDataURL('image/jpeg'));
    };
  }, [token]);

  useEffect(() => {
    if (!formData.field_id) {
      setDistricts([]);
      setChurches([]);
      return;
    }

    const fetchDistricts = async () => {
      setDistrictLoading(true);
      try {
        const res = await fetch(`http://localhost:5000/api/districts?field_id=${formData.field_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setDistricts(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error fetching districts:', err);
      } finally {
        setDistrictLoading(false);
      }
    };

    fetchDistricts();
  }, [formData.field_id, token]);

  useEffect(() => {
    if (!formData.district_id) {
      setChurches([]);
      return;
    }

    const fetchChurches = async () => {
      setChurchLoading(true);
      try {
        const res = await fetch(`http://localhost:5000/api/churches?district_id=${formData.district_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setChurches(Array.isArray(data) ? data : []);
        } else {
          setChurches([]);
        }
      } catch (err) {
        console.error('Error fetching churches:', err);
        setChurches([]);
      } finally {
        setChurchLoading(false);
      }
    };

    fetchChurches();
  }, [formData.district_id, token]);

  const fetchData = async () => {
    let userError = null;

    try {
      const unionsRes = await fetch('http://localhost:5000/api/unions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (unionsRes.ok) {
        const unionsData = await unionsRes.json();
        if (Array.isArray(unionsData)) setUnions(unionsData);
      }
    } catch (err) {
      console.error('Unions load error:', err);
    }

    try {
      const fieldsRes = await fetch('http://localhost:5000/api/fields', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (fieldsRes.ok) {
        const fieldsData = await fieldsRes.json();
        if (Array.isArray(fieldsData)) {
          setFields(fieldsData);
          if (fieldsData.length > 0 && !formData.field_id) {
            setFormData(prev => ({ ...prev, field_id: fieldsData[0].id }));
          }
        }
      } else {
        const fieldErr = await fieldsRes.text().catch(() => null);
        userError = `Fields load failed: ${fieldErr || fieldsRes.statusText}`;
      }
    } catch (err) {
      userError = `Fields load error: ${err.message}`;
    }

    try {
      const usersRes = await fetch('http://localhost:5000/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (Array.isArray(usersData)) setUsers(usersData);
      } else {
        const errText = await usersRes.text().catch(() => null);
        userError = userError || `Users load failed: ${errText || usersRes.statusText}`;
      }
    } catch (err) {
      userError = userError || `Users load error: ${err.message}`;
    }

    if (userError) {
      setError(`Strategic sync failed. Personnel data unreachable. ${userError}`);
    }

    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: value,
      // Reset dependent fields if parent changes
      ...(name === 'field_id' ? { district_id: '', church_id: '', church_name: '' } : {}),
      ...(name === 'district_id' ? { church_id: '', church_name: '' } : {})
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if ((formData.role === 'pastor' || formData.role === 'secretary' || formData.role === 'preacher') && !formData.field_id) {
      setError('⚠️ A field must be assigned');
      return;
    }
    if (formData.role === 'pastor' && !formData.district_id) {
      setError('⚠️ A district must be assigned for pastors');
      return;
    }
    if (formData.role === 'preacher' && !formData.church_id) {
      setError('⚠️ A church must be assigned for preachers');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`✅ ${formData.name} (${formData.role.toUpperCase()}) has been registered successfully!`);
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'pastor',
          field_id: fields.length > 0 ? fields[0].id : '',
          district_id: '',
          church_id: '',
          church_name: '',
          phone: '',
          specialty: '',
          availability_status: 'available'
        });
        setTimeout(() => setSuccess(''), 5000);
        fetchData();
      } else {
        setError(data.error || 'Failed to authorize new personnel');
      }
    } catch (err) {
      setError('Network communication failure: ' + err.message);
    }
  };

  const handleArchive = async (id, name, isArchived) => {
    const actionName = isArchived ? 'Restore' : 'Archive';
    if (!window.confirm(`Are you sure you want to ${actionName.toLowerCase()} access for ${name}?`)) return;
    try {
      const res = await fetch(`http://localhost:5000/api/users/${id}/archive`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccess(`✅ ${name}'s access has been ${isArchived ? 'restored' : 'archived'}`);
        setTimeout(() => setSuccess(''), 5000);
        setSelectedUser(null);
        fetchData();
      }
    } catch (err) {
      setError(`Failed to ${actionName.toLowerCase()} personnel access`);
    }
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setEditMode(false);
    setEditFormData(null);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditMode(true);
    setShowEditPassword(false);
    setEditFormData({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      field_id: user.field_id || '',
      district_id: user.district_id || '',
      church_id: user.church_id || '',
      church_name: user.church_name || '',
      password: user.plain_password || '',
      role: user.role || '',
      specialty: user.specialty || '',
      availability_status: user.availability_status || 'available'
    });
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ 
      ...prev, 
      [name]: value,
      ...(name === 'field_id' ? { district_id: '', church_id: '', church_name: '' } : {}),
      ...(name === 'district_id' ? { church_id: '', church_name: '' } : {})
    }));
  };

  const handleSaveEdit = async () => {
    if (!editFormData.name || !editFormData.email) {
      setError('Name and email are required');
      return;
    }

    try {
      const updatePayload = {
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone,
        field_id: editFormData.field_id,
        district_id: editFormData.district_id,
        church_id: editFormData.church_id,
        church_name: editFormData.church_name,
        specialty: editFormData.specialty,
        availability_status: editFormData.availability_status
      };

      if (editFormData.password) {
        updatePayload.password = editFormData.password;
      }

      const res = await fetch(`http://localhost:5000/api/users/${editFormData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatePayload)
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`✅ ${editFormData.name}'s information has been updated`);
        setTimeout(() => setSuccess(''), 5000);
        setSelectedUser(null);
        setEditMode(false);
        setEditFormData(null);
        fetchData();

        if (currentUser?.id === editFormData.id && onCurrentUserUpdate) {
          onCurrentUserUpdate(data.user || { ...currentUser, ...updatePayload });
        }
      } else {
        setError(data.error || 'Failed to update user');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    }
  };

  const handleFieldSave = async (fieldData) => {
    const isEdit = !!fieldData.id;
    const url = isEdit ? `http://localhost:5000/api/fields/${fieldData.id}` : 'http://localhost:5000/api/fields';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(fieldData)
      });

      if (res.ok) {
        setSuccess(`✅ Field ${isEdit ? 'updated' : 'created'} successfully`);
        setTimeout(() => setSuccess(''), 5000);
        fetchData();
        return true;
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to save field');
        return false;
      }
    } catch (err) {
      setError('Network error: ' + err.message);
      return false;
    }
  };

  const handleFieldDelete = async (id, name) => {
    if (!window.confirm(`Permanently delete field "${name}"? This may affect assigned users.`)) return;
    try {
      const res = await fetch(`http://localhost:5000/api/fields/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccess(`✅ Field "${name}" has been removed`);
        setTimeout(() => setSuccess(''), 5000);
        fetchData();
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to delete field');
      }
    } catch (err) {
      setError('Failed to delete field');
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const systemName = "Preacher Invitation and Service Coordination System";
    const reportTitle = "Official Personnel Directory";
    const dateStr = new Date().toLocaleString();
    const generatedBy = currentUser?.name || "System Admin";

    // Header Branding
    if (logoBase64) {
      doc.addImage(logoBase64, 'JPEG', 14, 12, 12, 12);
    }

    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text("PISCS", 28, 22);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(systemName.toUpperCase(), 28, 28);

    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.line(14, 35, 196, 35);

    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(reportTitle, 14, 48);

    // Metadata
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generated By: ${generatedBy}`, 14, 58);
    doc.text(`Prepared By: Strategic Coordination Office`, 14, 63);
    doc.text(`Timestamp: ${dateStr}`, 14, 68);

    const tableColumn = ["Personnel Name", "Church", "Email", "Role", "Field", "Status", "Contact"];
    const tableRows = [];

    const reportUsers = users.filter(u =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (fields.find(f => f.id === u.field_id)?.name || 'N/A').toLowerCase().includes(searchTerm.toLowerCase())
    );

    reportUsers.forEach(u => {
      const userData = [
        u.name,
        u.church_name || 'N/A',
        u.email,
        u.role.toUpperCase(),
        fields.find(f => f.id === u.field_id)?.name || 'N/A',
        (u.availability_status || 'available').toUpperCase(),
        u.phone || '—'
      ];
      tableRows.push(userData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 75,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'left'
      },
      styles: {
        fontSize: 8,
        cellPadding: 4,
        overflow: 'linebreak',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 35 },
        2: { cellWidth: 40 },
        3: { cellWidth: 20 },
        4: { cellWidth: 25 },
        5: { cellWidth: 20 },
        6: { cellWidth: 25 }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount} `, 196, 285, { align: 'right' });
      doc.text("© 2026 PISCS - Secure Document", 14, 285);
    }

    doc.save(`PISCS_Personnel_Directory_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) return (
    <div className="p-20 text-center space-y-4">
      <div className="w-12 h-12 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin mx-auto" />
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Synchronizing Personnel Data...</p>
    </div>
  );

  return (
    <div className="space-y-16 animate-in fade-in duration-500">
      <section className="space-y-10">
        <div className="flex items-center justify-between border-b border-white/5 pb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full bg-brand-accent" />
              <h3 className="text-xl font-black tracking-tighter">Personnel Commissioning</h3>
            </div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Register Pastors & Field Secretaries // Secure Portal</p>
          </div>
        </div>

        {error && (
          <div className="p-4 text-xs font-bold text-rose-400 bg-rose-400/10 rounded-2xl border border-rose-400/20 animate-in slide-in-from-top-2">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 text-xs font-bold text-emerald-400 bg-emerald-400/10 rounded-2xl border border-emerald-400/20 animate-in slide-in-from-top-2">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormGroup label="Full Name">
              <input
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                required
              />
            </FormGroup>

            <FormGroup label="Email">
              <input
                name="email"
                type="email"
                placeholder="official@church.rw"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                required
              />
            </FormGroup>

            <FormGroup label="Phone">
              <input
                name="phone"
                type="tel"
                placeholder="+250 7xx xxx xxx"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </FormGroup>

            <FormGroup label="Password">
              <input
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                required
              />
            </FormGroup>

            <FormGroup label="Role">
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value="pastor">Field Pastor</option>
                <option value="preacher">Field Preacher</option>
                <option value="secretary">Field Secretary</option>
              </select>
            </FormGroup>

            <FormGroup label="Field">
              <select
                name="field_id"
                value={formData.field_id}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                required
              >
                <option value="">Select field</option>
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </FormGroup>

            {(formData.role === 'pastor' || formData.role === 'preacher') && (
              <FormGroup label="District">
                {!formData.field_id ? (
                  <p className="text-xs text-slate-500 italic">Select a field first.</p>
                ) : districtLoading ? (
                  <p className="text-xs text-slate-500 italic">Loading districts…</p>
                ) : (
                  <select
                    name="district_id"
                    value={formData.district_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                    required
                  >
                    <option value="">Select a district</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                )}
              </FormGroup>
            )}

            {(formData.role === 'pastor' || formData.role === 'preacher') && (
              <FormGroup label="Church / Station">
                {!formData.district_id ? (
                  <p className="text-xs text-slate-500 italic">Select a district first.</p>
                ) : churchLoading ? (
                  <p className="text-xs text-slate-500 italic">Loading churches…</p>
                ) : (
                  <>
                    <select
                      name="church_id"
                      value={formData.church_id}
                      onChange={(e) => {
                        const cid = e.target.value;
                        const selectedChurch = churches.find(c => String(c.id) === cid);
                        setFormData(prev => ({ 
                          ...prev, 
                          church_id: cid,
                          church_name: selectedChurch ? selectedChurch.name : ''
                        }));
                      }}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                      required
                    >
                      <option value="">Select a church</option>
                      {churches.map((church) => (
                        <option key={church.id} value={church.id}>
                          {church.name}
                        </option>
                      ))}
                    </select>

                    {selectedChurch && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                        <p><span className="font-semibold">Field:</span> {selectedChurch.field_name || fields.find(f => f.id === Number(formData.field_id))?.name || 'N/A'}</p>
                        <p><span className="font-semibold">District:</span> {selectedChurch.district_name || districts.find(d => d.id === Number(formData.district_id))?.name || 'N/A'}</p>
                      </div>
                    )}
                  </>
                )}
              </FormGroup>
            )}

            <FormGroup label="Professional Status">
              <select
                name="availability_status"
                value={formData.availability_status}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="available">Available (Active)</option>
                <option value="busy">Busy / Occupied</option>
                <option value="on-mission">On Active Mission</option>
                <option value="away">Away / On Leave</option>
              </select>
            </FormGroup>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition"
              >
                Register Personnel
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="space-y-10">
        <div className="flex items-center gap-4">
          <div className="w-8 h-1 bg-blue-600 rounded-full" />
          <h3 className="text-2xl font-black tracking-tight text-slate-900">User Directory</h3>
          <button
            onClick={() => setShowFieldModal(true)}
            className="px-4 py-2 bg-blue-50 text-blue-700 border-2 border-blue-200 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-100 transition-all shadow-sm flex items-center gap-2"
          >
            <span>🏗️</span> Manage Fields
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-md flex items-center gap-2"
          >
            <span>📄</span> Export PDF
          </button>
          <span className="ml-auto px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
            {users.length} users
          </span>
        </div>

        {users.length === 0 ? (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-8 text-center">
            <p className="text-slate-600 font-semibold">No users registered yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search by name, email, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border-2 border-slate-200 shadow-md">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="px-6 py-4 text-left text-sm font-black uppercase tracking-wide">Personnel Name</th>
                    <th className="px-6 py-4 text-left text-sm font-black uppercase tracking-wide">Church</th>
                    <th className="px-6 py-4 text-left text-sm font-black uppercase tracking-wide">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-black uppercase tracking-wide">Role</th>
                    <th className="px-6 py-4 text-left text-sm font-black uppercase tracking-wide">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-black uppercase tracking-wide">Contact</th>
                    <th className="px-6 py-4 text-center text-sm font-black uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.filter(u =>
                    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    u.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (fields.find(f => f.id === u.field_id)?.name || 'N/A').toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((u, idx) => (
                    <tr key={u.id} className={idx % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-slate-50 hover:bg-blue-50'}>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{u.name}</div>
                        {u.field_id && <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-1">{fields.find(f => f.id === u.field_id)?.name}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-700 font-medium text-sm">
                           {u.church_name || <span className="text-slate-300 italic">No church data</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 text-sm font-medium">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide ${u.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : u.role === 'pastor'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                          } `}>
                          {u.role === 'admin' ? '🛡️ Admin' : u.role === 'pastor' ? '👤 Pastor' : u.role === 'preacher' ? '🕊️ Preacher' : '📋 Secretary'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${
                             u.availability_status === 'available' ? 'bg-emerald-500' : 
                             u.availability_status === 'busy' ? 'bg-amber-500' : 
                             u.availability_status === 'on-mission' ? 'bg-blue-500' : 'bg-slate-400'
                           }`} />
                           <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{u.availability_status || 'available'}</span>
                        </div>
                        {u.is_archived === 1 && <span className="mt-1 block text-[10px] text-rose-500 font-bold uppercase">Archived</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-700 text-sm font-medium">{u.phone || '—'}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-1 justify-center items-center">
                          <button
                            onClick={() => handleViewUser(u)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border-l-4 border-blue-400 text-xs font-semibold rounded transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleEditUser(u)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border-l-4 border-amber-400 text-xs font-semibold rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleArchive(u.id, u.name, u.is_archived === 1)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border-l-4 border-red-400 text-xs font-semibold rounded transition-colors"
                          >
                            {u.is_archived === 1 ? 'Restore' : 'Archive'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {showFieldModal && (
        <FieldManagementModal
          fields={fields}
          unions={unions}
          token={token}
          onClose={() => setShowFieldModal(false)}
          onSave={handleFieldSave}
          onDelete={handleFieldDelete}
          editingField={editingField}
          setEditingField={setEditingField}
        />
      )}

      {selectedUser && !editMode && (
        <UserViewModal
          user={selectedUser}
          fields={fields}
          showPassword={showViewPassword}
          setShowPassword={setShowViewPassword}
          onClose={() => { setSelectedUser(null); setShowViewPassword(false); }}
          onEdit={handleEditUser}
          onArchive={handleArchive}
        />
      )}

      {selectedUser && editMode && editFormData && (
        <UserEditModal
          user={editFormData}
          fields={fields}
          token={token}
          showPassword={showEditPassword}
          setShowPassword={setShowEditPassword}
          onClose={() => {
            setSelectedUser(null);
            setEditMode(false);
            setEditFormData(null);
          }}
          onChange={handleEditFormChange}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};

const UserViewModal = ({ user, fields, showPassword, setShowPassword, onClose, onEdit, onArchive }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <h2 className="text-2xl font-black text-slate-900">{user.name}</h2>
          <p className="text-sm text-slate-600 mt-1">{user.email}</p>
        </div>

        <div className="space-y-3">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Full Name</p>
            <p className="text-slate-900 font-semibold text-base">{user.name}</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Email Address</p>
            <p className="text-slate-900 font-semibold text-base">{user.email}</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Role</p>
            <p className="text-slate-900 font-semibold text-base">
              {user.role === 'admin' ? '🛡️ Admin' : user.role === 'pastor' ? '👤 Pastor' : user.role === 'preacher' ? '⛪ Preacher' : '📋 Secretary'}
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Field Assignment</p>
            <p className="text-slate-900 font-semibold text-base">
              {fields.find(f => f.id === user.field_id)?.name || 'Not assigned'}
            </p>
          </div>

          {user.district_name && (
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">District</p>
              <p className="text-slate-900 font-semibold text-base">📍 {user.district_name}</p>
            </div>
          )}

          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Phone Number</p>
            <p className="text-slate-900 font-semibold text-base">{user.phone || 'Not provided'}</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Password</p>
              <button
                onClick={() => setShowPassword(prev => !prev)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                {showPassword ? 'Hide' : 'Reveal'}
              </button>
            </div>
            {showPassword ? (
              <p className="text-slate-900 font-semibold text-base">
                {user.plain_password || <span className="text-slate-400 italic text-sm">Not recoverable</span>}
              </p>
            ) : (
              <p className="text-slate-900 font-semibold text-base tracking-widest">••••••••••••</p>
            )}
          </div>

          {user.church_name && (
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Church / Station</p>
              <p className="text-slate-900 font-semibold text-base">⛪ {user.church_name}</p>
            </div>
          )}

          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Specialty</p>
            <p className="text-slate-900 font-semibold text-base">{user.specialty || 'General Ministry'}</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Status</p>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                user.availability_status === 'available' ? 'bg-emerald-500' : 
                user.availability_status === 'busy' ? 'bg-amber-500' : 
                user.availability_status === 'on-mission' ? 'bg-blue-500' : 'bg-slate-400'
              }`} />
              <p className="text-slate-900 font-black uppercase text-xs tracking-widest">{user.availability_status || 'available'}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <button
            onClick={() => {
              onClose();
              onEdit(user);
            }}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold rounded-lg transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => {
              onArchive(user.id, user.name, user.is_archived === 1);
              onClose();
            }}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold rounded-lg transition-colors"
          >
            {user.is_archived === 1 ? 'Restore' : 'Archive'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
);

const UserEditModal = ({ user, fields, token, showPassword, setShowPassword, onClose, onChange, onSave }) => {
  const [districts, setDistricts] = useState([]);
  const [churches, setChurches] = useState([]);
  const [districtLoading, setDistrictLoading] = useState(false);
  const [churchLoading, setChurchLoading] = useState(false);

  const selectedChurchForEdit = churches.find(c => String(c.id) === String(user.church_id));

  useEffect(() => {
    if (!user.field_id) {
      setDistricts([]);
      setChurches([]);
      return;
    }

    const fetchDistricts = async () => {
      setDistrictLoading(true);
      try {
        const res = await fetch(`http://localhost:5000/api/districts?field_id=${user.field_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setDistricts(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error fetching districts:', err);
      } finally {
        setDistrictLoading(false);
      }
    };

    fetchDistricts();
  }, [user.field_id, token]);

  useEffect(() => {
    if (!user.district_id) {
      setChurches([]);
      return;
    }

    const fetchChurches = async () => {
      setChurchLoading(true);
      try {
        const res = await fetch(`http://localhost:5000/api/churches?district_id=${user.district_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setChurches(Array.isArray(data) ? data : []);
        } else {
          setChurches([]);
        }
      } catch (err) {
        console.error('Error fetching churches:', err);
      } finally {
        setChurchLoading(false);
      }
    };

    fetchChurches();
  }, [user.district_id, token]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-black text-slate-900">Edit Personnel</h2>
            <p className="text-sm text-slate-600 mt-1">Update {user.name}'s information</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Role</label>
              <div className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 font-semibold text-sm">
                {user.role === 'admin' ? '🛡️ Admin' : user.role === 'pastor' ? '👤 Pastor' : user.role === 'preacher' ? '⛪ Preacher' : '📋 Secretary'}
              </div>
              <p className="text-[10px] text-slate-500 mt-1 italic">Role cannot be changed in edit mode</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Full Name</label>
              <input
                name="name"
                value={user.name}
                onChange={onChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Email</label>
              <input
                name="email"
                type="email"
                value={user.email}
                onChange={onChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={user.password}
                  onChange={onChange}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 pr-16 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase text-blue-600 hover:text-blue-800"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Phone</label>
              <input
                name="phone"
                value={user.phone}
                onChange={onChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Field</label>
              <select
                name="field_id"
                value={user.field_id}
                onChange={onChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
              >
                <option value="">Select field</option>
                {fields.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            {(user.role === 'pastor' || user.role === 'preacher') && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">District</label>
                <select
                  name="district_id"
                  value={user.district_id}
                  onChange={onChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                  disabled={!user.field_id || districtLoading}
                >
                  <option value="">Select District</option>
                  {districts.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            {(user.role === 'pastor' || user.role === 'preacher') && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Church / Station</label>
                <select
                  name="church_id"
                  value={user.church_id}
                  onChange={(e) => {
                    const cid = e.target.value;
                    const selectedChurch = churches.find(c => String(c.id) === cid);
                    onChange({
                      target: {
                        name: 'church_id',
                        value: cid
                      }
                    });
                    onChange({
                      target: {
                        name: 'church_name',
                        value: selectedChurch ? selectedChurch.name : ''
                      }
                    });
                  }}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                  disabled={!user.district_id || churchLoading}
                >
                  <option value="">Select Church</option>
                  {churches.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                {selectedChurchForEdit && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    <p><span className="font-semibold">Field:</span> {selectedChurchForEdit.field_name || fields.find(f => f.id === user.field_id)?.name || 'N/A'}</p>
                    <p><span className="font-semibold">District:</span> {selectedChurchForEdit.district_name || districts.find(d => d.id === user.district_id)?.name || 'N/A'}</p>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Specialty</label>
              <input
                name="specialty"
                value={user.specialty}
                onChange={onChange}
                placeholder="e.g. Evangelism, Youth Ministry"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Availability Status</label>
              <select
                name="availability_status"
                value={user.availability_status}
                onChange={onChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
              >
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="on-mission">On Mission</option>
                <option value="away">Away</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={onSave}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-md"
            >
              Save Changes
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold rounded-xl transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FieldManagementModal = ({ fields, unions, token, onClose, onSave, onDelete, editingField, setEditingField }) => {
  const [showForm, setShowForm] = useState(false);

  const handleEdit = (field) => {
    setEditingField(field);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingField(null);
    setShowForm(true);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-8 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Administrative Fields</h2>
            <p className="text-sm text-slate-600 mt-1">Manage regional divisions and field assignments</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {showForm ? (
          <FieldForm
            initialData={editingField}
            unions={unions}
            onCancel={() => { setShowForm(false); setEditingField(null); }}
            onSave={async (data) => {
              const success = await onSave(data);
              if (success) {
                setShowForm(false);
                setEditingField(null);
              }
            }}
          />
        ) : (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                onClick={handleAddNew}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-md"
              >
                + Add New Field
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-3 text-left">Field Name</th>
                    <th className="px-4 py-3 text-left">Union / Division</th>
                    <th className="px-4 py-3 text-left">Location</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fields.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-slate-400 italic">No fields configured</td>
                    </tr>
                  ) : (
                    fields.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-slate-900">{f.name}</td>
                        <td className="px-4 py-3">
                          <div className="text-slate-700">{f.union_name || 'N/A'}</div>
                          <div className="text-[10px] text-slate-400">{f.division_name || 'N/A'}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{f.location || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(f)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => onDelete(f.id, f.name)}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FieldForm = ({ initialData, unions, onSave, onCancel }) => {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    union_id: '',
    area: '',
    location: '',
    phone: '',
    email: '',
    pobox: '',
    office_hours: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormGroup label="Field Name">
          <input
            name="name"
            placeholder="e.g., Central Rwanda Field"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
            required
          />
        </FormGroup>

        <FormGroup label="Union Association">
          <select
            name="union_id"
            value={formData.union_id}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
            required
          >
            <option value="">Select Union</option>
            {unions.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </FormGroup>

        <FormGroup label="Area / Region">
          <input
            name="area"
            placeholder="e.g., Kigali City"
            value={formData.area}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
          />
        </FormGroup>

        <FormGroup label="Physical Location">
          <input
            name="location"
            placeholder="Street address"
            value={formData.location}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
          />
        </FormGroup>

        <FormGroup label="Contact Phone">
          <input
            name="phone"
            type="tel"
            placeholder="+250..."
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
          />
        </FormGroup>

        <FormGroup label="Official Email">
          <input
            name="email"
            type="email"
            placeholder="field@church.rw"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
          />
        </FormGroup>

        <FormGroup label="P.O. Box">
          <input
            name="pobox"
            value={formData.pobox}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
          />
        </FormGroup>

        <FormGroup label="Office Hours">
          <input
            name="office_hours"
            placeholder="e.g., Mon-Fri 8:00 - 17:00"
            value={formData.office_hours}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
          />
        </FormGroup>
      </div>

      <div className="flex gap-3 pt-4 border-t border-slate-100">
        <button
          type="submit"
          className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition"
        >
          {initialData ? 'Update Field' : 'Create Field'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

const FormGroup = ({ label, children }) => (
  <div className="space-y-3">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{label}</label>
    {children}
  </div>
);

export default UserManagement;
