import React, { useState, useEffect } from 'react';
import logo from '../logo.jpeg';

const ProfileForm = ({ user, token, onSave, onCancel }) => {
  const isPreacher = user.role === 'preacher';
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email || '');
  const [password, setPassword] = useState(user.password || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [profilePic, setProfilePic] = useState(user.profile_pic || '');
  const [specialty, setSpecialty] = useState(user.specialty || '');
  const [churchId, setChurchId] = useState(user.church_id || '');
  const [churchName, setChurchName] = useState(user.church_name || '');
  const [districtId, setDistrictId] = useState(user.district_id || '');
  const [availabilityStatus, setAvailabilityStatus] = useState(user.availability_status || 'available');
  const [selectedLeaveDate, setSelectedLeaveDate] = useState('');
  const [selectedLeaveEndDate, setSelectedLeaveEndDate] = useState('');
  const [leaveDates, setLeaveDates] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [districts, setDistricts] = useState([]);
  const [churches, setChurches] = useState([]);
  const [districtLoading, setDistrictLoading] = useState(false);
  const [churchLoading, setChurchLoading] = useState(false);

  useEffect(() => {
    if (!token || !user.field_id) return;

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
        console.error('Failed to load districts:', err);
      } finally {
        setDistrictLoading(false);
      }
    };

    fetchDistricts();
  }, [token, user.field_id]);

  useEffect(() => {
    if (!token || !districtId) {
      setChurches([]);
      return;
    }

    const fetchChurches = async () => {
      setChurchLoading(true);
      try {
        const res = await fetch(`http://localhost:5000/api/churches?district_id=${districtId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setChurches(Array.isArray(data) ? data : []);
        } else {
          setChurches([]);
        }
      } catch (err) {
        console.error('Failed to load churches:', err);
        setChurches([]);
      } finally {
        setChurchLoading(false);
      }
    };

    fetchChurches();
  }, [token, districtId]);

  useEffect(() => {
    if (!token || (user.role !== 'preacher' && user.role !== 'pastor')) return;
    const route = user.role === 'preacher' ? 'preacher' : 'pastor';
    const fetchLeaveDates = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/${route}/leave-dates`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLeaveDates(Array.isArray(data) ? data.map(ld => ld.leave_date) : []);
        }
      } catch (err) {
        console.error('Failed to load leave dates:', err);
      }
    };
    fetchLeaveDates();
  }, [token, user.role]);

  const handleSubmit = (e) => {
    e.preventDefault();
    let leaveDatesToSave = leaveDates;

    if (statusRequiresLeave && selectedLeaveDate) {
      const datesToAdd = selectedLeaveEndDate
        ? getDateRange(selectedLeaveDate, selectedLeaveEndDate)
        : [selectedLeaveDate];
      leaveDatesToSave = Array.from(new Set([...leaveDates, ...datesToAdd])).sort();
      setLeaveDates(leaveDatesToSave);
    }

    onSave({ 
      ...user, 
      name, 
      email, 
      password, 
      phone, 
      profile_pic: profilePic, 
      specialty, 
      district_id: districtId || null,
      church_id: churchId || null,
      church_name: churchName || null, 
      availability_status: availabilityStatus,
      leave_dates: leaveDatesToSave
    });
  };

  const getDateRange = (start, end) => {
    const dates = [];
    let startDate = new Date(start);
    let endDate = new Date(end);
    if (startDate > endDate) {
      [startDate, endDate] = [endDate, startDate];
    }
    let current = new Date(startDate);
    while (current <= endDate) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const addLeaveDates = () => {
    if (!selectedLeaveDate) return;
    const datesToAdd = selectedLeaveEndDate ? getDateRange(selectedLeaveDate, selectedLeaveEndDate) : [selectedLeaveDate];
    const unique = Array.from(new Set([...leaveDates, ...datesToAdd]));
    unique.sort();
    setLeaveDates(unique);
    setSelectedLeaveDate('');
    setSelectedLeaveEndDate('');
  };

  const removeLeaveDate = (date) => {
    setLeaveDates(leaveDates.filter((d) => d !== date));
  };

  const statusRequiresLeave = availabilityStatus === 'busy' || availabilityStatus === 'away';

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 space-y-4"
    >
      {!isPreacher && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full overflow-hidden border border-slate-200">
            <img
              src={profilePic || user.profile_pic || logo}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="w-full">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upload profile picture</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setProfilePic(reader.result || '');
                reader.readAsDataURL(file);
              }}
              className="mt-2 w-full text-sm text-slate-600"
            />
            <button
              type="button"
              onClick={() => setProfilePic('')}
              className="mt-2 text-xs text-blue-600 hover:underline"
            >
              Remove picture
            </button>
          </div>
        </div>
      )}

      {isPreacher && (
        <div className="flex flex-col items-center gap-3 mb-4">
           <div className="w-20 h-20 rounded-full overflow-hidden border border-slate-200">
            <img
              src={user.profile_pic || logo}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">Preacher Authority Level</p>
        </div>
      )}

      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          readOnly={isPreacher}
          className={`mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 ${isPreacher ? 'bg-slate-50 cursor-not-allowed opacity-75' : ''}`}
          placeholder="Your name"
          required
        />
        {isPreacher && <p className="text-[9px] text-slate-400 mt-1 italic">Contact Administrator to update mission name</p>}
      </div>

      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          readOnly={isPreacher}
          className={`mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 ${isPreacher ? 'bg-slate-50 cursor-not-allowed opacity-75' : ''}`}
          placeholder="you@example.com"
          required
        />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 pr-12"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Telephone</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          readOnly={isPreacher}
          className={`mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 ${isPreacher ? 'bg-slate-50 cursor-not-allowed opacity-75' : ''}`}
          placeholder="+250 7XX XXX XXX"
        />
      </div>

      {(user.role === 'pastor' || user.role === 'preacher') && (
        <>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">District</label>
            {!user.field_id ? (
              <p className="text-[10px] text-amber-600 mt-1 mb-2 font-bold uppercase tracking-widest">⚠️ No field assigned</p>
            ) : districtLoading ? (
              <p className="text-xs text-slate-500 italic mt-2">Loading districts...</p>
            ) : (
              <select
                value={districtId}
                onChange={(e) => {
                  setDistrictId(e.target.value);
                  setChurchId('');
                  setChurchName('');
                }}
                disabled={isPreacher}
                className={`mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white ${isPreacher ? 'bg-slate-50 cursor-not-allowed opacity-75' : ''}`}
                required
              >
                <option value="">Select District</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Church / Station</label>
            {!districtId ? (
              <p className="text-[10px] text-slate-500 mt-1 mb-2 italic">Select a district first</p>
            ) : churchLoading ? (
              <p className="text-xs text-slate-500 italic mt-2">Loading churches...</p>
            ) : (
              <select
                value={churchId}
                onChange={(e) => {
                  const id = e.target.value;
                  setChurchId(id);
                  const selected = churches.find(c => String(c.id) === id);
                  setChurchName(selected ? selected.name : '');
                }}
                disabled={isPreacher}
                className={`mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white ${isPreacher ? 'bg-slate-50 cursor-not-allowed opacity-75' : ''}`}
                required
              >
                <option value="">Select your church</option>
                {churches.map((church) => (
                  <option key={church.id} value={church.id}>
                    {church.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </>
      )}

      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Specialty</label>
        <input
          type="text"
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          readOnly={isPreacher}
          className={`mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 ${isPreacher ? 'bg-slate-50 cursor-not-allowed opacity-75' : ''}`}
          placeholder="e.g. Youth Ministry, Evangelism"
        />
      </div>

      {(user.role === 'pastor' || user.role === 'preacher') && (
        <>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Availability Status</label>
            <select
              value={availabilityStatus}
              onChange={(e) => setAvailabilityStatus(e.target.value)}
              className={`mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white`}
            >
              <option value="available">Available for Missions</option>
              <option value="busy">Busy / Occupied</option>
              <option value="on-mission">On Active Mission</option>
              <option value="away">Away / On Leave</option>
            </select>
          </div>

          {(availabilityStatus === 'busy' || availabilityStatus === 'away') && (
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 mt-4">
              <h3 className="text-sm font-black text-slate-900 mb-3">Leave Date Selection</h3>
              <p className="text-xs text-slate-500 mb-4">Select one or more dates (or a date range) that correspond to your busy/away period. These dates will be added to your leave list.</p>

              <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block">Start Date</label>
                    <input
                      type="date"
                      value={selectedLeaveDate}
                      onChange={(e) => setSelectedLeaveDate(e.target.value)}
                      className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block">End Date</label>
                    <input
                      type="date"
                      value={selectedLeaveEndDate}
                      onChange={(e) => setSelectedLeaveEndDate(e.target.value)}
                      className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={addLeaveDates}
                      className="w-full py-3 rounded-xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition"
                    >
                      Add Dates
                    </button>
                  </div>
                </div>
              
              {leaveDates.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Selected Leave Dates</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {leaveDates.map((date) => (
                      <div key={date} className="bg-white rounded-2xl p-3 border border-slate-200 flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-slate-800">{new Date(date).toLocaleDateString()}</span>
                          <button
                            type="button"
                            onClick={() => removeLeaveDate(date)}
                            className="text-rose-500 text-xs font-black uppercase tracking-widest"
                          >Remove</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-bold text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
};

export default ProfileForm;
