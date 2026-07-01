import { useState, useEffect } from 'react';
import {
  IClock, IGrid, IList, IPalmtree, IChart, IUser, ISettings,
  IChevronL, IChevronR, ISun, IMoon, ILogout, IMenu, IX, IRefresh, IShare, IAddHome,
} from './icons';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

function readCollapsed() {
  return typeof document !== 'undefined' &&
    document.documentElement.dataset.sidebar === 'collapsed';
}
function readDark() {
  return typeof document !== 'undefined' &&
    document.documentElement.classList.contains('theme-dark');
}

export default function Sidebar({ tab, setTab, user, onLogout, working, pendingCount = 0, updateAvailable = false, onReload }) {
  const [collapsed, setCollapsed]     = useState(readCollapsed);
  const [dark, setDark]               = useState(readDark);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [showIosInstall, setShowIosInstall] = useState(false);

  const { canPrompt, isIOS, isStandalone, promptInstall } = useInstallPrompt();
  const canInstall = !isStandalone && (canPrompt || isIOS);

  const handleInstall = () => {
    if (canPrompt) { promptInstall(); }
    else if (isIOS) { setShowIosInstall(true); }
  };

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
        aria-label={updateAvailable ? 'פתח תפריט — גרסה חדשה זמינה' : 'פתח תפריט'}
        type="button"
      >
        <IMenu />
        {updateAvailable && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', top: 7, insetInlineEnd: 7,
              width: 9, height: 9, borderRadius: '50%',
              background: 'var(--primary)', boxShadow: '0 0 0 2px var(--surface)',
            }}
          />
        )}
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
            <strong>Hour Counter</strong>
            <span className={working ? 'live' : ''}>
              {working ? 'בעבודה כרגע' : 'by AK'}
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
          {updateAvailable && (
            <button
              className="sidebar-item"
              onClick={onReload}
              title="גרסה חדשה זמינה — רענן"
              type="button"
              style={{ background: 'var(--primary)', color: '#fff', marginBottom: 8, fontWeight: 700 }}
            >
              <span className="sidebar-item-icon"><IRefresh /></span>
              <span className="sidebar-item-label">גרסה חדשה — רענן</span>
            </button>
          )}
          {canInstall && (
            <button
              className="sidebar-item"
              onClick={handleInstall}
              title="הוסף למסך הבית"
              type="button"
              style={{ marginBottom: 4 }}
            >
              <span className="sidebar-item-icon"><IAddHome /></span>
              <span className="sidebar-item-label">הוסף למסך הבית</span>
            </button>
          )}
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

      {showIosInstall && (
        <IosInstallHelp onClose={() => setShowIosInstall(false)} />
      )}
    </>
  );
}

// iOS Safari can't trigger install programmatically — show the manual steps.
function IosInstallHelp({ onClose }) {
  const step = (n, text, icon) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
      <div style={{
        width: 26, height: 26, flex: '0 0 auto', borderRadius: '50%',
        background: 'var(--primary-soft, #e6f1f0)', color: 'var(--primary, #0f766e)',
        display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13,
      }}>{n}</div>
      <div style={{ fontSize: 14, color: 'var(--text, #1c1917)' }}>{text}</div>
      {icon && <span style={{ marginInlineStart: 'auto', color: 'var(--primary, #0f766e)' }}>{icon}</span>}
    </div>
  );
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.5)', display: 'flex',
        alignItems: 'flex-end', justifyContent: 'center',
        padding: 'env(safe-area-inset-bottom, 0px) 16px 16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
        style={{
          width: '100%', maxWidth: 400, background: 'var(--surface, #fff)',
          borderRadius: 18, padding: '20px 20px 16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4, color: 'var(--text, #1c1917)' }}>
          הוספה למסך הבית
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted, #78716c)', marginBottom: 8 }}>
          ב-Safari מוסיפים ידנית בשלושה צעדים:
        </div>
        {step(1, <>הקש על כפתור השיתוף בתחתית הדפדפן</>, <IShare width="20" height="20" />)}
        {step(2, <>גלול ובחר <b>״הוסף למסך הבית״</b></>, <IAddHome width="20" height="20" />)}
        {step(3, <>הקש <b>״הוסף״</b> בפינה העליונה</>)}
        <button
          type="button"
          onClick={onClose}
          className="btn2 primary"
          style={{ width: '100%', marginTop: 14 }}
        >
          הבנתי
        </button>
      </div>
    </div>
  );
}
