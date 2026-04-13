import React, { useState } from 'react';
import './RoleDashboard.css';
import ProposeIdea from './ProposeIdea';
import BrowseIdeas from './BrowseIdeas';
import MyInvitations from './MyInvitations';

const CARDS = [
  { icon: '📖', label: 'My Courses',       desc: 'View enrolled courses',           page: null },
  { icon: '🎯', label: 'My Grades',        desc: 'Check your results',              page: null },
  { icon: '📅', label: 'Schedule',         desc: 'Weekly timetable',                page: null },
  { icon: '🔍', label: 'Browse Ideas',     desc: 'Browse & apply on project ideas', page: 'browse' },
  { icon: '💡', label: 'Propose Idea',     desc: 'Submit your own project idea',    page: 'propose' },
  { icon: '📨', label: 'Team Invitations', desc: 'Respond to team invitations',     page: 'invitations' },
];

export default function StudentDashboard({ user }) {
  const [page, setPage] = useState('dashboard');

  if (page === 'propose')     return <ProposeIdea    onBack={() => setPage('dashboard')} />;
  if (page === 'browse')      return <BrowseIdeas    onBack={() => setPage('dashboard')} />;
  if (page === 'invitations') return <MyInvitations  onBack={() => setPage('dashboard')} />;

  return (
    <div className="role-dashboard">
      <div className="role-banner role-banner--student">
        <div>
          <h1>Welcome, {user.username}</h1>
          <p>Student Portal — Syrian Private University</p>
        </div>
        <span className="role-banner-icon" aria-hidden="true">🎓</span>
      </div>

      <div className="role-grid" role="list">
        {CARDS.map((c) => (
          <div
            key={c.label}
            className="role-card"
            role="listitem"
            onClick={() => c.page && setPage(c.page)}
            style={c.page ? { cursor: 'pointer' } : undefined}
            tabIndex={c.page ? 0 : undefined}
            onKeyDown={c.page ? (e) => e.key === 'Enter' && setPage(c.page) : undefined}
            aria-label={c.page ? `Go to ${c.label}` : undefined}
          >
            <span className="role-card-icon" aria-hidden="true">{c.icon}</span>
            <span className="role-card-label">{c.label}</span>
            <span className="role-card-desc">{c.desc}</span>
          </div>
        ))}
      </div>

      <div className="role-info-strip">
        <div className="role-info-item">
          <span className="role-info-label">Academic Year</span>
          <span className="role-info-value">2025 – 2026</span>
        </div>
        <div className="role-info-item">
          <span className="role-info-label">Semester</span>
          <span className="role-info-value">Spring</span>
        </div>
        <div className="role-info-item">
          <span className="role-info-label">Status</span>
          <span className="role-info-value role-status--active">Active</span>
        </div>
      </div>
    </div>
  );
}
