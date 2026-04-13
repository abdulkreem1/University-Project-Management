// BrowseIdeas v2 — with team member invitations
import React, { useState, useEffect } from 'react';
import { browseIdeas, applyOnIdea, fetchMyIdeaApplication, fetchMyProposal } from '../api';
import StudentSearch from './StudentSearch';
import './BrowseIdeas.css';

const STATUS_META = {
  awaiting_members: { label: 'Awaiting Member Confirmation', icon: '👥', cls: 'badge--hod' },
  pending_doctor:   { label: 'Pending Doctor Approval',      icon: '⏳', cls: 'badge--pending' },
  pending_hod:      { label: 'Pending HoD Approval',         icon: '🔄', cls: 'badge--hod' },
  registered:       { label: 'Registered',                   icon: '✅', cls: 'badge--approved' },
  rejected:         { label: 'Rejected',                     icon: '❌', cls: 'badge--rejected' },
};

const EMPTY_APPLY = { team_size: 1, member_ids: [] };

export default function BrowseIdeas({ onBack }) {
  const [ideas, setIdeas]           = useState([]);
  const [myApp, setMyApp]           = useState(undefined);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [applyModal, setApplyModal] = useState(null);
  const [applyForm, setApplyForm]   = useState(EMPTY_APPLY);
  const [applying, setApplying]     = useState(false);
  const [applyError, setApplyError] = useState('');
  const [search, setSearch]         = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  useEffect(() => {
    Promise.all([browseIdeas(), fetchMyIdeaApplication(), fetchMyProposal()])
      .then(([ideasRes, appRes, propRes]) => {
        setIdeas(ideasRes.data);
        if (appRes.data && ['awaiting_members', 'pending_doctor', 'pending_hod', 'registered'].includes(appRes.data.status)) {
          setMyApp(appRes.data);
        } else if (propRes.data && ['pending_supervisor', 'pending_hod', 'assigned'].includes(propRes.data.status)) {
          setMyApp({ _type: 'proposal', status: propRes.data.status });
        } else {
          setMyApp(null);
        }
      })
      .catch(() => setError('Failed to load ideas.'))
      .finally(() => setLoading(false));
  }, []);

  const openApply = (idea) => {
    setApplyModal(idea);
    setApplyForm({ team_size: 1, member_ids: [] });
    setApplyError('');
  };

  const handleTeamSizeChange = (size) => {
    const s = Number(size);
    setApplyForm({ team_size: s, member_ids: Array(s - 1).fill('') });
  };

  const handleMemberChange = (idx, val) => {
    setApplyForm((prev) => {
      const ids = [...prev.member_ids];
      ids[idx] = val;
      return { ...prev, member_ids: ids };
    });
  };

  const handleApplySubmit = async () => {
    setApplyError('');
    setApplying(true);
    try {
      const res = await applyOnIdea(applyModal.id, {
        team_size: applyForm.team_size,
        member_ids: applyForm.member_ids.filter(Boolean),
      });
      setMyApp(res.data);
      setApplyModal(null);
    } catch (err) {
      const data = err.response?.data;
      setApplyError(data?.error || 'Failed to apply. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  const filtered = ideas.filter((i) => {
    const matchSearch = !search ||
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.doctor_name.toLowerCase().includes(search.toLowerCase()) ||
      (i.required_skills || '').toLowerCase().includes(search.toLowerCase());
    const matchDept = !deptFilter || i.department === deptFilter;
    return matchSearch && matchDept;
  });

  const departments = [...new Set(ideas.map((i) => i.department))];

  return (
    <div className="browse-wrap">
      <div className="browse-header">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h2>Browse Project Ideas</h2>
      </div>

      {myApp && myApp.idea_title && (
        <div className="alert alert-info">
          You have an active application on <strong>"{myApp.idea_title}"</strong> —{' '}
          <span className={`status-badge ${STATUS_META[myApp.status]?.cls} browse-inline-badge`}>
            {STATUS_META[myApp.status]?.icon} {STATUS_META[myApp.status]?.label}
          </span>
        </div>
      )}
      {myApp && myApp._type === 'proposal' && (
        <div className="alert alert-info">
          You already have an active idea proposal. You cannot apply on another idea.
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <div className="browse-filters">
        <input type="text" className="form-control"
          placeholder="🔍 Search by title, doctor, or skills…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="form-control browse-dept-select"
          value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {loading && <p className="browse-loading">Loading…</p>}

      {!loading && filtered.length === 0 && !error && (
        <div className="browse-empty">
          <span aria-hidden="true">🔍</span>
          <p>No ideas found matching your search.</p>
        </div>
      )}

      <div className="browse-grid">
        {filtered.map((idea) => {
          const isApplied  = myApp && myApp.idea === idea.id;
          const isTaken    = idea.is_taken;
          const canApply   = !myApp && !isTaken;
          const team       = idea.registered_team;
          return (
            <div key={idea.id} className={`browse-card ${isTaken ? 'browse-card--taken' : ''}`}>
              <div className="browse-card-top">
                <h3 className="browse-card-title">{idea.title}</h3>
                <div className="browse-card-tags">
                  <span className="meta-tag">🏛 {idea.department.replace(/_/g, ' ')}</span>
                  <span className="meta-tag">👥 Max {idea.max_team_size}</span>
                  {isTaken && <span className="status-badge badge--rejected">🔒 Taken</span>}
                </div>
              </div>
              <p className="browse-card-desc">{idea.description}</p>

              {/* Registered team */}
              {isTaken && team && (
                <div className="browse-team">
                  <span className="browse-team-label">Registered team:</span>
                  <span className="browse-team-member">👑 {team.leader.name} ({team.leader.username})</span>
                  {team.members.map((m) => (
                    <span key={m.username} className="browse-team-member">👤 {m.name} ({m.username})</span>
                  ))}
                </div>
              )}

              <div className="browse-card-footer">
                <div className="browse-card-meta">
                  <span className="browse-doctor">👨‍🏫 {idea.doctor_name}</span>
                  {idea.required_skills && <span className="meta-tag">🛠 {idea.required_skills}</span>}
                </div>
                {isApplied ? (
                  <span className={`status-badge ${STATUS_META[myApp.status]?.cls}`}>
                    {STATUS_META[myApp.status]?.icon} {STATUS_META[myApp.status]?.label}
                  </span>
                ) : isTaken ? (
                  <span className="browse-unavailable">🔒 Already taken</span>
                ) : canApply ? (
                  <button className="btn btn-primary browse-apply-btn" onClick={() => openApply(idea)}>
                    📩 Apply
                  </button>
                ) : (
                  <span className="browse-unavailable">Not available</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Apply modal */}
      {applyModal && (
        <div className="sv-modal-overlay" role="dialog" aria-modal="true">
          <div className="sv-modal">
            <h3>📩 Apply: {applyModal.title}</h3>
            <p className="sv-modal-note">Max team size: <strong>{applyModal.max_team_size}</strong></p>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label htmlFor="team-size">Team Size</label>
              <select id="team-size" className="form-control"
                value={applyForm.team_size}
                onChange={(e) => handleTeamSizeChange(e.target.value)}>
                {Array.from({ length: applyModal.max_team_size }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n} student{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>

            {applyForm.member_ids.map((val, idx) => (
              <div className="form-group" key={idx}>
                <label htmlFor={`member-${idx}`}>Member {idx + 2} — Search by name or ID</label>
                <StudentSearch
                  id={`member-${idx}`}
                  value={val}
                  onChange={(username) => handleMemberChange(idx, username)}
                  placeholder="Type name or university ID…"
                />
              </div>
            ))}

            {applyError && <div className="alert alert-error">{applyError}</div>}

            <div className="sv-modal-actions">
              <button className="btn btn-primary" onClick={handleApplySubmit} disabled={applying}>
                {applying ? 'Submitting…' : 'Confirm Application'}
              </button>
              <button className="btn btn-outline" onClick={() => setApplyModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
