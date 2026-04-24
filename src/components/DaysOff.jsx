import { useState } from 'react';
import { HEB_MONTHS } from '../constants';
import { ymd, parseYmd } from '../utils/date';

export default function DaysOff({ userId, daysOff, setDaysOff, settings, jobPercent }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [date, setDate] = useState(ymd(new Date()));
  const [note, setNote] = useState('');
  const [flash, setFlash] = useState('');

  const now = new Date();
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  // Days off for the current user (array of 'YYYY-MM-DD')
  const userDaysOff = daysOff[userId] || [];

  // Filter to current month
  const monthDaysOff = userDaysOff
    .filter(d => {
      const dt = parseYmd(d);
      return dt.getFullYear() === viewYear && dt.getMonth() === viewMonth;
    })
    .sort((a, b) => b.localeCompare(a));

  const addDayOff = (e) => {
    e.preventDefault();
    if (!date) { alert('בחר תאריך'); return; }
    if (userDaysOff.includes(date)) {
      alert('יום זה כבר קיים ברשימת ימי החופשה');
      return;
    }
    const next = { ...daysOff, [userId]: [...userDaysOff, date] };
    setDaysOff(next);
    setNote('');
    setFlash('יום חופש נוסף');
    setTimeout(() => setFlash(''), 2000);
  };

  const removeDayOff = (d) => {
    if (!confirm('למחוק יום חופש זה?')) return;
    const next = { ...daysOff, [userId]: userDaysOff.filter(x => x !== d) };
    setDaysOff(next);
  };

  const formatDate = (dateStr) => {
    const d = parseYmd(dateStr);
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
  };

  const getWeekDayHeb = (dateStr) => {
    const days = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
    return days[parseYmd(dateStr).getDay()];
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">הוספת יום חופש</div>
        {flash && <div className="form-success">{flash}</div>}
        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
          ימי חופשה מפחיתים את יעד השעות ליום הספציפי ל-0 שעות.
          {jobPercent && jobPercent < 100 && (
            <span> (אחוזי משרה שלך: {jobPercent}%)</span>
          )}
        </div>
        <form onSubmit={addDayOff}>
          <div className="form-row">
            <div>
              <label className="form-label">תאריך</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label">הערה (אופציונלי)</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="לדוגמה: חופשה, מחלה..."
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">הוסף יום חופש</button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="period-nav">
          <button className="nav-btn" onClick={() => setMonthOffset(o => o - 1)} aria-label="חודש קודם">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <div className="current">{HEB_MONTHS[viewMonth]} {viewYear}</div>
          <button
            className="nav-btn"
            onClick={() => setMonthOffset(o => o + 1)}
            aria-label="חודש הבא"
            disabled={monthOffset >= 0}
            style={monthOffset >= 0 ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        </div>

        <div style={{ marginBottom: 12, color: 'var(--text-muted)', fontSize: 13 }}>
          סה"כ: <strong style={{ color: 'var(--text)' }}>{monthDaysOff.length} ימי חופש</strong> בחודש זה
        </div>

        {monthDaysOff.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🏖</div>
            <div className="empty-title">אין ימי חופש בחודש זה</div>
            <div className="empty-text">הוסף ימי חופש בטופס למעלה</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>יום</th>
                  <th style={{ textAlign: 'left' }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {monthDaysOff.map(d => (
                  <tr key={d}>
                    <td>{formatDate(d)}</td>
                    <td>{getWeekDayHeb(d)}</td>
                    <td>
                      <div className="actions-inline">
                        <button
                          className="icon-btn danger"
                          onClick={() => removeDayOff(d)}
                          title="מחיקה"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
