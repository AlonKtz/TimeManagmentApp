import { useState, useEffect } from 'react';
import { HEB_DAYS, HEB_MONTHS, DEFAULT_LOCATION } from '../constants';
import { ymd, fmtHours, fmtTime24, startOfWeek, endOfWeek, daysInRange, sessionDuration } from '../utils/date';
import { getPersonalDailyTarget, getWorkedOnDate, getPersonalRangeStats, getHolidayInfo } from '../utils/business';
import PunchEditModal from './PunchEditModal';
import TargetEditorModal from './TargetEditorModal';
import LiveTimer from './LiveTimer';
import StatCard from './StatCard';
import Heatmap from './Heatmap';
import LocationSplit from './LocationSplit';
import {
  IHome, IOffice, IPlay, IStop, IPencil, IChevronL, IChevronR,
} from './icons';

export default function Dashboard({
  user, entries, settings, setSettings, activePunch, onPunch, onEditPunch, daysOff,
}) {
  const [, setNow] = useState(new Date()); // tick to refresh liveAdd while punched
  const [weekOffset, setWeekOffset]               = useState(0);
  const [editingTargetDate, setEditingTargetDate] = useState(null);
  const [editingPunch, setEditingPunch]           = useState(false);
  const [location, setLocation]                   = useState(() => activePunch?.location || DEFAULT_LOCATION);

  const isAdmin          = user.role === 'admin';
  const jobPercent       = user.jobPercent ?? 100;
  const customDailyHours = user.customDailyHours || null;
  const userDaysOff      = daysOff || [];

  useEffect(() => {
    if (activePunch?.location) setLocation(activePunch.location);
  }, [activePunch?.location]);

  // Tick every second to keep weekly/today aggregates fresh while punched in
  useEffect(() => {
    if (!activePunch) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [activePunch]);

  // ── Stats ───────────────────────────────────────────────────────────────
  const today        = new Date();
  const todayTarget  = getPersonalDailyTarget(today, settings, jobPercent, customDailyHours);
  const todayWorked  = getWorkedOnDate(entries, today);
  const liveAdd      = activePunch ? sessionDuration({ start: activePunch.start }) : 0;
  const todayTotal   = todayWorked + liveAdd;

  const displayedBase = new Date(today);
  displayedBase.setDate(displayedBase.getDate() + weekOffset * 7);
  const weekStart = startOfWeek(displayedBase);
  const weekEnd   = endOfWeek(displayedBase);
  const weekStats = getPersonalRangeStats(entries, settings, weekStart, weekEnd, jobPercent, customDailyHours);
  const isCurrentWeek = weekOffset === 0;
  const weekTotal = weekStats.worked + (isCurrentWeek ? liveAdd : 0);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd   = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const monthStats = getPersonalRangeStats(entries, settings, monthStart, monthEnd, jobPercent, customDailyHours);
  const monthTotal = monthStats.worked + liveAdd;

  // ── Location split (current month) ──────────────────────────────────────
  const locSplit = entries
    .filter((e) => {
      if (e.mode === 'dayoff' || e.note === 'יום חופש') return false;
      const d = e.date && new Date(e.date + 'T12:00:00');
      return d && d >= monthStart && d <= monthEnd;
    })
    .reduce((acc, e) => {
      const loc = e.location === 'home' ? 'home' : 'office';
      acc[loc] += e.hours || 0;
      return acc;
    }, { office: 0, home: 0 });

  // ── Greeting line ───────────────────────────────────────────────────────
  const todayLabel = `${HEB_DAYS[today.getDay()]} · ${today.getDate()} ב${HEB_MONTHS[today.getMonth()]} ${today.getFullYear()}`;

  // Active punch metadata
  const punchStartMs = activePunch ? new Date(activePunch.start).getTime() : null;

  // ── Target-reach forecast ──────────────────────────────────────────────
  // While punched in, the moment the user will hit the daily target is:
  //   punch_start + (target - hours already worked from earlier entries today)
  // (independent of liveAdd — this stays stable as the timer ticks.)
  const targetReachTime = (activePunch && todayTarget > 0)
    ? new Date(punchStartMs + Math.max(0, (todayTarget - todayWorked)) * 3600000)
    : null;
  const targetAlreadyMet = todayTotal >= todayTarget && todayTarget > 0;

  return (
    <div>
      {/* ===== Top header ===== */}
      <div className="topbar2">
        <div className="topbar2-left">
          <div className="topbar2-eyebrow">{todayLabel}</div>
          <div className="topbar2-title">
            שלום {user.name}{' '}
            <span style={{ display: 'inline-block', animation: 'wave 1.6s ease-in-out infinite' }}>👋</span>
          </div>
        </div>
        {jobPercent < 100 && (
          <span className="pill2 muted">{jobPercent}% משרה</span>
        )}
      </div>
      <style>{`@keyframes wave { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(14deg); } 75% { transform: rotate(-8deg); } }`}</style>

      {/* ===== Hero punch ===== */}
      <div className={`hero-punch ${activePunch ? '' : 'idle'}`} style={{ marginBottom: 20 }}>
        <div className="hero-grid">
          <div>
            <div className="hero-eyebrow">
              <span className={`live-dot ${activePunch ? '' : 'idle'}`} />
              {activePunch ? 'אתה בעבודה כרגע' : 'מוכן להתחיל'}
            </div>
            {activePunch ? (
              <>
                <LiveTimer startMs={punchStartMs} />
                <div className="hero-sub">
                  נכנסת ב־<b style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtTime24(new Date(activePunch.start))}</b>
                  <button
                    type="button"
                    onClick={() => setEditingPunch(true)}
                    title="עריכת שעת כניסה"
                    style={{
                      background: 'rgba(255,255,255,0.16)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      padding: '3px 8px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    <IPencil width="11" height="11" /> עריכה
                  </button>
                  <span style={{ opacity: 0.6 }}>·</span>
                  מיקום: <b>{location === 'home' ? 'מהבית' : 'מהמשרד'}</b>
                  {todayTarget > 0 && (
                    <>
                      <span style={{ opacity: 0.6 }}>·</span>
                      היעד היומי: <b>{todayTarget.toFixed(1)} ש׳</b>
                    </>
                  )}
                  {targetReachTime && (
                    <>
                      <span style={{ opacity: 0.6 }}>·</span>
                      {targetAlreadyMet
                        ? <>✓ השלמת את היעד היומי</>
                        : <>הגעה לתקן היומי בשעה <b style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtTime24(targetReachTime)}</b></>}
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="hero-timer" dir="ltr">
                  <span>00:00</span><span className="sec">:00</span>
                </div>
                <div className="hero-sub">
                  בחר מיקום והתחל את היום. אפשר גם להוסיף רישום ידני מ"השעות שלי".
                </div>
              </>
            )}
          </div>

          <div className="hero-cta">
            <div className="location-seg2" role="group">
              <button
                className={location === 'office' ? 'active' : ''}
                onClick={() => setLocation('office')}
                type="button"
              >
                <IOffice />מהמשרד
              </button>
              <button
                className={location === 'home' ? 'active' : ''}
                onClick={() => setLocation('home')}
                type="button"
              >
                <IHome />מהבית
              </button>
            </div>
            {activePunch ? (
              <button
                className="punch-btn stop"
                onClick={() => onPunch({ action: 'stop', location })}
                type="button"
              >
                <IStop />יציאה ושמירה
              </button>
            ) : (
              <button
                className="punch-btn start"
                onClick={() => onPunch({ action: 'start', location })}
                type="button"
              >
                <IPlay />כניסה
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===== Stats trio ===== */}
      <div className="stats3 stagger" style={{ marginBottom: 20 }}>
        <StatCard label="היום"           value={todayTotal} target={todayTarget} />
        <StatCard label="השבוע (א׳–ה׳)" value={weekTotal}  target={weekStats.target} />
        <StatCard label="החודש"         value={monthTotal} target={monthStats.target} />
      </div>

      {/* ===== Heatmap + location split ===== */}
      <div
        className="resp-cols"
        style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 20 }}
      >
        <div className="card2">
          <div className="card2-title">
            <h3>פעילות החודש</h3>
            <span className="pill2 muted">{HEB_MONTHS[today.getMonth()]} {today.getFullYear()}</span>
          </div>
          <Heatmap
            entries={entries}
            settings={settings}
            year={today.getFullYear()}
            month={today.getMonth()}
          />
        </div>
        <div className="card2">
          <div className="card2-title">
            <h3>פילוח לפי מיקום</h3>
            <span className="pill2 muted">חודש נוכחי</span>
          </div>
          <LocationSplit office={locSplit.office} home={locSplit.home} />
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .resp-cols { grid-template-columns: 1fr !important; } }`}</style>

      {/* ===== Weekly summary ===== */}
      <div className="card2">
        <div className="card2-title">
          <h3>סיכום שבועי</h3>
          <div className="period-nav2">
            <button onClick={() => setWeekOffset((o) => o - 1)} aria-label="שבוע קודם">
              <IChevronR width="14" height="14" />
            </button>
            <div className="label">
              {isCurrentWeek ? 'השבוע הנוכחי'
                : weekOffset === -1 ? 'שבוע קודם'
                : weekOffset === 1  ? 'שבוע הבא'
                : `${weekStart.getDate()}.${weekStart.getMonth() + 1} – ${weekEnd.getDate()}.${weekEnd.getMonth() + 1}`}
            </div>
            <button onClick={() => setWeekOffset((o) => o + 1)} aria-label="שבוע הבא">
              <IChevronL width="14" height="14" />
            </button>
            {!isCurrentWeek && (
              <button onClick={() => setWeekOffset(0)} title="חזרה לשבוע הנוכחי" style={{ width: 'auto', padding: '0 10px', fontSize: 12 }}>
                היום
              </button>
            )}
          </div>
        </div>

        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
          {weekStart.getDate()}.{weekStart.getMonth() + 1} – {weekEnd.getDate()}.{weekEnd.getMonth() + 1}
          {' · '}סה״כ: <strong style={{ color: 'var(--text)' }}>{fmtHours(weekTotal)}</strong>
          {' · '}יעד: <strong style={{ color: 'var(--text)' }}>{fmtHours(weekStats.target)}</strong>
          {' · '}הפרש: <strong style={{ color: (weekTotal - weekStats.target) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {(weekTotal - weekStats.target) >= 0 ? '+' : ''}{fmtHours(weekTotal - weekStats.target)}
          </strong>
        </div>

        <div className="table-wrap" style={{ overflowX: 'auto' }}>
          <table className="table2">
            <thead>
              <tr>
                <th>יום</th>
                <th>תאריך</th>
                <th>יעד</th>
                <th>בפועל</th>
                <th>הפרש</th>
                {isAdmin && <th style={{ width: 1, textAlign: 'left' }}>עריכה</th>}
              </tr>
            </thead>
            <tbody>
              {daysInRange(weekStart, weekEnd).map((d) => {
                const target      = getPersonalDailyTarget(d, settings, jobPercent, customDailyHours);
                const isToday     = ymd(d) === ymd(today);
                const worked      = getWorkedOnDate(entries, d) + (isToday ? liveAdd : 0);
                const diff        = worked - target;
                const holidayInfo = getHolidayInfo(d, settings);
                const isDayOff    = userDaysOff.includes(ymd(d));
                const key         = ymd(d);
                return (
                  <tr key={key} className={isToday ? 'current' : ''}>
                    <td>
                      <div className="row">
                        <strong>{HEB_DAYS[d.getDay()]}</strong>
                        {isToday && <span className="pill2 primary">היום</span>}
                        {isDayOff && <span className="pill2 muted">חופש</span>}
                        {!isDayOff && holidayInfo && (
                          <span className={`pill2 ${holidayInfo.type === 'chag' ? 'danger' : 'warning'}`}>
                            {holidayInfo.note}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{d.getDate()}.{d.getMonth() + 1}</td>
                    <td>{fmtHours(target)}</td>
                    <td><b>{fmtHours(worked)}</b></td>
                    <td>
                      {target > 0 || worked > 0 ? (
                        <span className={`pill2 ${diff >= 0 ? 'success' : 'danger'}`}>
                          {diff >= 0 ? '+' : ''}{fmtHours(diff)}
                        </span>
                      ) : <span style={{ color: 'var(--text-soft)' }}>—</span>}
                    </td>
                    {isAdmin && (
                      <td>
                        <div className="row" style={{ justifyContent: 'flex-end' }}>
                          <button className="icon-btn2" onClick={() => setEditingTargetDate(key)} title="עריכת יעד">
                            <IPencil width="14" height="14" />
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

      {/* ===== Modals (unchanged behavior) ===== */}
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
