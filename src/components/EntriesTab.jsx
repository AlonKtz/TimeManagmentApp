import { useState } from 'react';
import { HEB_DAYS, HEB_MONTHS, DEFAULT_LOCATION } from '../constants';
import { ymd, parseYmd, fmtHours, timeStrToHours } from '../utils/date';
import { getPersonalRangeStats } from '../utils/business';
import LocationToggle from './LocationToggle';
import LocationPill from './LocationPill';
import Time24Input from './Time24Input';

export default function EntriesTab({ user, entries, setEntries, settings, daysOff }) {
  const [mode, setMode] = useState('range');
  const [date, setDate] = useState(ymd(new Date()));
  const [startT, setStartT] = useState('09:00');
  const [endT, setEndT] = useState('18:00');
  const [hours, setHours] = useState('9');
  const [note, setNote] = useState('');
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [editingId, setEditingId] = useState(null);
  const [flash, setFlash] = useState('');
  const [monthOffset, setMonthOffset] = useState(0);

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
      const s = timeStrToHours(startT);
      const e2 = timeStrToHours(endT);
      computedHours = e2 - s;
      if (computedHours <= 0) {
        alert('שעת סיום חייבת להיות אחרי שעת התחלה');
        return;
      }
      start = startT; end = endT;
    } else {
      const n = parseFloat(hours);
      if (isNaN(n) || n <= 0 || n > 24) {
        alert('הזן מספר שעות תקין (בין 0 ל־24)');
        return;
      }
      computedHours = n;
    }

    const userEntries = entries[user.id] || [];
    const newEntry = {
      id: editingId || 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      date,
      hours: Math.round(computedHours * 100) / 100,
      start,
      end,
      note: note.trim(),
      mode,
      location,
      createdAt: editingId ? (userEntries.find(e => e.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    };

    const next = editingId
      ? userEntries.map(e => e.id === editingId ? newEntry : e)
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
      setMode('range');
      setStartT(entry.start); setEndT(entry.end);
    } else {
      setMode('hours');
      setHours(String(entry.hours));
    }
    setNote(entry.note || '');
    setLocation(entry.location || DEFAULT_LOCATION);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteEntry = (id) => {
    if (!confirm('למחוק את הרישום?')) return;
    const userEntries = entries[user.id] || [];
    setEntries({ ...entries, [user.id]: userEntries.filter(e => e.id !== id) });
    if (editingId === id) resetForm();
  };

  const userEntries = entries[user.id] || [];
  const now = new Date();
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const viewStart = viewDate;
  const viewEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  const monthEntries = userEntries
    .filter(e => { const d = parseYmd(e.date); return d >= viewStart && d <= viewEnd; })
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  const jobPercent = user.jobPercent ?? 100;
  const monthStats = getPersonalRangeStats(userEntries, settings, viewStart, viewEnd, jobPercent);

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">
          {editingId ? 'עריכת רישום' : 'הוספת רישום'}
          {editingId && <button className="btn btn-ghost btn-sm" onClick={resetForm}>ביטול עריכה</button>}
        </div>
        {flash && <div className="form-success">{flash}</div>}

        <form onSubmit={submit}>
          <div className="form-row">
            <div>
              <label className="form-label">תאריך</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="form-label">סוג הרישום</label>
              <select value={mode} onChange={e => setMode(e.target.value)}>
                <option value="range">לפי שעות כניסה/יציאה</option>
                <option value="hours">מספר שעות ישירות</option>
              </select>
            </div>
          </div>

          {mode === 'range' ? (
            <div className="form-row">
              <div>
                <label className="form-label">כניסה</label>
                <Time24Input value={startT} onChange={setStartT} required />
              </div>
              <div>
                <label className="form-label">יציאה</label>
                <Time24Input value={endT} onChange={setEndT} required />
              </div>
              <div>
                <label className="form-label">סה״כ</label>
                <input type="text" readOnly value={fmtHours(timeStrToHours(endT) - timeStrToHours(startT))} style={{ background: 'var(--surface-2)' }} />
              </div>
            </div>
          ) : (
            <div className="form-row">
              <div>
                <label className="form-label">שעות</label>
                <input type="number" step="0.25" min="0" max="24" value={hours} onChange={e => setHours(e.target.value)} required />
                <div className="hint">ניתן להזין חלקי שעה, לדוגמה 8.5 לשמונה וחצי</div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">מיקום עבודה</label>
            <LocationToggle value={location} onChange={setLocation} />
          </div>

          <div className="form-group">
            <label className="form-label">הערה (אופציונלי)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="לדוגמה: פגישת צוות, פרויקט X..." />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">{editingId ? 'שמירה' : 'הוספה'}</button>
            {editingId && <button type="button" className="btn btn-secondary" onClick={resetForm}>ביטול</button>}
          </div>
        </form>
      </div>

      <div className="card">
        <div className="period-nav">
          <button className="nav-btn" onClick={() => setMonthOffset(o => o - 1)} aria-label="חודש קודם">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <div className="current">{HEB_MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</div>
          <button className="nav-btn" onClick={() => setMonthOffset(o => o + 1)} aria-label="חודש הבא" disabled={monthOffset >= 0} style={monthOffset >= 0 ? { opacity: 0.4, cursor: 'not-allowed' } : {}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        </div>

        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-label">שעות שנרשמו</div>
            <div className="stat-value">{fmtHours(monthStats.worked)}</div>
            <div className="stat-target">{monthEntries.length} רישומים</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">יעד חודשי</div>
            <div className="stat-value">{fmtHours(monthStats.target)}</div>
            <div className="stat-target">לפי ימי העבודה בחודש</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">הפרש</div>
            <div className="stat-value" style={{ color: monthStats.diff >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {monthStats.diff >= 0 ? '+' : ''}{fmtHours(monthStats.diff)}
            </div>
            <div className="stat-target">{monthStats.diff >= 0 ? 'מעל היעד' : 'מתחת ליעד'}</div>
          </div>
        </div>

        {monthEntries.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📋</div>
            <div className="empty-title">אין רישומים בחודש זה</div>
            <div className="empty-text">התחל בהוספת רישום חדש למעלה</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>יום</th>
                  <th>שעות</th>
                  <th>פירוט</th>
                  <th>מיקום</th>
                  <th>הערה</th>
                  <th style={{ textAlign: 'left' }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {monthEntries.map(e => {
                  const d = parseYmd(e.date);
                  const isDayOff = e.mode === 'dayoff';
                  return (
                    <tr key={e.id} style={isDayOff ? { background: 'var(--surface-2)' } : {}}>
                      <td>{d.getDate()}.{d.getMonth() + 1}.{d.getFullYear()}</td>
                      <td>{HEB_DAYS[d.getDay()]}</td>
                      <td style={{ fontWeight: 600 }}>{fmtHours(e.hours)}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        {isDayOff
                          ? <span className="pill pill-muted">יום חופש</span>
                          : e.mode === 'range' && e.start && e.end
                            ? `${e.start} – ${e.end}`
                            : e.viaPunch ? 'punch' : 'שעות ידני'}
                      </td>
                      <td>{isDayOff ? '—' : <LocationPill loc={e.location || DEFAULT_LOCATION} />}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.note || '—'}
                      </td>
                      <td>
                        <div className="actions-inline">
                          {!isDayOff && (
                            <button className="icon-btn" onClick={() => editEntry(e)} title="עריכה">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                          )}
                          <button className="icon-btn danger" onClick={() => deleteEntry(e.id)} title="מחיקה">
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
    </div>
  );
}
