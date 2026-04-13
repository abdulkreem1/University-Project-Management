import React, { useState, useEffect } from 'react';
import { fetchHodPending, hodReview } from '../api';
import './SupervisorReview.css'; /* reuse same styles */

export default function HodProposalReview({ onBack }) {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [reviewing, setReviewing] = useState(null);
  const [reason, setReason]       = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    fetchHodPending()
      .then((res) => setProposals(res.data))
      .catch(() => setError('Failed to load proposals.'))
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
      await hodReview(reviewing.id, {
        action: reviewing.action,
        rejection_reason: reason,
      });
      setProposals((prev) => prev.filter((p) => p.id !== reviewing.id));
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
        <h2>Student Proposals — Pending HoD Review</h2>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="sv-loading">Loading…</p>}

      {!loading && proposals.length === 0 && !error && (
        <div className="sv-empty">
          <span aria-hidden="true">✅</span>
          <p>No proposals pending your review.</p>
        </div>
      )}

      <div className="sv-list">
        {proposals.map((p) => (
          <div key={p.id} className="sv-card">
            <div className="sv-card-top">
              <div>
                <h3 className="sv-card-title">{p.title}</h3>
                <span className="sv-card-student">👤 {p.student_name}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="meta-tag">🏛 {p.department.replace(/_/g, ' ')}</span>
                <span className="meta-tag">👨‍🏫 {p.supervisor_name}</span>
              </div>
            </div>
            <p className="sv-card-desc">{p.description}</p>
            <div className="sv-card-actions">
              <button className="btn btn-primary" onClick={() => openReview(p.id, 'approve')}>
                ✅ Approve & Assign
              </button>
              <button className="btn btn-danger" onClick={() => openReview(p.id, 'reject')}>
                ❌ Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {reviewing && (
        <div className="sv-modal-overlay" role="dialog" aria-modal="true">
          <div className="sv-modal">
            <h3>{reviewing.action === 'approve' ? '✅ Approve & Assign' : '❌ Reject Proposal'}</h3>

            {reviewing.action === 'approve' && (
              <p className="sv-modal-note">
                Approving will assign this project to the student and automatically create a project application with status <strong>Accepted</strong>.
              </p>
            )}

            {reviewing.action === 'reject' && (
              <div className="form-group" style={{ marginTop: 16 }}>
                <label htmlFor="hod-reason">Rejection Reason <span aria-hidden="true">*</span></label>
                <textarea
                  id="hod-reason"
                  className="form-control"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this proposal is being rejected…"
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
