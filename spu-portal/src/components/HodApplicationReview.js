import React, { useState, useEffect } from 'react';
import { fetchHodPendingApplications, hodReviewApplication } from '../api';
import './SupervisorReview.css';

export default function HodApplicationReview({ onBack }) {
  const [apps, setApps]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [reviewing, setReviewing] = useState(null);
  const [reason, setReason]       = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    fetchHodPendingApplications()
      .then((res) => setApps(res.data))
      .catch(() => setError('Failed to load applications.'))
      .finally(() => setLoading(false));
  }, []);

  const openReview = (id, action) => { setReviewing({ id, action }); setReason(''); setActionError(''); };

  const handleConfirm = async () => {
    setActionError('');
    try {
      await hodReviewApplication(reviewing.id, { action: reviewing.action, rejection_reason: reason });
      setApps((prev) => prev.filter((a) => a.id !== reviewing.id));
      setReviewing(null);
    } catch (err) {
      const data = err.response?.data;
      setActionError(data?.rejection_reason?.[0] || data?.error || 'Something went wrong.');
    }
  };

  return (
    <div className="sv-wrap">
      <div className="sv-header">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h2>Student Applications — Pending HoD Approval</h2>
      </div>

      {error   && <div className="alert alert-error">{error}</div>}
      {loading && <p className="sv-loading">Loading…</p>}

      {!loading && apps.length === 0 && !error && (
        <div className="sv-empty"><span aria-hidden="true">✅</span><p>No pending applications.</p></div>
      )}

      <div className="sv-list">
        {apps.map((app) => (
          <div key={app.id} className="sv-card">
            <div className="sv-card-top">
              <div>
                <h3 className="sv-card-title">{app.idea_title}</h3>
                <span className="sv-card-student">👤 {app.student_name}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="meta-tag">👨‍🏫 {app.doctor_name}</span>
                <span className="meta-tag">🗓 {new Date(app.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="sv-card-actions">
              <button className="btn btn-primary" onClick={() => openReview(app.id, 'approve')}>✅ Register</button>
              <button className="btn btn-danger"  onClick={() => openReview(app.id, 'reject')}>❌ Reject</button>
            </div>
          </div>
        ))}
      </div>

      {reviewing && (
        <div className="sv-modal-overlay" role="dialog" aria-modal="true">
          <div className="sv-modal">
            <h3>{reviewing.action === 'approve' ? '✅ Register Project' : '❌ Reject Application'}</h3>
            {reviewing.action === 'approve' && (
              <p className="sv-modal-note">Approving will <strong>register</strong> this project for the student.</p>
            )}
            {reviewing.action === 'reject' && (
              <div className="form-group" style={{ marginTop: 16 }}>
                <label htmlFor="hod-app-reason">Rejection Reason <span aria-hidden="true">*</span></label>
                <textarea id="hod-app-reason" className="form-control" rows={3}
                  value={reason} onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why…" />
              </div>
            )}
            {actionError && <div className="alert alert-error">{actionError}</div>}
            <div className="sv-modal-actions">
              <button className={`btn ${reviewing.action === 'approve' ? 'btn-primary' : 'btn-danger'}`} onClick={handleConfirm}>Confirm</button>
              <button className="btn btn-outline" onClick={() => setReviewing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
