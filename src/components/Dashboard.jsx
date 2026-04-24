import { useState, useEffect } from 'react';
import { HEB_DAYS, HEB_MONTHS, DEFAULT_LOCATION } from '../constants';
import { ymd, fmtHours, fmtTime24, startOfWeek, endOfWeek, daysInRange, sessionDuration } from '../utils/date';
import { getPersonalDailyTarget, getWorkedOnDate, getPersonalRangeStats, getHolidayInfo } from '../utils/business';
import LocationToggle from './LocationToggle';
import PunchEditModal from './PunchEditModal';
import TargetEditorModal from './TargetEditorModal';

export default function Dashboard({ user, entries, settings, setSettings, activePunch, onPunch, onEditPunch, daysOff }) {
  const [now, setNow] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [editingTargetDate, setEditingTargetDate] = useState(null);
  const [editingPunch, setEditingPunch] = useState(false);
  const [location, setLocation] = useState(() => activePunch?.location || DEFAULT_LOCATION);
  const isAdmin = user.role === 'admin';
  const jobPercent = user.jobPercent ?? 100;
  const userDaysOff = daysOff || [];

  useEffect(() => {
    if (activePunch?.location) setLocation(activePunch.location);
  }, [activePunch?.location]);

  useEffect(() => {
    if (!activePunch) return;
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, [activePunch]);

  const today = new Date();
  const todayTarget = getPersonalDailyTarget(today, settings, jobPercent, userDaysOff);
  const todayWorked = getWorkedOnDate(entries, today);
  const liveAdd = activePunch ? sessionDuration({ start: activePunch.start }) : 0;
  const todayTotal = todayWorked + liveAdd;

  const displayedBase = new Date(today);
  displayedBase.setDate(displayedBase.getDate() + weekOffset * 7);
  const weekStart = startOfWeek(displayedBase);
  const weekEnd = endOfWeek(displayedBase);
  const weekStats = getPersonalRangeStats(entries, settings, weekStart, weekEnd, jobPercent, userDaysOff);
  const isCurrentWeek = weekOffset === 0;
  const weekTotal = weekStats.worked + (isCurrentWeek ? liveAdd : 0);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const monthStats = getPersonalRangeStats(entries, settings, monthStart, monthEnd, jobPercent, userDaysOff);
  const monthTotal = monthStats.worked + liveAdd;

  const todayPct = todayTarget > 0 ? (todayTotal / todayTarget) * 100 : (todayTotal > 0 ? 100 : 0);
  const weekPct = weekStats.target > 0 ? (weekTotal / weekStats.target) * 100 : 0;
  const monthPct = monthStats.target > 0 ? (monthTotal / monthStats.target) * 100 : 0;

  // ===== Weekly averages over past 4 complete weeks =====
  const avgStats = (() => {
    const currentWeekStart = startOfWeek(today);
    let totalDailyWorkedDays = 0;
    let totalDailyWorkedHours = 0;
    let totalWeeklyHours = 0;
    const WEEKS = 4;
    for (let w = 1; w <= WEEKS; w++) {
      const ws = new Date(currentWeekStart);
      ws.setDate(ws.getDate() - w * 7);
      const we = endOfWeek(ws);
      const days = daysInRange(ws, we);
      let weekHours = 0;
      for (const d of days) {
        const worked = getWorkedOnDate(entries, d);
        if (worked > 0) {
          totalDailyWorkedDays++;
          totalDailyWorkedHours += worked;
        }
        weekHours += worked;
      }
      totalWeeklyHours += weekHours;
    }
    const dailyAvg = totalDailyWorkedDays > 0 ? totalDailyWorkedHours / totalDailyWorkedDays : 0;
    const weeklyAvg = totalWeeklyHours / WEEKS;
    return { dailyAvg, weeklyAvg };
  })();

  const barClass = (pct) => pct >= 100 ? 'complete' : '';

  const renderStat = (label, worked, target, pct, showRemaining = true) => {
    const diff = worked - target;
    return (
      <div className="stat-card">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{fmtHours(worked)}</div>
        <div className="stat-target">מתוך יעד {fmtHours(target)}</div>
        <div className="stat-bar">
          <div className={`stat-bar-fill ${barClass(pct)}`} style={{ width: Math.min(100, Math.max(0, pct)) + '%' }} />
        </div>
        {showRemaining && target > 0 && (
          <div className={`stat-diff ${diff >= 0 ? 'positive' : 'negative'}`}>
            {diff >= 0 ? '+' : ''}{fmtHours(diff)} {diff >= 0 ? 'מעל היעד' : 'נותרו להשלמה'}
          </div>
        )}
      </div>
    );
  };

  const liveTime = activePunch ? fmtHours(liveAdd) : null;
  const startTime = activePunch ? new Date(activePunch.start) : null;

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="row-between">
          <div>
            <div className="card-title" style={{ margin: 0 }}>שלום {user.name} 👋</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              {HEB_DAYS[today.getDay()]}, {today.getDate()} ב{HEB_MONTHS[today.getMonth()]} {today.getFullYear()}
              {jobPercent < 100 && (
                <span className="pill pill-muted" style={{ marginRight: 8 }}>{jobPercent}% משרה</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">כניסה/יציאה מהירה</div>
        <div className="punch-panel">
          <div className={`punch-status ${activePunch ? 'active' : ''}`}>
            <div className="punch-status-label">{activePunch ? 'בעבודה כרגע' : 'לא בעבודה'}</div>
            <div className="punch-status-time">{activePunch ? liveTime : '--:--'}</div>
            <div className="punch-status-sub">
              {activePunch ? (
                <>
                  נכנסת ב־<strong style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmtTime24(startTime)}</strong>
                  <button type="button" className="edit-time-link" onClick={() => setEditingPunch(true)} title="עריכת שעת כניסה">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    עריכה
                  </button>
                </>
              ) : 'בחר מיקום ולחץ על "כניסה"'}
            </div>
            <LocationToggle value={location} onChange={setLocation} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {activePunch ? (
              <button className="btn btn-danger btn-lg btn-block" onClick={() => onPunch({ action: 'stop', location })}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
                יציאה ושמירה
              </button>
            ) : (
              <button className="btn btn-primary btn-lg btn-block" onClick={() => onPunch({ action: 'start', location })}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                כניסה
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="stats-grid">
        {renderStat('היום', todayTotal, todayTarget, todayPct)}
        {renderStat('השבוע (א׳–ה׳)', weekTotal, weekStats.target, weekPct)}
        {renderStat('החודש', monthTotal, monthStats.target, monthPct)}
      </div>

      {/* Weekly & daily averages */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">ממוצע יומי</div>
          <div className="stat-value">{fmtHours(avgStats.dailyAvg)}</div>
          <div className="stat-target">ב-4 שבועות אחרונים</div>
          <div className="stat-bar">
            <div className="stat-bar-fill" style={{ width: Math.min(100, avgStats.dailyAvg > 0 ? 60 : 0) + '%' }} />
          </div>
          <div className="stat-diff" style={{ color: 'var(--text-muted)' }}>לפי ימים שעבדת בפועל</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">ממוצע שבועי</div>
          <div className="stat-value">{fmtHours(avgStats.weeklyAvg)}</div>
          <div className="stat-target">ב-4 שבועות אחרונים</div>
          <div className="stat-bar">
            <div className="stat-bar-fill" style={{ width: Math.min(100, weekStats.target > 0 ? (avgStats.weeklyAvg / weekStats.target) * 100 : 0) + '%' }} />
          </div>
          <div className="stat-diff" style={{ color: 'var(--text-muted)' }}>ממוצע 4 שבועות שלמים</div>
        </div>
      </div>

      <div className="card">
        <div className="row-between" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>סיכום שבועי</div>
          <div className="period-nav" style={{ margin: 0, flex: '0 0 auto', minWidth: 260 }}>
            <button className="nav-btn" onClick={() => setWeekOffset(o => o - 1)} aria-label="שבוע קודם">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <div className="current" style={{ fontSize: 13 }}>
              {isCurrentWeek ? 'השבוע הנוכחי'
                : weekOffset === -1 ? 'שבוע קודם'
                : weekOffset === 1 ? 'שבוע הבא'
                : `${weekStart.getDate()}.${weekStart.getMonth() + 1} – ${weekEnd.getDate()}.${weekEnd.getMonth() + 1}`}
            </div>
            <button className="nav-btn" onClick={() => setWeekOffset(o => o + 1)} aria-label="שבוע הבא">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            {!isCurrentWeek && (
              <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(0)}>היום</button>
            )}
          </div>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
          {weekStart.getDate()}.{weekStart.getMonth() + 1}.{weekStart.getFullYear()} – {weekEnd.getDate()}.{weekEnd.getMonth() + 1}.{weekEnd.getFullYear()}
          {' · '}סה"כ בפועל: <strong style={{ color: 'var(--text)' }}>{fmtHours(weekTotal)}</strong>
          {' · '}יעד: <strong style={{ color: 'var(--text)' }}>{fmtHours(weekStats.target)}</strong>
          {' · '}הפרש: <strong style={{ color: (weekTotal - weekStats.target) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {(weekTotal - weekStats.target) >= 0 ? '+' : ''}{fmtHours(weekTotal - weekStats.target)}
          </strong>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>יום</th>
                <th>תאריך</th>
                <th>יעד</th>
                <th>שעות בפועל</th>
                <th>הפרש</th>
                {isAdmin && <th style={{ textAlign: 'left' }}>עריכה</th>}
              </tr>
            </thead>
            <tbody>
              {daysInRange(weekStart, weekEnd).map(d => {
                const target = getPersonalDailyTarget(d, settings, jobPercent, userDaysOff);
                const isToday = ymd(d) === ymd(today);
                const worked = getWorkedOnDate(entries, d) + (isToday ? liveAdd : 0);
                const diff = worked - target;
                const holidayInfo = getHolidayInfo(d, settings);
                const isDayOff = userDaysOff.includes(ymd(d));
                const key = ymd(d);
                return (
                  <tr key={key}>
                    <td>
                      {HEB_DAYS[d.getDay()]}
                      {isToday && <span className="pill pill-info" style={{ marginRight: 6 }}>היום</span>}
                      {isDayOff && <span className="pill pill-muted" style={{ marginRight: 6 }}>חופש</span>}
                      {!isDayOff && holidayInfo && (
                        <span className={`pill ${holidayInfo.type === 'chag' ? 'pill-danger' : 'pill-warning'}`} style={{ marginRight: 6 }}>
                          {holidayInfo.note}
                        </span>
                      )}
                    </td>
                    <td>{d.getDate()}.{d.getMonth() + 1}</td>
                    <td>{fmtHours(target)}</td>
                    <td style={{ fontWeight: 500 }}>{fmtHours(worked)}</td>
                    <td>
                      {target > 0 || worked > 0 ? (
                        <span className={diff >= 0 ? 'pill pill-success' : 'pill pill-danger'}>
                          {diff >= 0 ? '+' : ''}{fmtHours(diff)}
                        </span>
                      ) : <span style={{ color: 'var(--text-soft)' }}>—</span>}
                    </td>
                    {isAdmin && (
                      <td>
                        <div className="actions-inline">
                          <button className="icon-btn" onClick={() => setEditingTargetDate(key)} title="עריכת יעד ליום זה">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingTargetDate && (
        <TargetEditorModal
          date={editingTargetDate}
          settings={settings}
          setSettings={setSettings}
          onClose={() => setEditingTargetDate(null)}
        />
      )}

      {editingPunch && activePunch && (
        <PunchEditModal
          activePunch={activePunch}
          onSave={(newStartIso) => { onEditPunch(newStartIso); setEditingPunch(false); }}
          onClose={() => setEditingPunch(false)}
        />
      )}
    </div>
  );
}
