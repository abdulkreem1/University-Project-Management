import React, { useState, useEffect } from 'react';
import { fetchHodPendingApplications, hodReviewApplication, fetchResponseByApplication } from '../api';
import './SupervisorReview.css';

export default function HodApplicationReview({ onBack }) {
  const [apps, setApps]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [reviewing, setReviewing] = useState(null);
  const [reason, setReason]       = useState('');
  const [actionError, setActionError] = useState('');
  const [formResponses, setFormResponses] = useState({});
  const [expandedForm, setExpandedForm]   = useState(null);

  useEffect(() => {
    fetchHodPendingApplications()
      .then((res) => {
        setApps(res.data);
        res.data.forEach((app) => {
          fetchResponseByApplication(app.id)
            .then((r) => setFormResponses((prev) => ({ ...prev, [app.id]: r.data })))
            .catch(() => {});
        });
      })
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
        {apps.map((app) => {
          const resp = formResponses[app.id];
          const isExpanded = expandedForm === app.id;

          return (
            <div key={app.id} className="sv-card">
              <div className="sv-card-top">
                <div>
                  <h3 className="sv-card-title">{app.idea_title}</h3>
                  <span className="sv-card-student">👤 {app.student_name}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className="meta-tag">👨‍🏫 {app.doctor_name}</span>
                  <span className="meta-tag">👥 {app.team_size} student{app.team_size > 1 ? 's' : ''}</span>
                  <span className="meta-tag">🗓 {new Date(app.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Team members */}
              {app.invitations && app.invitations.length > 0 && (
                <div className="sv-team-row">
                  <span className="sv-team-label">Team:</span>
                  {app.invitations.map((inv) => (
                    <span key={inv.id} className={`sv-team-member sv-team-member--${inv.status}`}>
                      {inv.invitee_name}
                    </span>
                  ))}
                </div>
              )}

              {/* Dynamic form responses */}
              {resp && resp.field_responses && resp.field_responses.length > 0 && (
                <div className="sv-form-section">
                  <button
                    className="sv-form-toggle"
                    onClick={() => setExpandedForm(isExpanded ? null : app.id)}
                    aria-expanded={isExpanded}
                  >
                    📋 Department Form Responses
                    <span className="sv-form-toggle-arrow">{isExpanded ? '▲' : '▼'}</span>
                  </button>
                  {isExpanded && (
                    <div className="sv-form-responses">
                      {resp.field_responses.map((fr, idx) => (
                        <div key={idx} className="sv-form-field">
                          <span className="sv-form-field-label">{fr.field_label}</span>
                          <span className="sv-form-field-value">
                            {fr.value || <em className="sv-form-empty">—</em>}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="sv-card-actions">
                <button className="btn btn-primary" onClick={() => openReview(app.id, 'approve')}>✅ Register</button>
                <button className="btn btn-danger"  onClick={() => openReview(app.id, 'reject')}>❌ Reject</button>
              </div>
            </div>
          );
        })}
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
