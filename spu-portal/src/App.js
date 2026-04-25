import React, { useState } from 'react';
import './index.css';
import './App.css';
import { logoutUser } from './api';
import Login from './components/Login';
import SelfRegister from './components/SelfRegister';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import ImportUsers from './components/ImportUsers';
import StudentDashboard from './components/StudentDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import HodDashboard from './components/HodDashboard';
import DeanDashboard from './components/DeanDashboard';
import AssignHod from './components/AssignHod';
import ChangePassword from './components/ChangePassword';

export default function App() {
  const [user, setUser]     = useState(null);
  const [page, setPage]     = useState('dashboard');
  const [screen, setScreen] = useState('login'); // 'login' | 'register'

  const handleLogin      = (u) => { setUser(u); setPage('dashboard'); setScreen('login'); };
  const handleRegistered = (u) => { setUser(u); setPage('dashboard'); };

  const handleLogout = async () => {
    try { await logoutUser(); } catch { /* proceed */ }
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    setUser(null);
    setScreen('login');
    setPage('dashboard');
  };

  const handlePasswordChanged = () => setUser({ ...user, must_change_password: false });

  if (!user) {
    if (screen === 'register')
      return <SelfRegister onRegistered={handleRegistered} onBack={() => setScreen('login')} />;
    return <Login onLogin={handleLogin} onRegister={() => setScreen('register')} />;
  }

  if (user.must_change_password)
    return <ChangePassword user={user} onSuccess={handlePasswordChanged} />;

  if (user.role === 'student') return <><Navbar user={user} onLogout={handleLogout} currentPage={page} /><StudentDashboard user={user} /></>;
  if (user.role === 'doctor')  return <><Navbar user={user} onLogout={handleLogout} currentPage={page} /><DoctorDashboard  user={user} /></>;
  if (user.role === 'hod')     return <><Navbar user={user} onLogout={handleLogout} currentPage={page} /><HodDashboard     user={user} /></>;
  if (user.role === 'dean')    return <><Navbar user={user} onLogout={handleLogout} currentPage={page} /><DeanDashboard    user={user} /></>;

  // Only dean has admin privileges (import users, assign HoD)
  const canImport = user.role === 'dean';

  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} currentPage={page} />
      <div className="app-layout" style={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
        <main style={{ flex: 1, background: '#F8F9FD', overflow: 'auto' }}>
          {page === 'dashboard'  && <Dashboard user={user} onNavigate={setPage} />}
          {page === 'import'     && canImport && <ImportUsers />}
          {page === 'assign-hod' && canImport && <AssignHod />}
        </main>

        <aside className="sidebar-container" role="navigation" aria-label="Sidebar">
          <nav className="sidebar-nav">
            <SidebarItem 
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>} 
              label="Dashboard"    
              active={page === 'dashboard'}  
              onClick={() => setPage('dashboard')} 
            />
            {canImport && (
              <SidebarItem 
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>} 
                label="Import Users"  
                active={page === 'import'}      
                onClick={() => setPage('import')} 
              />
            )}
            {canImport && (
              <SidebarItem 
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>} 
                label="Assign HoD"    
                active={page === 'assign-hod'}  
                onClick={() => setPage('assign-hod')} 
              />
            )}
          </nav>
        </aside>
      </div>
    </div>
  );
}

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
