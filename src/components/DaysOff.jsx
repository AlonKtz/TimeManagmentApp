import { useState } from 'react';
import { HEB_MONTHS } from '../constants';
import { ymd, parseYmd } from '../utils/date';
import { LEAVE_TYPES } from '../utils/business';
import {
  IPlus, ITrash, IChevronL, IChevronR, IPalmtree,
} from './icons';

const HEB_WEEKDAYS = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const SHORT_MONTHS = ['ינו׳','פבר׳','מרץ','אפר׳','מאי','יוני','יולי','אוג׳','ספט׳','אוק׳','נוב׳','דצמ׳'];

const KIND_ORDER = ['vacation', 'sick', 'reserve'];

export default function DaysOff({ userId, daysOff, setDaysOff, jobPercent }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [date, setDate]               = useState(ymd(new Date()));
  const [kind, setKind]               = useState('vacation');
  const [flash, setFlash]             = useState('');

  const now       = new Date();
  const viewDate  = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const viewYear  = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  // userLeave: [{ date, kind }]
  const userLeave = daysOff[userId] || [];

  // Upcoming leave (today + future) — for the hero counter
  const todayKey = ymd(new Date());
  const upcoming = userLeave.filter((l) => l.date >= todayKey);
  const upcomingThisYear = upcoming.filter((l) => parseYmd(l.date).getFullYear() === now.getFullYear());
  // Per-type counts across the whole year (for the sub-line breakdown)
  const yearLeave = userLeave.filter((l) => parseYmd(l.date).getFullYear() === now.getFullYear());
  const countByKind = (k) => yearLeave.filter((l) => l.kind === k).length;

  const monthLeave = userLeave
    .filter((l) => {
      const dt = parseYmd(l.date);
      return dt.getFullYear() === viewYear && dt.getMonth() === viewMonth;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const addLeave = (e) => {
    e.preventDefault();
    if (!date) { alert('בחר תאריך'); return; }
    if (userLeave.some((l) => l.date === date)) {
      alert('כבר קיימת היעדרות בתאריך זה. מחק אותה קודם כדי לשנות סוג.');
      return;
    }
    setDaysOff({ ...daysOff, [userId]: [...userLeave, { date, kind }] });
    // Jump the month list to the added date so it's immediately visible
    const dt = parseYmd(date);
    setMonthOffset((dt.getFullYear() - now.getFullYear()) * 12 + (dt.getMonth() - now.getMonth()));
    setFlash(`${LEAVE_TYPES[kind].label} נוסף/ה`);
    setTimeout(() => setFlash(''), 2000);
  };

  const removeLeave = (d) => {
    if (!confirm('למחוק היעדרות זו?')) return;
    setDaysOff({ ...daysOff, [userId]: userLeave.filter((l) => l.date !== d) });
  };

  return (
    <div>
      <div className="topbar2">
        <div className="topbar2-left">
          <div className="topbar2-eyebrow">חופש · מחלה · מילואים</div>
          <div className="topbar2-title">היעדרויות</div>
        </div>
      </div>

      {/* ===== Hero stat + add form ===== */}
      <div className="leave-grid" style={{ marginBottom: 16 }}>
        <div className="leave-stat">
          <div className="leave-stat-label">היעדרויות מתוכננות</div>
          <div className="leave-stat-value num">{upcomingThisYear.length}</div>
          <div className="leave-stat-sub">
            השנה · {userLeave.length} סה״כ ברישום
            {jobPercent && jobPercent < 100 && (
              <> · {jobPercent}% משרה</>
            )}
          </div>
          <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {KIND_ORDER.map((k) => (
              <span key={k} className={`pill2 ${LEAVE_TYPES[k].pill}`}>
                {LEAVE_TYPES[k].label}: {countByKind(k)}
              </span>
            ))}
          </div>
        </div>

        <div className="card2">
          <div className="card2-title">
            <h3>הוספת היעדרות</h3>
            <IPalmtree style={{ width: 18, height: 18, color: 'var(--primary)' }} />
          </div>
          {flash && (
            <div style={{ background: 'var(--success-soft)', color: 'var(--success)', padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
              ✓ {flash}
            </div>
          )}
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
            כל היעדרות נספרת כשעות תקן ליום ההוא — כמו משמרת מלאה. הסוג משמש לתיוג בלבד.
          </div>
          <form onSubmit={addLeave}>
            <div className="field" style={{ marginBottom: 12 }}>
              <label className="field-label">סוג היעדרות</label>
              <div className="location-seg2" role="group" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                {KIND_ORDER.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={kind === k ? 'active' : ''}
                    style={kind === k
                      ? { background: 'var(--surface)', color: 'var(--primary)' }
                      : { color: 'var(--text-muted)' }}
                    onClick={() => setKind(k)}
                  >
                    {LEAVE_TYPES[k].label}
                  </button>
                ))}
              </div>
            </div>
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
          <h3>היעדרויות בחודש {HEB_MONTHS[viewMonth]} {viewYear}</h3>
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
          סה״כ: <b style={{ color: 'var(--text)' }}>{monthLeave.length}</b> ימי היעדרות בחודש זה
        </div>

        {monthLeave.length === 0 ? (
          <div style={{
            padding: '36px 20px', textAlign: 'center',
            color: 'var(--text-muted)', fontSize: 14,
            background: 'var(--surface-2)', borderRadius: 14,
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏖</div>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>אין היעדרויות בחודש זה</div>
            <div>הוסף היעדרות בטופס למעלה</div>
          </div>
        ) : (
          <div className="stagger">
            {monthLeave.map((l) => {
              const dt = parseYmd(l.date);
              const type = LEAVE_TYPES[l.kind] || LEAVE_TYPES.vacation;
              return (
                <div key={l.date} className="leave-row">
                  <div className="date">
                    <div className="d num">{dt.getDate()}</div>
                    <div className="m">{SHORT_MONTHS[dt.getMonth()]}</div>
                  </div>
                  <div className="info">
                    <strong>{HEB_WEEKDAYS[dt.getDay()]}</strong>
                    <span>{dt.getDate()}.{dt.getMonth() + 1}.{dt.getFullYear()}</span>
                  </div>
                  <span className={`pill2 ${type.pill}`}>{type.label}</span>
                  <button className="icon-btn2 danger" onClick={() => removeLeave(l.date)} title="מחיקה">
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
