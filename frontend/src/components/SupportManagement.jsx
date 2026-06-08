import React, { useState, useEffect } from 'react';
import { Send, LifeBuoy, MessageSquare, Clock, CheckCircle, AlertCircle, User, ChevronRight, Reply } from 'lucide-react';

const SupportManagement = ({ token, user }) => {
  const [requests, setRequests] = useState([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState({});
  const [submittingReply, setSubmittingReply] = useState({});
  const [activeFilter, setActiveFilter] = useState('all');

  const isAdmin = user.role === 'admin';

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const endpoint = isAdmin ? '/api/support' : '/api/support/my-requests';
    try {
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setRequests(data);
    } catch (err) {
      console.error('Error fetching support requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!subject || !message) return;

    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subject, message })
      });
      if (res.ok) {
        setSubject('');
        setMessage('');
        fetchRequests();
        alert('Support request submitted! Admins have been notified.');
      }
    } catch (err) {
      console.error('Error submitting request:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (requestId) => {
    const text = replyText[requestId];
    if (!text) return;

    setSubmittingReply({ ...submittingReply, [requestId]: true });
    try {
      const res = await fetch(`http://localhost:5000/api/support/${requestId}/reply`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ admin_reply: text })
      });
      if (res.ok) {
        setReplyText({ ...replyText, [requestId]: '' });
        fetchRequests();
      }
    } catch (err) {
      console.error('Error replying to request:', err);
    } finally {
      setSubmittingReply({ ...submittingReply, [requestId]: false });
    }
  };

  const filteredRequests = requests.filter(r => {
    if (activeFilter === 'all') return true;
    return r.status === activeFilter;
  });

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <LifeBuoy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">{isAdmin ? 'Support Management' : 'Help & Support'}</h2>
            <p className="text-sm text-slate-500">{isAdmin ? 'Manage and respond to personnel help requests.' : 'Get assistance from the administrative team.'}</p>
          </div>
        </div>
        
        {isAdmin && (
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {['all', 'pending', 'replied'].map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${activeFilter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden">
        {/* Left Column: Form (for users) or Stats (for admin) */}
        {!isAdmin && (
          <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                New Request
              </h3>
              <form onSubmit={handleSubmitRequest} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Briefly describe the issue"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows="5"
                    placeholder="Provide details about your request..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition resize-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : <><Send className="w-4 h-4" /> Send Request</>}
                </button>
              </form>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  <Clock className="w-4 h-4" />
                </div>
                <h4 className="font-black text-sm">Response Time</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Admins typically respond within 24 hours. You'll receive a notification as soon as your request is addressed.
              </p>
            </div>
          </div>
        )}

        {/* Right Column: History List */}
        <div className={`${isAdmin ? 'lg:col-span-12' : 'lg:col-span-8'} flex flex-col gap-4 overflow-y-auto pr-2`}>
          {loading && requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-slate-500 font-bold">Synchronizing requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl text-center px-6">
              <div className="bg-slate-50 p-6 rounded-full mb-4">
                <LifeBuoy className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-black">No support requests found</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                {isAdmin ? 'Excellent! There are no pending help tickets at the moment.' : 'Your history is clear. If you need help, use the form on the left.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 pb-8">
              {filteredRequests.map((req) => (
                <div key={req.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${req.status === 'replied' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                        {req.status === 'replied' ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${req.status === 'replied' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {req.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">
                            SUP-{req.id.toString().padStart(4, '0')}
                          </span>
                        </div>
                        <h4 className="text-lg font-black leading-tight">{req.subject}</h4>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-bold">
                            <Clock className="w-3 h-3" />
                            {new Date(req.created_at).toLocaleDateString('en-GB')}
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-1 text-[11px] text-blue-600 font-black uppercase tracking-tighter">
                              <User className="w-3 h-3" />
                              {req.user_name} ({req.role})
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-5 mb-5">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{req.message}</p>
                  </div>

                  {req.admin_reply ? (
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 relative">
                      <div className="absolute -top-3 left-6 px-3 py-1 bg-white border border-emerald-100 rounded-full flex items-center gap-2">
                        <Reply className="w-3 h-3 text-emerald-600 transform rotate-180" />
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Admin Feedback</span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed italic">{req.admin_reply}</p>
                      <div className="mt-3 flex items-center gap-2 text-[10px] text-emerald-600 font-bold ml-1">
                        <CheckCircle className="w-3 h-3" />
                        Resolved on {new Date(req.updated_at).toLocaleDateString('en-GB')}
                      </div>
                    </div>
                  ) : isAdmin ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <textarea
                          placeholder="Type your official response here..."
                          value={replyText[req.id] || ''}
                          onChange={(e) => setReplyText({ ...replyText, [req.id]: e.target.value })}
                          className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-sm focus:border-blue-400 focus:bg-white outline-none transition resize-none min-h-[100px]"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleReply(req.id)}
                          disabled={!replyText[req.id] || submittingReply[req.id]}
                          className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition active:scale-95 disabled:opacity-30 flex items-center gap-2"
                        >
                          {submittingReply[req.id] ? 'Sending...' : 'Submit Resolution'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
                      <AlertCircle className="w-4 h-4" />
                      <p className="text-xs font-bold uppercase tracking-widest">Waiting for administrative review</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportManagement;
