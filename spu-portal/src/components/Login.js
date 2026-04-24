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
    <div className="login-split-container">
      {/* Left Side: Branding */}
      <div className="login-branding">
        <div className="branding-overlay"></div>
        <div className="branding-content">
          <div className="branding-logo">🎓</div>
          <h2>Syrian Private University</h2>
          <p>Graduation Project Management Ecosystem   </p>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="login-form-container">
        <div className="login-form-inner">
          <div className="login-mobile-logo">🎓</div>
          <h1 className="login-title">Academic Portal</h1>
          <p className="login-subtitle">Sign in to manage your project</p>

          <form onSubmit={handleSubmit} className="login-form-main">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                className="form-control"
                type="text"
                placeholder="e.g. 4210XXXX"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                className="form-control"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <button className="btn btn-primary login-btn-modern" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>

          {onRegister && (
            <div className="login-registration-cue">
              <span>New to the portal?</span>
              <button type="button" onClick={onRegister} className="btn-link">
                Register now
              </button>
            </div>
          )}

          <footer className="login-form-footer">
            &copy; {new Date().getFullYear()} Syrian Private University | Faculty of AI Engineering
          </footer>
        </div>
      </div>
    </div>
  );
}
