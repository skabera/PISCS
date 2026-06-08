import React, { useState } from 'react';
import { X, Send, AlertTriangle, ShieldCheck, Megaphone } from 'lucide-react';

const BroadcastModal = ({ token, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!title || !message) {
      setError('Please provide both a title and a detailed message.');
      return;
    }

    setSending(true);
    setError('');

    try {
      const res = await fetch('http://localhost:5000/api/notifications/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, message })
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        onSuccess();
      } else {
        setError(data.error || 'Failed to send broadcast');
      }
    } catch (err) {
      console.error('Broadcast failed:', err);
      setError('A system error occurred while dispatching the broadcast.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
      {/* Modal Header */}
      <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">System Broadcast</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Protocol: Global Alert Dispatch</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <form onSubmit={handleBroadcast} className="p-10 space-y-6">
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Administrator Clearance Required</p>
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Update Subject</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., System Maintenance Notification"
              className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message Content (Plain Text)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Detailed instructions or system update details..."
              rows={5}
              className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none resize-none"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-600 transition"
          >
            Cancel Protocol
          </button>
          <button
            type="submit"
            disabled={sending}
            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-xl shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>Dispatching Updates...</>
            ) : (
              <>
                <Send className="w-4 h-4" /> Finalize Dispatch
              </>
            )}
          </button>
        </div>

        <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-tighter max-w-[80%] mx-auto leading-relaxed">
          Warning: This action will trigger a persistent alert for every active user in the coordination system.
        </p>
      </form>
    </div>
  );
};

export default BroadcastModal;
