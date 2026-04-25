import React, { useState } from 'react';
import './RoleDashboard.css';
import ProposeIdea from './ProposeIdea';
import BrowseIdeas from './BrowseIdeas';
import MyInvitations from './MyInvitations';
import MyProject from './MyProject';

/* Premium SVG Icons */
const Icons = {
  Book: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>,
  Target: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  Calendar: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Search: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Lightbulb: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2A7 7 0 0 0 5 9c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/></svg>,
  Mail: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  Kanban: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></svg>,
  ChevronRight: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Dashboard: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
};

const CARDS = [
  { icon: Icons.Book, label: 'My Courses',       desc: 'View enrolled courses',           page: null },
  { icon: Icons.Target, label: 'My Grades',        desc: 'Check your results',              page: null },
  { icon: Icons.Calendar, label: 'Schedule',         desc: 'Weekly timetable',                page: null },
  { icon: Icons.Search, label: 'Browse Ideas',     desc: 'Browse & apply on project ideas', page: 'browse' },
  { icon: Icons.Lightbulb, label: 'Propose Idea',     desc: 'Submit your own project idea',    page: 'propose' },
  { icon: Icons.Mail, label: 'Team Invitations', desc: 'Respond to team invitations',     page: 'invitations' },
  { icon: Icons.Kanban, label: 'My Project',       desc: 'Manage your project board',        page: 'myproject' },
];

function SidebarItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`sidebar-item ${active ? 'active' : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      <span aria-hidden="true" className="sidebar-item-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function StudentDashboard({ user }) {
  const [page, setPage] = useState('dashboard');

  const renderContent = () => {
    if (page === 'propose')     return <ProposeIdea    onBack={() => setPage('dashboard')} />;
    if (page === 'browse')      return <BrowseIdeas    onBack={() => setPage('dashboard')} />;
    if (page === 'invitations') return <MyInvitations  onBack={() => setPage('dashboard')} />;
    if (page === 'myproject')   return <MyProject user={user} />;

    return (
      <div className="premium-dashboard">
        <header className="pd-header">
          <div className="pd-greeting-area">
            <h1 className="pd-title">Student Portal</h1>
            <p className="pd-subtitle">Welcome back, {user.username}. Here is your academic overview.</p>
          </div>
          <div className="pd-term-badge">
            <span className="pd-term-label">Academic Year</span>
            <span className="pd-term-value">25/26 - Spring</span>
          </div>
        </header>

        {/* Bento Metrics Row (Replaces info strip) */}
        <div className="pd-metrics-row">
          <div className="pd-metric-card">
            <span className="pd-metric-title">Current Semester</span>
            <span className="pd-metric-value">Spring</span>
          </div>
          <div className="pd-metric-card">
            <span className="pd-metric-title">Enrollment Status</span>
            <span className="pd-metric-value" style={{color: 'var(--success)'}}>Active</span>
          </div>
          <div className="pd-metric-card">
            <span className="pd-metric-title">Tasks Pending</span>
            <span className="pd-metric-value pd-metric-warning">0</span>
          </div>
        </div>

        <h2 className="pd-section-title" style={{ marginTop: '16px' }}>Academic Modules</h2>
        
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
  };

  return (
    <div className="app-layout" style={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
      <main style={{ flex: 1, background: '#F8F9FD', overflow: 'auto' }}>
        {renderContent()}
      </main>

      <aside className="sidebar-container" role="navigation" aria-label="Sidebar">
        <nav className="sidebar-nav">
          <SidebarItem 
            icon={Icons.Dashboard} 
            label="Overview"    
            active={page === 'dashboard'}  
            onClick={() => setPage('dashboard')} 
          />
          <SidebarItem 
            icon={Icons.Search} 
            label="Browse Ideas"  
            active={page === 'browse'}      
            onClick={() => setPage('browse')} 
          />
          <SidebarItem 
            icon={Icons.Lightbulb} 
            label="Propose Idea"    
            active={page === 'propose'}  
            onClick={() => setPage('propose')} 
          />
          <SidebarItem 
            icon={Icons.Mail} 
            label="Team Invitations"    
            active={page === 'invitations'}  
            onClick={() => setPage('invitations')} 
          />
          <SidebarItem 
            icon={Icons.Kanban} 
            label="My Project"    
            active={page === 'myproject'}  
            onClick={() => setPage('myproject')} 
          />
        </nav>
      </aside>
    </div>
  );
}
