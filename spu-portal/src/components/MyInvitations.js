import React, { useState, useEffect } from 'react';
import {
  fetchMyInvitations, respondToInvitation,
  fetchMyProposalInvitations, respondToProposalInvitation,
} from '../api';
import './SupervisorReview.css';

/* Premium SVG Icons */
const Icons = {
  Inbox: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
  Check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  X: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  User: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Briefcase: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  ArrowLeft: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  AlertCircle: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
};

export default function MyInvitations({ onBack }) {
  const [ideaInvs, setIdeaInvs]       = useState([]);
  const [propInvs, setPropInvs]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [acting, setActing]           = useState(null);

  useEffect(() => {
    Promise.all([fetchMyInvitations(), fetchMyProposalInvitations()])
      .then(([ideaRes, propRes]) => {
        setIdeaInvs(ideaRes.data);
        setPropInvs(propRes.data);
      })
      .catch(() => setError('Failed to load invitations.'))
      .finally(() => setLoading(false));
  }, []);

  const handleIdeaRespond = async (invId, action) => {
    setActing(invId);
    try {
      await respondToInvitation(invId, action);
      setIdeaInvs((prev) => prev.filter((i) => i.id !== invId));
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setActing(null);
    }
  };

  const handlePropRespond = async (invId, action) => {
    setActing(invId);
    try {
      await respondToProposalInvitation(invId, action);
      setPropInvs((prev) => prev.filter((i) => i.id !== invId));
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setActing(null);
    }
  };

  const total = ideaInvs.length + propInvs.length;

  return (
    <div className="premium-dashboard sv-wrap">
      <header className="pd-header propose-header">
         <div className="pd-greeting-area">
            <button className="btn-back-modern" onClick={onBack}>
              {Icons.ArrowLeft} <span>Back to Overview</span>
            </button>
            <h1 className="pd-title">Team Invitations</h1>
            <p className="pd-subtitle">Review and respond to pending team formation requests.</p>
         </div>
      </header>

      {error && (
        <div className="alert-strip alert-error-strip">
           <span className="alert-icon">{Icons.AlertCircle}</span>
           <span>{error}</span>
        </div>
      )}

      {loading && <p className="browse-loading">Loading invitations…</p>}

      {!loading && total === 0 && !error && (
        <div className="browse-empty" style={{ marginTop: '16px' }}>
           <div className="empty-icon-wrap" style={{width: 80, height: 80}}>
              {Icons.Inbox}
           </div>
           <p style={{fontSize: 18, color: "var(--text)"}}>No pending invitations.</p>
           <span style={{fontSize: 14, color: "var(--muted)", marginTop: 8}}>You're all caught up!</span>
        </div>
      )}

      {/* Doctor idea application invitations */}
      {ideaInvs.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 16 }}>
            Doctor Idea Applications
          </p>
          <div className="sv-list">
            {ideaInvs.map((inv) => (
              <div key={inv.id} className="saas-project-card">
                <div className="spc-header">
                  <div className="spc-meta-top">
                    <span className="spc-department">{Icons.User} {inv.doctor_name}</span>
                  </div>
                  <h3 className="spc-title">{inv.idea_title}</h3>
                  <div className="spc-info-row" style={{ marginTop: 8, padding: 12 }}>
                    <div className="spc-info-item">
                      {Icons.User}
                      <div className="spc-info-text">
                        <span className="label">Invited by Team Leader</span>
                        <span className="value">{inv.leader_name}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="alert-strip alert-info-strip compact">
                  <span className="alert-icon">{Icons.Briefcase}</span>
                  <span style={{fontSize: 13}}>Accepting means you won't be able to apply elsewhere until this application is decided. If rejected, you'll be free again.</span>
                </div>
                
                <div className="sv-card-actions">
                  <button className="btn btn-primary" style={{display:'inline-flex', alignItems:'center', gap:8}} onClick={() => handleIdeaRespond(inv.id, 'accept')} disabled={acting === inv.id}>
                    {Icons.Check} Accept
                  </button>
                  <button className="btn btn-danger" style={{display:'inline-flex', alignItems:'center', gap:8}} onClick={() => handleIdeaRespond(inv.id, 'reject')} disabled={acting === inv.id}>
                    {Icons.X} Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student proposal invitations */}
      {propInvs.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 16 }}>
            Student Proposal Teams
          </p>
          <div className="sv-list">
            {propInvs.map((inv) => (
              <div key={inv.id} className="saas-project-card">
                <div className="spc-header">
                  <h3 className="spc-title">{inv.idea_title}</h3>
                  <div className="spc-info-row" style={{ marginTop: 8, padding: 12 }}>
                    <div className="spc-info-item">
                      {Icons.User}
                      <div className="spc-info-text">
                        <span className="label">Proposed by Team Leader</span>
                        <span className="value">{inv.leader_name}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="alert-strip alert-info-strip compact">
                  <span className="alert-icon">{Icons.Briefcase}</span>
                  <span style={{fontSize: 13}}>Accepting means you won't be able to apply elsewhere until this proposal is decided. If rejected, you'll be free again.</span>
                </div>

                <div className="sv-card-actions">
                  <button className="btn btn-primary" style={{display:'inline-flex', alignItems:'center', gap:8}} onClick={() => handlePropRespond(inv.id, 'accept')} disabled={acting === inv.id}>
                    {Icons.Check} Accept
                  </button>
                  <button className="btn btn-danger" style={{display:'inline-flex', alignItems:'center', gap:8}} onClick={() => handlePropRespond(inv.id, 'reject')} disabled={acting === inv.id}>
                    {Icons.X} Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
