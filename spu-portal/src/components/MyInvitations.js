import React, { useState, useEffect } from 'react';
import {
  fetchMyInvitations, respondToInvitation,
  fetchMyProposalInvitations, respondToProposalInvitation,
} from '../api';
import './SupervisorReview.css';

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
    <div className="sv-wrap">
      <div className="sv-header">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h2>Team Invitations</h2>
      </div>

      {error   && <div className="alert alert-error">{error}</div>}
      {loading && <p className="sv-loading">Loading…</p>}

      {!loading && total === 0 && !error && (
        <div className="sv-empty">
          <span aria-hidden="true">📭</span>
          <p>No pending invitations.</p>
        </div>
      )}

      {/* Doctor idea application invitations */}
      {ideaInvs.length > 0 && (
        <>
          <p style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Doctor Idea Applications
          </p>
          <div className="sv-list">
            {ideaInvs.map((inv) => (
              <div key={inv.id} className="sv-card">
                <div className="sv-card-top">
                  <div>
                    <h3 className="sv-card-title">{inv.idea_title}</h3>
                    <span className="sv-card-student">👤 Invited by <strong>{inv.leader_name}</strong></span>
                  </div>
                  <span className="meta-tag">👨‍🏫 {inv.doctor_name}</span>
                </div>
                <div className="alert alert-info" style={{ margin: 0 }}>
                  Accepting means you won't be able to apply elsewhere until this application is decided. If rejected, you'll be free again.
                </div>
                <div className="sv-card-actions">
                  <button className="btn btn-primary" onClick={() => handleIdeaRespond(inv.id, 'accept')} disabled={acting === inv.id}>✅ Accept</button>
                  <button className="btn btn-danger"  onClick={() => handleIdeaRespond(inv.id, 'reject')} disabled={acting === inv.id}>❌ Decline</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Student proposal invitations */}
      {propInvs.length > 0 && (
        <>
          <p style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 8 }}>
            Student Proposal Teams
          </p>
          <div className="sv-list">
            {propInvs.map((inv) => (
              <div key={inv.id} className="sv-card">
                <div className="sv-card-top">
                  <div>
                    <h3 className="sv-card-title">{inv.idea_title}</h3>
                    <span className="sv-card-student">👤 Proposed by <strong>{inv.leader_name}</strong></span>
                  </div>
                </div>
                <div className="alert alert-info" style={{ margin: 0 }}>
                  Accepting means you won't be able to apply elsewhere until this proposal is decided. If rejected, you'll be free again.
                </div>
                <div className="sv-card-actions">
                  <button className="btn btn-primary" onClick={() => handlePropRespond(inv.id, 'accept')} disabled={acting === inv.id}>✅ Accept</button>
                  <button className="btn btn-danger"  onClick={() => handlePropRespond(inv.id, 'reject')} disabled={acting === inv.id}>❌ Decline</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
