import React, { useState } from 'react';
import './RoleDashboard.css';
import HodProposalReview from './HodProposalReview';
import HodIdeaReview from './HodIdeaReview';
import HodApplicationReview from './HodApplicationReview';
import HodFormBuilder from './HodFormBuilder';
import HodProjects from './HodProjects';

const DEPT_LABELS = {
  software_engineering:    'Software Engineering',
  artificial_intelligence: 'Artificial Intelligence',
  information_security:    'Information Security',
  communications:          'Communications',
  control_robotics:        'Control & Robotics',
};

/* Premium SVG Icons */
const Icons = {
  Users: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  BookOpen: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  Lightbulb: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2A7 7 0 0 0 5 9c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/></svg>,
  ClipboardCheck: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><polyline points="9 14 11 16 15 11"/></svg>,
  Inbox: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
  BarChart: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
  Forms: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,
  Kanban: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></svg>,
  ChevronRight: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
};

const CARDS = [
  { icon: Icons.Users, label: 'Faculty Members',      desc: 'View department staff',                    page: null },
  { icon: Icons.BookOpen, label: 'Manage Courses',       desc: 'Courses in your department',               page: null },
  { icon: Icons.Lightbulb, label: 'Doctor Ideas',         desc: 'Review & approve doctor project ideas',    page: 'ideas' },
  { icon: Icons.ClipboardCheck, label: 'Student Proposals',    desc: 'Review & approve student proposals',       page: 'proposals' },
  { icon: Icons.Inbox, label: 'Idea Applications',    desc: 'Register student applications on ideas',   page: 'applications' },
  { icon: Icons.Forms, label: 'Form Builder',          desc: 'Customize student submission forms',        page: 'formbuilder' },
  { icon: Icons.Kanban, label: 'Active Projects',       desc: 'Monitor department project progress',       page: 'projects' },
  { icon: Icons.BarChart, label: 'Reports',              desc: 'Department statistics',                    page: null },
];

export default function HodDashboard({ user }) {
  const [page, setPage] = useState('dashboard');
  const deptLabel = DEPT_LABELS[user.department] || 'Your Department';

  if (page === 'ideas')        return <HodIdeaReview        onBack={() => setPage('dashboard')} />;
  if (page === 'proposals')    return <HodProposalReview    onBack={() => setPage('dashboard')} />;
  if (page === 'applications') return <HodApplicationReview onBack={() => setPage('dashboard')} />;
  if (page === 'formbuilder')  return <HodFormBuilder       onBack={() => setPage('dashboard')} />;
  if (page === 'projects')     return <HodProjects          onBack={() => setPage('dashboard')} user={user} />;

  return (
    <div className="premium-dashboard">
      <header className="pd-header">
        <div className="pd-greeting-area">
          <h1 className="pd-title">Head of Department Portal</h1>
          <p className="pd-subtitle">Welcome, Dr. {user.username}. Managing operations for {deptLabel}.</p>
        </div>
        <div className="pd-term-badge">
          <span className="pd-term-label">Academic Year</span>
          <span className="pd-term-value">25/26 - Spring</span>
        </div>
      </header>

      {/* Bento Metrics Row (Replaces info strip) */}
      <div className="pd-metrics-row">
        <div className="pd-metric-card">
          <span className="pd-metric-title">Department Focus</span>
          <span className="pd-metric-value" style={{fontSize: '18px', lineHeight: 1.2}}>{deptLabel}</span>
        </div>
        <div className="pd-metric-card">
          <span className="pd-metric-title">Current Semester</span>
          <span className="pd-metric-value">Spring</span>
        </div>
        <div className="pd-metric-card">
          <span className="pd-metric-title">Approvals Pending</span>
          <span className="pd-metric-value pd-metric-warning">0</span>
        </div>
      </div>

      <h2 className="pd-section-title" style={{ marginTop: '16px' }}>Department Operations</h2>
      
      <div className="pd-modules-grid" role="list">
        {CARDS.map((c) => (
          <div
            key={c.label}
            className="pd-module-card"
            role="listitem"
            onClick={() => c.page && setPage(c.page)}
            style={c.page ? { cursor: 'pointer' } : { opacity: 0.7, cursor: 'not-allowed' }}
            tabIndex={c.page ? 0 : -1}
            onKeyDown={c.page ? (e) => e.key === 'Enter' && setPage(c.page) : undefined}
          >
            <div className="pd-module-icon">{c.icon}</div>
            <div className="pd-module-info">
              <span className="pd-module-label">{c.label}</span>
              <span className="pd-module-desc">{c.desc}</span>
            </div>
            {c.page && (
              <div className="pd-module-arrow">{Icons.ChevronRight}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
