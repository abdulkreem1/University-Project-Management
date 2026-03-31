import React from 'react';
import './RoleDashboard.css';

const CARDS = [
  { icon: '📖', label: 'My Courses',  desc: 'View enrolled courses' },
  { icon: '🎯', label: 'My Grades',   desc: 'Check your results' },
  { icon: '📅', label: 'Schedule',    desc: 'Weekly timetable' },
  { icon: '📚', label: 'Library',     desc: 'Academic resources' },
];

export default function StudentDashboard({ user }) {
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
          <div key={c.label} className="role-card" role="listitem">
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
