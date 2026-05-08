import React, { useState, useEffect } from 'react';
import { fetchHodPendingWithdrawals, hodReviewWithdrawal } from '../api';
import './SupervisorReview.css';

const getApiError = (err) => {
  const data = err.response?.data;
  return data?.details?.rejection_reason?.[0] || data?.error || 'Something went wrong.';
};

const projectTypeLabel = (type) => (
  type === 'student_proposal' ? 'Student proposal' : 'Doctor idea application'
);

export default function HodWithdrawalReview({ onBack }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewing, setReviewing] = useState(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let active = true;
    fetchHodPendingWithdrawals()
      .then((res) => { if (active) setRequests(res.data || []); })
      .catch(() => { if (active) setError('Failed to load withdrawal requests.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const openReview = (id, action) => {
    setReviewing({ id, action });
    setReason('');
    setActionError('');
  };

  const handleConfirm = async () => {
    if (!reviewing || confirming) return;
    if (reviewing.action === 'reject' && !reason.trim()) {
      setActionError('Rejection reason is required.');
      return;
    }

    setConfirming(true);
    setActionError('');
    try {
      await hodReviewWithdrawal(reviewing.id, {
        action: reviewing.action,
        rejection_reason: reason,
      });
      setRequests((prev) => prev.filter((item) => item.id !== reviewing.id));
      setReviewing(null);
    } catch (err) {
      setActionError(getApiError(err));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="sv-wrap">
      <div className="sv-header">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h2>Project Withdrawal Requests</h2>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="sv-loading">Loading...</p>}

      {!loading && requests.length === 0 && !error && (
        <div className="sv-empty"><p>No withdrawal requests pending your review.</p></div>
      )}

      <div className="sv-list">
        {requests.map((item) => (
          <div key={item.id} className="sv-card">
            <div className="sv-card-top">
              <div>
                <h3 className="sv-card-title">{item.project_title}</h3>
                <span className="sv-card-student">{item.student_name} ({item.student_username})</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="meta-tag">{projectTypeLabel(item.project_type)}</span>
                <span className="meta-tag">{item.department.replace(/_/g, ' ')}</span>
                <span className="meta-tag">{new Date(item.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="sv-form-section">
              <div className="sv-form-responses">
                <div className="sv-form-field">
                  <span className="sv-form-field-label">Student reason</span>
                  <span className="sv-form-field-value">{item.reason}</span>
                </div>
              </div>
            </div>

            <div className="sv-card-actions">
              <button className="btn btn-primary" onClick={() => openReview(item.id, 'approve')}>Approve Withdrawal</button>
              <button className="btn btn-danger" onClick={() => openReview(item.id, 'reject')}>Reject</button>
            </div>
          </div>
        ))}
      </div>

      {reviewing && (
        <div className="sv-modal-overlay" role="dialog" aria-modal="true">
          <div className="sv-modal">
            <h3>{reviewing.action === 'approve' ? 'Approve Withdrawal' : 'Reject Withdrawal'}</h3>
            {reviewing.action === 'approve' && (
              <p className="sv-modal-note">
                Approval removes this student from the old project board and allows them to join or register another project.
              </p>
            )}
            {reviewing.action === 'reject' && (
              <div className="form-group" style={{ marginTop: 16 }}>
                <label htmlFor="withdrawal-reject-reason">Rejection Reason <span aria-hidden="true">*</span></label>
                <textarea
                  id="withdrawal-reject-reason"
                  className="form-control"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this withdrawal request is rejected..."
                />
              </div>
            )}
            {actionError && <div className="alert alert-error">{actionError}</div>}
            <div className="sv-modal-actions">
              <button
                className={`btn ${reviewing.action === 'approve' ? 'btn-primary' : 'btn-danger'}`}
                onClick={handleConfirm}
                disabled={confirming}
              >
                {confirming ? 'Processing...' : 'Confirm'}
              </button>
              <button className="btn btn-outline" onClick={() => setReviewing(null)} disabled={confirming}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
