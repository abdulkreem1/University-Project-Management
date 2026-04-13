import React, { useState, useEffect } from 'react';
import { submitStudentProposal, fetchMyProposal, fetchDoctorsList } from '../api';
import StudentSearch from './StudentSearch';
import './ProposeIdea.css';

const DEPARTMENTS = [
  { value: 'software_engineering',    label: 'Software Engineering' },
  { value: 'artificial_intelligence', label: 'Artificial Intelligence' },
  { value: 'information_security',    label: 'Information Security' },
  { value: 'communications',          label: 'Communications' },
  { value: 'control_robotics',        label: 'Control & Robotics' },
];

const STATUS_META = {
  awaiting_members:   { label: 'Awaiting Member Confirmation', icon: '👥', cls: 'badge--hod' },
  pending_supervisor: { label: 'Pending Supervisor Approval',  icon: '⏳', cls: 'badge--pending' },
  pending_hod:        { label: 'Pending HoD Review',           icon: '🔄', cls: 'badge--hod' },
  assigned:           { label: 'Assigned',                     icon: '✅', cls: 'badge--approved' },
  rejected:           { label: 'Rejected',                     icon: '❌', cls: 'badge--rejected' },
};

const EMPTY = { title: '', description: '', department: '', supervisor: '',
                team_size: 2, team_size_reason: '', member_ids: [''] };

export default function ProposeIdea({ onBack }) {
  const [existing, setExisting]     = useState(undefined);
  const [doctors, setDoctors]       = useState([]);
  const [form, setForm]             = useState(EMPTY);
  const [loading, setLoading]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMyProposal(), fetchDoctorsList()])
      .then(([propRes, docRes]) => {
        setExisting(propRes.data || null);
        setDoctors(docRes.data);
      })
      .catch(() => setError('Failed to load data. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTeamSizeChange = (size) => {
    const s = Number(size);
    // Standard sizes 2-3 need member fields; others just need a reason
    const memberCount = (s >= 2 && s <= 3) ? s - 1 : 0;
    setForm((prev) => ({
      ...prev,
      team_size: s,
      member_ids: Array(memberCount).fill(''),
      team_size_reason: (s < 2 || s > 3) ? prev.team_size_reason : '',
    }));
  };

  const handleMemberChange = (idx, val) => {
    setForm((prev) => {
      const ids = [...prev.member_ids];
      ids[idx] = val;
      return { ...prev, member_ids: ids };
    });
  };

  const needsReason = form.team_size < 2 || form.team_size > 3;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await submitStudentProposal({
        title:            form.title,
        description:      form.description,
        department:       form.department,
        supervisor:       Number(form.supervisor),
        team_size:        Number(form.team_size),
        team_size_reason: form.team_size_reason,
        member_ids:       form.member_ids.filter(Boolean),
      });
      setExisting(res.data.proposal);
    } catch (err) {
      const data = err.response?.data;
      if (data?.error) setError(data.error);
      else if (data && typeof data === 'object') setError(Object.values(data).flat().join(' '));
      else setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="propose-wrap">
        <div className="propose-page-header">
          <button className="btn-back" onClick={onBack}>← Back</button>
          <h2>My Project Proposal</h2>
        </div>
        <p className="propose-loading">Loading…</p>
      </div>
    );
  }

  // ── Already has a proposal ──
  if (existing) {
    const meta = STATUS_META[existing.status] || STATUS_META.pending_supervisor;
    return (
      <div className="propose-wrap">
        <div className="propose-page-header">
          <button className="btn-back" onClick={onBack}>← Back</button>
          <h2>My Project Proposal</h2>
        </div>

        <div className="propose-status-card">
          <div className="propose-status-top">
            <h3>{existing.title}</h3>
            <span className={`status-badge ${meta.cls}`}>{meta.icon} {meta.label}</span>
          </div>
          <p className="propose-status-desc">{existing.description}</p>

          <div className="propose-status-meta">
            <div className="propose-meta-item">
              <span className="propose-meta-label">Department</span>
              <span className="propose-meta-value">{existing.department.replace(/_/g, ' ')}</span>
            </div>
            <div className="propose-meta-item">
              <span className="propose-meta-label">Supervisor</span>
              <span className="propose-meta-value">{existing.supervisor_name || '—'}</span>
            </div>
            <div className="propose-meta-item">
              <span className="propose-meta-label">Team Size</span>
              <span className="propose-meta-value">{existing.team_size} student{existing.team_size > 1 ? 's' : ''}</span>
            </div>
            <div className="propose-meta-item">
              <span className="propose-meta-label">Submitted</span>
              <span className="propose-meta-value">{new Date(existing.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Team members */}
          {existing.invitations && existing.invitations.length > 0 && (
            <div className="propose-members">
              <span className="propose-meta-label">Team Members</span>
              {existing.invitations.map((inv) => (
                <div key={inv.id} className="propose-member-row">
                  <span>{inv.invitee_name} ({inv.invitee_id})</span>
                  <span className={`status-badge ${inv.status === 'accepted' ? 'badge--approved' : inv.status === 'rejected' ? 'badge--rejected' : 'badge--pending'}`}>
                    {inv.status === 'accepted' ? '✅' : inv.status === 'rejected' ? '❌' : '⏳'} {inv.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {existing.status === 'awaiting_members' && (
            <div className="alert alert-info">Waiting for team members to confirm their participation.</div>
          )}
          {existing.status === 'assigned' && (
            <div className="alert alert-success">🎉 Your idea has been approved and assigned to you.</div>
          )}
          {existing.status === 'rejected' && existing.rejection_reason && (
            <div className="alert alert-error"><strong>Rejection reason:</strong> {existing.rejection_reason}</div>
          )}
          {existing.status === 'pending_supervisor' && (
            <div className="alert alert-info">Waiting for <strong>{existing.supervisor_name}</strong> to review.</div>
          )}
          {existing.status === 'pending_hod' && (
            <div className="alert alert-info">Approved by supervisor — awaiting HoD review.</div>
          )}
        </div>
      </div>
    );
  }

  // ── Form ──
  return (
    <div className="propose-wrap">
      <div className="propose-page-header">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h2>Propose a Project Idea</h2>
      </div>

      <div className="alert alert-info">
        <span aria-hidden="true">ℹ️</span>
        <span>Standard team size is <strong>2–3 students</strong>. Other sizes require a justification.</span>
      </div>

      <div className="propose-card">
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="p-title">Title *</label>
            <input id="p-title" name="title" type="text" className="form-control"
              value={form.title} onChange={handleChange}
              placeholder="e.g. Smart Campus Navigation App" required />
          </div>

          <div className="form-group">
            <label htmlFor="p-desc">Description *</label>
            <textarea id="p-desc" name="description" rows={4} className="form-control"
              value={form.description} onChange={handleChange}
              placeholder="Describe your project idea, goals, and expected outcomes…" required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="p-dept">Department *</label>
              <select id="p-dept" name="department" className="form-control"
                value={form.department} onChange={handleChange} required>
                <option value="">— Select —</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="p-sup">Preferred Supervisor *</label>
              <select id="p-sup" name="supervisor" className="form-control"
                value={form.supervisor} onChange={handleChange} required>
                <option value="">— Select —</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}{d.department ? ` (${d.department.replace(/_/g, ' ')})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Team size */}
          <div className="form-group">
            <label htmlFor="p-team">Team Size *</label>
            <select id="p-team" className="form-control"
              value={form.team_size}
              onChange={(e) => handleTeamSizeChange(e.target.value)}>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>{n} student{n > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>

          {/* Reason for non-standard size */}
          {needsReason && (
            <div className="form-group">
              <label htmlFor="p-reason">
                Justification for {form.team_size === 1 ? 'solo' : `${form.team_size}-student`} team *
              </label>
              <textarea id="p-reason" name="team_size_reason" rows={3} className="form-control"
                value={form.team_size_reason} onChange={handleChange}
                placeholder={form.team_size < 2
                  ? 'Explain why you are working alone…'
                  : 'Explain why your team needs more than 3 members…'}
                required />
            </div>
          )}

          {/* Member fields for standard sizes */}
          {form.member_ids.map((val, idx) => (
            <div className="form-group" key={idx}>
              <label htmlFor={`p-member-${idx}`}>Member {idx + 2} — Search by name or ID *</label>
              <StudentSearch
                id={`p-member-${idx}`}
                value={val}
                onChange={(username) => handleMemberChange(idx, username)}
                placeholder="Type name or university ID…"
              />
            </div>
          ))}

          <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
            {submitting ? 'Submitting…' : '📤 Submit Proposal'}
          </button>
        </form>
      </div>
    </div>
  );
}
