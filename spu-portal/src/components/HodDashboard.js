import React from 'react';
import './RoleDashboard.css';

const DEPT_LABELS = {
  software_engineering:    'Software Engineering',
  artificial_intelligence: 'Artificial Intelligence',
  information_security:    'Information Security',
  communications:          'Communications',
  control_robotics:        'Control & Robotics',
};

const CARDS = [
  { icon: '👥', label: 'Faculty Members', desc: 'View department staff' },
  { icon: '📚', label: 'Manage Courses',  desc: 'Courses in your department' },
  { icon: '✅', label: 'Approve Projects', desc: 'Review student projects' },
  { icon: '📊', label: 'Reports',          desc: 'Department statistics' },
];

export default function HodDashboard({ user }) {
  const deptLabel = DEPT_LABELS[user.department] || 'Your Department';

  return (
    <div className="role-dashboard">
      <div className="role-banner role-banner--hod">
        <div>
          <h1>Welcome, Dr. {user.username}</h1>
          <p>Head of Department — {deptLabel}</p>
        </div>
        <span className="role-banner-icon" aria-hidden="true">👨‍💼</span>
      </div>

      <div className="role-grid" role="list">
        {CARDS.map(c => (
          <div key={c.label} className="role-card" role="listitem">
            <span className="role-card-icon" aria-hidden="true">{c.icon}</span>
            <span className="role-card-label">{c.label}</span>
            <span className="role-card-desc">{c.desc}</span>
          </div>
        ))}
      </div>

      <div className="role-info-strip">
        <div className="role-info-item">
          <span className="role-info-label">Department</span>
          <span className="role-info-value">{deptLabel}</span>
        </div>
        <div className="role-info-item">
          <span className="role-info-label">Academic Year</span>
          <span className="role-info-value">2025 – 2026</span>
        </div>
        <div className="role-info-item">
          <span className="role-info-label">Semester</span>
          <span className="role-info-value">Spring</span>
        </div>
      </div>
    </div>
  );
}
