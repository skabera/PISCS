import React, { useState } from 'react';
import { Star, MessageSquare, X, CheckCircle2, ShieldCheck } from 'lucide-react';

const FeedbackModal = ({ invitation, user, token, onClose, onSuccess }) => {
  const isPreacher = user.role === 'preacher' || (user.role === 'pastor' && invitation.target_user_id === user.id);
  const isRequestingPastor = user.role === 'pastor' && invitation.requesting_pastor_id === user.id;
  const isAdmin = user.role === 'admin';

  const [preacherRating, setPreacherRating] = useState(invitation.preacher_rating || 0);
  const [preacherNote, setPreacherNote] = useState(invitation.preacher_experience_note || '');
  const [pastorComment, setPastorComment] = useState(invitation.pastor_return_comment || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const body = {};
    if (isPreacher || isAdmin) {
      body.preacher_rating = preacherRating;
      body.preacher_experience_note = preacherNote;
    }
    if (isRequestingPastor || isAdmin) {
      body.pastor_return_comment = pastorComment;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/invitations/${invitation.id}/feedback`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch (err) {
      console.error('Failed to save feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
      <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight uppercase">Mission Feedback</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Reference: PISCS-ARC-{invitation.id.toString().padStart(4, '0')}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        {/* Preacher Section */}
        {(isPreacher || isAdmin || invitation.preacher_experience_note) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Preacher's Evaluation</h3>
            </div>
            
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Location Rating (Church/District)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    disabled={!isPreacher && !isAdmin}
                    onClick={() => setPreacherRating(star)}
                    className={`p-2 rounded-xl transition-all ${preacherRating >= star ? 'text-amber-500 bg-amber-50 shadow-sm shadow-amber-100' : 'text-slate-300 bg-slate-50'}`}
                  >
                    <Star className={`w-6 h-6 ${preacherRating >= star ? 'fill-current' : ''}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Experience Note</label>
              <textarea
                value={preacherNote}
                onChange={(e) => setPreacherNote(e.target.value)}
                readOnly={!isPreacher && !isAdmin}
                placeholder="How was the reception? Any challenges or highlights?"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none min-h-[100px] resize-none"
              />
            </div>
          </div>
        )}

        {/* Pastor Section */}
        {(isRequestingPastor || isAdmin || invitation.pastor_return_comment) && (
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Congregational Feedback (Host Pastor)</h3>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Member Sentiment & Return Request</label>
              <textarea
                value={pastorComment}
                onChange={(e) => setPastorComment(e.target.value)}
                readOnly={!isRequestingPastor && !isAdmin}
                placeholder="How did the members feel? Do they want him back?"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none min-h-[100px] resize-none"
              />
            </div>
          </div>
        )}

        <div className="pt-4 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-8 py-4 border border-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
          >
            Cancel
          </button>
          {(isPreacher || isRequestingPastor || isAdmin) && (
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Feedback'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default FeedbackModal;
