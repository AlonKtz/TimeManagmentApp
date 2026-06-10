import { useState } from 'react';
import { HEB_DAYS, HEB_MONTHS, DEFAULT_LOCATION } from '../constants';
import { ymd, parseYmd, fmtHours, timeStrToHours } from '../utils/date';
import { getPersonalRangeStats, isDayOffEntry } from '../utils/business';
import Time24Input from './Time24Input';
import {
  IHome, IOffice, IPencil, ITrash, IPlus, IChevronL, IChevronR,
} from './icons';

export default function EntriesTab({ user, entries, setEntries, settings }) {
  const [mode, setMode]           = useState('range');
  const [date, setDate]           = useState(ymd(new Date()));
  const [startT, setStartT]       = useState('09:00');
  const [endT, setEndT]           = useState('18:00');
  const [hours, setHours]         = useState('9');
  const [note, setNote]           = useState('');
  const [location, setLocation]   = useState(DEFAULT_LOCATION);
  const [editingId, setEditingId] = useState(null);
  const [flash, setFlash]         = useState('');
  const [monthOffset, setMonthOffset] = useState(0);
  const [formOpen, setFormOpen]   = useState(true);

  const resetForm = () => {
    setDate(ymd(new Date()));
    setStartT('09:00'); setEndT('18:00'); setHours('9'); setNote('');
    setLocation(DEFAULT_LOCATION);
    setEditingId(null); setMode('range');
  };

  const submit = (e) => {
    e.preventDefault();
    let computedHours = 0;
    let start = null, end = null;
    if (mode === 'range') {
      const s  = timeStrToHours(startT);
      const e2 = timeStrToHours(endT);
      computedHours = e2 - s;
      if (computedHours <= 0) { alert('שעת סיום חייבת להיות אחרי שעת התחלה'); return; }
      start = startT; end = endT;
    } else {
      const n = parseFloat(hours);
      if (isNaN(n) || n <= 0 || n > 24) { alert('הזן מספר שעות תקין (בין 0 ל־24)'); return; }
      computedHours = n;
    }

    const userEntries = entries[user.id] || [];
    const original = editingId ? userEntries.find((x) => x.id === editingId) : null;
    const newEntry = {
      id: editingId || 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      date,
      hours: Math.round(computedHours * 100) / 100,
      start, end,
      note: note.trim(),
      mode, location,
      viaPunch: original?.viaPunch || false,
      createdAt: original?.createdAt || new Date().toISOString(),
    };
    const next = editingId
      ? userEntries.map((x) => x.id === editingId ? newEntry : x)
      : [...userEntries, newEntry];

    setEntries({ ...entries, [user.id]: next });
    setFlash(editingId ? 'הרישום עודכן' : 'הרישום נוסף');
    setTimeout(() => setFlash(''), 2000);
    resetForm();
  };

  const editEntry = (entry) => {
    setEditingId(entry.id);
    setDate(entry.date);
    if (entry.mode === 'range' && entry.start && entry.end) {
      setMode('range'); setStartT(entry.start); setEndT(entry.end);
    } else {
      setMode('hours'); setHours(String(entry.hours));
    }
    setNote(entry.note || '');
    setLocation(entry.location || DEFAULT_LOCATION);
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteEntry = (id) => {
    if (!confirm('למחוק את הרישום?')) return;
    const userEntries = entries[user.id] || [];
    setEntries({ ...entries, [user.id]: userEntries.filter((x) => x.id !== id) });
    if (editingId === id) resetForm();
  };

  const userEntries = entries[user.id] || [];
  const now       = new Date();
  const viewDate  = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const viewStart = viewDate;
  const viewEnd   = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  const monthEntries = userEntries
    .filter((e) => { const d = parseYmd(e.date); return d >= viewStart && d <= viewEnd; })
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));

  const jobPercent = user.jobPercent ?? 100;
  const customDailyHours = user.customDailyHours || null;
  const monthStats = getPersonalRangeStats(userEntries, settings, viewStart, viewEnd, jobPercent, customDailyHours);
  const liveHours  = mode === 'range' ? (timeStrToHours(endT) - timeStrToHours(startT)) : parseFloat(hours) || 0;

  return (
    <div>
      <div className="topbar2">
        <div className="topbar2-left">
          <div className="topbar2-eyebrow">המעקב האישי שלך</div>
          <div className="topbar2-title">השעות שלי</div>
        </div>
        <div className="topbar2-actions">
          <button className="btn2 ghost" onClick={() => setFormOpen((o) => !o)} type="button">
            {formOpen ? 'סגור טופס' : 'הוסף רישום'}
          </button>
        </div>
      </div>

      {/* ===== Add / edit form ===== */}
      {formOpen && (
        <div className="card2 page-enter" style={{ marginBottom: 16 }}>
          <div className="card2-title">
            <h3>{editingId ? 'עריכת רישום' : 'הוספת רישום ידני'}</h3>
            {editingId && (
              <button className="btn2 ghost" onClick={resetForm} type="button">ביטול עריכה</button>
            )}
          </div>
          {flash && (
            <div style={{ background: 'var(--success-soft)', color: 'var(--success)', padding: '10px 14px', borderRadius: 10, marginBottom: 14, fontSize: 13, fontWeight: 600 }}>
              ✓ {flash}
            </div>
          )}

          <form onSubmit={submit}>
            <div className="form-row2">
              <div className="field">
                <label className="field-label">תאריך</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="field">
                <label className="field-label">סוג רישום</label>
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="range">לפי שעות כניסה/יציאה</option>
                  <option value="hours">מספר שעות ישירות</option>
                </select>
              </div>
            </div>

            {mode === 'range' ? (
              <div className="form-row2">
                <div className="field">
                  <label className="field-label">כניסה</label>
                  <Time24Input value={startT} onChange={setStartT} required />
                </div>
                <div className="field">
                  <label className="field-label">יציאה</label>
                  <Time24Input value={endT} onChange={setEndT} required />
                </div>
                <div className="field">
                  <label className="field-label">סה״כ</label>
                  <input
                    type="text"
                    readOnly
                    value={`${liveHours > 0 ? liveHours.toFixed(2) : '0.00'} ש׳`}
                    style={{ background: 'var(--surface-2)', textAlign: 'center', fontWeight: 600 }}
                  />
                </div>
              </div>
            ) : (
              <div className="form-row2">
                <div className="field">
                  <label className="field-label">שעות</label>
                  <input
                    type="number" step="0.25" min="0" max="24"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    required
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    ניתן להזין חלקי שעה (למשל 8.5 לשמונה וחצי)
                  </div>
                </div>
              </div>
            )}

            <div className="form-row2" style={{ gridTemplateColumns: 'auto 1fr' }}>
              <div className="field">
                <label className="field-label">מיקום</label>
                <div className="location-seg2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    className={location === 'office' ? 'active' : ''}
                    style={location === 'office'
                      ? { background: 'var(--surface)', color: 'var(--primary)' }
                      : { color: 'var(--text-muted)' }}
                    onClick={() => setLocation('office')}
                  >
                    <IOffice />מהמשרד
                  </button>
                  <button
                    type="button"
                    className={location === 'home' ? 'active' : ''}
                    style={location === 'home'
                      ? { background: 'var(--surface)', color: 'var(--primary)' }
                      : { color: 'var(--text-muted)' }}
                    onClick={() => setLocation('home')}
                  >
                    <IHome />מהבית
                  </button>
                </div>
              </div>
              <div className="field">
                <label className="field-label">הערה (אופציונלי)</label>
                <input
                  type="text" value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="לדוגמה: פגישת צוות, פרויקט X..."
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              {editingId && (
                <button type="button" className="btn2 ghost" onClick={resetForm}>ביטול</button>
              )}
              <button type="submit" className="btn2 primary">
                <IPlus /> {editingId ? 'שמירת רישום' : 'הוספת רישום'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===== Month table ===== */}
      <div className="card2">
        <div className="row-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div className="period-nav2">
            <button onClick={() => setMonthOffset((o) => o + 1)} aria-label="חודש הבא" type="button">
              <IChevronL width="14" height="14" />
            </button>
            <div className="label">{HEB_MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</div>
            <button onClick={() => setMonthOffset((o) => o - 1)} aria-label="חודש קודם" type="button">
              <IChevronR width="14" height="14" />
            </button>
            {monthOffset !== 0 && (
              <button onClick={() => setMonthOffset(0)} title="חזרה לחודש הנוכחי" type="button"
                      style={{ width: 'auto', padding: '0 10px', fontSize: 12 }}>
                היום
              </button>
            )}
          </div>

          <div className="row" style={{ gap: 18 }}>
            <MiniStat label="שעות שנרשמו" value={fmtHours(monthStats.worked)} sub={`${monthEntries.length} רישומים`} />
            <MiniStat label="יעד חודשי" value={fmtHours(monthStats.target)} sub="ש׳" />
            <MiniStat
              label="הפרש"
              value={`${monthStats.diff >= 0 ? '+' : ''}${fmtHours(monthStats.diff)}`}
              sub={monthStats.diff >= 0 ? 'מעל היעד' : 'מתחת ליעד'}
              tone={monthStats.diff >= 0 ? 'success' : 'danger'}
            />
          </div>
        </div>

        {monthEntries.length === 0 ? (
          <div style={{
            padding: '40px 20px', textAlign: 'center',
            color: 'var(--text-muted)', fontSize: 14,
            background: 'var(--surface-2)', borderRadius: 14,
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>אין רישומים בחודש זה</div>
            <div>התחל בהוספת רישום חדש למעלה</div>
          </div>
        ) : (
          <div className="table-wrap" style={{ overflowX: 'auto' }}>
            <table className="table2">
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>יום</th>
                  <th>שעות</th>
                  <th>פירוט</th>
                  <th>מיקום</th>
                  <th>הערה</th>
                  <th style={{ width: 1, textAlign: 'end' }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {monthEntries.map((e) => {
                  const d = parseYmd(e.date);
                  const isDayOff = isDayOffEntry(e);
                  return (
                    <tr key={e.id} style={isDayOff ? { background: 'color-mix(in oklab, var(--warning-soft) 30%, transparent)' } : {}}>
                      <td>{d.getDate()}.{d.getMonth() + 1}.{d.getFullYear()}</td>
                      <td>{HEB_DAYS[d.getDay()]}</td>
                      <td><b>{fmtHours(e.hours)}</b></td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {isDayOff
                          ? <span className="pill2 warning">יום חופש</span>
                          : e.mode === 'range' && e.start && e.end
                            ? <span dir="ltr">{e.start} – {e.end}</span>
                            : e.viaPunch
                              ? <span className="pill2 info">punch</span>
                              : 'שעות ידני'}
                      </td>
                      <td>
                        {isDayOff
                          ? <span style={{ color: 'var(--text-soft)' }}>—</span>
                          : <LocPill2 loc={e.location || DEFAULT_LOCATION} />}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.note || '—'}
                      </td>
                      <td>
                        <div className="row" style={{ justifyContent: 'flex-end' }}>
                          {!isDayOff && (
                            <button className="icon-btn2" onClick={() => editEntry(e)} title="עריכה">
                              <IPencil width="14" height="14" />
                            </button>
                          )}
                          <button className="icon-btn2 danger" onClick={() => deleteEntry(e.id)} title="מחיקה">
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
    </div>
  );
}

function MiniStat({ label, value, sub, tone }) {
  const color = tone === 'success' ? 'var(--success)'
              : tone === 'danger'  ? 'var(--danger)'
              : 'var(--text)';
  return (
    <div style={{ textAlign: 'end' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div className="num" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color, lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  );
}

function LocPill2({ loc }) {
  const isHome = loc === 'home';
  const Ico = isHome ? IHome : IOffice;
  return (
    <span className={`loc-pill2 ${isHome ? 'home' : 'office'}`}>
      <Ico />{isHome ? 'מהבית' : 'מהמשרד'}
    </span>
  );
}
