import React, { useState } from 'react';
import './RoleDashboard.css';
import MyIdeas from './MyIdeas';
import SubmitIdea from './SubmitIdea';
import SupervisorReview from './SupervisorReview';
import DoctorApplicationReview from './DoctorApplicationReview';
import SupervisorProjects from './SupervisorProjects';
import WorkflowBuilder from './WorkflowBuilder';
import ApplyWorkflow from './ApplyWorkflow';
import WorkflowReview from './WorkflowReview';

/* Premium SVG Icons */
const Icons = {
  Book: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>,
  ClipboardList: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14h6"/><path d="M9 18h6"/><path d="M9 10h6"/></svg>,
  Calendar: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Lightbulb: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2A7 7 0 0 0 5 9c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/></svg>,
  FileText: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Inbox: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
  Kanban: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></svg>,
  ChevronRight: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
};

const CARDS = [
  { icon: Icons.Book, label: 'My Courses',          desc: 'Courses you teach',                  page: null },
  { icon: Icons.ClipboardList, label: 'Student Grades',      desc: 'Enter & manage grades',              page: null },
  { icon: Icons.Calendar, label: 'Schedule',            desc: 'Your teaching schedule',             page: null },
  { icon: Icons.Lightbulb, label: 'My Ideas',            desc: 'Submit & track project ideas',       page: 'my-ideas' },
  { icon: Icons.FileText, label: 'Student Proposals',   desc: 'Review proposals assigned to you',   page: 'supervisor-review' },
  { icon: Icons.Inbox, label: 'Idea Applications',   desc: 'Review student applications on your ideas', page: 'app-review' },
  { icon: Icons.Kanban, label: 'Supervised Projects',  desc: 'Track progress of registered student projects', page: 'supervised-projects' },
  { icon: Icons.FileText, label: 'Workflow Builder',     desc: 'Create dynamic project workflows',          page: 'workflow' },
  { icon: Icons.ClipboardList, label: 'Apply Workflow',       desc: 'Apply workflow templates to projects',      page: 'applyworkflow' },
  { icon: Icons.ClipboardList, label: 'Review Workflows',     desc: 'Review and approve workflow submissions',   page: 'reviewworkflow' },
];

export default function DoctorDashboard({ user }) {
  const [page, setPage] = useState('dashboard');

  if (page === 'my-ideas')             return <MyIdeas onBack={() => setPage('dashboard')} onSubmitNew={() => setPage('submit-idea')} />;
  if (page === 'submit-idea')          return <SubmitIdea onBack={() => setPage('my-ideas')} />;
  if (page === 'supervisor-review')    return <SupervisorReview onBack={() => setPage('dashboard')} />;
  if (page === 'app-review')           return <DoctorApplicationReview onBack={() => setPage('dashboard')} />;
  if (page === 'supervised-projects')  return <SupervisorProjects onBack={() => setPage('dashboard')} />;
  if (page === 'workflow')             return <WorkflowBuilder onBack={() => setPage('dashboard')} />;
  if (page === 'applyworkflow')        return <ApplyWorkflow onBack={() => setPage('dashboard')} />;
  if (page === 'reviewworkflow')       return <WorkflowReview onBack={() => setPage('dashboard')} />;

  return (
    <div className="premium-dashboard">
      <header className="pd-header">
        <div className="pd-greeting-area">
          <h1 className="pd-title">Faculty Portal</h1>
          <p className="pd-subtitle">Welcome back, Dr. {user.username}. Have a great day.</p>
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
          <span className="pd-metric-title">Department</span>
          <span className="pd-metric-value" style={{fontSize: '24px'}}>{user.department || 'Faculty'}</span>
        </div>
        <div className="pd-metric-card">
          <span className="pd-metric-title">Tasks Pending</span>
          <span className="pd-metric-value pd-metric-warning">0</span>
        </div>
      </div>

      <h2 className="pd-section-title" style={{ marginTop: '16px' }}>Faculty Modules</h2>
      
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
