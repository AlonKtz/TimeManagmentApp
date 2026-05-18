import { useState, useEffect } from 'react';
import {
  IClock, IGrid, IList, IPalmtree, IChart, IUser, ISettings,
  IChevronL, IChevronR, ISun, IMoon, ILogout,
} from './icons';

// Read collapsed state from html dataset so it persists across re-mounts
function readCollapsed() {
  return typeof document !== 'undefined' &&
    document.documentElement.dataset.sidebar === 'collapsed';
}

// Read dark mode from html class
function readDark() {
  return typeof document !== 'undefined' &&
    document.documentElement.classList.contains('theme-dark');
}

export default function Sidebar({ tab, setTab, user, onLogout, working, pendingCount = 0 }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [dark, setDark] = useState(readDark);

  // Keep React state in sync if the html attributes change externally
  useEffect(() => {
    const onResize = () => setCollapsed(readCollapsed());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const toggleCollapse = () => {
    const html = document.documentElement;
    const next = html.dataset.sidebar === 'collapsed' ? 'expanded' : 'collapsed';
    html.dataset.sidebar = next;
    try { localStorage.setItem('th-sidebar', next); } catch {}
    setCollapsed(next === 'collapsed');
  };

  const toggleTheme = () => {
    const html = document.documentElement;
    html.classList.toggle('theme-dark');
    const isDark = html.classList.contains('theme-dark');
    try { localStorage.setItem('th-theme', isDark ? 'dark' : 'light'); } catch {}
    setDark(isDark);
  };

  const isAdmin = user?.role === 'admin';

  const nav = [
    { id: 'dashboard', label: 'מסך ראשי',     Icon: IGrid },
    { id: 'entries',   label: 'השעות שלי',    Icon: IList },
    { id: 'daysoff',   label: 'ימי חופש',     Icon: IPalmtree },
    { id: 'quarterly', label: 'סיכום רבעוני', Icon: IChart },
    { id: 'account',   label: 'החשבון שלי',   Icon: IUser },
  ];
  if (isAdmin) {
    nav.push({
      id: 'admin',
      label: 'הגדרות וניהול',
      Icon: ISettings,
      count: pendingCount > 0 ? pendingCount : null,
    });
  }

  return (
    <aside className="sidebar">
      <button
        className="sidebar-toggle"
        onClick={toggleCollapse}
        title={collapsed ? 'הרחב סרגל' : 'כווץ סרגל'}
        aria-label="toggle sidebar"
      >
        {collapsed ? <IChevronL /> : <IChevronR />}
      </button>

      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">
          <IClock style={{ width: 22, height: 22 }} />
        </div>
        <div className="sidebar-brand-text">
          <strong>שעות צוות</strong>
          <span className={working ? 'live' : ''}>
            {working ? 'בעבודה כרגע' : 'Team Hours'}
          </span>
        </div>
      </div>

      <div className="sidebar-section-label">ניווט</div>
      {nav.map(({ id, label, Icon, count }) => (
        <button
          key={id}
          className={`sidebar-item ${tab === id ? 'active' : ''}`}
          onClick={() => setTab(id)}
          title={label}
        >
          <span className="sidebar-item-icon"><Icon /></span>
          <span className="sidebar-item-label">{label}</span>
          {count != null && <span className="sidebar-item-count">{count}</span>}
        </button>
      ))}

      <div className="sidebar-footer">
        <button
          className="sidebar-item"
          onClick={toggleTheme}
          title={dark ? 'מצב יום' : 'מצב לילה'}
          style={{ marginBottom: 4 }}
        >
          <span className="sidebar-item-icon">{dark ? <ISun /> : <IMoon />}</span>
          <span className="sidebar-item-label">{dark ? 'מצב יום' : 'מצב לילה'}</span>
        </button>

        <button
          className="sidebar-item"
          onClick={onLogout}
          title="יציאה"
          style={{ marginBottom: 8 }}
        >
          <span className="sidebar-item-icon"><ILogout /></span>
          <span className="sidebar-item-label">יציאה</span>
        </button>

        <div className="sidebar-user" onClick={() => setTab('account')}>
          <div className="sidebar-avatar">
            {(user?.name || '?').slice(0, 1)}
          </div>
          <div className="sidebar-user-meta">
            <strong>{user?.name || 'אורח'}</strong>
            <span>{isAdmin ? 'מנהל' : 'עובד'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
