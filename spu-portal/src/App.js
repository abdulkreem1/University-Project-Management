import React, { useState } from 'react';
import './index.css';
import { logoutUser } from './api';
import Login from './components/Login';
import SelfRegister from './components/SelfRegister';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import ImportUsers from './components/ImportUsers';
import StudentDashboard from './components/StudentDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import HodDashboard from './components/HodDashboard';
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

  if (user.role === 'student') return <><Navbar user={user} onLogout={handleLogout} /><StudentDashboard user={user} /></>;
  if (user.role === 'doctor')  return <><Navbar user={user} onLogout={handleLogout} /><DoctorDashboard  user={user} /></>;
  if (user.role === 'hod')     return <><Navbar user={user} onLogout={handleLogout} /><HodDashboard     user={user} /></>;

  const canImport = ['dean', 'admin'].includes(user.role);

  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} />
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
        <aside style={sidebarStyle} role="navigation" aria-label="Sidebar">
          <nav>
            <SidebarItem icon="🏠" label="Dashboard"    active={page === 'dashboard'}  onClick={() => setPage('dashboard')} />
            {canImport && <SidebarItem icon="📥" label="Import Users"  active={page === 'import'}      onClick={() => setPage('import')} />}
            {canImport && <SidebarItem icon="👨‍💼" label="Assign HoD"    active={page === 'assign-hod'}  onClick={() => setPage('assign-hod')} />}
          </nav>
        </aside>
        <main style={{ flex: 1, background: '#f4f6f9' }}>
          {page === 'dashboard'  && <Dashboard user={user} onNavigate={setPage} />}
          {page === 'import'     && canImport && <ImportUsers />}
          {page === 'assign-hod' && canImport && <AssignHod />}
        </main>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        width: '100%', padding: '12px 20px', border: 'none',
        background: active ? 'rgba(200,168,75,.15)' : 'transparent',
        borderLeft: active ? '3px solid #c8a84b' : '3px solid transparent',
        color: active ? '#c8a84b' : '#cdd5e0',
        fontWeight: active ? 700 : 400, fontSize: '14px',
        cursor: 'pointer', textAlign: 'left', transition: 'background .15s',
      }}
    >
      <span aria-hidden="true">{icon}</span>{label}
    </button>
  );
}

const sidebarStyle = {
  width: '220px',
  background: '#0d2137',
  paddingTop: '16px',
  flexShrink: 0,
};
