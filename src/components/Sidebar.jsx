import { useState, useEffect } from 'react';
import {
  IClock, IGrid, IList, IPalmtree, IChart, IUser, ISettings,
  IChevronL, IChevronR, ISun, IMoon, ILogout, IMenu, IX,
} from './icons';

function readCollapsed() {
  return typeof document !== 'undefined' &&
    document.documentElement.dataset.sidebar === 'collapsed';
}
function readDark() {
  return typeof document !== 'undefined' &&
    document.documentElement.classList.contains('theme-dark');
}

export default function Sidebar({ tab, setTab, user, onLogout, working, pendingCount = 0 }) {
  const [collapsed, setCollapsed]     = useState(readCollapsed);
  const [dark, setDark]               = useState(readDark);
  const [mobileOpen, setMobileOpen]   = useState(false);

  // Sync mobile drawer state → html attribute so CSS can drive transforms
  useEffect(() => {
    document.documentElement.dataset.sidebarMobile = mobileOpen ? 'open' : 'closed';
    // Lock body scroll while drawer is open
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Close drawer on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

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

  // Wrapping setTab to also close the mobile drawer
  const navigate = (id) => {
    setTab(id);
    setMobileOpen(false);
  };

  const isAdmin = user?.role === 'admin';

  const nav = [
    { id: 'dashboard', label: 'מסך ראשי',     Icon: IGrid },
    { id: 'entries',   label: 'השעות שלי',    Icon: IList },
    { id: 'daysoff',   label: 'היעדרויות',    Icon: IPalmtree },
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
    <>
      {/* ===== Mobile-only hamburger trigger (visible only when drawer closed) ===== */}
      <button
        className="mobile-menu-trigger"
        onClick={() => setMobileOpen(true)}
        aria-label="פתח תפריט"
        type="button"
      >
        <IMenu />
      </button>

      {/* ===== Mobile-only backdrop ===== */}
      <div
        className="mobile-menu-backdrop"
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* ===== Sidebar (desktop right column / mobile drawer) ===== */}
      <aside className="sidebar">
        {/* Desktop-only collapse chevron */}
        <button
          className="sidebar-toggle"
          onClick={toggleCollapse}
          title={collapsed ? 'הרחב סרגל' : 'כווץ סרגל'}
          aria-label="toggle sidebar"
          type="button"
        >
          {collapsed ? <IChevronL /> : <IChevronR />}
        </button>

        {/* Mobile-only close button — same chevron-style spot, but X icon */}
        <button
          className="mobile-menu-close"
          onClick={() => setMobileOpen(false)}
          aria-label="סגור תפריט"
          type="button"
        >
          <IX />
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
            onClick={() => navigate(id)}
            title={label}
            type="button"
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
            type="button"
          >
            <span className="sidebar-item-icon">{dark ? <ISun /> : <IMoon />}</span>
            <span className="sidebar-item-label">{dark ? 'מצב יום' : 'מצב לילה'}</span>
          </button>

          <button
            className="sidebar-item"
            onClick={() => { setMobileOpen(false); onLogout(); }}
            title="יציאה"
            style={{ marginBottom: 8 }}
            type="button"
          >
            <span className="sidebar-item-icon"><ILogout /></span>
            <span className="sidebar-item-label">יציאה</span>
          </button>

          <div className="sidebar-user" onClick={() => navigate('account')}>
            <div className="sidebar-avatar">{(user?.name || '?').slice(0, 1)}</div>
            <div className="sidebar-user-meta">
              <strong>{user?.name || 'אורח'}</strong>
              <span>{isAdmin ? 'מנהל' : 'עובד'}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
