import { useState, useEffect, useRef } from 'react';
import { DEFAULT_SETTINGS, DEFAULT_LOCATION } from './constants';
import { ymd, fmtTime24, diffHours } from './utils/date';
import { loadPunch, savePunch } from './utils/storage';
import { getPersonalDailyTarget } from './utils/business';
import sb from './lib/supabase';
import { useAuth } from './hooks/useAuth';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import EntriesTab from './components/EntriesTab';
import AdminSettings from './components/AdminSettings';
import AccountSettings from './components/AccountSettings';
import DaysOff from './components/DaysOff';
import QuarterlyView from './components/QuarterlyView';

// Convert DB time_entries row → app entry format
function normalizeEntry(r) {
  return {
    id: r.id,
    date: typeof r.date === 'string' ? r.date.slice(0, 10) : r.date,
    hours: Number(r.hours),
    start: r.start_time,
    end: r.end_time,
    note: r.note || '',
    mode: r.mode || 'range',
    location: r.location || DEFAULT_LOCATION,
    viaPunch: r.via_punch,
    createdAt: r.created_at,
  };
}

export default function App() {
  const auth = useAuth();
  const [tab, setTab] = useState('dashboard');

  // flat array of entries for the current user
  const [entries, setEntriesState] = useState([]);
  const [settings, setSettingsState] = useState(DEFAULT_SETTINGS);
  const [activePunch, setActivePunchState] = useState(null);
  // daysOff kept as { [userId]: ['YYYY-MM-DD', ...] } for compat with DaysOff + Dashboard display
  const [daysOff, setDaysOffState] = useState({});
  const [dataLoaded, setDataLoaded] = useState(false);

  // Refs to avoid stale closures inside async callbacks
  const entriesRef  = useRef([]);
  const daysOffRef  = useRef({});
  const settingsRef = useRef(DEFAULT_SETTINGS);
  useEffect(() => { entriesRef.current  = entries;  }, [entries]);
  useEffect(() => { daysOffRef.current  = daysOff;  }, [daysOff]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const user = auth.currentUser;

  // ── Load all data when user logs in ─────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setEntriesState([]);
      setSettingsState(DEFAULT_SETTINGS);
      setDaysOffState({});
      setActivePunchState(null);
      setDataLoaded(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        await Promise.all([loadEntries(), loadSettings(), loadDaysOff(), loadPunchState()]);
      } catch (e) {
        console.error('[app] initial load error:', e);
      }
      if (!cancelled) setDataLoaded(true);

      // Admin: pre-load user list
      if (user.role === 'admin') auth.loadUsers();
    };

    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  // ── Real-time subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const unsub = sb.subscribe(user.id, () => loadEntries());
    return unsub;
  }, [user?.id]);

  // ── Re-fetch when tab becomes visible (cross-device sync) ─────────────────
  useEffect(() => {
    if (!user) return;
    let hiddenAt = null;
    let lastFetch = 0;

    const onVisibility = async () => {
      if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
      const hiddenMs = hiddenAt ? Date.now() - hiddenAt : 0;
      hiddenAt = null;
      if (Date.now() - lastFetch < 8000) return; // debounce rapid tab-switches
      lastFetch = Date.now();

      // Refresh JWT if hidden > 5 min
      if (hiddenMs > 5 * 60 * 1000) {
        const raw = localStorage.getItem('tt_session');
        const session = raw ? JSON.parse(raw) : null;
        if (session?.refresh_token) {
          try {
            const res = await sb.refreshSession(session.refresh_token);
            if (res.access_token) {
              sb._token = res.access_token;
              localStorage.setItem('tt_session', JSON.stringify({
                access_token: res.access_token,
                refresh_token: res.refresh_token,
              }));
            }
          } catch {}
        }
      }

      loadEntries();
      loadSettings();
      loadPunchState();
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [user?.id]);

  // ── Window focus: re-fetch ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let lastFocus = 0;
    const onFocus = () => {
      if (Date.now() - lastFocus < 8000) return;
      lastFocus = Date.now();
      loadEntries();
      loadPunchState();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user?.id]);

  // ── Data loaders ──────────────────────────────────────────────────────────

  const loadEntries = async () => {
    if (!user) return;
    try {
      const rows = await sb.select(
        'time_entries',
        `user_id=eq.${user.id}&order=date.desc,created_at.desc`
      );
      setEntriesState(rows.map(normalizeEntry));
    } catch (e) {
      console.error('[app] loadEntries:', e);
    }
  };

  const loadSettings = async () => {
    try {
      const rows = await sb.select('settings', '');
      const map = {};
      for (const r of rows) map[r.key] = r.value;

      const ovRows = await sb.select('day_overrides', 'order=date.asc');
      const overrides = {};
      const disabledHolidays = [];
      for (const r of ovRows) {
        if (r.disabled) {
          disabledHolidays.push(r.date);
        } else {
          overrides[r.date] = { hours: r.hours, note: r.note, type: r.type };
        }
      }

      setSettingsState({
        standardHours: map.standardHours ?? DEFAULT_SETTINGS.standardHours,
        holidayHours:  map.holidayHours  ?? DEFAULT_SETTINGS.holidayHours,
        disabledHolidays,
        overrides,
      });
    } catch (e) {
      console.error('[app] loadSettings:', e);
    }
  };

  const loadDaysOff = async () => {
    if (!user) return;
    try {
      const rows = await sb.select('days_off', `user_id=eq.${user.id}&order=date.desc`);
      setDaysOffState({ [user.id]: rows.map((r) => r.date) });
    } catch (e) {
      console.error('[app] loadDaysOff:', e);
      setDaysOffState({});
    }
  };

  const loadPunchState = async () => {
    if (!user) return;
    try {
      const rows = await sb.select('profiles', `id=eq.${user.id}&select=punch_state`);
      const serverPunch = rows[0]?.punch_state;
      if (serverPunch?.start) {
        setActivePunchState(serverPunch);
        savePunch(serverPunch);
      } else if (serverPunch === null) {
        const local = loadPunch();
        if (local) { setActivePunchState(null); savePunch(null); }
      }
    } catch {
      // punch_state column might not exist yet — fallback to localStorage
      const local = loadPunch();
      if (local) setActivePunchState(local);
    }
  };

  // ── Entries CRUD (diff-based upsert/delete) ───────────────────────────────

  // entriesByUser = { [userId]: [...] }  (EntriesTab's interface)
  const setEntries = async (entriesByUser) => {
    if (!user) return;
    const next = entriesByUser[user.id] || [];
    await saveEntries(next);
  };

  const saveEntries = async (nextEntries) => {
    const prevEntries = entries;
    setEntriesState(nextEntries); // optimistic

    const currentIds = new Set(prevEntries.map((e) => e.id));
    const nextIds    = new Set(nextEntries.map((e) => e.id));

    // Delete removed entries
    for (const id of [...currentIds].filter((id) => !nextIds.has(id))) {
      try { await sb.delete('time_entries', 'id', id); }
      catch (err) { console.error('[app] delete entry:', err); }
    }

    // Upsert new or changed entries
    const toUpsert = nextEntries.filter(
      (e) =>
        !currentIds.has(e.id) ||
        JSON.stringify(e) !== JSON.stringify(prevEntries.find((x) => x.id === e.id))
    );
    for (const e of toUpsert) {
      try {
        await sb.upsert(
          'time_entries',
          {
            id: e.id,
            user_id: user.id,
            date: e.date,
            hours: e.hours,
            start_time: e.start || null,
            end_time: e.end || null,
            note: e.note || '',
            mode: e.mode || 'range',
            location: e.location || DEFAULT_LOCATION,
            via_punch: e.viaPunch || false,
            created_at: e.createdAt || new Date().toISOString(),
          },
          'id'
        );
      } catch (err) {
        console.error('[app] upsert entry:', err);
      }
    }
  };

  // ── Settings save ────────────────────────────────────────────────────────
  const setSettings = async (next) => {
    setSettingsState(next);
    try {
      await sb.upsert(
        'settings',
        { key: 'standardHours', value: next.standardHours, updated_at: new Date().toISOString() },
        'key'
      );
      await sb.upsert(
        'settings',
        { key: 'holidayHours', value: next.holidayHours, updated_at: new Date().toISOString() },
        'key'
      );

      const existing = await sb.select('day_overrides', 'select=date');
      const existingDates = existing.map((r) => r.date);

      const desiredRows = [];
      for (const [date, ov] of Object.entries(next.overrides || {})) {
        desiredRows.push({ date, hours: ov.hours, note: ov.note || '', type: ov.type || 'custom', disabled: false });
      }
      for (const date of next.disabledHolidays || []) {
        desiredRows.push({ date, hours: 0, note: '', type: 'disabled', disabled: true });
      }

      const desiredDates = new Set(desiredRows.map((r) => r.date));
      const toDelete = existingDates.filter((d) => !desiredDates.has(d));
      if (toDelete.length) await sb.deleteMulti('day_overrides', 'date', toDelete);
      for (const row of desiredRows) {
        await sb.upsert('day_overrides', row, 'date');
      }
    } catch (e) {
      console.error('[app] settings save:', e);
    }
  };

  // ── Days Off save ────────────────────────────────────────────────────────
  // A day off = a permanent time entry for the full standard hours of that day.
  // The days_off table is used for display/reference; the entry provides the hours.
  const setDaysOff = async (nextMap) => {
    if (!user) return;

    // Use refs to avoid stale closure
    const prevDates = daysOffRef.current[user.id] || [];
    const nextDates = nextMap[user.id] || [];

    const toAdd    = nextDates.filter((d) => !prevDates.includes(d));
    const toRemove = prevDates.filter((d) => !nextDates.includes(d));

    setDaysOffState(nextMap); // optimistic UI

    // ── Add new days off ──────────────────────────────────────────────────
    for (const date of toAdd) {
      // 1. Persist to days_off table (plain INSERT — no composite unique constraint needed)
      try {
        await fetch(`${sb._url}/rest/v1/days_off`, {
          method: 'POST',
          headers: sb.headers({ Prefer: 'return=minimal' }),
          body: JSON.stringify({ user_id: user.id, date }),
        });
      } catch (e) {
        console.error('[app] add day off row:', e);
      }

      // 2. Auto-create a time entry for the standard hours of that day
      const d = new Date(date + 'T12:00:00'); // noon to avoid DST edge cases
      const dayHours = getPersonalDailyTarget(d, settingsRef.current, user.jobPercent ?? 100);
      if (dayHours > 0) {
        const newEntry = {
          id: 'dayoff_' + date + '_' + user.id.slice(0, 6),
          date,
          hours: dayHours,
          start: null,
          end: null,
          note: 'יום חופש',
          mode: 'dayoff',
          location: DEFAULT_LOCATION,
          viaPunch: false,
          createdAt: new Date().toISOString(),
        };
        const currentEntries = entriesRef.current;
        // Only add if no dayoff entry for this date already exists
        if (!currentEntries.some((e) => e.date === date && e.mode === 'dayoff')) {
          await saveEntries([...currentEntries, newEntry]);
        }
      }
    }

    // ── Remove days off ───────────────────────────────────────────────────
    for (const date of toRemove) {
      // 1. Delete from days_off table
      try {
        await fetch(
          `${sb._url}/rest/v1/days_off?user_id=eq.${encodeURIComponent(user.id)}&date=eq.${encodeURIComponent(date)}`,
          { method: 'DELETE', headers: sb.headers() }
        );
      } catch (e) {
        console.error('[app] remove day off row:', e);
      }

      // 2. Delete the corresponding dayoff entry
      const currentEntries = entriesRef.current;
      const nextEntries = currentEntries.filter((e) => !(e.date === date && e.mode === 'dayoff'));
      if (nextEntries.length !== currentEntries.length) {
        await saveEntries(nextEntries);
      }
    }
  };

  // ── Punch ────────────────────────────────────────────────────────────────
  const setActivePunch = (v) => { savePunch(v); setActivePunchState(v); };

  const handlePunch = async ({ action, location }) => {
    if (action === 'start') {
      if (activePunch) return;
      const now = await sb.serverTime();
      const punch = { start: now.toISOString(), location: location || DEFAULT_LOCATION };
      setActivePunch(punch);
      try { await sb.updateProfile(user.id, { punch_state: punch }); } catch {}
    } else if (action === 'stop') {
      if (!activePunch) return;
      const now = await sb.serverTime();
      const startDate = new Date(activePunch.start);
      const hours = diffHours(activePunch.start, now.toISOString());
      if (hours < 0.01) {
        if (!confirm('פחות מדקה נרשמה. להפסיק בכל זאת?')) return;
      }
      const newEntry = {
        id: 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        date: ymd(startDate),
        hours: Math.round(hours * 100) / 100,
        start: fmtTime24(startDate),
        end: fmtTime24(now),
        note: '',
        mode: 'range',
        location: location || activePunch.location || DEFAULT_LOCATION,
        viaPunch: true,
        createdAt: now.toISOString(),
      };
      setActivePunch(null);
      try { await sb.updateProfile(user.id, { punch_state: null }); } catch {}
      await saveEntries([...entries, newEntry]);
    }
  };

  const handleEditPunch = (newStartIso) => {
    if (!activePunch) return;
    const updated = { ...activePunch, start: newStartIso };
    setActivePunch(updated);
    try { sb.updateProfile(user.id, { punch_state: updated }); } catch {}
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (!auth.authLoaded) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <LoginScreen auth={auth} />;
  }

  if (!dataLoaded) {
    return <LoadingSpinner />;
  }

  // EntriesTab expects entries keyed by userId
  const entriesByUser = { [user.id]: entries };
  const userDaysOff = daysOff[user.id] || [];
  const pendingCount = auth.users.filter((u) => u.status === 'pending').length;

  const tabs = [
    { id: 'dashboard', label: 'מסך ראשי' },
    { id: 'entries',   label: 'השעות שלי' },
    { id: 'daysoff',   label: 'ימי חופש' },
    { id: 'quarterly', label: 'סיכום רבעוני' },
    { id: 'account',   label: 'החשבון שלי' },
  ];
  if (user.role === 'admin') {
    tabs.push({
      id: 'admin',
      label: pendingCount > 0 ? `הגדרות וניהול (${pendingCount})` : 'הגדרות וניהול',
    });
  }

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
        {tabs.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <Dashboard
          user={user}
          entries={entries}
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
          entries={entriesByUser}
          setEntries={setEntries}
          settings={settings}
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
          entries={entries}
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

function LoadingSpinner() {
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
