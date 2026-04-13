import React, { useEffect, useState } from 'react';
import { fetchMyIdeas } from '../api';
import './MyIdeas.css';

const STATUS_META = {
  pending_review: { label: 'Pending Review', icon: '⏳', cls: 'badge--pending' },
  approved:       { label: 'Approved',        icon: '✅', cls: 'badge--approved' },
  rejected:       { label: 'Rejected',        icon: '❌', cls: 'badge--rejected' },
};

export default function MyIdeas({ onBack, onSubmitNew }) {
  const [ideas, setIdeas]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetchMyIdeas()
      .then((res) => setIdeas(res.data))
      .catch(() => setError('Failed to load ideas. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    pending_review: ideas.filter((i) => i.status === 'pending_review').length,
    approved:       ideas.filter((i) => i.status === 'approved').length,
    rejected:       ideas.filter((i) => i.status === 'rejected').length,
  };

  return (
    <div className="my-ideas-wrap">
      {/* Header */}
      <div className="my-ideas-page-header">
        <button className="btn-back" onClick={onBack} aria-label="Back to dashboard">← Back</button>
        <h2>My Project Ideas</h2>
        <button className="btn btn-primary my-ideas-new-btn" onClick={onSubmitNew}>
          + Submit New Idea
        </button>
      </div>

      {/* Summary strip */}
      <div className="my-ideas-summary">
        <div className="summary-item summary-item--pending">
          <span className="summary-count">{counts.pending_review}</span>
          <span className="summary-label">Pending Review</span>
        </div>
        <div className="summary-item summary-item--approved">
          <span className="summary-count">{counts.approved}</span>
          <span className="summary-label">Approved</span>
        </div>
        <div className="summary-item summary-item--rejected">
          <span className="summary-count">{counts.rejected}</span>
          <span className="summary-label">Rejected</span>
        </div>
      </div>

      {/* Content */}
      {loading && <p className="my-ideas-loading">Loading…</p>}
      {error   && <div className="alert alert-error" role="alert">{error}</div>}

      {!loading && !error && ideas.length === 0 && (
        <div className="my-ideas-empty">
          <span aria-hidden="true">💡</span>
          <p>You haven't submitted any ideas yet.</p>
          <button className="btn btn-primary" onClick={onSubmitNew}>Submit Your First Idea</button>
        </div>
      )}

      {!loading && ideas.length > 0 && (
        <div className="my-ideas-list">
          {ideas.map((idea) => {
            const meta = STATUS_META[idea.status] || STATUS_META.pending_review;
            return (
              <div key={idea.id} className="idea-card">
                <div className="idea-card-top">
                  <div className="idea-card-title-row">
                    <h3 className="idea-card-title">{idea.title}</h3>
                    <span className={`status-badge ${meta.cls}`}>
                      {meta.icon} {meta.label}
                    </span>
                  </div>
                  <p className="idea-card-desc">{idea.description}</p>
                </div>
                <div className="idea-card-meta">
                  <span className="meta-tag">🏛 {idea.department.replace(/_/g, ' ')}</span>
                  <span className="meta-tag">👥 {idea.max_team_size} students</span>
                  {idea.required_skills && (
                    <span className="meta-tag">🛠 {idea.required_skills}</span>
                  )}
                  <span className="meta-tag meta-tag--date">
                    🗓 {new Date(idea.created_at).toLocaleDateString()}
                  </span>
                </div>
                {idea.status === 'rejected' && idea.rejection_reason && (
                  <div className="alert alert-error" style={{ margin: '8px 0 0' }}>
                    <strong>Rejection reason:</strong> {idea.rejection_reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
