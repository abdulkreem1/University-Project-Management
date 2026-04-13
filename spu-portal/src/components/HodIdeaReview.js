import React, { useState, useEffect } from 'react';
import { fetchHodPendingDoctorIdeas, hodReviewDoctorIdea } from '../api';
import './SupervisorReview.css';

export default function HodIdeaReview({ onBack }) {
  const [ideas, setIdeas]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [reviewing, setReviewing] = useState(null); // { id, action }
  const [reason, setReason]       = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    fetchHodPendingDoctorIdeas()
      .then((res) => setIdeas(res.data))
      .catch(() => setError('Failed to load ideas.'))
      .finally(() => setLoading(false));
  }, []);

  const openReview = (id, action) => {
    setReviewing({ id, action });
    setReason('');
    setActionError('');
  };

  const handleConfirm = async () => {
    setActionError('');
    try {
      await hodReviewDoctorIdea(reviewing.id, {
        action: reviewing.action,
        rejection_reason: reason,
      });
      setIdeas((prev) => prev.filter((i) => i.id !== reviewing.id));
      setReviewing(null);
    } catch (err) {
      const data = err.response?.data;
      if (data?.rejection_reason) setActionError(data.rejection_reason[0]);
      else if (data?.error) setActionError(data.error);
      else setActionError('Something went wrong.');
    }
  };

  return (
    <div className="sv-wrap">
      <div className="sv-header">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h2>Doctor Project Ideas — Pending Your Review</h2>
      </div>

      {error   && <div className="alert alert-error">{error}</div>}
      {loading && <p className="sv-loading">Loading…</p>}

      {!loading && ideas.length === 0 && !error && (
        <div className="sv-empty">
          <span aria-hidden="true">✅</span>
          <p>No pending doctor ideas at the moment.</p>
        </div>
      )}

      <div className="sv-list">
        {ideas.map((idea) => (
          <div key={idea.id} className="sv-card">
            <div className="sv-card-top">
              <div>
                <h3 className="sv-card-title">{idea.title}</h3>
                <span className="sv-card-student">👨‍🏫 {idea.doctor_name}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="meta-tag">🏛 {idea.department.replace(/_/g, ' ')}</span>
                <span className="meta-tag">👥 {idea.max_team_size} students</span>
              </div>
            </div>

            <p className="sv-card-desc">{idea.description}</p>

            {idea.required_skills && (
              <span className="meta-tag">🛠 {idea.required_skills}</span>
            )}

            <div className="sv-card-actions">
              <button className="btn btn-primary" onClick={() => openReview(idea.id, 'approve')}>
                ✅ Approve
              </button>
              <button className="btn btn-danger" onClick={() => openReview(idea.id, 'reject')}>
                ❌ Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {reviewing && (
        <div className="sv-modal-overlay" role="dialog" aria-modal="true">
          <div className="sv-modal">
            <h3>{reviewing.action === 'approve' ? '✅ Approve Idea' : '❌ Reject Idea'}</h3>

            {reviewing.action === 'approve' && (
              <p className="sv-modal-note">
                This idea will be marked as <strong>Approved</strong> and become available for student applications.
              </p>
            )}

            {reviewing.action === 'reject' && (
              <div className="form-group" style={{ marginTop: 16 }}>
                <label htmlFor="hod-idea-reason">Rejection Reason <span aria-hidden="true">*</span></label>
                <textarea
                  id="hod-idea-reason"
                  className="form-control"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this idea is being rejected…"
                />
              </div>
            )}

            {actionError && <div className="alert alert-error">{actionError}</div>}

            <div className="sv-modal-actions">
              <button
                className={`btn ${reviewing.action === 'approve' ? 'btn-primary' : 'btn-danger'}`}
                onClick={handleConfirm}
              >
                Confirm
              </button>
              <button className="btn btn-outline" onClick={() => setReviewing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
