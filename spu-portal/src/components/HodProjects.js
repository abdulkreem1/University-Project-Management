import React, { useState, useEffect } from 'react';
import { fetchHodBoards, fetchHodStats } from '../api';
import KanbanBoard, { COLUMNS } from './KanbanBoard';
import './SupervisorProjects.css';
import './HodProjects.css';

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

export default function HodProjects({ onBack, user }) {
  const [boards, setBoards]     = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    Promise.all([fetchHodBoards(), fetchHodStats()])
      .then(([boardsRes, statsRes]) => {
        setBoards(boardsRes.data);
        setStats(statsRes.data);
      })
      .catch(() => setError('Failed to load projects.'))
      .finally(() => setLoading(false));
  }, []);

  const selectedBoard = boards.find((b) => b.id === selected);

  if (selected && selectedBoard) {
    return (
      <div>
        <div className="sp-topbar">
          <button className="sp-back-btn" onClick={() => setSelected(null)}>
            <BackIcon /> All Projects
          </button>
          <span className="hod-readonly-badge">Read-Only View</span>
        </div>
        <KanbanBoard
          board={selectedBoard}
          setBoard={() => {}} // read-only
          canEdit={false}
        />
      </div>
    );
  }

  return (
    <div className="sp-wrap">
      <div className="sv-header">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h2>{user.role === 'dean' ? 'All Department Projects' : 'Department Projects'}</h2>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="hod-stats-row">
          <div className="hod-stat-card">
            <span className="hod-stat-icon">📊</span>
            <div className="hod-stat-info">
              <span className="hod-stat-val">{stats.total_projects}</span>
              <span className="hod-stat-label">Active Projects</span>
            </div>
          </div>
          <div className="hod-stat-card">
            <span className="hod-stat-icon">📝</span>
            <div className="hod-stat-info">
              <span className="hod-stat-val">{stats.proposals_count}</span>
              <span className="hod-stat-label">Student Proposals</span>
            </div>
          </div>
          <div className="hod-stat-card">
            <span className="hod-stat-icon">💡</span>
            <div className="hod-stat-info">
              <span className="hod-stat-val">{stats.applications_count}</span>
              <span className="hod-stat-label">Doctor Ideas</span>
            </div>
          </div>
          <div className="hod-stat-card hod-stat-card--highlight">
            <span className="hod-stat-icon">📈</span>
            <div className="hod-stat-info">
              <span className="hod-stat-val">{stats.avg_progress}%</span>
              <span className="hod-stat-label">Avg Progress</span>
            </div>
          </div>
        </div>
      )}

      {error   && <div className="alert alert-error">{error}</div>}
      {loading && <p className="sv-loading">Loading…</p>}

      {!loading && boards.length === 0 && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>📂</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', margin: '0 0 8px' }}>No Active Projects</h3>
          <p style={{ fontSize: 14, maxWidth: 360, lineHeight: 1.6 }}>
            Projects will appear here once they are registered.
          </p>
        </div>
      )}

      <div className="sp-projects-grid">
        {boards.map((board) => {
          const done  = board.tasks.filter((t) => t.status === 'done').length;
          const total = board.tasks.length;
          const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

          return (
            <div key={board.id} className="sp-project-card" onClick={() => setSelected(board.id)}>
              <div className="sp-project-top">
                <h3 className="sp-project-title">{board.title}</h3>
                <span className="sp-task-count">{total} tasks</span>
              </div>

              <div className="sp-members-row">
                {board.members.map((m) => (
                  <span key={m.id} className="sp-avatar" title={m.name}>
                    {(m.name || m.username)[0].toUpperCase()}
                  </span>
                ))}
                <span className="sp-member-names">
                  {board.members.map((m) => m.name || m.username).join(', ')}
                </span>
              </div>

              <div className="sp-col-stats">
                {COLUMNS.map((col) => {
                  const count = board.tasks.filter((t) => t.status === col.key).length;
                  return (
                    <div key={col.key} className="sp-col-stat">
                      <span className="sp-col-stat-dot" style={{ background: col.color }} />
                      <span className="sp-col-stat-label">{col.label}</span>
                      <span className="sp-col-stat-val">{count}</span>
                    </div>
                  );
                })}
              </div>

              <div className="sp-progress-row">
                <div className="sp-progress-bar">
                  <div className="sp-progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="sp-progress-pct">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
