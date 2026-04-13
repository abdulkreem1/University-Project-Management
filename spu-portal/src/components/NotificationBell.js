import React, { useState, useEffect, useRef } from 'react';
import { fetchNotifications, fetchUnreadCount, markNotifRead, markAllNotifsRead } from '../api';
import './NotificationBell.css';

const TYPE_ICON = {
  idea_submitted:           '💡',
  idea_approved:            '✅',
  idea_rejected:            '❌',
  proposal_submitted:       '📋',
  proposal_approved_sup:    '✅',
  proposal_approved_hod:    '✅',
  proposal_rejected:        '❌',
  proposal_assigned:        '🎉',
  application_submitted:    '📩',
  application_approved_doc: '✅',
  application_approved_hod: '✅',
  application_rejected:     '❌',
  application_registered:   '🎉',
  invitation_received:      '📨',
  invitation_accepted:      '✅',
  invitation_rejected:      '❌',
};

export default function NotificationBell() {
  const [count, setCount]         = useState(0);
  const [notifs, setNotifs]       = useState([]);
  const [open, setOpen]           = useState(false);
  const [loaded, setLoaded]       = useState(false);
  const wrapRef                   = useRef(null);

  // Poll unread count every 30s
  useEffect(() => {
    const load = () => fetchUnreadCount().then((r) => setCount(r.data.count)).catch(() => {});
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = async () => {
    setOpen((prev) => !prev);
    if (!loaded) {
      try {
        const res = await fetchNotifications();
        setNotifs(res.data);
        setLoaded(true);
      } catch { /* ignore */ }
    }
  };

  const handleRead = async (id) => {
    await markNotifRead(id).catch(() => {});
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAll = async () => {
    await markAllNotifsRead().catch(() => {});
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setCount(0);
  };

  return (
    <div className="nb-wrap" ref={wrapRef}>
      <button className="nb-btn" onClick={handleOpen} aria-label={`Notifications${count > 0 ? `, ${count} unread` : ''}`}>
        <span className="nb-icon" aria-hidden="true">🔔</span>
        {count > 0 && <span className="nb-badge">{count > 99 ? '99+' : count}</span>}
      </button>

      {open && (
        <div className="nb-dropdown" role="dialog" aria-label="Notifications">
          <div className="nb-header">
            <span className="nb-header-title">Notifications</span>
            {count > 0 && (
              <button className="nb-mark-all" onClick={handleMarkAll}>Mark all read</button>
            )}
          </div>

          {notifs.length === 0 && (
            <div className="nb-empty">No notifications yet.</div>
          )}

          <ul className="nb-list">
            {notifs.map((n) => (
              <li
                key={n.id}
                className={`nb-item ${n.is_read ? '' : 'nb-item--unread'}`}
                onClick={() => !n.is_read && handleRead(n.id)}
              >
                <span className="nb-item-icon" aria-hidden="true">
                  {TYPE_ICON[n.notif_type] || '🔔'}
                </span>
                <div className="nb-item-body">
                  <span className="nb-item-title">{n.title}</span>
                  <span className="nb-item-msg">{n.message}</span>
                  <span className="nb-item-time">
                    {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {!n.is_read && <span className="nb-dot" aria-hidden="true" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
