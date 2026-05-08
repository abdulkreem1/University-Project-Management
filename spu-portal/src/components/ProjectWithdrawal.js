import React, { useEffect, useState } from 'react';
import { fetchMyBoard, fetchMyWithdrawalRequests, requestProjectWithdrawal } from '../api';
import './ProjectWithdrawal.css';

const getApiError = (err) => {
  const data = err.response?.data;
  return data?.details?.reason?.[0] || data?.error || 'Something went wrong.';
};

const STATUS_LABELS = {
  pending: 'Pending HoD review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default function ProjectWithdrawal({ onBack }) {
  const [board, setBoard] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([fetchMyBoard(), fetchMyWithdrawalRequests()])
      .then(([boardRes, withdrawalRes]) => {
        if (!active) return;
        setBoard(boardRes.data.has_project ? boardRes.data.board : null);
        setWithdrawals(withdrawalRes.data || []);
      })
      .catch(() => { if (active) setError('Failed to load withdrawal information.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const pendingWithdrawal = withdrawals.find((item) => item.status === 'pending');
  const canSubmit = Boolean(board) && !pendingWithdrawal && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError('Withdrawal reason is required.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await requestProjectWithdrawal(trimmedReason);
      setWithdrawals((prev) => [res.data, ...prev]);
      setReason('');
      setSuccess('Withdrawal request submitted. You can join or register another project only after HoD approval.');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="pw-loading">Loading withdrawal process...</div>;

  return (
    <div className="pw-wrap">
      <div className="pw-header">
        <button className="pw-back" onClick={onBack}>Back</button>
        <div>
          <h2>Project Withdrawal</h2>
          <p>Request HoD approval before leaving your current project.</p>
        </div>
      </div>

      {error && <div className="pw-alert pw-alert-error">{error}</div>}
      {success && <div className="pw-alert pw-alert-success">{success}</div>}

      <div className="pw-grid">
        <section className="pw-card pw-card-primary">
          <span className="pw-eyebrow">Current Project</span>
          {board ? (
            <>
              <h3>{board.title}</h3>
              <p>{board.members?.length || 0} active member{board.members?.length === 1 ? '' : 's'} on this board.</p>
              {pendingWithdrawal && (
                <div className="pw-status-note">
                  Your withdrawal request is pending. This project remains active until HoD approval.
                </div>
              )}
            </>
          ) : (
            <>
              <h3>No active project</h3>
              <p>You do not currently have a project that can be withdrawn from.</p>
            </>
          )}
        </section>

        <section className="pw-card">
          <span className="pw-eyebrow">Process</span>
          <ol className="pw-steps">
            <li>Submit a reason for leaving your current project.</li>
            <li>The Head of Department reviews your request.</li>
            <li>If approved, your old project no longer blocks new registration or invitations.</li>
          </ol>
        </section>
      </div>

      <section className="pw-card">
        <div className="pw-section-title">
          <div>
            <span className="pw-eyebrow">New Request</span>
            <h3>Submit Withdrawal Request</h3>
          </div>
          {pendingWithdrawal && <span className="pw-badge pw-badge-pending">Pending</span>}
        </div>

        <form onSubmit={handleSubmit} className="pw-form">
          <label htmlFor="withdrawal-reason">Reason for withdrawal</label>
          <textarea
            id="withdrawal-reason"
            rows={5}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why you need to withdraw from your current project..."
            disabled={!canSubmit}
          />
          {!board && <p className="pw-help">You need an active registered project before you can request withdrawal.</p>}
          {pendingWithdrawal && <p className="pw-help">You already have a pending request for this project.</p>}
          <button className="pw-submit" type="submit" disabled={!canSubmit}>
            {submitting ? 'Submitting...' : 'Submit for HoD Review'}
          </button>
        </form>
      </section>

      <section className="pw-card">
        <div className="pw-section-title">
          <div>
            <span className="pw-eyebrow">History</span>
            <h3>Withdrawal Requests</h3>
          </div>
        </div>

        {withdrawals.length === 0 ? (
          <p className="pw-empty">No withdrawal requests yet.</p>
        ) : (
          <div className="pw-history">
            {withdrawals.map((item) => (
              <article key={item.id} className="pw-history-item">
                <div className="pw-history-top">
                  <div>
                    <h4>{item.project_title}</h4>
                    <p>{new Date(item.created_at).toLocaleDateString()} - {item.department.replace(/_/g, ' ')}</p>
                  </div>
                  <span className={`pw-badge pw-badge-${item.status}`}>{STATUS_LABELS[item.status] || item.status}</span>
                </div>
                <p className="pw-reason">{item.reason}</p>
                {item.status === 'rejected' && item.rejection_reason && (
                  <p className="pw-review-note">Rejection reason: {item.rejection_reason}</p>
                )}
                {item.reviewed_at && (
                  <p className="pw-reviewed">Reviewed on {new Date(item.reviewed_at).toLocaleDateString()}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
