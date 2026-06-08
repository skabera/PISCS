import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Users, CheckCircle, XCircle, Clock } from 'lucide-react';

const PreacherAvailability = ({ token, compact = false }) => {
    const today = new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(today);
    const [preachers, setPreachers] = useState([]);
    const [leaveDates, setLeaveDates] = useState({});
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // 'all' | 'available' | 'unavailable'

    const h = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        setLoading(true);
        Promise.all([
            // ── FIX: was /api/users?role=preacher (admin-only).
            // Now uses /api/preachers which allows pastor + admin.
            fetch('http://localhost:5000/api/preachers', { headers: h }).then(r => r.json()),
            fetch('http://localhost:5000/api/invitations', { headers: h }).then(r => r.json()),
        ])
            .then(([users, invs]) => {
                const ps = Array.isArray(users) ? users : [];
                const allInvs = Array.isArray(invs) ? invs : [];
                setPreachers(ps);
                setInvitations(allInvs);

                // Fetch leave dates for every preacher in parallel
                return Promise.all(
                    ps.map(p =>
                        fetch(`http://localhost:5000/api/pastor/leave-dates?user_id=${p.id}`, { headers: h })
                            .then(r => r.json())
                            .then(rows => ({
                                id: p.id,
                                dates: Array.isArray(rows) ? rows.map(r => r.leave_date) : [],
                            }))
                            .catch(() => ({ id: p.id, dates: [] }))
                    )
                );
            })
            .then(results => {
                const map = {};
                results.forEach(({ id, dates }) => { map[id] = dates; });
                setLeaveDates(map);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [token]);

    const getStatus = (preacher) => {
        const leaves = leaveDates[preacher.id] || [];
        if (leaves.includes(date)) {
            return { type: 'leave', label: 'On leave', badgeCls: 'bg-red-50 text-red-700 border border-red-100', borderCls: 'border-l-red-400' };
        }

        const busy = invitations.find(inv => {
            if (inv.target_user_id !== preacher.id) return false;
            if (['rejected', 'cancelled'].includes(inv.status)) return false;
            const start = inv.service_date;
            const end = inv.service_end_date || inv.service_date;
            return start <= date && end >= date;
        });

        if (busy) {
            const label = busy.status === 'approved' ? 'Approved mission'
                : busy.status === 'pending_preacher_confirmation' ? 'Pending confirmation'
                    : 'Has mission';
            return { type: 'conflict', label, badgeCls: 'bg-amber-50 text-amber-700 border border-amber-100', borderCls: 'border-l-amber-400', detail: `Ref #${String(busy.id).padStart(4, '0')}` };
        }

        return { type: 'available', label: 'Available', badgeCls: 'bg-emerald-50 text-emerald-700 border border-emerald-100', borderCls: 'border-l-emerald-400' };
    };

    const enriched = useMemo(() => preachers.map(p => ({ ...p, status: getStatus(p) })), [preachers, leaveDates, invitations, date]);

    const filtered = useMemo(() => enriched.filter(p => {
        const s = search.toLowerCase();
        const matchSearch = !s || p.name?.toLowerCase().includes(s) || p.specialty?.toLowerCase().includes(s) || p.church_name?.toLowerCase().includes(s);
        const matchFilter = filter === 'all' || (filter === 'available' && p.status.type === 'available') || (filter === 'unavailable' && p.status.type !== 'available');
        return matchSearch && matchFilter;
    }), [enriched, search, filter]);

    const availCount = enriched.filter(p => p.status.type === 'available').length;
    const leaveCount = enriched.filter(p => p.status.type === 'leave').length;
    const conflictCount = enriched.filter(p => p.status.type === 'conflict').length;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-500" />
                        Preacher Availability
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Check who is free on any date</p>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                    />
                </div>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-3 gap-3">
                <button
                    onClick={() => setFilter(filter === 'available' ? 'all' : 'available')}
                    className={`rounded-xl p-3 text-center border transition-all ${filter === 'available' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-100 bg-slate-50 hover:bg-emerald-50/50'}`}
                >
                    <p className="text-2xl font-black text-emerald-600">{availCount}</p>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5 flex items-center justify-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-400" /> Available
                    </p>
                </button>
                <button
                    onClick={() => setFilter(filter === 'unavailable' ? 'all' : 'unavailable')}
                    className={`rounded-xl p-3 text-center border transition-all ${filter === 'unavailable' ? 'border-red-300 bg-red-50' : 'border-slate-100 bg-slate-50 hover:bg-red-50/50'}`}
                >
                    <p className="text-2xl font-black text-red-500">{leaveCount + conflictCount}</p>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5 flex items-center justify-center gap-1">
                        <XCircle className="w-3 h-3 text-red-400" /> Unavailable
                    </p>
                </button>
                <div className="rounded-xl p-3 text-center border border-slate-100 bg-slate-50">
                    <p className="text-2xl font-black text-slate-700">{enriched.length}</p>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5 flex items-center justify-center gap-1">
                        <Users className="w-3 h-3" /> Total
                    </p>
                </div>
            </div>

            {/* Search */}
            <input
                type="text"
                placeholder="Search by name, specialty, church…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />

            {/* Grid */}
            {loading ? (
                <div className="py-10 text-center">
                    <Clock className="w-6 h-6 text-slate-300 mx-auto mb-2 animate-spin" />
                    <p className="text-xs text-slate-400">Loading preachers…</p>
                </div>
            ) : filtered.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8 bg-slate-50 rounded-xl">No preachers match your search.</p>
            ) : (
                <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} max-h-80 overflow-y-auto pr-0.5`}>
                    {filtered.map(p => (
                        <div
                            key={p.id}
                            className={`bg-white border border-slate-100 border-l-4 ${p.status.borderCls} rounded-xl p-3.5 space-y-1.5 hover:shadow-sm transition-shadow`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                                    {p.church_name && <p className="text-[11px] text-slate-400 truncate">{p.church_name}</p>}
                                    {p.specialty && <p className="text-[11px] text-slate-400 truncate">{p.specialty}</p>}
                                </div>
                                <div className="flex-shrink-0 text-right">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status.badgeCls}`}>
                                        {p.status.label}
                                    </span>
                                    {p.status.detail && <p className="text-[10px] text-slate-400 mt-1">{p.status.detail}</p>}
                                </div>
                            </div>
                            {p.phone && <p className="text-[10px] text-slate-400">📞 {p.phone}</p>}
                        </div>
                    ))}
                </div>
            )}

            {/* Legend */}
            <div className="flex gap-4 pt-1 border-t border-slate-100">
                {[
                    { color: 'bg-emerald-400', label: 'Available' },
                    { color: 'bg-red-400', label: 'On leave' },
                    { color: 'bg-amber-400', label: 'Has mission' },
                ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${l.color}`} />
                        <span className="text-[10px] text-slate-400 font-semibold">{l.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PreacherAvailability;