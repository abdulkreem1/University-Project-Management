import React, { useState } from 'react';
import { studentSelfRegister } from '../api';
import './Login.css';
import './SelfRegister.css';

export default function SelfRegister({ onRegistered, onBack }) {
  const [form, setForm] = useState({ university_id: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await studentSelfRegister(form.university_id, form.password);
      localStorage.setItem('access', res.data.access);
      localStorage.setItem('refresh', res.data.refresh);
      const payload = JSON.parse(atob(res.data.access.split('.')[1]));
      onRegistered({
        username: payload.username,
        role: payload.role,
        must_change_password: payload.must_change_password,
        department: payload.department,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-split-container">
      {/* Left Side: Branding (Consistent with Login) */}
      <div className="login-branding">
        <div className="branding-overlay"></div>
        <div className="branding-content">
          <div className="branding-logo">🎓</div>
          <h2>Syrian Private University</h2>
          <p>Graduation Project Management Ecosystem</p>
        </div>
      </div>

      {/* Right Side: Verification Form */}
      <div className="login-form-container">
        <div className="login-form-inner">
          <div className="login-mobile-logo">🎓</div>
          <h1 className="login-title">Student Verification</h1>
          <p className="login-subtitle">Verify your identity to create your account</p>

          <div className="sr-info" role="note">
            Enter your University ID and password to verify your eligibility.
            Access will be granted automatically.
          </div>

          <form onSubmit={handleSubmit} className="login-form-main">
            {error && <div className="alert alert-error" role="alert">{error}</div>}

            <div className="form-group">
              <label htmlFor="university_id">University ID</label>
              <input
                id="university_id"
                className="form-control"
                type="text"
                placeholder="e.g. 2024001234"
                value={form.university_id}
                onChange={set('university_id')}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="sr_password">Password</label>
              <input
                id="sr_password"
                className="form-control"
                type="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={set('password')}
                required
              />
            </div>

            <button className="btn btn-primary login-btn-modern" type="submit" disabled={loading}>
              {loading ? 'Verifying…' : 'Verify & Access Portal'}
            </button>

            <button type="button" className="sr-back-modern" onClick={onBack}>
              ← Back to Login
            </button>
          </form>

          <footer className="login-form-footer">
            &copy; {new Date().getFullYear()} Syrian Private University. All Rights Reserved.
          </footer>
        </div>
      </div>
    </div>
  );
}
