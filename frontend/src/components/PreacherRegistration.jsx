import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, CheckCircle2, AlertCircle, Building, Phone, Mail, User, Lock, RefreshCw } from 'lucide-react';

const PreacherRegistration = ({ token, user: currentUser }) => {
  const [loading, setLoading] = useState(false);
  const [churches, setChurches] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'preacher',
    field_id: currentUser.field_id || '',
    district_id: currentUser.district_id || '',
    church_id: '',
    church_name: '',
    phone: '',
    specialty: ''
  });

  useEffect(() => {
    if (currentUser.district_id) {
      fetchChurches(currentUser.district_id);
      fetchDistrictInfo(currentUser.district_id);
    }
  }, [currentUser.district_id]);

  const fetchChurches = async (districtId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/churches?district_id=${districtId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setChurches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch churches:', err);
    }
  };

  const fetchDistrictInfo = async (districtId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/districts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const myDistrict = data.find(d => d.id == districtId);
      if (myDistrict) setDistricts([myDistrict]);
    } catch (err) {
        // Silently fail if districts can't be fetched
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
        if (name === 'church_id') {
            const selected = churches.find(c => c.id == value);
            return { ...prev, church_id: value, church_name: selected ? selected.name : '' };
        }
        return { ...prev, [name]: value };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!formData.church_id) {
      setError('Please select a church within your district');
      setLoading(false);
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
        setSuccess(`Success! Preacher ${formData.name} has been registered.`);
        setFormData({
          ...formData, // Keep district/field info
          name: '',
          email: '',
          password: '',
          church_id: '',
          church_name: '',
          phone: '',
          specialty: ''
        });
      } else {
        setError(data.error || 'Failed to register preacher');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Preacher Commissioning</h2>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Register a new preacher for your district</p>
            </div>
          </div>
          <Shield className="absolute -right-10 -bottom-10 w-48 h-48 text-slate-200/20 rotate-12" />
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-in bounce-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}
          
          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 text-sm font-bold animate-in bounce-in">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-l-4 border-blue-600 pl-3">Personal Information</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <User className="w-3 h-3 text-blue-600" /> Full Name
                  </label>
                  <input
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="E.g. John Doe"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none text-sm font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Mail className="w-3 h-3 text-blue-600" /> Professional Email
                  </label>
                  <input
                    required
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="preacher@piscs.org"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none text-sm font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Phone className="w-3 h-3 text-blue-600" /> Phone Number
                  </label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+250 78x xxx xxx"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none text-sm font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Lock className="w-3 h-3 text-blue-600" /> Initial Password
                  </label>
                  <input
                    required
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-l-4 border-emerald-500 pl-3">Ecclesiastical Assignment</h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Fixed Context</p>
                    <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Assigned Field</span>
                        <span className="text-sm font-black text-slate-900">{currentUser.field_name || 'Your Assigned Field'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Your Jurisdiction</span>
                        <span className="text-sm font-black text-slate-900">{currentUser.district_name || 'District Jurisdiction'}</span>
                    </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Building className="w-3 h-3 text-blue-600" /> Target Church / Station
                  </label>
                  <select
                    required
                    name="church_id"
                    value={formData.church_id}
                    onChange={handleInputChange}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none text-sm font-black text-slate-900 appearance-none"
                  >
                    <option value="">Choose a local church</option>
                    {churches.map(church => (
                      <option key={church.id} value={church.id}>{church.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Shield className="w-3 h-3 text-blue-600" /> Ministry Specialty
                  </label>
                  <input
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleInputChange}
                    placeholder="E.g. Youth Ministry, Health, Evangelism"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none text-sm font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="hidden sm:block">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-[200px]">
                    This action will grant system access to the new preacher.
                </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-12 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-black active:scale-95 transition-all shadow-xl shadow-slate-200 flex items-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Authorizing...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Finalize Registration
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      
      <div className="mt-8 p-6 bg-slate-100/50 rounded-3xl border border-slate-200 border-dashed text-center">
         <p className="text-xs text-slate-500 font-medium">
            New preachers will appear in the system directory immediately after commissioning. 
            They can log in with the provided email and initial password.
         </p>
      </div>
    </div>
  );
};

export default PreacherRegistration;
