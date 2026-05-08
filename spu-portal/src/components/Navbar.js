import React from 'react';
import './Navbar.css';
import NotificationBell from './NotificationBell';

const ROLE_LABELS = {
  dean: 'Dean',
  admin: 'Administrator',
  hod: 'Head of Department',
  doctor: 'Doctor',
  student: 'Student',
};

export default function Navbar({ user, onLogout, currentPage }) {
  const showBell = ['student', 'doctor', 'hod', 'dean', 'admin'].includes(user.role);

  const getBreadcrumb = () => {
    const roleName = ROLE_LABELS[user.role] || user.role;
    if (!currentPage || currentPage === 'dashboard') return roleName;
    const pageName = currentPage.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return `${roleName} / ${pageName}`;
  };

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-left">
        <div className="navbar-brand">
          <span className="navbar-logo" aria-hidden="true">🎓</span>
          <span className="navbar-title">SPU Portal</span>
        </div>
        <div className="breadcrumbs" aria-label="Breadcrumbs">
          <span className="breadcrumb-item">Home</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{getBreadcrumb()}</span>
        </div>
      </div>

      <div className="navbar-user">
        {showBell && <NotificationBell />}
        <div className="user-profile-trigger">
          <div className="user-info">
            <span className="user-name">{user.username}</span>
            <span className="user-role">{ROLE_LABELS[user.role] || user.role}</span>
          </div>
          <button className="btn btn-outline-danger navbar-logout" onClick={onLogout} aria-label="Sign out">
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
