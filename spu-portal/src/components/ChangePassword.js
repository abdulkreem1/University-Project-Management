import React, { useState } from 'react';
import { changePassword } from '../api';
import './ChangePassword.css';

export default function ChangePassword({ user, onSuccess }) {
  const [form, setForm] = useState({ new_password: '', confirm_password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.new_password !== form.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await changePassword(form.new_password, form.confirm_password);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="cp-page">
      <div className="cp-card">
        <div className="cp-header">
          <div className="cp-icon" aria-hidden="true">🔐</div>
          <h1>Change Your Password</h1>
          <p>You must set a new password before continuing</p>
        </div>

        <div className="cp-body">
          <div className="cp-info" role="note">
            <span aria-hidden="true">ℹ️</span>
            Your current password is your university ID (<strong>{user.username}</strong>).
            Please choose a new secure password.
          </div>

          {error && <div className="alert alert-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="new_password">New Password</label>
              <input
                id="new_password"
                className="form-control"
                type="password"
                placeholder="At least 8 characters"
                value={form.new_password}
                onChange={set('new_password')}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm_password">Confirm Password</label>
              <input
                id="confirm_password"
                className="form-control"
                type="password"
                placeholder="Repeat your new password"
                value={form.confirm_password}
                onChange={set('confirm_password')}
                required
                autoComplete="new-password"
              />
            </div>

            {/* Password strength hints */}
            <ul className="cp-hints" aria-label="Password requirements">
              <li className={form.new_password.length >= 8 ? 'hint--ok' : ''}>
                At least 8 characters
              </li>
              <li className={/[a-zA-Z]/.test(form.new_password) ? 'hint--ok' : ''}>
                Contains letters
              </li>
              <li className={form.new_password !== user.username || !form.new_password ? 'hint--ok' : 'hint--fail'}>
                Not the same as your university ID
              </li>
            </ul>

            <button className="btn btn-primary cp-btn" type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Set New Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
