import React, { useState } from 'react';
import { studentSelfRegister } from '../api';
import './Login.css';
import './SelfRegister.css';

export default function SelfRegister({ onRegistered, onBack }) {
  const [form, setForm]   = useState({ university_id: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await studentSelfRegister(form.university_id, form.password);
      localStorage.setItem('access',  res.data.access);
      localStorage.setItem('refresh', res.data.refresh);
      const payload = JSON.parse(atob(res.data.access.split('.')[1]));
      onRegistered({
        username:             payload.username,
        role:                 payload.role,
        must_change_password: payload.must_change_password,
        department:           payload.department,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo" aria-hidden="true">🎓</div>
          <h1>Student Verification</h1>
          <p>Syrian Private University</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="sr-info" role="note">
            Enter your University ID and password to verify your eligibility.
            Your account will be created automatically upon successful verification.
          </div>

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
              autoComplete="username"
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
              autoComplete="current-password"
            />
          </div>

          <button className="btn btn-primary login-btn" type="submit" disabled={loading}>
            {loading ? 'Verifying…' : 'Verify & Access Portal'}
          </button>

          <button type="button" className="sr-back" onClick={onBack}>
            ← Back to Login
          </button>
        </form>

        <p className="login-footer">Syrian Private University &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
