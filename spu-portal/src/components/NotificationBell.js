import React, { useState, useEffect, useRef } from 'react';
import {
  fetchNotifications,
  fetchUnreadCount,
  fetchNotificationSummary,
  markNotifRead,
  markAllNotifsRead,
  archiveNotification,
  archiveReadNotifications,
} from '../api';
import './NotificationBell.css';

const Icons = {
  Bell: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Check: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  XCircle: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  FileText: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Mail: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  Inbox: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
  Archive: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
};

const TYPE_ICON = {
  idea_submitted: { icon: Icons.FileText, color: 'text-primary' },
  idea_approved: { icon: Icons.Check, color: 'text-success' },
  idea_rejected: { icon: Icons.XCircle, color: 'text-danger' },
  proposal_submitted: { icon: Icons.FileText, color: 'text-primary' },
  proposal_approved_sup: { icon: Icons.Check, color: 'text-success' },
  proposal_approved_hod: { icon: Icons.Check, color: 'text-success' },
  proposal_rejected: { icon: Icons.XCircle, color: 'text-danger' },
  proposal_assigned: { icon: Icons.Check, color: 'text-success' },
  application_submitted: { icon: Icons.Mail, color: 'text-primary' },
  application_approved_doc: { icon: Icons.Check, color: 'text-success' },
  application_approved_hod: { icon: Icons.Check, color: 'text-success' },
  application_rejected: { icon: Icons.XCircle, color: 'text-danger' },
  application_registered: { icon: Icons.Check, color: 'text-success' },
  invitation_received: { icon: Icons.Mail, color: 'text-primary' },
  invitation_accepted: { icon: Icons.Check, color: 'text-success' },
  invitation_rejected: { icon: Icons.XCircle, color: 'text-danger' },
  withdrawal_requested: { icon: Icons.FileText, color: 'text-warning' },
  withdrawal_approved: { icon: Icons.Check, color: 'text-success' },
  withdrawal_rejected: { icon: Icons.XCircle, color: 'text-danger' },
  task_created: { icon: Icons.FileText, color: 'text-muted' },
  task_assigned: { icon: Icons.FileText, color: 'text-warning' },
  task_updated: { icon: Icons.FileText, color: 'text-primary' },
  task_completed: { icon: Icons.Check, color: 'text-success' },
  task_comment_added: { icon: Icons.Mail, color: 'text-primary' },
  task_attachment_added: { icon: Icons.FileText, color: 'text-primary' },
  workflow_applied: { icon: Icons.FileText, color: 'text-warning' },
  workflow_stage_submitted: { icon: Icons.FileText, color: 'text-warning' },
  workflow_stage_approved: { icon: Icons.Check, color: 'text-success' },
  workflow_stage_rejected: { icon: Icons.XCircle, color: 'text-danger' },
  account_created: { icon: Icons.Check, color: 'text-success' },
  account_imported: { icon: Icons.Check, color: 'text-success' },
  password_changed: { icon: Icons.Check, color: 'text-success' },
  hod_assigned: { icon: Icons.Check, color: 'text-warning' },
};

const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'account', label: 'Account' },
  { value: 'project', label: 'Project' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'application', label: 'Application' },
  { value: 'invitation', label: 'Invitation' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'task', label: 'Task' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'system', label: 'System' },
];

function formatSafeDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(date);
}

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [notifs, setNotifs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('active');
  const [categoryFilter, setCategoryFilter] = useState('');
  const wrapRef = useRef(null);
  const pollingRef = useRef(false);

  useEffect(() => {
    let active = true;
    let timeoutId = null;

    const loadCount = async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      try {
        const response = await fetchUnreadCount();
        if (active) {
          setCount(response.data.count || 0);
          setUrgentCount(response.data.urgent_count || 0);
        }
      } catch { /* ignore polling failures */ }
      finally {
        pollingRef.current = false;
        if (active) timeoutId = setTimeout(loadCount, 30000);
      }
    };

    loadCount();
    return () => { active = false; clearTimeout(timeoutId); };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [listResponse, summaryResponse] = await Promise.all([
          fetchNotifications({ status: statusFilter, category: categoryFilter, limit: 75 }),
          fetchNotificationSummary(),
        ]);
        if (!active) return;
        setNotifs(listResponse.data || []);
        setSummary(summaryResponse.data || null);
      } catch { /* keep previous content */ }
      finally { if (active) setLoading(false); }
    };
    load();
    return () => { active = false; };
  }, [open, statusFilter, categoryFilter]);

  const refreshCounts = async () => {
    try {
      const response = await fetchUnreadCount();
      setCount(response.data.count || 0);
      setUrgentCount(response.data.urgent_count || 0);
    } catch { /* ignore */ }
  };

  const handleOpen = () => setOpen((prev) => !prev);

  const handleRead = async (notification) => {
    if (notification.is_read) return;
    await markNotifRead(notification.id).catch(() => {});
    setNotifs((prev) => prev.map((n) => n.id === notification.id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n));
    setCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAll = async () => {
    await markAllNotifsRead().catch(() => {});
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: n.read_at || new Date().toISOString() })));
    setCount(0);
    setUrgentCount(0);
  };

  const handleArchive = async (e, notification) => {
    e.stopPropagation();
    await archiveNotification(notification.id).catch(() => {});
    setNotifs((prev) => prev.filter((n) => n.id !== notification.id));
    if (!notification.is_read) setCount((c) => Math.max(0, c - 1));
    refreshCounts();
  };

  const handleArchiveRead = async () => {
    await archiveReadNotifications().catch(() => {});
    setNotifs((prev) => prev.filter((n) => !n.is_read));
  };

  const handleAction = async (e, notification) => {
    e.stopPropagation();
    await handleRead(notification);
    if (notification.action_url) window.location.assign(notification.action_url);
  };

  return (
    <div className="nb-wrap" ref={wrapRef}>
      <button className="nb-btn" aria-expanded={open} onClick={handleOpen} aria-label={`Notifications${count > 0 ? `, ${count} unread` : ''}`}>
        <span className="nb-icon" aria-hidden="true">{Icons.Bell}</span>
        {count > 0 && <span className={`nb-badge ${urgentCount > 0 ? 'nb-badge--urgent' : ''}`}>{count > 99 ? '99+' : count}</span>}
      </button>

      {open && (
        <div className="nb-dropdown" role="dialog" aria-label="Notifications" dir="ltr">
          <div className="nb-header">
            <div>
              <span className="nb-header-title">Notification Center</span>
              <span className="nb-header-subtitle">{summary ? `${summary.unread} unread of ${summary.total}` : 'System updates'}</span>
            </div>
            <div className="nb-header-actions">
              {count > 0 && <button className="nb-link-btn" onClick={handleMarkAll}>Mark all read</button>}
              <button className="nb-link-btn" onClick={handleArchiveRead}>Archive read</button>
            </div>
          </div>

          <div className="nb-filters">
            <div className="nb-status-tabs" role="tablist" aria-label="Notification status filter">
              {[
                ['active', 'All'],
                ['unread', 'Unread'],
                ['read', 'Read'],
                ['archived', 'Archived'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={`nb-status-tab ${statusFilter === value ? 'active' : ''}`}
                  onClick={() => setStatusFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="nb-category-select" aria-label="Filter by category">
              {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          {loading && <div className="nb-loading">Loading notifications...</div>}

          {!loading && notifs.length === 0 && (
            <div className="nb-empty">
              <div className="nb-empty-icon">{Icons.Inbox}</div>
              <p>No notifications match this view.</p>
            </div>
          )}

          {!loading && notifs.length > 0 && (
            <ul className="nb-list">
              {notifs.map((notification) => {
                const conf = TYPE_ICON[notification.notif_type] || { icon: Icons.Bell, color: 'text-muted' };
                return (
                  <li
                    key={notification.id}
                    className={`nb-item ${notification.is_read ? '' : 'nb-item--unread'}`}
                    onClick={() => handleRead(notification)}
                  >
                    <div className={`nb-item-icon-wrap ${conf.color}`}>{conf.icon}</div>
                    <div className="nb-item-body">
                      <div className="nb-item-title-row">
                        <span className="nb-item-title">{notification.title}</span>
                        <span className={`nb-priority nb-priority--${notification.priority}`}>{notification.priority_label || notification.priority}</span>
                      </div>
                      <span className="nb-item-msg">{notification.message}</span>
                      <div className="nb-item-meta">
                        <span>{notification.category_label || notification.category}</span>
                        {notification.actor_name && <span>From {notification.actor_name}</span>}
                        <span>{formatSafeDate(notification.created_at)}</span>
                      </div>
                      {notification.action_url && notification.action_label && (
                        <button className="nb-action-btn" onClick={(e) => handleAction(e, notification)}>{notification.action_label}</button>
                      )}
                    </div>
                    <button className="nb-archive-btn" onClick={(e) => handleArchive(e, notification)} aria-label="Archive notification">{Icons.Archive}</button>
                    {!notification.is_read && <span className="nb-dot" aria-hidden="true" />}
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
