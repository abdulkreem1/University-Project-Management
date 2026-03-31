import React, { useState } from 'react';
import { login } from '../api';
import './Login.css';

export default function Login({ onLogin, onRegister }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(form.username, form.password);
      localStorage.setItem('access', res.data.access);
      localStorage.setItem('refresh', res.data.refresh);
      // Decode role from JWT payload
      const payload = JSON.parse(atob(res.data.access.split('.')[1]));
      onLogin({ username: form.username, role: payload.role, must_change_password: payload.must_change_password, department: payload.department });
    } catch (err) {
      console.error('Login error:', err.response?.status, err.response?.data);
      setError(err.response?.data?.detail || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="login-logo">🎓</div>
          <h1>Syrian Private University</h1>
          <p>Academic Management Portal</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              className="form-control"
              type="text"
              placeholder="Enter your username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="form-control"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="current-password"
            />
          </div>

          <button className="btn btn-primary login-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="login-footer">
          Syrian Private University &copy; {new Date().getFullYear()}
        </p>
        {onRegister && (
          <div style={{ textAlign: 'center', paddingBottom: '20px' }}>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#c8a84b', fontSize: '13px', cursor: 'pointer' }}
              onClick={onRegister}
            >
              First time? Verify your ID and create an account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
