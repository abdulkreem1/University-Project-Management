import React, { useState, useEffect } from 'react';
import { browseIdeas, applyOnIdea, fetchMyIdeaApplication, fetchMyProposal } from '../api';
import StudentSearch from './StudentSearch';
import './BrowseIdeas.css';

/* Premium SVG Icons */
const Icons = {
  Users: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  User: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Award: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
  Briefcase: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  Wrench: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  ArrowLeft: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Lock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Send: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  CheckCircle: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  Clock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
};

const STATUS_META = {
  awaiting_members: { label: 'Awaiting Members', icon: Icons.Users, cls: 'badge--hod' },
  pending_doctor:   { label: 'Pending Doctor',   icon: Icons.Clock, cls: 'badge--pending' },
  pending_hod:      { label: 'Pending HoD',      icon: Icons.Clock, cls: 'badge--hod' },
  registered:       { label: 'Registered',       icon: Icons.CheckCircle, cls: 'badge--approved' },
  rejected:         { label: 'Rejected',         icon: Icons.Lock,  cls: 'badge--rejected' },
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
    <div className="premium-dashboard browse-wrap">
      <header className="pd-header propose-header">
         <div className="pd-greeting-area">
            <button className="btn-back-modern" onClick={onBack}>
              {Icons.ArrowLeft} <span>Back to Overview</span>
            </button>
            <h1 className="pd-title">Browse Project Ideas</h1>
            <p className="pd-subtitle">Discover and apply for graduation projects proposed by faculty members.</p>
         </div>
      </header>

      {myApp && myApp.idea_title && (
        <div className="alert-strip alert-info-strip">
          <span className="alert-icon">{Icons.CheckCircle}</span>
          <span>
            You have an active application on <strong>"{myApp.idea_title}"</strong>
            <span className={`status-badge modern ${STATUS_META[myApp.status]?.cls} browse-inline-badge`}>
              {STATUS_META[myApp.status]?.label}
            </span>
          </span>
        </div>
      )}
      {myApp && myApp._type === 'proposal' && (
        <div className="alert-strip alert-info-strip">
          <span className="alert-icon">{Icons.Briefcase}</span>
          <span>You already have an active idea proposal. You cannot apply on another idea.</span>
        </div>
      )}

      {error && (
        <div className="alert-strip alert-error-strip">
           <span className="alert-icon">{Icons.Lock}</span>
           <span>{error}</span>
        </div>
      )}

      <div className="browse-filters modern-filters">
        <div className="filter-search-wrap">
          <span className="filter-icon">{Icons.Search}</span>
          <input type="text" className="form-control"
            placeholder="Search by title, doctor, or skills…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="select-wrapper browse-dept-select-wrap">
          <select className="form-control"
            value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p className="browse-loading">Loading projects…</p>}

      {!loading && filtered.length === 0 && !error && (
        <div className="browse-empty">
           <div className="empty-icon-wrap">{Icons.Search}</div>
           <p>No project ideas found matching your criteria.</p>
        </div>
      )}

      <div className="modern-projects-grid">
        {filtered.map((idea) => {
          const isApplied  = myApp && myApp.idea === idea.id;
          const isTaken    = idea.is_taken;
          const canApply   = !myApp && !isTaken;
          const team       = idea.registered_team;

          return (
            <div key={idea.id} className={`saas-project-card ${isTaken ? 'card-taken' : ''}`}>
              <div className="spc-header">
                <div className="spc-meta-top">
                  <span className="spc-department">{Icons.Briefcase} {idea.department.replace(/_/g, ' ')}</span>
                  {isTaken && <span className="spc-status-badge badge--rejected">Taken</span>}
                </div>
                <h3 className="spc-title">{idea.title}</h3>
                <p className="spc-desc">{idea.description}</p>
              </div>

              <div className="spc-body">
                <div className="spc-info-row">
                  <div className="spc-info-item">
                    {Icons.User} 
                    <div className="spc-info-text">
                      <span className="label">Supervisor</span>
                      <span className="value">{idea.doctor_name}</span>
                    </div>
                  </div>
                  <div className="spc-info-item">
                    {Icons.Users}
                    <div className="spc-info-text">
                      <span className="label">Team Size</span>
                      <span className="value">Max {idea.max_team_size}</span>
                    </div>
                  </div>
                </div>

                {idea.required_skills && (
                  <div className="spc-skills">
                    <span className="skill-icon">{Icons.Wrench}</span>
                    <span className="skill-text">{idea.required_skills}</span>
                  </div>
                )}
                
                {/* Registered team displayed identically inside the body if taken */}
                {isTaken && team && (
                  <div className="spc-registered-team">
                    <span className="rt-label">Registered Team</span>
                    <div className="rt-members">
                      <span className="rt-member hit-leader">{Icons.Award} {team.leader.name}</span>
                      {team.members.map((m) => (
                        <span key={m.username} className="rt-member">{Icons.User} {m.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="spc-footer">
                {isApplied ? (
                  <div className={`spc-status-btn ${STATUS_META[myApp.status]?.cls}`}>
                    {STATUS_META[myApp.status]?.icon} {STATUS_META[myApp.status]?.label}
                  </div>
                ) : isTaken ? (
                  <div className="spc-apply-btn btn-unavailable">
                    {Icons.Lock} Project Not Available
                  </div>
                ) : canApply ? (
                  <button className="spc-apply-btn btn-available outline" onClick={() => openApply(idea)}>
                    {Icons.Send} Apply for Project
                  </button>
                ) : (
                  <div className="spc-apply-btn btn-unavailable">
                    Not Available
                  </div>
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
            <h3>{Icons.Send} Apply: {applyModal.title}</h3>
            <p className="sv-modal-note">Max team size for this project: <strong>{applyModal.max_team_size}</strong></p>

            <form className="premium-form" style={{ marginTop: '20px' }}>
              <div className="form-group">
                <label htmlFor="team-size">Your Team Size</label>
                <div className="select-wrapper">
                  <select id="team-size" className="form-control"
                    value={applyForm.team_size}
                    onChange={(e) => handleTeamSizeChange(e.target.value)}>
                    {Array.from({ length: applyModal.max_team_size }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n} student{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {applyForm.member_ids.map((val, idx) => (
                <div className="form-group" key={idx}>
                  <label htmlFor={`member-${idx}`}>Team Member {idx + 2}</label>
                  <StudentSearch
                    id={`member-${idx}`}
                    value={val}
                    onChange={(username) => handleMemberChange(idx, username)}
                    placeholder="Search by student name or university ID…"
                  />
                </div>
              ))}
            </form>

            {applyError && (
              <div className="alert-strip alert-error-strip compact" style={{marginTop: '16px'}}>
                <span className="alert-icon">{Icons.Lock}</span>
                <span>{applyError}</span>
              </div>
            )}

            <div className="sv-modal-actions">
              <button className="btn btn-primary btn-submit-modern" onClick={handleApplySubmit} disabled={applying}>
                 <span>{applying ? 'Submitting…' : 'Confirm Application'}</span>
              </button>
              <button className="btn btn-outline" style={{padding: '14px 28px', borderRadius: '8px', fontWeight: 700}} onClick={() => setApplyModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
