import React, { useState, useEffect } from 'react';
import { X, MapPin, Mail, Phone } from 'lucide-react';

const FieldManagement = ({ token, onNavigateToUsers }) => {
  const [fields, setFields] = useState([]);
  const [editingField, setEditingField] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    union_id: '',
    area: '',
    location: '',
    phone: '',
    email: '',
    pobox: '',
    office_hours: ''
  });
  const [subEntityType, setSubEntityType] = useState('churches');
  const [subEntitiesByType, setSubEntitiesByType] = useState({ districts: [], churches: [], health_centers: [] });
  const [editingSubEntity, setEditingSubEntity] = useState(null);
  const [subEntityForm, setSubEntityForm] = useState({ name: '', district_id: '', address: '', phone: '', status: 'active' });
  const [fieldSecretaries, setFieldSecretaries] = useState([]);
  const [secretariesLoading, setSecretariesLoading] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedDistrictChurches, setSelectedDistrictChurches] = useState([]);
  const [districtChurchesLoading, setDistrictChurchesLoading] = useState(false);
  const [selectedChurch, setSelectedChurch] = useState(null);
  const [selectedChurchPreachers, setSelectedChurchPreachers] = useState([]);
  const [churchPreachersLoading, setChurchPreachersLoading] = useState(false);
  const [fieldPastors, setFieldPastors] = useState([]);
  const [pastorsLoading, setPastorsLoading] = useState(false);

  const availablePastors = fieldPastors.filter(pastor => String(pastor.field_id) === String(editingField?.id));

  const fetchChurchesForDistrict = async (districtId) => {
    if (!districtId) {
      setSelectedDistrictChurches([]);
      return;
    }

    try {
      setDistrictChurchesLoading(true);
      const res = await fetch(`http://localhost:5000/api/churches?district_id=${districtId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        setSelectedDistrictChurches([]);
        return;
      }

      const data = await res.json();
      setSelectedDistrictChurches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching churches for district:', err);
      setSelectedDistrictChurches([]);
    } finally {
      setDistrictChurchesLoading(false);
    }
  };

  // Fetch fields with hierarchy info
  const fetchFields = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/fields', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setFields(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching fields:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, [token]);

  useEffect(() => {
    if (!editingField) {
      setSubEntitiesByType({ districts: [], churches: [], health_centers: [] });
      setEditingSubEntity(null);
      setSubEntityForm({ name: '', district_id: '', address: '', phone: '', status: 'active' });
      setFieldSecretaries([]);
      setSelectedDistrict(null);
      setSelectedDistrictChurches([]);
      setSelectedChurch(null);
      setSelectedChurchPreachers([]);
      setFieldPastors([]);
      return;
    }
    setSelectedDistrict(null);
    setSelectedDistrictChurches([]);
    setSelectedChurch(null);
    setSelectedChurchPreachers([]);

    const fetchSubEntitiesAndSecretaries = async () => {
      try {
        setSecretariesLoading(true);
        setPastorsLoading(true);

        const [districtRes, churchRes, healthRes, secretRes, pastorsRes] = await Promise.all([
          fetch(`http://localhost:5000/api/districts?field_id=${editingField.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`http://localhost:5000/api/churches?field_id=${editingField.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`http://localhost:5000/api/health-centers?field_id=${editingField.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`http://localhost:5000/api/fields/${editingField.id}/secretaries`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`http://localhost:5000/api/users?role=pastor&field_id=${editingField.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const [districts, churches, healthCenters, secretaries, pastors] = await Promise.all([
          districtRes.json(),
          churchRes.json(),
          healthRes.json(),
          secretRes.json(),
          pastorsRes.json()
        ]);

        setSubEntitiesByType({ 
          districts: Array.isArray(districts) ? districts : [],
          churches: Array.isArray(churches) ? churches : [], 
          health_centers: Array.isArray(healthCenters) ? healthCenters : [] 
        });
        setFieldSecretaries(Array.isArray(secretaries) ? secretaries : []);
        setFieldPastors(Array.isArray(pastors) ? pastors : []);
      } catch (err) {
        console.error('Error fetching sub-entities, secretaries, or pastors:', err);
      } finally {
        setSecretariesLoading(false);
        setPastorsLoading(false);
      }
    };

    fetchSubEntitiesAndSecretaries();
  }, [editingField, token]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFieldSelect = (e) => {
    const selectedField = fields.find(f => f.id === parseInt(e.target.value));
    if (selectedField) {
      setFormData({
        name: selectedField.name,
        union_id: selectedField.union_id || '',
        area: selectedField.area || '',
        location: selectedField.location || '',
        phone: selectedField.phone || '',
        email: selectedField.email || '',
        pobox: selectedField.pobox || '',
        office_hours: selectedField.office_hours || ''
      });
      setEditingField(selectedField);
    }
  };

  const handleSubEntityTypeChange = (type) => {
    setSubEntityType(type);
    setEditingSubEntity(null);
    setSubEntityForm({ name: '', district_id: '', address: '', phone: '', status: 'active' });
    setSelectedDistrict(null);
    setSelectedDistrictChurches([]);
  };

  const handleSubEntityInputChange = (e) => {
    const { name, value } = e.target;
    setSubEntityForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubEntitySelect = async (entity) => {
    setEditingSubEntity(entity);
    setSubEntityForm({
      name: entity.name || '',
      district_id: entity.district_id || '',
      address: entity.address || '',
      phone: entity.phone || '',
      status: entity.status || 'active'
    });

    if (subEntityType === 'districts') {
      setSelectedDistrict(entity);
      setSelectedChurch(null);
      setSelectedChurchPreachers([]);
      await fetchChurchesForDistrict(entity.id);
    } else if (subEntityType === 'churches') {
      setSelectedDistrict(null);
      setSelectedDistrictChurches([]);
      setSelectedChurch(entity);
      await fetchPreachersForChurch(entity.id);
    } else {
      setSelectedDistrict(null);
      setSelectedDistrictChurches([]);
      setSelectedChurch(null);
      setSelectedChurchPreachers([]);
    }
  };

  const handleDistrictPastorUpdate = async (districtId, pastorId) => {
    const normalizedPastorId = pastorId ? parseInt(pastorId, 10) : null;
    const previousPastorId = selectedDistrict?.pastor_id ? parseInt(selectedDistrict.pastor_id, 10) : null;

    try {
      const res = await fetch(`http://localhost:5000/api/districts/${districtId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pastor_id: normalizedPastorId })
      });

      if (!res.ok) {
        console.error('Failed to update district pastor');
        return;
      }

      // If a new pastor was selected, assign them to the district and field.
      if (normalizedPastorId && editingField?.id) {
        await fetch(`http://localhost:5000/api/users/${normalizedPastorId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ district_id: districtId, field_id: editingField.id })
        });
      }

      // If a different pastor was previously assigned, clear their district_id.
      if (previousPastorId && previousPastorId !== normalizedPastorId) {
        await fetch(`http://localhost:5000/api/users/${previousPastorId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ district_id: null })
        });
      }

      setSubEntitiesByType(prev => ({
        ...prev,
        districts: prev.districts.map(d => 
          d.id === districtId ? { ...d, pastor_id: normalizedPastorId } : d
        )
      }));

      if (selectedDistrict && selectedDistrict.id === districtId) {
        setSelectedDistrict(prev => ({ ...prev, pastor_id: normalizedPastorId }));
      }
    } catch (err) {
      console.error('Error updating district pastor:', err);
    }
  };

  const handleDistrictChurchSelect = async (church) => {
    setSelectedChurch(church);
    await fetchPreachersForChurch(church.id);
  };

  const fetchPreachersForChurch = async (churchId) => {
    if (!churchId) {
      setSelectedChurchPreachers([]);
      return;
    }

    try {
      setChurchPreachersLoading(true);
      const res = await fetch(`http://localhost:5000/api/directory/pastors?church_id=${churchId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        setSelectedChurchPreachers([]);
        return;
      }

      const data = await res.json();
      setSelectedChurchPreachers(Array.isArray(data) ? data.filter(u => u.role === 'preacher') : []);
    } catch (err) {
      console.error('Error fetching preachers for church:', err);
      setSelectedChurchPreachers([]);
    } finally {
      setChurchPreachersLoading(false);
    }
  };

  const resetSubEntityForm = () => {
    setEditingSubEntity(null);
    setSubEntityForm({ name: '', district_id: '', address: '', phone: '', status: 'active' });
  };

  const handleSubEntityDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;

    try {
      const endpoint = subEntityType === 'churches' ? 'churches' : 'health-centers';
      const res = await fetch(`http://localhost:5000/api/${endpoint}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Forbidden (you might need to sign in again)');
        }
        const text = await res.text();
        throw new Error(text || 'Failed to delete');
      }

      alert('Deleted successfully');
      resetSubEntityForm();
      // Reload list for this field
      const listRes = await fetch(`http://localhost:5000/api/${endpoint}?field_id=${editingField.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const listData = await listRes.json();
      setSubEntitiesByType(prev => ({ ...prev, [subEntityType]: Array.isArray(listData) ? listData : [] }));
      
      // If we deleted a district, we should probably also refresh churches to see updated linkage
      if (subEntityType === 'districts') {
        const churchRes = await fetch(`http://localhost:5000/api/churches?field_id=${editingField.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const churchData = await churchRes.json();
        setSubEntitiesByType(prev => ({ ...prev, churches: Array.isArray(churchData) ? churchData : [] }));

        if (selectedDistrict?.id === id) {
          setSelectedDistrict(null);
          setSelectedDistrictChurches([]);
        }
      }
    } catch (err) {
      alert('Error deleting item: ' + err.message);
    }
  };

  const handleSubEntitySave = async () => {
    if (!editingField) return;

    const endpoint = subEntityType === 'districts' ? 'districts' : (subEntityType === 'churches' ? 'churches' : 'health-centers');
    const method = editingSubEntity ? 'PUT' : 'POST';
    const url = editingSubEntity
      ? `http://localhost:5000/api/${endpoint}/${editingSubEntity.id}`
      : `http://localhost:5000/api/${endpoint}`;

    try {
      const payload = {
        ...subEntityForm,
        field_id: editingField.id
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Forbidden (you might need to sign in again)');
        }

        const text = await res.text();
        let errorMessage;

        try {
          const json = JSON.parse(text);
          errorMessage = json.error || json.message || JSON.stringify(json);
        } catch {
          errorMessage = text || res.statusText;
        }

        throw new Error(errorMessage || 'Failed to save');
      }

      alert('Saved successfully');
      resetSubEntityForm();

      const listRes = await fetch(`http://localhost:5000/api/${endpoint}?field_id=${editingField.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const listData = await listRes.json();
      setSubEntitiesByType(prev => ({ ...prev, [subEntityType]: Array.isArray(listData) ? listData : [] }));

      // If we saved a district or church, ensure hierarchy is synced
      if (subEntityType === 'districts' || subEntityType === 'churches') {
          const cRes = await fetch(`http://localhost:5000/api/churches?field_id=${editingField.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const cData = await cRes.json();
          const dRes = await fetch(`http://localhost:5000/api/districts?field_id=${editingField.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const dData = await dRes.json();
          setSubEntitiesByType(prev => ({ 
            ...prev, 
            churches: Array.isArray(cData) ? cData : [],
            districts: Array.isArray(dData) ? dData : []
          }));

          if (selectedDistrict) {
            await fetchChurchesForDistrict(selectedDistrict.id);
          }
      }
    } catch (err) {
      alert('Error saving item: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingField) {
      alert('Please select a field to edit');
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/fields/${editingField.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Failed to save field');

      alert('Field updated successfully');
      handleCancel();
      await fetchFields();
    } catch (err) {
      alert('Error saving field: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this field?')) return;

    try {
      const res = await fetch(`http://localhost:5000/api/fields/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to delete field');

      alert('Field deleted successfully');
      handleCancel();
      await fetchFields();
    } catch (err) {
      alert('Error deleting field: ' + err.message);
    }
  };

  const handleCancel = () => {
    setEditingField(null);
    setFormData({ name: '', union_id: '', area: '', location: '', phone: '', email: '', pobox: '', office_hours: '' });
    setSubEntityType('churches');
    setSubEntitiesByType({ churches: [], health_centers: [] });
    setSelectedDistrict(null);
    setSelectedDistrictChurches([]);
    setSelectedChurch(null);
    setSelectedChurchPreachers([]);
    resetSubEntityForm();
  };

  const currentSubEntities = subEntitiesByType[subEntityType] || [];

  if (loading) {
    return <div className="text-center py-8 text-slate-500">Loading fields...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">Manage Fields</h2>
        <p className="text-sm text-slate-500 mt-1">View and edit field/province information</p>
      </div>

      {/* Organizational Hierarchy Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="font-black text-sm uppercase tracking-wider text-blue-900 mb-3">Organizational Structure</h3>
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 flex-wrap">
          <span className="bg-white px-3 py-1 rounded-full border border-blue-300">General Conference</span>
          <span className="text-blue-400">↓</span>
          <span className="bg-white px-3 py-1 rounded-full border border-blue-300">Division</span>
          <span className="text-blue-400">↓</span>
          <span className="bg-white px-3 py-1 rounded-full border border-blue-300">Union</span>
          <span className="text-blue-400">↓</span>
          <span className="bg-white px-3 py-1 rounded-full border border-blue-300">Field</span>
          <span className="text-blue-400">↓</span>
          <span className="bg-white px-3 py-1 rounded-full border border-blue-300">District</span>
          <span className="text-blue-400">↓</span>
          <span className="bg-white px-3 py-1 rounded-full border border-blue-300">Churches</span>
        </div>
      </div>

      {/* Field Selection Dropdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          Select a Field to Edit
        </label>
        <select
          onChange={handleFieldSelect}
          value={editingField?.id || ''}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 font-medium"
        >
          <option value="">-- Choose a field --</option>
          {fields.map(field => (
            <option key={field.id} value={field.id}>
              {field.gc_name} / {field.division_name} / {field.union_name} / {field.name}
            </option>
          ))}
        </select>
      </div>

      {/* Edit Form */}
      {editingField && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black">Edit Field Details</h3>
              <div className="text-xs text-slate-500 mt-2 space-y-0.5">
                <p><strong>Organization:</strong> {editingField.gc_name}</p>
                <p><strong>Division:</strong> {editingField.division_name}</p>
                <p><strong>Union:</strong> {editingField.union_name}</p>
                <div className="mt-2">
                  <p className="font-semibold text-slate-700 text-xs mb-1">Field Secretary</p>
                  {secretariesLoading ? (
                    <p className="text-xs text-slate-500">Loading…</p>
                  ) : fieldSecretaries.length === 0 ? (
                    <div>
                      <p className="text-xs text-rose-600">No secretary assigned to this field. Please add one via the Users tab.</p>
                      {onNavigateToUsers && (
                        <button
                          type="button"
                          onClick={onNavigateToUsers}
                          className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Go to User Management
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <ul className="text-xs text-slate-600 list-disc list-inside space-y-0.5">
                        {fieldSecretaries.map((sec) => (
                          <li key={sec.id}>
                            {sec.name} ({sec.email})
                          </li>
                        ))}
                      </ul>
                      {onNavigateToUsers && (
                        <button
                          type="button"
                          onClick={onNavigateToUsers}
                          className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Manage Secretaries in Users
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="text-slate-400 hover:text-slate-600 transition"
              title="Clear selection"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Field Name (Read-only) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Field Name
              </label>
              <input
                type="text"
                value={formData.name}
                disabled
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed"
              />
            </div>

            {/* Area */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Area / Region
              </label>
              <input
                type="text"
                name="area"
                value={formData.area}
                onChange={handleInputChange}
                placeholder="e.g., Northern Region"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Location / Address
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Ruhengeri, Nyakinama, Musanze"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* P.O Box */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                P.O Box
              </label>
              <input
                type="text"
                name="pobox"
                value={formData.pobox}
                onChange={handleInputChange}
                placeholder="e.g., P.O Box 33 Musanze, Rwanda"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="e.g., +250788654321"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="e.g., info@nrf.rumadvantist.org"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Office Hours */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Office Hours
              </label>
              <textarea
                name="office_hours"
                value={formData.office_hours}
                onChange={handleInputChange}
                placeholder="e.g., Mon-Thu: 09:00 AM - 05:30 PM&#10;Fri: 09:00 AM - 01:30 PM&#10;Closed: Sunday, Saturday"
                rows="4"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handleDelete(editingField.id)}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition"
              >
                Delete Field
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg font-semibold hover:bg-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Save Changes
              </button>
            </div>
          </form>

          {/* Sub Entities */}
          <div className="mt-10 bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6 mb-4">
              <div>
                <h3 className="text-lg font-black">Sub Entities</h3>
                <p className="text-sm text-slate-500 mt-1">Select a sub-entity type and manage the associated congregations or health centers for this field.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSubEntityTypeChange('districts')}
                  className={`px-4 py-2 rounded-full border text-xs font-semibold transition ${subEntityType === 'districts' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                >
                  Districts ({subEntitiesByType.districts.length})
                </button>
                <button
                  type="button"
                  onClick={() => handleSubEntityTypeChange('churches')}
                  className={`px-4 py-2 rounded-full border text-xs font-semibold transition ${subEntityType === 'churches' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                >
                  Churches ({subEntitiesByType.churches.length})
                </button>
                <button
                  type="button"
                  onClick={() => handleSubEntityTypeChange('health_centers')}
                  className={`px-4 py-2 rounded-full border text-xs font-semibold transition ${subEntityType === 'health_centers' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                >
                  Medical ({subEntitiesByType.health_centers.length})
                </button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">List</h4>
                  <button
                    type="button"
                    onClick={resetSubEntityForm}
                    className="text-blue-600 text-xs font-semibold hover:underline"
                  >
                    + Add New
                  </button>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {currentSubEntities.length === 0 ? (
                    <p className="text-xs text-slate-500">No entries yet.</p>
                  ) : (
                    currentSubEntities.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSubEntitySelect(item)}
                        className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{item.name}</span>
                          {item.status && (
                            <span className={`text-xs font-semibold ${item.status === 'active' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {item.status}
                            </span>
                          )}
                        </div>
                        {(item.address || item.phone) && (
                          <div className="text-xs text-slate-500 mt-1">
                            {item.address && <span>{item.address}</span>}
                            {item.address && item.phone && <span className="mx-1">·</span>}
                            {item.phone && <span>{item.phone}</span>}
                          </div>
                        )}
                        {subEntityType === 'districts' && (
                          <div className="text-xs text-slate-500 mt-1">
                            Pastor: {item.pastor_id ? (fieldPastors.find(p => p.id === item.pastor_id)?.name || 'Unknown') : 'Not assigned'}
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>

                {selectedChurch && (
                  <div className="mt-4 bg-white border border-slate-200 rounded-xl p-4">
                    <h4 className="font-semibold mb-3">Preachers in {selectedChurch.name}</h4>
                    {churchPreachersLoading ? (
                      <p className="text-xs text-slate-500">Loading preachers…</p>
                    ) : selectedChurchPreachers.length === 0 ? (
                      <p className="text-xs text-slate-500">No preachers registered under this church.</p>
                    ) : (
                      <ul className="space-y-2 text-sm text-slate-700">
                        {selectedChurchPreachers.map(preacher => (
                          <li key={preacher.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="font-semibold">{preacher.name}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              {preacher.email}{preacher.phone ? ` · ${preacher.phone}` : ''}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {subEntityType === 'districts' && selectedDistrict && (
                  <>
                    <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <h4 className="font-semibold mb-3">Pastor in Charge of {selectedDistrict.name}</h4>
                      {pastorsLoading ? (
                        <p className="text-xs text-slate-500">Loading pastors…</p>
                      ) : (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700">Assign Pastor</label>
                          <select
                            value={selectedDistrict.pastor_id || ''}
                            onChange={(e) => handleDistrictPastorUpdate(selectedDistrict.id, e.target.value || null)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          >
                            <option value="">-- No Pastor Assigned --</option>
                            {availablePastors.map(pastor => (
                              <option key={pastor.id} value={pastor.id}>{pastor.name}</option>
                            ))}
                          </select>
                          {selectedDistrict.pastor_id && (
                            <p className="text-xs text-slate-500">
                              Current: {availablePastors.find(p => String(p.id) === String(selectedDistrict.pastor_id))?.name || fieldPastors.find(p => String(p.id) === String(selectedDistrict.pastor_id))?.name || 'Unknown'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <h4 className="font-semibold mb-3">Churches in {selectedDistrict.name}</h4>
                    {districtChurchesLoading ? (
                      <p className="text-xs text-slate-500">Loading churches…</p>
                    ) : selectedDistrictChurches.length === 0 ? (
                      <p className="text-xs text-slate-500">No churches registered under this district.</p>
                    ) : (
                      <ul className="space-y-2 text-sm text-slate-700">
                        {selectedDistrictChurches.map(church => (
                          <button
                            key={church.id}
                            type="button"
                            onClick={() => handleDistrictChurchSelect(church)}
                            className="w-full text-left rounded-xl border border-slate-200 bg-white p-3 hover:border-blue-300 hover:bg-blue-50 transition"
                          >
                            <div className="font-semibold">{church.name}</div>
                            {(church.address || church.phone) && (
                              <div className="text-xs text-slate-500 mt-1">
                                {church.address && <span>{church.address}</span>}
                                {church.address && church.phone && <span className="mx-1">·</span>}
                                {church.phone && <span>{church.phone}</span>}
                              </div>
                            )}
                          </button>
                        ))}
                      </ul>
                    )}
                  </div>
                  </>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h4 className="font-semibold mb-3">{editingSubEntity ? 'Edit Details' : 'New Entry'}</h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
                    <input
                      name="name"
                      value={subEntityForm.name}
                      onChange={handleSubEntityInputChange}
                      placeholder={subEntityType === 'churches' ? 'e.g. Kigali Central SDA Church' : 'e.g. Kigali Health Center'}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {subEntityType === 'churches' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">District</label>
                      <select
                        name="district_id"
                        value={subEntityForm.district_id}
                        onChange={handleSubEntityInputChange}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">-- No District (Directly in Field) --</option>
                        {subEntitiesByType.districts.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {subEntityType !== 'districts' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Address</label>
                      <input
                        name="address"
                        value={subEntityForm.address}
                        onChange={handleSubEntityInputChange}
                        placeholder="Physical address"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
                    <input
                      name="phone"
                      value={subEntityForm.phone}
                      onChange={handleSubEntityInputChange}
                      placeholder="e.g. +250788123456"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                    <select
                      name="status"
                      value={subEntityForm.status}
                      onChange={handleSubEntityInputChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  {editingSubEntity && (
                    <button
                      type="button"
                      onClick={() => handleSubEntityDelete(editingSubEntity.id)}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSubEntitySave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    {editingSubEntity ? 'Save' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fields Overview */}
      {!editingField && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Available Fields</h3>
          <div className="grid grid-cols-1 gap-3">
            {fields.map(field => (
              <div 
                key={field.id} 
                className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition cursor-pointer hover:border-blue-400"
                onClick={() => {
                  setFormData({
                    name: field.name,
                    union_id: field.union_id || '',
                    area: field.area || '',
                    location: field.location || '',
                    phone: field.phone || '',
                    email: field.email || '',
                    pobox: field.pobox || '',
                    office_hours: field.office_hours || ''
                  });
                  setEditingField(field);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-slate-400 uppercase mb-1">
                      {field.gc_name} / {field.division_name} / {field.union_name}
                    </div>
                    <h4 className="font-black text-slate-900 mb-2">{field.name}</h4>
                    {field.area && <p className="text-xs text-slate-500 mb-2">{field.area}</p>}
                    <div className="space-y-1 text-xs text-slate-600">
                      {field.location && <p className="flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" /> {field.location}</p>}
                      {field.phone && <p className="flex items-start gap-1"><Phone className="w-3 h-3 mt-0.5 flex-shrink-0" /> {field.phone}</p>}
                      {field.email && <p className="flex items-start gap-1"><Mail className="w-3 h-3 mt-0.5 flex-shrink-0" /> {field.email}</p>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldManagement;
