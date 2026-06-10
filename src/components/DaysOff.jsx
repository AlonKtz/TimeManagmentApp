import { useState } from 'react';
import { HEB_MONTHS } from '../constants';
import { ymd, parseYmd } from '../utils/date';
import {
  IPlus, ITrash, IChevronL, IChevronR, IPalmtree,
} from './icons';

const HEB_WEEKDAYS = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const SHORT_MONTHS = ['ינו׳','פבר׳','מרץ','אפר׳','מאי','יוני','יולי','אוג׳','ספט׳','אוק׳','נוב׳','דצמ׳'];

export default function DaysOff({ userId, daysOff, setDaysOff, jobPercent }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [date, setDate]               = useState(ymd(new Date()));
  const [flash, setFlash]             = useState('');

  const now       = new Date();
  const viewDate  = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const viewYear  = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const userDaysOff = daysOff[userId] || [];

  // Upcoming days off (current month + future) — for the leave-row list
  const todayKey = ymd(new Date());
  const upcoming = [...userDaysOff]
    .filter((d) => d >= todayKey)
    .sort();
  const upcomingThisYear = upcoming.filter((d) => parseYmd(d).getFullYear() === now.getFullYear()).length;

  const monthDaysOff = userDaysOff
    .filter((d) => {
      const dt = parseYmd(d);
      return dt.getFullYear() === viewYear && dt.getMonth() === viewMonth;
    })
    .sort();

  const addDayOff = (e) => {
    e.preventDefault();
    if (!date) { alert('בחר תאריך'); return; }
    if (userDaysOff.includes(date)) { alert('יום זה כבר קיים ברשימת ימי החופשה'); return; }
    setDaysOff({ ...daysOff, [userId]: [...userDaysOff, date] });
    // Jump the month list to the added date so it's immediately visible
    const dt = parseYmd(date);
    setMonthOffset((dt.getFullYear() - now.getFullYear()) * 12 + (dt.getMonth() - now.getMonth()));
    setFlash('יום חופש נוסף');
    setTimeout(() => setFlash(''), 2000);
  };

  const removeDayOff = (d) => {
    if (!confirm('למחוק יום חופש זה?')) return;
    setDaysOff({ ...daysOff, [userId]: userDaysOff.filter((x) => x !== d) });
  };

  return (
    <div>
      <div className="topbar2">
        <div className="topbar2-left">
          <div className="topbar2-eyebrow">חופשות וחגים</div>
          <div className="topbar2-title">ימי חופש</div>
        </div>
      </div>

      {/* ===== Hero stat + add form ===== */}
      <div className="leave-grid" style={{ marginBottom: 16 }}>
        <div className="leave-stat">
          <div className="leave-stat-label">ימי חופש מתוכננים</div>
          <div className="leave-stat-value num">{upcomingThisYear}</div>
          <div className="leave-stat-sub">
            השנה · {userDaysOff.length} סה״כ ברישום
            {jobPercent && jobPercent < 100 && (
              <> · {jobPercent}% משרה</>
            )}
          </div>
        </div>

        <div className="card2">
          <div className="card2-title">
            <h3>הוספת יום חופש</h3>
            <IPalmtree style={{ width: 18, height: 18, color: 'var(--primary)' }} />
          </div>
          {flash && (
            <div style={{ background: 'var(--success-soft)', color: 'var(--success)', padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
              ✓ {flash}
            </div>
          )}
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
            כל יום חופש שתוסיף נספר כשעות תקן ליום ההוא — כמו משמרת מלאה.
          </div>
          <form onSubmit={addDayOff}>
            <div className="form-row2">
              <div className="field" style={{ flex: 1 }}>
                <label className="field-label">תאריך</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="field" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button type="submit" className="btn2 primary" style={{ width: '100%' }}>
                  <IPlus />הוספה
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ===== Month list ===== */}
      <div className="card2">
        <div className="card2-title">
          <h3>ימים בחודש {HEB_MONTHS[viewMonth]} {viewYear}</h3>
          <div className="period-nav2">
            <button onClick={() => setMonthOffset((o) => o + 1)} aria-label="חודש הבא" type="button">
              <IChevronL width="14" height="14" />
            </button>
            <div className="label">{HEB_MONTHS[viewMonth]} {viewYear}</div>
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
        </div>

        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14 }}>
          סה״כ: <b style={{ color: 'var(--text)' }}>{monthDaysOff.length}</b> ימי חופש בחודש זה
        </div>

        {monthDaysOff.length === 0 ? (
          <div style={{
            padding: '36px 20px', textAlign: 'center',
            color: 'var(--text-muted)', fontSize: 14,
            background: 'var(--surface-2)', borderRadius: 14,
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏖</div>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>אין ימי חופש בחודש זה</div>
            <div>הוסף יום חופש בטופס למעלה</div>
          </div>
        ) : (
          <div className="stagger">
            {monthDaysOff.map((d) => {
              const dt = parseYmd(d);
              return (
                <div key={d} className="leave-row">
                  <div className="date">
                    <div className="d num">{dt.getDate()}</div>
                    <div className="m">{SHORT_MONTHS[dt.getMonth()]}</div>
                  </div>
                  <div className="info">
                    <strong>{HEB_WEEKDAYS[dt.getDay()]}</strong>
                    <span>{dt.getDate()}.{dt.getMonth() + 1}.{dt.getFullYear()}</span>
                  </div>
                  <span className="pill2 info">חופש</span>
                  <button className="icon-btn2 danger" onClick={() => removeDayOff(d)} title="מחיקה">
                    <ITrash width="14" height="14" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
