import React, { useState } from 'react';
import './RoleDashboard.css';
import MyIdeas from './MyIdeas';
import SubmitIdea from './SubmitIdea';
import SupervisorReview from './SupervisorReview';
import DoctorApplicationReview from './DoctorApplicationReview';

const CARDS = [
  { icon: '📘', label: 'My Courses',          desc: 'Courses you teach',                  page: null },
  { icon: '📝', label: 'Student Grades',      desc: 'Enter & manage grades',              page: null },
  { icon: '📅', label: 'Schedule',            desc: 'Your teaching schedule',             page: null },
  { icon: '💡', label: 'My Ideas',            desc: 'Submit & track project ideas',       page: 'my-ideas' },
  { icon: '📋', label: 'Student Proposals',   desc: 'Review proposals assigned to you',   page: 'supervisor-review' },
  { icon: '📩', label: 'Idea Applications',   desc: 'Review student applications on your ideas', page: 'app-review' },
];

export default function DoctorDashboard({ user }) {
  const [page, setPage] = useState('dashboard');

  if (page === 'my-ideas')         return <MyIdeas onBack={() => setPage('dashboard')} onSubmitNew={() => setPage('submit-idea')} />;
  if (page === 'submit-idea')      return <SubmitIdea onBack={() => setPage('my-ideas')} />;
  if (page === 'supervisor-review') return <SupervisorReview onBack={() => setPage('dashboard')} />;
  if (page === 'app-review')       return <DoctorApplicationReview onBack={() => setPage('dashboard')} />;

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
          <span className="role-info-label">Department</span>
          <span className="role-info-value">Faculty</span>
        </div>
      </div>
    </div>
  );
}
