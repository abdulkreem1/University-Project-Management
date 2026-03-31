import React from 'react';
import './Dashboard.css';

const ROLE_LABELS = {
  dean: 'Dean',
  admin: 'Administrator',
  hod: 'Head of Department',
  doctor: 'Doctor',
  student: 'Student',
};

// Cards shown per role
const ROLE_CARDS = {
  dean:    ['Import Users', 'Manage Departments', 'View Reports', 'System Settings'],
  admin:   ['Import Users', 'Manage Users', 'View Reports', 'System Settings'],
  hod:     ['View Faculty', 'Manage Courses', 'View Reports'],
  doctor:  ['My Courses', 'Student Grades', 'Schedule'],
  student: ['My Courses', 'My Grades', 'Schedule', 'Library'],
};

const CARD_ICONS = {
  'Import Users':        '📥',
  'Manage Departments':  '🏛️',
  'View Reports':        '📊',
  'System Settings':     '⚙️',
  'Manage Users':        '👥',
  'View Faculty':        '👨‍🏫',
  'Manage Courses':      '📚',
  'My Courses':          '📖',
  'Student Grades':      '📝',
  'My Grades':           '🎯',
  'Schedule':            '📅',
  'Library':             '📚',
};

export default function Dashboard({ user, onNavigate }) {
  const cards = ROLE_CARDS[user.role] || [];

  return (
    <div className="dashboard">
      {/* Welcome banner */}
      <div className="welcome-banner">
        <div>
          <h1>Welcome, {user.username}</h1>
          <p>{ROLE_LABELS[user.role] || user.role} — Syrian Private University</p>
        </div>
        <div className="welcome-badge" aria-hidden="true">🎓</div>
      </div>

      {/* Quick-access cards */}
      <div className="dashboard-grid" role="list">
        {cards.map((label) => (
          <button
            key={label}
            className="dash-card"
            role="listitem"
            onClick={() => label === 'Import Users' && onNavigate('import')}
            aria-label={label}
          >
            <span className="dash-card-icon" aria-hidden="true">{CARD_ICONS[label]}</span>
            <span className="dash-card-label">{label}</span>
          </button>
        ))}
      </div>

      {/* Info strip */}
      <div className="dashboard-info">
        <div className="info-item">
          <span className="info-label">Academic Year</span>
          <span className="info-value">2025 – 2026</span>
        </div>
        <div className="info-item">
          <span className="info-label">Current Semester</span>
          <span className="info-value">Spring</span>
        </div>
        <div className="info-item">
          <span className="info-label">Role</span>
          <span className="info-value">{ROLE_LABELS[user.role] || user.role}</span>
        </div>
      </div>
    </div>
  );
}
