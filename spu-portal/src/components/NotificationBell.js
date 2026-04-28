import React, { useState, useEffect, useRef } from 'react';
import { fetchNotifications, fetchUnreadCount, markNotifRead, markAllNotifsRead } from '../api';
import './NotificationBell.css';

/* Premium SVG Icons for Notifications */
const Icons = {
  Bell: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Lightbulb: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>,
  Check: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  XCircle: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  FileText: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Party: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Mail: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  Inbox: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
};

const TYPE_ICON = {
  idea_submitted:           { icon: Icons.Lightbulb, color: 'text-primary' },
  idea_approved:            { icon: Icons.Check, color: 'text-success' },
  idea_rejected:            { icon: Icons.XCircle, color: 'text-danger' },
  proposal_submitted:       { icon: Icons.FileText, color: 'text-primary' },
  proposal_approved_sup:    { icon: Icons.Check, color: 'text-success' },
  proposal_approved_hod:    { icon: Icons.Check, color: 'text-success' },
  proposal_rejected:        { icon: Icons.XCircle, color: 'text-danger' },
  proposal_assigned:        { icon: Icons.Party, color: 'text-success' },
  application_submitted:    { icon: Icons.Mail, color: 'text-primary' },
  application_approved_doc: { icon: Icons.Check, color: 'text-success' },
  application_approved_hod: { icon: Icons.Check, color: 'text-success' },
  application_rejected:     { icon: Icons.XCircle, color: 'text-danger' },
  application_registered:   { icon: Icons.Party, color: 'text-success' },
  invitation_received:      { icon: Icons.Mail, color: 'text-primary' },
  invitation_accepted:      { icon: Icons.Check, color: 'text-success' },
  invitation_rejected:      { icon: Icons.XCircle, color: 'text-danger' },
};

function formatSafeDate(dateString) {
  const d = new Date(dateString);
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  });
  return formatter.format(d);
}

export default function NotificationBell() {
  const [count, setCount]         = useState(0);
  const [notifs, setNotifs]       = useState([]);
  const [open, setOpen]           = useState(false);
  const [loaded, setLoaded]       = useState(false);
  const wrapRef                   = useRef(null);
  const pollingRef                = useRef(false);

  // Poll unread count every 30s
  useEffect(() => {
    let active = true;
    let timeoutId = null;

    const load = async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      try {
        const r = await fetchUnreadCount();
        if (active) setCount(r.data.count);
      } catch { /* ignore */ }
      finally {
        pollingRef.current = false;
        if (active) timeoutId = setTimeout(load, 30000);
      }
    };

    load();
    return () => { active = false; clearTimeout(timeoutId); };
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
      <button className="nb-btn" aria-expanded={open} onClick={handleOpen} aria-label={`Notifications${count > 0 ? `, ${count} unread` : ''}`}>
        <span className="nb-icon" aria-hidden="true">{Icons.Bell}</span>
        {count > 0 && <span className="nb-badge">{count > 99 ? '99+' : count}</span>}
      </button>

      {open && (
        <div className="nb-dropdown" role="dialog" aria-label="Notifications" dir="ltr">
          <div className="nb-header">
            <span className="nb-header-title">Notifications</span>
            {count > 0 && (
              <button className="nb-mark-all" onClick={handleMarkAll}>Mark all read</button>
            )}
          </div>

          {notifs.length === 0 && (
            <div className="nb-empty">
              <div className="nb-empty-icon">{Icons.Inbox}</div>
              <p>You have no notifications yet.</p>
            </div>
          )}

          {notifs.length > 0 && (
            <ul className="nb-list">
              {notifs.map((n) => {
                const conf = TYPE_ICON[n.notif_type] || { icon: Icons.Bell, color: 'text-muted' };
                return (
                  <li
                    key={n.id}
                    className={`nb-item ${n.is_read ? '' : 'nb-item--unread'}`}
                    onClick={() => !n.is_read && handleRead(n.id)}
                  >
                    <div className={`nb-item-icon-wrap ${conf.color}`}>
                      {conf.icon}
                    </div>
                    <div className="nb-item-body">
                      <span className="nb-item-title">{n.title}</span>
                      <span className="nb-item-msg">{n.message}</span>
                      <span className="nb-item-time">{formatSafeDate(n.created_at)}</span>
                    </div>
                    {!n.is_read && <span className="nb-dot" aria-hidden="true" />}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
