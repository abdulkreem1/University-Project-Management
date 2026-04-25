import React, { useState, useEffect } from 'react';
import { submitStudentProposal, fetchMyProposal, fetchDoctorsList, fetchStudentForm } from '../api';
import StudentSearch from './StudentSearch';
import './ProposeIdea.css';

const DEPARTMENTS = [
  { value: 'software_engineering',    label: 'Software Engineering' },
  { value: 'artificial_intelligence', label: 'Artificial Intelligence' },
  { value: 'information_security',    label: 'Information Security' },
  { value: 'communications',          label: 'Communications' },
  { value: 'control_robotics',        label: 'Control & Robotics' },
];

/* Premium SVG Icons */
const Icons = {
  Users: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Clock: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Refresh: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  CheckCircle: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  XCircle: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  Info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  ArrowLeft: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Send: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
};

const STATUS_META = {
  awaiting_members:   { label: 'Awaiting Member Confirmation', icon: Icons.Users, cls: 'badge--hod' },
  pending_supervisor: { label: 'Pending Supervisor Approval',  icon: Icons.Clock, cls: 'badge--pending' },
  pending_hod:        { label: 'Pending HoD Review',           icon: Icons.Refresh, cls: 'badge--hod' },
  assigned:           { label: 'Assigned',                     icon: Icons.CheckCircle, cls: 'badge--approved' },
  rejected:           { label: 'Rejected',                     icon: Icons.XCircle, cls: 'badge--rejected' },
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

  // Dynamic form state
  const [dynForm, setDynForm]       = useState(null);
  const [dynValues, setDynValues]   = useState({});

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

  // Load dynamic form when department changes
  useEffect(() => {
    if (!form.department) { setDynForm(null); return; }
    fetchStudentForm(form.department, 'propose')
      .then(res => {
        setDynForm(res.data?.fields?.length ? res.data : null);
        const init = {};
        (res.data?.fields || []).forEach(f => { init[f.id] = ''; });
        setDynValues(init);
      })
      .catch(() => setDynForm(null));
  }, [form.department]);

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
        // dynamic form fields sent together in the same request
        form_id:          dynForm?.id || null,
        field_responses:  dynForm
          ? (dynForm.fields || []).map(f => ({ field: f.id, value: dynValues[f.id] || '' }))
          : [],
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

  // ── Header common for all states ──
  const FormHeader = () => (
    <header className="pd-header propose-header">
       <div className="pd-greeting-area">
          <button className="btn-back-modern" onClick={onBack}>
            {Icons.ArrowLeft} <span>Back to Overview</span>
          </button>
          <h1 className="pd-title">Project Proposal</h1>
          <p className="pd-subtitle">{existing ? 'Track your submitted proposal' : 'Submit a new idea for approval'}</p>
       </div>
    </header>
  );

  // ── Loading ──
  if (loading) {
    return (
      <div className="premium-dashboard">
        <FormHeader />
        <p className="propose-loading">Loading data…</p>
      </div>
    );
  }

  // ── Already has a proposal ──
  if (existing) {
    const meta = STATUS_META[existing.status] || STATUS_META.pending_supervisor;
    return (
      <div className="premium-dashboard">
        <FormHeader />

        <div className="propose-status-card">
          <div className="propose-status-top">
            <h3>{existing.title}</h3>
            <span className={`status-badge modern ${meta.cls}`}>{meta.icon} <span>{meta.label}</span></span>
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
                  <span className={`status-badge modern ${inv.status === 'accepted' ? 'badge--approved' : inv.status === 'rejected' ? 'badge--rejected' : 'badge--pending'}`}>
                    {inv.status === 'accepted' ? Icons.CheckCircle : inv.status === 'rejected' ? Icons.XCircle : Icons.Clock} 
                    <span>{inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Alert Strips */}
          {existing.status === 'awaiting_members' && (
            <div className="alert-strip alert-info-strip">
              <span className="alert-icon">{Icons.Info}</span>
              <span>Waiting for team members to confirm their participation.</span>
            </div>
          )}
          {existing.status === 'assigned' && (
            <div className="alert-strip alert-success-strip">
              <span className="alert-icon">{Icons.CheckCircle}</span>
              <span>Your idea has been approved and assigned to you.</span>
            </div>
          )}
          {existing.status === 'rejected' && existing.rejection_reason && (
            <div className="alert-strip alert-error-strip">
              <span className="alert-icon">{Icons.XCircle}</span>
              <span><strong>Rejection reason:</strong> {existing.rejection_reason}</span>
            </div>
          )}
          {existing.status === 'pending_supervisor' && (
            <div className="alert-strip alert-info-strip">
              <span className="alert-icon">{Icons.Info}</span>
              <span>Waiting for <strong>{existing.supervisor_name}</strong> to review.</span>
            </div>
          )}
          {existing.status === 'pending_hod' && (
            <div className="alert-strip alert-info-strip">
              <span className="alert-icon">{Icons.Info}</span>
              <span>Approved by supervisor — awaiting HoD review.</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Form ──
  return (
    <div className="premium-dashboard">
      <FormHeader />

      <div className="alert-strip alert-info-strip compact">
        <span className="alert-icon">{Icons.Info}</span>
        <span>Standard team size is <strong>2–3 students</strong>. Other sizes require a detailed justification.</span>
      </div>

      <div className="propose-card">
        {error && (
            <div className="alert-strip alert-error-strip">
              <span className="alert-icon">{Icons.XCircle}</span>
              <span>{error}</span>
            </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="premium-form">
          <div className="form-group">
            <label htmlFor="p-title">Project Title</label>
            <input id="p-title" name="title" type="text" className="form-control"
              value={form.title} onChange={handleChange}
              placeholder="e.g. Smart Campus Navigation App" required />
          </div>

          <div className="form-group">
            <label htmlFor="p-desc">Project Description</label>
            <textarea id="p-desc" name="description" rows={4} className="form-control"
              value={form.description} onChange={handleChange}
              placeholder="Describe your project idea in detail, highlighting goals and expected outcomes…" required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="p-dept">Assigned Department</label>
              <div className="select-wrapper">
                <select id="p-dept" name="department" className="form-control"
                  value={form.department} onChange={handleChange} required>
                  <option value="">— Select Department —</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="p-sup">Preferred Supervisor</label>
              <div className="select-wrapper">
                <select id="p-sup" name="supervisor" className="form-control"
                  value={form.supervisor} onChange={handleChange} required>
                  <option value="">— Select Supervisor —</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}{d.department ? ` (${d.department.replace(/_/g, ' ')})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Team size */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="p-team">Team Size</label>
              <div className="select-wrapper">
                <select id="p-team" className="form-control"
                  value={form.team_size}
                  onChange={(e) => handleTeamSizeChange(e.target.value)}>
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>{n} student{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Reason for non-standard size */}
          {needsReason && (
            <div className="form-group justification-group">
              <label htmlFor="p-reason">
                Justification for {form.team_size === 1 ? 'Solo' : `${form.team_size}-Student`} Team
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
              <label htmlFor={`p-member-${idx}`}>Team Member {idx + 2}</label>
              <StudentSearch
                id={`p-member-${idx}`}
                value={val}
                onChange={(username) => handleMemberChange(idx, username)}
                placeholder="Search by student name or university ID…"
              />
            </div>
          ))}

          {/* Dynamic fields from HoD */}
          {dynForm && (dynForm.fields || []).length > 0 && (
            <div className="propose-dyn-section">
              <div className="propose-dyn-label">
                {dynForm.title || 'Additional Department Requirements'}
              </div>
              {dynForm.fields.map(field => (
                <ProposeDynField
                  key={field.id}
                  field={field}
                  value={dynValues[field.id] || ''}
                  onChange={val => setDynValues(prev => ({ ...prev, [field.id]: val }))}
                />
              ))}
            </div>
          )}

          <div className="submit-action-area">
            <button type="submit" className="btn btn-primary btn-submit-modern" disabled={submitting}>
              <span>{submitting ? 'Submitting Proposal…' : 'Submit Proposal'}</span>
              {!submitting && Icons.Send}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Inline dynamic field renderer for ProposeIdea ────────────────────────────
function ProposeDynField({ field, value, onChange }) {
  const { label, field_type, required, options } = field;
  const lbl = <label className="form-label">{label}{required && <span style={{color:'#ef4444'}}> *</span>}</label>;

  if (field_type === 'text')
    return <div className="form-group">{lbl}<input className="form-control" type="text" value={value} required={required} onChange={e => onChange(e.target.value)} /></div>;
  if (field_type === 'textarea')
    return <div className="form-group">{lbl}<textarea className="form-control" rows={3} value={value} required={required} onChange={e => onChange(e.target.value)} /></div>;
  if (field_type === 'number')
    return <div className="form-group">{lbl}<input className="form-control" type="number" value={value} required={required} min="0" step="any" onChange={e => onChange(e.target.value)} style={{maxWidth:120}} /></div>;
  if (field_type === 'date')
    return <div className="form-group">{lbl}<input className="form-control" type="date" value={value} required={required} onChange={e => onChange(e.target.value)} /></div>;
  if (field_type === 'select')
    return <div className="form-group">{lbl}<div className="select-wrapper"><select className="form-control" value={value} required={required} onChange={e => onChange(e.target.value)}><option value="">Select...</option>{(options||[]).map(o=><option key={o} value={o}>{o}</option>)}</select></div></div>;
  if (field_type === 'radio')
    return <div className="form-group">{lbl}<div style={{display:'flex',flexDirection:'column',gap:6}}>{(options||[]).map(o=><label key={o} style={{display:'flex',alignItems:'center',gap:8,fontSize:14}}><input type="radio" name={`dyn-${field.id}`} value={o} checked={value===o} onChange={()=>onChange(o)} required={required}/>{o}</label>)}</div></div>;
  if (field_type === 'checkbox')
    return <div className="form-group">{lbl}<div style={{display:'flex',flexDirection:'column',gap:6}}>{(options||[]).map(o=>{const checked=(value||'').split(',').includes(o);const toggle=()=>{const cur=value?value.split(',').filter(Boolean):[];onChange(checked?cur.filter(v=>v!==o).join(','):[...cur,o].join(','))};return<label key={o} style={{display:'flex',alignItems:'center',gap:8,fontSize:14}}><input type="checkbox" checked={checked} onChange={toggle}/>{o}</label>;})}</div></div>;
  if (field_type === 'file')
    return <div className="form-group">{lbl}<input className="form-control" type="file" required={required} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif" onChange={e=>{const file=e.target.files?.[0];if(file)onChange(file.name);}}/><small style={{fontSize:12,color:'#64748b',marginTop:4,display:'block'}}>Upload a file (PDF, DOC, or image)</small></div>;
  return null;
}
