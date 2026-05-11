import { useState, useEffect } from 'react';
import { HEB_DAYS, HOLIDAY_TYPES, ISRAELI_HOLIDAYS, DEFAULT_SETTINGS } from '../constants';
import { ymd, parseYmd, fmtHours } from '../utils/date';

export default function AdminSettings({ settings, setSettings, users, setUsers, currentUser, auth }) {
  const [sh, setSh] = useState(settings.standardHours);
  const [hh, setHh] = useState(settings.holidayHours || DEFAULT_SETTINGS.holidayHours);
  const [overrideDate, setOverrideDate] = useState(ymd(new Date()));
  const [overrideHours, setOverrideHours] = useState('0');
  const [overrideNote, setOverrideNote] = useState('');
  const [flash, setFlash] = useState('');
  const [holidayFilter, setHolidayFilter] = useState('upcoming');

  useEffect(() => setSh(settings.standardHours), [settings.standardHours]);
  useEffect(() => setHh(settings.holidayHours || DEFAULT_SETTINGS.holidayHours), [settings.holidayHours]);

  const updateStandard = (dow, val) => {
    const n = parseFloat(val);
    setSh({ ...sh, [dow]: isNaN(n) ? 0 : n });
  };

  const saveStandard = () => {
    setSettings({ ...settings, standardHours: sh });
    setFlash('התקן השבועי נשמר');
    setTimeout(() => setFlash(''), 2000);
  };

  const updateHoliday = (type, val) => {
    const n = parseFloat(val);
    setHh({ ...hh, [type]: isNaN(n) ? 0 : n });
  };

  const saveHolidayHours = () => {
    setSettings({ ...settings, holidayHours: hh });
    setFlash('שעות החגים נשמרו');
    setTimeout(() => setFlash(''), 2000);
  };

  const toggleHolidayDisabled = (key) => {
    const disabled = settings.disabledHolidays || [];
    const next = disabled.includes(key)
      ? disabled.filter((k) => k !== key)
      : [...disabled, key];
    setSettings({ ...settings, disabledHolidays: next });
  };

  const addOverride = (e) => {
    e.preventDefault();
    const n = parseFloat(overrideHours);
    if (isNaN(n) || n < 0 || n > 24) { alert('הזן מספר שעות תקין'); return; }
    setSettings({
      ...settings,
      overrides: {
        ...settings.overrides,
        [overrideDate]: { hours: n, note: overrideNote.trim() || (n === 0 ? 'חג' : 'חריג'), type: 'custom' },
      },
    });
    setOverrideNote(''); setOverrideHours('0');
    setFlash('החריגה נוספה');
    setTimeout(() => setFlash(''), 2000);
  };

  const removeOverride = (key) => {
    if (!confirm('להסיר את החריגה?')) return;
    const { [key]: _, ...rest } = settings.overrides;
    setSettings({ ...settings, overrides: rest });
  };

  const removeUser = async (userId) => {
    if (userId === currentUser.id) return;
    if (!confirm('למחוק את המשתמש? כל הנתונים שלו יימחקו.')) return;
    await auth.deleteUser(userId);
  };

  const overrideList = Object.entries(settings.overrides || {}).sort((a, b) => b[0].localeCompare(a[0]));
  const pendingUsers = users.filter((u) => u.status === 'pending');
  const activeUsers  = users.filter((u) => u.status !== 'pending');

  const todayKey = ymd(new Date());
  const disabled = settings.disabledHolidays || [];
  const allHolidays = Object.entries(ISRAELI_HOLIDAYS)
    .map(([key, h]) => ({ key, ...h }))
    .sort((a, b) => a.key.localeCompare(b.key));
  const visibleHolidays = holidayFilter === 'upcoming'
    ? allHolidays.filter((h) => h.key >= todayKey)
    : allHolidays;

  return (
    <div>
      {flash && <div className="form-success" style={{ marginBottom: 16 }}>{flash}</div>}

      {/* ===== Pending users (only shown if Supabase somehow queues them) ===== */}
      {pendingUsers.length > 0 && (
        <div className="card" style={{ marginBottom: 20, border: '1px solid #fcd34d', background: 'var(--warning-soft)' }}>
          <div className="card-title">
            <span>⏳ משתמשים ממתינים לאישור</span>
            <span className="count">{pendingUsers.length} ממתינים</span>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>שם</th><th>אימייל</th><th>פעולות</th></tr>
              </thead>
              <tbody>
                {pendingUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td dir="ltr">{u.email}</td>
                    <td>
                      <div className="actions-inline">
                        <button className="btn btn-primary btn-sm" onClick={() => auth.approveUser(u.id)}>אישור ✓</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => { if (confirm('לדחות?')) auth.rejectUser(u.id); }}>דחייה ✗</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== Weekly hours standard ===== */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">תקן שעות שבועי</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
          קבע את מספר שעות העבודה הסטנדרטי לכל יום בשבוע. שישי ושבת אינם ימי עבודה.
        </div>
        <div className="admin-day-grid">
          {[0, 1, 2, 3, 4].map((dow) => (
            <div className="admin-day-card" key={dow}>
              <div className="day-name">יום {HEB_DAYS[dow]}</div>
              <div className="day-hours-input">
                <input
                  type="number" step="0.25" min="0" max="24"
                  value={sh[dow] ?? 0}
                  onChange={(e) => updateStandard(dow, e.target.value)}
                />
                <span>שעות</span>
              </div>
            </div>
          ))}
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={saveStandard}>שמירת תקן</button>
        </div>
      </div>

      {/* ===== Holiday hours ===== */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">שעות לפי סוג חג</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
          הגדרות אלו חלות אוטומטית על כל חגי ישראל הרלוונטיים.
        </div>
        <div className="admin-day-grid">
          {Object.entries(HOLIDAY_TYPES).map(([type, meta]) => (
            <div className="admin-day-card holiday" key={type}>
              <div className="day-name">{meta.label}</div>
              <div className="day-hours-input">
                <input
                  type="number" step="0.25" min="0" max="24"
                  value={hh[type] ?? meta.defaultHours}
                  onChange={(e) => updateHoliday(type, e.target.value)}
                />
                <span>שעות</span>
              </div>
            </div>
          ))}
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={saveHolidayHours}>שמירת שעות חגים</button>
        </div>
      </div>

      {/* ===== Holiday calendar ===== */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">
          לוח חגי ישראל
          <div style={{ display: 'flex', gap: 6 }}>
            <button className={`btn btn-sm ${holidayFilter === 'upcoming' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setHolidayFilter('upcoming')}>קרובים</button>
            <button className={`btn btn-sm ${holidayFilter === 'all'      ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setHolidayFilter('all')}>כולם</button>
          </div>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
          ניתן לכבות תאריך ספציפי על ידי לחיצה על הכפתור.
        </div>
        {visibleHolidays.length === 0 ? (
          <div className="empty"><div className="empty-icon">📅</div><div className="empty-text">אין חגים קרובים</div></div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>תאריך</th><th>יום</th><th>שם החג</th><th>סוג</th><th>שעות</th><th style={{ textAlign: 'left' }}>סטטוס</th></tr>
              </thead>
              <tbody>
                {visibleHolidays.map((h) => {
                  const d = parseYmd(h.key);
                  const isDisabled = disabled.includes(h.key);
                  const hours = hh[h.type] ?? HOLIDAY_TYPES[h.type].defaultHours;
                  const pillClass = h.type === 'chag' ? 'pill-danger' : h.type === 'erev' ? 'pill-warning' : h.type === 'memorial' ? 'pill-info' : 'pill-muted';
                  return (
                    <tr key={h.key} style={isDisabled ? { opacity: 0.5 } : {}}>
                      <td>{d.getDate()}.{d.getMonth() + 1}.{d.getFullYear()}</td>
                      <td>{HEB_DAYS[d.getDay()]}</td>
                      <td>{h.note}</td>
                      <td><span className={`pill ${pillClass}`}>{HOLIDAY_TYPES[h.type].label}</span></td>
                      <td style={{ fontWeight: 600 }}>
                        {isDisabled ? <span style={{ color: 'var(--text-soft)', fontWeight: 400 }}>—</span> : fmtHours(hours)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => toggleHolidayDisabled(h.key)}>
                            {isDisabled ? 'הפעלה מחדש' : 'ביטול'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== Custom overrides ===== */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">חריגות מותאמות אישית</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
          לתאריכים שאינם חגים רשמיים — יום עבודה מקוצר, אירוע חברה, חופשה מרוכזת וכו'.
        </div>
        <form onSubmit={addOverride}>
          <div className="form-row">
            <div>
              <label className="form-label">תאריך</label>
              <input type="date" value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} required />
            </div>
            <div>
              <label className="form-label">שעות ליום זה</label>
              <input type="number" step="0.25" min="0" max="24" value={overrideHours} onChange={(e) => setOverrideHours(e.target.value)} required />
              <div className="hint">הזן 0 ליום חופש מלא</div>
            </div>
            <div>
              <label className="form-label">תיאור</label>
              <input type="text" value={overrideNote} onChange={(e) => setOverrideNote(e.target.value)} placeholder="יום גיבוש, ערב חגיגה..." />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">הוספת חריגה</button>
          </div>
        </form>

        <div className="divider"></div>

        {overrideList.length === 0 ? (
          <div className="empty"><div className="empty-icon">📅</div><div className="empty-text">לא הוגדרו חריגות מותאמות</div></div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>תאריך</th><th>יום</th><th>שעות</th><th>תיאור</th><th style={{ textAlign: 'left' }}>פעולות</th></tr>
              </thead>
              <tbody>
                {overrideList.map(([key, val]) => {
                  const d = parseYmd(key);
                  return (
                    <tr key={key}>
                      <td>{d.getDate()}.{d.getMonth() + 1}.{d.getFullYear()}</td>
                      <td>{HEB_DAYS[d.getDay()]}</td>
                      <td style={{ fontWeight: 600 }}>{fmtHours(val.hours)}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{val.note || '—'}</td>
                      <td>
                        <div className="actions-inline">
                          <button className="icon-btn danger" onClick={() => removeOverride(key)} title="מחיקה">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== User management ===== */}
      <div className="card">
        <div className="card-title">
          ניהול משתמשים פעילים
          <span className="count">{activeUsers.length} משתמשים</span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>שם</th><th>אימייל</th><th>תפקיד</th><th>תאריך הצטרפות</th><th style={{ textAlign: 'left' }}>פעולות</th></tr>
            </thead>
            <tbody>
              {activeUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="user-avatar" style={{ width: 28, height: 28, fontSize: 12 }}>{u.name.charAt(0)}</div>
                      {u.name}
                      {u.id === currentUser.id && <span className="pill pill-info">זה אתה</span>}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }} dir="ltr">{u.email}</td>
                  <td>
                    {u.role === 'admin'
                      ? <span className="pill pill-warning">מנהל</span>
                      : <span className="pill pill-muted">עובד</span>}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('he-IL') : '—'}
                  </td>
                  <td>
                    <div className="actions-inline">
                      {u.id !== currentUser.id && (
                        <button className="icon-btn danger" onClick={() => removeUser(u.id)} title="מחיקה">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
