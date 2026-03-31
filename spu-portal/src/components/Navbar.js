import React from 'react';
import './Navbar.css';

const ROLE_LABELS = {
  dean: 'Dean',
  admin: 'Administrator',
  hod: 'Head of Department',
  doctor: 'Doctor',
  student: 'Student',
};

export default function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-brand">
        <span className="navbar-logo" aria-hidden="true">🎓</span>
        <div>
          <span className="navbar-title">Syrian Private University</span>
          <span className="navbar-subtitle">Academic Portal</span>
        </div>
      </div>

      <div className="navbar-user">
        <div className="user-info">
          <span className="user-name">{user.username}</span>
          <span className="user-role">{ROLE_LABELS[user.role] || user.role}</span>
        </div>
        <button className="btn btn-outline navbar-logout" onClick={onLogout} aria-label="Sign out">
          Sign Out
        </button>
      </div>
    </nav>
  );
}
