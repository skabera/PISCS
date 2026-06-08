import React, { useState, useEffect } from 'react';
import { Search, MapPin, Award, Phone, Plus, X, User, AlertCircle } from 'lucide-react';
import InvitationForm from './InvitationForm';

const PastorDirectory = ({ user, token, allowInvitations = true }) => {
  const [pastors, setPastors] = useState([]);
  const [fields, setFields] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    field_id: '',
    district_id: '',
    specialty: ''
  });
  const [showRequestForm, setShowRequestForm] = useState(null);
  const [selectedPastor, setSelectedPastor] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, [token]);

  useEffect(() => {
    searchPastors();
  }, [filters, token]);

  const fetchInitialData = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/fields', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setFields(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch fields:', err);
    }
  };

  useEffect(() => {
    if (!filters.field_id) {
      setDistricts([]);
      return;
    }
    const fetchDistricts = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/districts?field_id=${filters.field_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setDistricts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch districts:', err);
      }
    };
    fetchDistricts();
  }, [filters.field_id, token]);

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (filters.field_id) params.append('field_id', filters.field_id);
    if (filters.district_id) params.append('district_id', filters.district_id);
    if (filters.specialty) params.append('specialty', filters.specialty);
    if (filters.search) params.append('search', filters.search);
    return params.toString() ? `?${params.toString()}` : '';
  };

  const searchPastors = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/directory/pastors${buildQueryString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setPastors(Array.isArray(data) ? data.filter(u => u.role === 'preacher') : []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvitationSuccess = () => {
    setShowRequestForm(null);
    alert('Invitation request submitted! Your secretary will review it.');
  };

  const getStatusBadge = (status) => {
    const s = status || 'available';
    switch (s) {
      case 'on-mission':
        return (
          <div className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-tighter border border-blue-100">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> On Mission
          </div>
        );
      case 'busy':
        return (
          <div className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-tighter border border-amber-100">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Busy
          </div>
        );
      case 'away':
        return (
          <div className="flex items-center gap-1.5 bg-rose-50 text-rose-600 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-tighter border border-rose-100">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Away
          </div>
        );
      case 'available':
      default:
        return (
          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-tighter border border-emerald-100">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Available
          </div>
        );
    }
  };

  const uniqueSpecialties = [...new Set(pastors.map(p => p.specialty).filter(Boolean))];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Preacher Directory</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Connect with regional leaders for cross-field mission coordination</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-100 p-8 space-y-6">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Search by name, church, district or specialty..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 shadow-inner"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={filters.field_id}
            onChange={(e) => setFilters({ ...filters, field_id: e.target.value, district_id: '' })}
            className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none text-sm font-bold text-slate-600 appearance-none cursor-pointer"
          >
            <option value="">All Fields</option>
            {fields.map((field) => (
              <option key={field.id} value={field.id}>{field.name}</option>
            ))}
          </select>

          <select
            value={filters.district_id}
            onChange={(e) => setFilters({ ...filters, district_id: e.target.value })}
            className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none text-sm font-bold text-slate-600 appearance-none cursor-pointer"
            disabled={!filters.field_id}
          >
            <option value="">All Districts</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            value={filters.specialty}
            onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}
            className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none text-sm font-bold text-slate-600 appearance-none cursor-pointer"
          >
            <option value="">All Specialties</option>
            {uniqueSpecialties.map((spec) => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="p-20 text-center animate-pulse">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Filtering Strategic Personnel...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pastors.length === 0 ? (
            <div className="col-span-full text-center py-32 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200">
              <User className="w-16 h-16 mx-auto text-slate-200 mb-6" />
              <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">No coordination targets identified</p>
            </div>
          ) : (
            pastors.map((pastor) => (
              <div
                key={pastor.id}
                className="bg-white rounded-[2.5rem] shadow-lg shadow-slate-100 border border-slate-100 p-8 hover:shadow-2xl hover:-translate-y-2 transition-all group relative overflow-hidden flex flex-col"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 group-hover:bg-blue-100 transition-colors" />

                <div className="relative flex-1 space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-blue-200 rotate-3 group-hover:rotate-0 transition-transform">
                      {pastor.name.charAt(0)}
                    </div>
                    {getStatusBadge(pastor.availability_status)}
                  </div>

                  <div>
                    <h3 className="font-black text-slate-900 text-xl leading-tight group-hover:text-blue-600 transition-colors">{pastor.name}</h3>
                    <div className="flex flex-col gap-1.5 mt-3">
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        <MapPin className="w-3.5 h-3.5 text-blue-500" />
                        {pastor.field_name}
                      </div>
                      {pastor.district_name && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest pl-1">
                          <span className="text-blue-300 font-black">↳</span> {pastor.district_name} District
                        </div>
                      )}
                      {pastor.display_church && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold uppercase tracking-widest pl-2">
                          <span className="text-blue-500 font-black">⛪</span> {pastor.display_church}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-xs text-slate-600 font-bold bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <Award className="w-4 h-4 text-blue-500" />
                      {pastor.specialty || 'General Ministry'}
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-50">
                  {allowInvitations ? (
                    <button
                      onClick={() => setShowRequestForm(pastor.id)}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-600 shadow-xl shadow-slate-200 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      <Plus className="w-4 h-4" /> Send Invitation
                    </button>
                  ) : (
                    <div className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 cursor-not-allowed">
                      <AlertCircle className="w-4 h-4" /> Invitations Disabled
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {allowInvitations && showRequestForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <InvitationForm
            user={user}
            token={token}
            targetPastor={pastors.find(p => p.id === showRequestForm)}
            onCancel={() => setShowRequestForm(null)}
            onSuccess={handleInvitationSuccess}
          />
        </div>
      )}
    </div>
  );
};

export default PastorDirectory;
