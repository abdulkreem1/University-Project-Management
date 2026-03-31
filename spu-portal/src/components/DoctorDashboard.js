import React from 'react';
import './RoleDashboard.css';

const CARDS = [
  { icon: '📘', label: 'My Courses',     desc: 'Courses you teach' },
  { icon: '📝', label: 'Student Grades', desc: 'Enter & manage grades' },
  { icon: '📅', label: 'Schedule',       desc: 'Your teaching schedule' },
  { icon: '📊', label: 'Reports',        desc: 'Course statistics' },
];

export default function DoctorDashboard({ user }) {
  return (
    <div className="role-dashboard">
      <div className="role-banner role-banner--doctor">
        <div>
          <h1>Welcome, Dr. {user.username}</h1>
          <p>Faculty Portal — Syrian Private University</p>
        </div>
        <span className="role-banner-icon" aria-hidden="true">👨‍🏫</span>
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
          <span className="role-info-label">Department</span>
          <span className="role-info-value">Faculty</span>
        </div>
      </div>
    </div>
  );
}
