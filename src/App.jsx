import { useState, useEffect } from 'react';
import { STORAGE_KEYS, DEFAULT_SETTINGS, DEFAULT_LOCATION } from './constants';
import { saveData, loadAllData } from './utils/storage';
import { ymd, fmtTime24, diffHours } from './utils/date';
import { useAuth } from './hooks/useAuth';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import EntriesTab from './components/EntriesTab';
import AdminSettings from './components/AdminSettings';
import AccountSettings from './components/AccountSettings';
import DaysOff from './components/DaysOff';
import QuarterlyView from './components/QuarterlyView';

export default function App() {
  const auth = useAuth();
  const [tab, setTab] = useState('dashboard');

  const [entries, setEntries] = useState({});
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [activePunches, setActivePunches] = useState({});
  const [daysOff, setDaysOff] = useState({});
  const [appLoaded, setAppLoaded] = useState(false);

  // Load app data from localforage on mount
  useEffect(() => {
    loadAllData([
      STORAGE_KEYS.entries,
      STORAGE_KEYS.settings,
      STORAGE_KEYS.activePunch,
      STORAGE_KEYS.daysOff,
    ]).then((data) => {
      const loadedSettings = data[STORAGE_KEYS.settings];
      setEntries(data[STORAGE_KEYS.entries] || {});
      setSettings(loadedSettings && loadedSettings.standardHours
        ? loadedSettings
        : { ...DEFAULT_SETTINGS, ...(loadedSettings || {}) });
      setActivePunches(data[STORAGE_KEYS.activePunch] || {});
      setDaysOff(data[STORAGE_KEYS.daysOff] || {});
      setAppLoaded(true);
    });
  }, []);

  // Save app data on change (fire-and-forget)
  useEffect(() => { if (appLoaded) saveData(STORAGE_KEYS.entries, entries); }, [entries, appLoaded]);
  useEffect(() => { if (appLoaded) saveData(STORAGE_KEYS.settings, settings); }, [settings, appLoaded]);
  useEffect(() => { if (appLoaded) saveData(STORAGE_KEYS.activePunch, activePunches); }, [activePunches, appLoaded]);
  useEffect(() => { if (appLoaded) saveData(STORAGE_KEYS.daysOff, daysOff); }, [daysOff, appLoaded]);

  // Show loading screen until both auth and app data are ready
  if (!auth.authLoaded || !appLoaded) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
        background: 'var(--bg)',
        color: 'var(--text-muted)',
        fontSize: 15,
      }}>
        <div style={{
          width: 40, height: 40,
          borderRadius: '50%',
          border: '3px solid var(--border)',
          borderTopColor: 'var(--primary)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span>טוען...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!auth.currentUser) {
    return <LoginScreen auth={auth} />;
  }

  const user = auth.currentUser;
  const userEntries = entries[user.id] || [];
  const activePunch = activePunches[user.id] || null;
  const userDaysOff = daysOff[user.id] || [];

  const handlePunch = ({ action, location }) => {
    if (action === 'start') {
      if (activePunch) return;
      setActivePunches({
        ...activePunches,
        [user.id]: { start: new Date().toISOString(), location: location || DEFAULT_LOCATION },
      });
    } else if (action === 'stop') {
      if (!activePunch) return;
      const startDate = new Date(activePunch.start);
      const endDate = new Date();
      const hours = diffHours(activePunch.start, endDate.toISOString());
      if (hours < 0.01) {
        if (!confirm('פחות מדקה נרשמה. להפסיק בכל זאת?')) return;
      }
      const newEntry = {
        id: 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        date: ymd(startDate),
        hours: Math.round(hours * 100) / 100,
        start: fmtTime24(startDate),
        end: fmtTime24(endDate),
        note: '',
        mode: 'range',
        location: location || activePunch.location || DEFAULT_LOCATION,
        createdAt: new Date().toISOString(),
        viaPunch: true,
      };
      setEntries({ ...entries, [user.id]: [...userEntries, newEntry] });
      const { [user.id]: _, ...restPunches } = activePunches;
      setActivePunches(restPunches);
    }
  };

  const handleEditPunch = (newStartIso) => {
    if (!activePunch) return;
    setActivePunches({ ...activePunches, [user.id]: { ...activePunch, start: newStartIso } });
  };

  const pendingCount = auth.users.filter(u => u.status === 'pending').length;

  const tabs = [
    { id: 'dashboard', label: 'מסך ראשי' },
    { id: 'entries', label: 'השעות שלי' },
    { id: 'daysoff', label: 'ימי חופש' },
    { id: 'quarterly', label: 'סיכום רבעוני' },
    { id: 'account', label: 'החשבון שלי' },
  ];
  if (user.role === 'admin') tabs.push({
    id: 'admin',
    label: pendingCount > 0 ? `הגדרות וניהול (${pendingCount})` : 'הגדרות וניהול',
  });

  return (
    <div className="app">
      <div className="topbar">
        <div className="topbar-title">
          <div className="logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          מעקב שעות צוות
        </div>
        <div className="topbar-user">
          <div className="user-chip">
            <div className="user-avatar">{user.name.charAt(0)}</div>
            <span>{user.name}</span>
            {user.role === 'admin' && <span className="admin-badge">מנהל</span>}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={auth.logout}>יציאה</button>
        </div>
      </div>

      <div className="tabs">
        {tabs.map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <Dashboard
          user={user}
          entries={userEntries}
          settings={settings}
          setSettings={setSettings}
          activePunch={activePunch}
          onPunch={handlePunch}
          onEditPunch={handleEditPunch}
          daysOff={userDaysOff}
        />
      )}
      {tab === 'entries' && (
        <EntriesTab
          user={user}
          entries={entries}
          setEntries={setEntries}
          settings={settings}
          daysOff={userDaysOff}
        />
      )}
      {tab === 'daysoff' && (
        <DaysOff
          userId={user.id}
          daysOff={daysOff}
          setDaysOff={setDaysOff}
          settings={settings}
          jobPercent={user.jobPercent ?? 100}
        />
      )}
      {tab === 'quarterly' && (
        <QuarterlyView
          user={user}
          entries={userEntries}
          settings={settings}
          daysOff={daysOff}
        />
      )}
      {tab === 'account' && (
        <AccountSettings user={user} auth={auth} />
      )}
      {tab === 'admin' && user.role === 'admin' && (
        <AdminSettings
          settings={settings}
          setSettings={setSettings}
          users={auth.users}
          setUsers={auth.setUsers}
          currentUser={user}
          auth={auth}
        />
      )}
    </div>
  );
}
