import React, { useState } from 'react';
import './RoleDashboard.css';
import HodProposalReview from './HodProposalReview';
import HodIdeaReview from './HodIdeaReview';
import HodApplicationReview from './HodApplicationReview';

const DEPT_LABELS = {
  software_engineering:    'Software Engineering',
  artificial_intelligence: 'Artificial Intelligence',
  information_security:    'Information Security',
  communications:          'Communications',
  control_robotics:        'Control & Robotics',
};

const CARDS = [
  { icon: '👥', label: 'Faculty Members',      desc: 'View department staff',                    page: null },
  { icon: '📚', label: 'Manage Courses',       desc: 'Courses in your department',               page: null },
  { icon: '💡', label: 'Doctor Ideas',         desc: 'Review & approve doctor project ideas',    page: 'ideas' },
  { icon: '📋', label: 'Student Proposals',    desc: 'Review & approve student proposals',       page: 'proposals' },
  { icon: '📩', label: 'Idea Applications',    desc: 'Register student applications on ideas',   page: 'applications' },
  { icon: '📊', label: 'Reports',              desc: 'Department statistics',                    page: null },
];

export default function HodDashboard({ user }) {
  const [page, setPage] = useState('dashboard');
  const deptLabel = DEPT_LABELS[user.department] || 'Your Department';

  if (page === 'ideas')        return <HodIdeaReview        onBack={() => setPage('dashboard')} />;
  if (page === 'proposals')    return <HodProposalReview    onBack={() => setPage('dashboard')} />;
  if (page === 'applications') return <HodApplicationReview onBack={() => setPage('dashboard')} />;

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
