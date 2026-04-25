import React, { useState } from 'react';
import './RoleDashboard.css';
import HodProjects from './HodProjects';
import ImportUsers from './ImportUsers';
import AssignHod from './AssignHod';

const Icons = {
  Users: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  BookOpen: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  Kanban: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></svg>,
  BarChart: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
  Upload: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  UserPlus: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>,
  ChevronRight: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
};

const CARDS = [
  { icon: Icons.Upload, label: 'Import Users',         desc: 'Bulk import students & faculty',          page: 'import' },
  { icon: Icons.UserPlus, label: 'Assign HoD',           desc: 'Assign heads of departments',             page: 'assign-hod' },
  { icon: Icons.Kanban, label: 'All Projects',          desc: 'Monitor all department projects',          page: 'projects' },
  { icon: Icons.Users, label: 'Faculty Overview',      desc: 'View all faculty members',                 page: null },
  { icon: Icons.BookOpen, label: 'Academic Programs',     desc: 'Manage university programs',               page: null },
  { icon: Icons.BarChart, label: 'Analytics',            desc: 'University-wide statistics',              page: null },
];

export default function DeanDashboard({ user }) {
  const [page, setPage] = useState('dashboard');

  if (page === 'projects')   return <HodProjects  onBack={() => setPage('dashboard')} user={user} />;
  if (page === 'import')     return <ImportUsers  onBack={() => setPage('dashboard')} />;
  if (page === 'assign-hod') return <AssignHod    onBack={() => setPage('dashboard')} />;

  return (
    <div className="premium-dashboard">
      <header className="pd-header">
        <div className="pd-greeting-area">
          <h1 className="pd-title">Dean Portal</h1>
          <p className="pd-subtitle">Welcome, Dr. {user.username}. Overseeing all university operations.</p>
        </div>
        <div className="pd-term-badge">
          <span className="pd-term-label">Academic Year</span>
          <span className="pd-term-value">25/26 - Spring</span>
        </div>
      </header>

      <div className="pd-metrics-row">
        <div className="pd-metric-card">
          <span className="pd-metric-title">Role</span>
          <span className="pd-metric-value" style={{fontSize: '20px'}}>Dean</span>
        </div>
        <div className="pd-metric-card">
          <span className="pd-metric-title">Current Semester</span>
          <span className="pd-metric-value">Spring</span>
        </div>
        <div className="pd-metric-card">
          <span className="pd-metric-title">Active Departments</span>
          <span className="pd-metric-value">5</span>
        </div>
      </div>

      <h2 className="pd-section-title" style={{ marginTop: '16px' }}>University Operations</h2>
      
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
