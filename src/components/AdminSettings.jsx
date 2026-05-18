import { useState, useEffect } from 'react';
import { HEB_DAYS, HOLIDAY_TYPES, ISRAELI_HOLIDAYS, DEFAULT_SETTINGS } from '../constants';
import { ymd, parseYmd, fmtHours } from '../utils/date';
import { ITrash, IPlus } from './icons';

export default function AdminSettings({ settings, setSettings, users, currentUser, auth }) {
  const [sh, setSh] = useState(settings.standardHours);
  const [hh, setHh] = useState(settings.holidayHours || DEFAULT_SETTINGS.holidayHours);
  const [overrideDate, setOverrideDate]   = useState(ymd(new Date()));
  const [overrideHours, setOverrideHours] = useState('0');
  const [overrideNote, setOverrideNote]   = useState('');
  const [flash, setFlash]                 = useState('');
  const [holidayFilter, setHolidayFilter] = useState('upcoming');

  useEffect(() => setSh(settings.standardHours), [settings.standardHours]);
  useEffect(() => setHh(settings.holidayHours || DEFAULT_SETTINGS.holidayHours), [settings.holidayHours]);

  const showFlash = (msg) => { setFlash(msg); setTimeout(() => setFlash(''), 2000); };

  const updateStandard = (dow, val) => {
    const n = parseFloat(val);
    setSh({ ...sh, [dow]: isNaN(n) ? 0 : n });
  };
  const saveStandard = () => { setSettings({ ...settings, standardHours: sh }); showFlash('התקן השבועי נשמר'); };

  const updateHoliday = (type, val) => {
    const n = parseFloat(val);
    setHh({ ...hh, [type]: isNaN(n) ? 0 : n });
  };
  const saveHolidayHours = () => { setSettings({ ...settings, holidayHours: hh }); showFlash('שעות החגים נשמרו'); };

  const toggleHolidayDisabled = (key) => {
    const disabled = settings.disabledHolidays || [];
    const next = disabled.includes(key) ? disabled.filter((k) => k !== key) : [...disabled, key];
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
    showFlash('החריגה נוספה');
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
      <div className="topbar2">
        <div className="topbar2-left">
          <div className="topbar2-eyebrow">ניהול מערכת</div>
          <div className="topbar2-title">הגדרות וניהול</div>
        </div>
      </div>

      {flash && (
        <div style={{ background: 'var(--success-soft)', color: 'var(--success)', padding: '10px 14px', borderRadius: 10, marginBottom: 14, fontSize: 13, fontWeight: 600 }}>
          ✓ {flash}
        </div>
      )}

      {/* ===== Pending users ===== */}
      {pendingUsers.length > 0 && (
        <div className="card2" style={{ marginBottom: 16, borderColor: 'color-mix(in oklab, var(--warning) 30%, var(--border))' }}>
          <div className="card2-title">
            <h3>⏳ משתמשים ממתינים לאישור</h3>
            <span className="pill2 warning">{pendingUsers.length} ממתינים</span>
          </div>
          <div className="table-wrap" style={{ overflowX: 'auto' }}>
            <table className="table2">
              <thead><tr><th>שם</th><th>אימייל</th><th>פעולות</th></tr></thead>
              <tbody>
                {pendingUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td dir="ltr">{u.email}</td>
                    <td>
                      <div className="row">
                        <button className="btn2 primary" onClick={() => auth.approveUser(u.id)} style={{ padding: '6px 12px' }}>אישור ✓</button>
                        <button className="btn2 ghost" style={{ color: 'var(--danger)', padding: '6px 12px' }} onClick={() => { if (confirm('לדחות?')) auth.rejectUser(u.id); }}>דחייה ✗</button>
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
      <div className="card2" style={{ marginBottom: 16 }}>
        <div className="card2-title"><h3>תקן שעות שבועי</h3></div>
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="btn2 primary" onClick={saveStandard}>שמירת תקן</button>
        </div>
      </div>

      {/* ===== Holiday hours ===== */}
      <div className="card2" style={{ marginBottom: 16 }}>
        <div className="card2-title"><h3>שעות לפי סוג חג</h3></div>
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="btn2 primary" onClick={saveHolidayHours}>שמירת שעות חגים</button>
        </div>
      </div>

      {/* ===== Holiday calendar ===== */}
      <div className="card2" style={{ marginBottom: 16 }}>
        <div className="card2-title">
          <h3>לוח חגי ישראל</h3>
          <div className="row" style={{ gap: 6 }}>
            <button
              className={`btn2 ${holidayFilter === 'upcoming' ? 'primary' : 'ghost'}`}
              onClick={() => setHolidayFilter('upcoming')}
              style={{ padding: '6px 12px', fontSize: 12 }}
            >קרובים</button>
            <button
              className={`btn2 ${holidayFilter === 'all' ? 'primary' : 'ghost'}`}
              onClick={() => setHolidayFilter('all')}
              style={{ padding: '6px 12px', fontSize: 12 }}
            >כולם</button>
          </div>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14 }}>
          ניתן לכבות תאריך ספציפי על ידי לחיצה על הכפתור.
        </div>
        {visibleHolidays.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📅</div>
            <div>אין חגים קרובים</div>
          </div>
        ) : (
          <div className="table-wrap" style={{ overflowX: 'auto' }}>
            <table className="table2">
              <thead>
                <tr><th>תאריך</th><th>יום</th><th>שם החג</th><th>סוג</th><th>שעות</th><th style={{ textAlign: 'end' }}>סטטוס</th></tr>
              </thead>
              <tbody>
                {visibleHolidays.map((h) => {
                  const d = parseYmd(h.key);
                  const isDisabled = disabled.includes(h.key);
                  const hours = hh[h.type] ?? HOLIDAY_TYPES[h.type].defaultHours;
                  const tone = h.type === 'chag' ? 'danger' : h.type === 'erev' ? 'warning' : h.type === 'memorial' ? 'info' : 'muted';
                  return (
                    <tr key={h.key} style={isDisabled ? { opacity: 0.5 } : {}}>
                      <td>{d.getDate()}.{d.getMonth() + 1}.{d.getFullYear()}</td>
                      <td>{HEB_DAYS[d.getDay()]}</td>
                      <td>{h.note}</td>
                      <td><span className={`pill2 ${tone}`}>{HOLIDAY_TYPES[h.type].label}</span></td>
                      <td>
                        {isDisabled ? <span style={{ color: 'var(--text-soft)' }}>—</span> : <b>{fmtHours(hours)}</b>}
                      </td>
                      <td>
                        <div className="row" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn2 ghost" onClick={() => toggleHolidayDisabled(h.key)} style={{ padding: '4px 10px', fontSize: 12 }}>
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
      <div className="card2" style={{ marginBottom: 16 }}>
        <div className="card2-title"><h3>חריגות מותאמות אישית</h3></div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14 }}>
          לתאריכים שאינם חגים רשמיים — יום עבודה מקוצר, אירוע חברה, חופשה מרוכזת וכו'.
        </div>
        <form onSubmit={addOverride}>
          <div className="form-row2">
            <div className="field">
              <label className="field-label">תאריך</label>
              <input type="date" value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} required />
            </div>
            <div className="field">
              <label className="field-label">שעות ליום זה</label>
              <input type="number" step="0.25" min="0" max="24" value={overrideHours} onChange={(e) => setOverrideHours(e.target.value)} required />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>הזן 0 ליום חופש מלא</div>
            </div>
            <div className="field">
              <label className="field-label">תיאור</label>
              <input type="text" value={overrideNote} onChange={(e) => setOverrideNote(e.target.value)} placeholder="יום גיבוש, ערב חגיגה..." />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn2 primary"><IPlus />הוספת חריגה</button>
          </div>
        </form>

        <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />

        {overrideList.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📅</div>
            <div>לא הוגדרו חריגות מותאמות</div>
          </div>
        ) : (
          <div className="table-wrap" style={{ overflowX: 'auto' }}>
            <table className="table2">
              <thead><tr><th>תאריך</th><th>יום</th><th>שעות</th><th>תיאור</th><th style={{ textAlign: 'end' }}>פעולות</th></tr></thead>
              <tbody>
                {overrideList.map(([key, val]) => {
                  const d = parseYmd(key);
                  return (
                    <tr key={key}>
                      <td>{d.getDate()}.{d.getMonth() + 1}.{d.getFullYear()}</td>
                      <td>{HEB_DAYS[d.getDay()]}</td>
                      <td><b>{fmtHours(val.hours)}</b></td>
                      <td style={{ color: 'var(--text-muted)' }}>{val.note || '—'}</td>
                      <td>
                        <div className="row" style={{ justifyContent: 'flex-end' }}>
                          <button className="icon-btn2 danger" onClick={() => removeOverride(key)} title="מחיקה">
                            <ITrash width="14" height="14" />
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
      <div className="card2">
        <div className="card2-title">
          <h3>ניהול משתמשים פעילים</h3>
          <span className="pill2 muted">{activeUsers.length} משתמשים</span>
        </div>
        <div className="table-wrap" style={{ overflowX: 'auto' }}>
          <table className="table2">
            <thead><tr><th>שם</th><th>אימייל</th><th>תפקיד</th><th>תאריך הצטרפות</th><th style={{ textAlign: 'end' }}>פעולות</th></tr></thead>
            <tbody>
              {activeUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="row" style={{ gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'var(--grad-primary)', color: 'white',
                        display: 'grid', placeItems: 'center',
                        fontSize: 12, fontWeight: 700, flex: '0 0 auto',
                      }}>{u.name.charAt(0)}</div>
                      <strong>{u.name}</strong>
                      {u.id === currentUser.id && <span className="pill2 info">זה אתה</span>}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }} dir="ltr">{u.email}</td>
                  <td>
                    {u.role === 'admin'
                      ? <span className="pill2 warning">מנהל</span>
                      : <span className="pill2 muted">עובד</span>}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('he-IL') : '—'}
                  </td>
                  <td>
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      {u.id !== currentUser.id && (
                        <button className="icon-btn2 danger" onClick={() => removeUser(u.id)} title="מחיקה">
                          <ITrash width="14" height="14" />
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
