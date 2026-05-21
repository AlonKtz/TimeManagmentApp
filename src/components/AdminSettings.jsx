import { useState, useEffect } from 'react';
import { HEB_DAYS, HOLIDAY_TYPES, ISRAELI_HOLIDAYS, DEFAULT_SETTINGS } from '../constants';
import { ymd, parseYmd, fmtHours } from '../utils/date';
import { ITrash, IPlus } from './icons';

// Human-friendly "מלפני 5 דקות" / "אתמול" / etc. with full-date fallback
function timeAgoHe(iso) {
  if (!iso) return { short: '—', full: 'אין מידע על פעילות', stale: true };
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(0, Math.floor((now - then) / 1000));
  const full = new Date(iso).toLocaleString('he-IL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  let short;
  if (sec < 60)            short = 'עכשיו';
  else if (sec < 3600)     short = `לפני ${Math.floor(sec / 60)} דק׳`;
  else if (sec < 86400)    short = `לפני ${Math.floor(sec / 3600)} שעות`;
  else if (sec < 86400 * 2) short = 'אתמול';
  else if (sec < 86400 * 7) short = `לפני ${Math.floor(sec / 86400)} ימים`;
  else if (sec < 86400 * 30) short = `לפני ${Math.floor(sec / (86400 * 7))} שבועות`;
  else {
    const d = new Date(iso);
    short = `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
  }
  return { short, full, stale: sec > 86400 * 14 };
}

export default function AdminSettings({ settings, setSettings, users, currentUser, auth }) {
  const [sh, setSh] = useState(settings.standardHours);
  const [hh, setHh] = useState(settings.holidayHours || DEFAULT_SETTINGS.holidayHours);
  const [overrideDate, setOverrideDate]   = useState(ymd(new Date()));
  const [overrideHours, setOverrideHours] = useState('0');
  const [overrideNote, setOverrideNote]   = useState('');
  const [overrideType, setOverrideType]   = useState('vacation'); // vacation | half | short | custom
  const [flash, setFlash]                 = useState({ msg: '', tone: 'success' });
  const [holidayFilter, setHolidayFilter] = useState('upcoming');

  // Quick-presets for company days. Picking one prefills hours + a sensible note.
  const TYPE_PRESETS = [
    { id: 'vacation', label: '🌴 חופשה (יום מלא)', hours: 0, note: 'חופשת חברה' },
    { id: 'half',     label: '🌗 חצי יום (5 ש׳)',  hours: 5, note: 'חצי יום' },
    { id: 'short',    label: '⏱ יום מקוצר (6 ש׳)', hours: 6, note: 'יום מקוצר' },
    { id: 'custom',   label: '✎ מותאם אישית',      hours: null, note: '' },
  ];
  const applyTypePreset = (id) => {
    setOverrideType(id);
    const p = TYPE_PRESETS.find((x) => x.id === id);
    if (p && p.hours !== null) setOverrideHours(String(p.hours));
    if (p && p.note) setOverrideNote(p.note);
  };

  useEffect(() => setSh(settings.standardHours), [settings.standardHours]);
  useEffect(() => setHh(settings.holidayHours || DEFAULT_SETTINGS.holidayHours), [settings.holidayHours]);

  const showFlash = (msg, tone = 'success') => {
    setFlash({ msg, tone });
    setTimeout(() => setFlash((f) => (f.msg === msg ? { msg: '', tone } : f)), tone === 'error' ? 6000 : 2500);
  };

  // Wrap an awaited setSettings call: shows a green success flash or a red
  // failure flash that includes the underlying error message (e.g. RLS denial).
  const saveAnd = async (next, successMsg) => {
    const res = await setSettings(next);
    if (res?.ok) {
      showFlash(successMsg, 'success');
    } else {
      showFlash(`שמירה נכשלה — ${res?.error || 'שגיאה לא ידועה'}`, 'error');
    }
    return res;
  };

  const updateStandard = (dow, val) => {
    const n = parseFloat(val);
    setSh({ ...sh, [dow]: isNaN(n) ? 0 : n });
  };
  const saveStandard = () => saveAnd({ ...settings, standardHours: sh }, 'התקן השבועי נשמר');

  const updateHoliday = (type, val) => {
    const n = parseFloat(val);
    setHh({ ...hh, [type]: isNaN(n) ? 0 : n });
  };
  const saveHolidayHours = () => saveAnd({ ...settings, holidayHours: hh }, 'שעות החגים נשמרו');

  const toggleHolidayDisabled = (key) => {
    const disabled = settings.disabledHolidays || [];
    const next = disabled.includes(key) ? disabled.filter((k) => k !== key) : [...disabled, key];
    return saveAnd(
      { ...settings, disabledHolidays: next },
      disabled.includes(key) ? 'החג הופעל מחדש' : 'החג בוטל'
    );
  };

  const addOverride = async (e) => {
    e.preventDefault();
    const n = parseFloat(overrideHours);
    if (isNaN(n) || n < 0 || n > 24) { alert('הזן מספר שעות תקין'); return; }
    const res = await saveAnd({
      ...settings,
      overrides: {
        ...settings.overrides,
        [overrideDate]: { hours: n, note: overrideNote.trim() || (n === 0 ? 'חג' : 'חריג'), type: 'custom' },
      },
    }, 'החריגה נוספה');
    // Only reset form on actual success — keep values around if save failed
    if (res?.ok) { setOverrideNote(''); setOverrideHours('0'); }
  };

  const removeOverride = (key) => {
    if (!confirm('להסיר את החריגה?')) return;
    const { [key]: _, ...rest } = settings.overrides;
    return saveAnd({ ...settings, overrides: rest }, 'החריגה הוסרה');
  };

  // Per-date override for an Israeli holiday — keyed by date in the same
  // overrides map. getHolidayInfo() in business.js already checks overrides
  // before falling back to the type default, so this just works app-wide.
  const setHolidayOverride = (date, hours, note, type) =>
    saveAnd({
      ...settings,
      overrides: {
        ...(settings.overrides || {}),
        [date]: { hours, note: note || '', type: type || 'custom' },
      },
    }, 'שעות החג נשמרו');

  const clearHolidayOverride = (date) => {
    const { [date]: _, ...rest } = settings.overrides || {};
    return saveAnd({ ...settings, overrides: rest }, 'חזרה לברירת מחדל');
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

      {flash.msg && (
        <div style={{
          background: flash.tone === 'error' ? 'var(--danger-soft)' : 'var(--success-soft)',
          color:      flash.tone === 'error' ? 'var(--danger)'      : 'var(--success)',
          border:    `1px solid ${flash.tone === 'error' ? 'var(--danger)' : 'var(--success)'}`,
          padding: '10px 14px',
          borderRadius: 10,
          marginBottom: 14,
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span>{flash.tone === 'error' ? '⚠️' : '✓'}</span>
          <span style={{ flex: 1 }}>{flash.msg}</span>
        </div>
      )}

      {/* ===== Global-scope notice ===== */}
      <div
        className="card2"
        style={{
          marginBottom: 16,
          background: 'color-mix(in oklab, var(--info-soft) 60%, var(--surface))',
          borderColor: 'color-mix(in oklab, var(--info) 25%, var(--border))',
        }}
      >
        <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--info)', color: 'white',
            display: 'grid', placeItems: 'center', flex: '0 0 auto',
            fontSize: 18,
          }}>🌍</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--info)' }}>
              הגדרות כלל-חברתיות
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
              כל ההגדרות בעמוד זה (תקן שעות, שעות חגים, ימי חופש וחריגות) משפיעות מיידית על כל המשתמשים במערכת.
            </div>
          </div>
        </div>
      </div>

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
        <div className="card2-title">
          <h3>תקן שעות שבועי</h3>
          <span className="pill2 info">משפיע על כולם</span>
        </div>
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
        <div className="card2-title">
          <h3>שעות לפי סוג חג</h3>
          <span className="pill2 info">משפיע על כולם</span>
        </div>
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
            <span className="pill2 info" style={{ marginInlineEnd: 4 }}>משפיע על כולם</span>
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
          ערוך שעות לתאריך ספציפי (יחליף את ברירת המחדל של סוג החג), כבה חג שלא חל אצלכם, או חזור לברירת מחדל בלחיצה על הכפתור ↺.
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
                <tr><th>תאריך</th><th>יום</th><th>שם החג</th><th>סוג</th><th>שעות (ערוך)</th><th style={{ textAlign: 'end' }}>סטטוס</th></tr>
              </thead>
              <tbody>
                {visibleHolidays.map((h) => {
                  const d = parseYmd(h.key);
                  const isDisabled = disabled.includes(h.key);
                  const typeDefault = hh[h.type] ?? HOLIDAY_TYPES[h.type].defaultHours;
                  const override = settings.overrides?.[h.key];
                  const hasOverride = !!override;
                  const effectiveHours = hasOverride ? Number(override.hours) : typeDefault;
                  const tone = h.type === 'chag' ? 'danger' : h.type === 'erev' ? 'warning' : h.type === 'memorial' ? 'info' : 'muted';
                  return (
                    <tr key={h.key} style={isDisabled ? { opacity: 0.5 } : {}}>
                      <td>{d.getDate()}.{d.getMonth() + 1}.{d.getFullYear()}</td>
                      <td>{HEB_DAYS[d.getDay()]}</td>
                      <td>
                        {h.note}
                        {hasOverride && !isDisabled && (
                          <span className="pill2 primary" style={{ marginInlineStart: 6, fontSize: 10 }}>מותאם</span>
                        )}
                      </td>
                      <td><span className={`pill2 ${tone}`}>{HOLIDAY_TYPES[h.type].label}</span></td>
                      <td>
                        {isDisabled ? (
                          <span style={{ color: 'var(--text-soft)' }}>—</span>
                        ) : (
                          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                            <input
                              type="number" step="0.25" min="0" max="24"
                              key={`${h.key}-${effectiveHours}`}            /* remount when default changes elsewhere */
                              defaultValue={effectiveHours}
                              onBlur={(e) => {
                                const v = parseFloat(e.target.value);
                                if (isNaN(v) || v < 0 || v > 24) {
                                  e.target.value = effectiveHours;
                                  return;
                                }
                                if (Math.abs(v - typeDefault) < 0.001) {
                                  // back to type default — drop the override if any
                                  if (hasOverride) clearHolidayOverride(h.key);
                                } else if (Math.abs(v - effectiveHours) >= 0.001) {
                                  setHolidayOverride(h.key, v, h.note, h.type);
                                }
                              }}
                              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                              style={{
                                width: 70,
                                padding: '6px 8px',
                                textAlign: 'center',
                                fontWeight: 600,
                                fontVariantNumeric: 'tabular-nums',
                                border: hasOverride ? '1.5px solid var(--primary)' : '1px solid var(--border-strong)',
                                borderRadius: 8,
                                background: hasOverride ? 'var(--primary-soft)' : 'var(--surface)',
                                color: 'var(--text)',
                                outline: 'none',
                                minHeight: 32,
                              }}
                            />
                            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>ש׳</span>
                            {hasOverride && (
                              <button
                                type="button"
                                className="icon-btn2"
                                onClick={() => clearHolidayOverride(h.key)}
                                title={`חזרה לברירת מחדל (${fmtHours(typeDefault)})`}
                                style={{ width: 30, height: 30, fontSize: 14 }}
                              >↺</button>
                            )}
                          </div>
                        )}
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

      {/* ===== Company vacations / overrides ===== */}
      <div className="card2" style={{ marginBottom: 16 }}>
        <div className="card2-title">
          <h3>🌴 חופשות חברה וחריגות</h3>
          <span className="pill2 info">משפיע על כולם</span>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14 }}>
          הוסף ימי חופשה, ימים מקוצרים או חריגות לתאריכים שאינם חגי ישראל הרשמיים.
          ההגדרה תחול אוטומטית על כל העובדים — היעד היומי שלהם לאותו תאריך יתעדכן.
        </div>

        <form onSubmit={addOverride}>
          {/* Quick-pick type chips */}
          <div className="field" style={{ marginBottom: 14 }}>
            <label className="field-label">סוג</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TYPE_PRESETS.map((p) => {
                const isActive = overrideType === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyTypePreset(p.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 999,
                      border: `1.5px solid ${isActive ? 'var(--primary)' : 'var(--border-strong)'}`,
                      background: isActive ? 'var(--primary-soft)' : 'var(--surface)',
                      color: isActive ? 'var(--primary)' : 'var(--text)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      minHeight: 38,
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-row2">
            <div className="field">
              <label className="field-label">תאריך</label>
              <input type="date" value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} required />
            </div>
            <div className="field">
              <label className="field-label">שעות ליום זה</label>
              <input
                type="number" step="0.25" min="0" max="24"
                value={overrideHours}
                onChange={(e) => { setOverrideHours(e.target.value); setOverrideType('custom'); }}
                required
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                0 = יום חופש מלא. אחרת = שעות התקן לאותו יום.
              </div>
            </div>
            <div className="field">
              <label className="field-label">תיאור</label>
              <input
                type="text" value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
                placeholder="חופשת חברה, יום גיבוש, ערב חגיגה..."
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn2 primary">
              <IPlus />הוסף לכל העובדים
            </button>
          </div>
        </form>

        <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />

        {overrideList.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🌴</div>
            <div>טרם הוגדרו חופשות או חריגות לחברה</div>
          </div>
        ) : (
          <div className="table-wrap" style={{ overflowX: 'auto' }}>
            <table className="table2">
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>יום</th>
                  <th>סוג</th>
                  <th>שעות</th>
                  <th>תיאור</th>
                  <th style={{ textAlign: 'end' }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {overrideList.map(([key, val]) => {
                  const d = parseYmd(key);
                  const isVacation = Number(val.hours) === 0;
                  const isHalf     = Number(val.hours) === 5;
                  const isShort    = Number(val.hours) === 6;
                  const typeLabel  = isVacation ? '🌴 חופשה'
                                   : isHalf     ? '🌗 חצי יום'
                                   : isShort    ? '⏱ יום מקוצר'
                                   : '✎ מותאם';
                  const tone = isVacation ? 'info'
                             : isHalf     ? 'warning'
                             : isShort    ? 'warning'
                             : 'muted';
                  return (
                    <tr key={key}>
                      <td>{d.getDate()}.{d.getMonth() + 1}.{d.getFullYear()}</td>
                      <td>{HEB_DAYS[d.getDay()]}</td>
                      <td><span className={`pill2 ${tone}`}>{typeLabel}</span></td>
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
            <thead><tr><th>שם</th><th>אימייל</th><th>תפקיד</th><th>הצטרפות</th><th>פעילות אחרונה</th><th style={{ textAlign: 'end' }}>פעולות</th></tr></thead>
            <tbody>
              {activeUsers.map((u) => {
                const activity = timeAgoHe(u.last_active_at);
                return (
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
                    <td title={activity.full}>
                      <span style={{
                        color: !u.last_active_at ? 'var(--text-soft)'
                             : activity.stale     ? 'var(--text-muted)'
                             : 'var(--text)',
                        fontWeight: !u.last_active_at ? 400 : 500,
                      }}>
                        {activity.short}
                      </span>
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
