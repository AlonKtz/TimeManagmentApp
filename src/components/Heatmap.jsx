import { ymd } from '../utils/date';
import { getHolidayInfo, getWorkedOnDate } from '../utils/business';

const DOW_HEB = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];

// Saturate hours → discrete level 0..4 for cell color
function levelFor(hours) {
  if (hours == null) return null;
  if (hours === 0)   return 0;
  if (hours < 4)     return 1;
  if (hours < 7)     return 2;
  if (hours < 9.5)   return 3;
  return 4;
}

// Monthly grid heatmap (Sun..Sat columns, weeks as rows).
// Wired to real `entries` for the user — sums hours per day and colors
// cells from gray (none) → primary (full standard).
export default function Heatmap({ entries, settings, year, month /* 0..11 */ }) {
  const today    = new Date();
  const todayKey = ymd(today);

  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0); // last day of month
  const totalDays = last.getDate();
  const offset    = first.getDay(); // 0 = Sunday

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push({ blank: true });
  for (let i = 1; i <= totalDays; i++) {
    const d = new Date(year, month, i);
    const hours = getWorkedOnDate(entries, d);
    const holiday = getHolidayInfo(d, settings);
    cells.push({
      day: i,
      hours: hours || (holiday && holiday.hours === 0 ? 0 : (hours || 0)),
      isToday: ymd(d) === todayKey,
      isFuture: d > today,
      isHoliday: !!holiday,
      holidayNote: holiday?.note,
    });
  }

  return (
    <div>
      <div className="heatmap-head">
        {DOW_HEB.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="heatmap">
        {cells.map((c, i) => {
          if (c.blank) {
            return <div key={'b' + i} className="heatmap-day" style={{ visibility: 'hidden', animation: 'none' }} />;
          }
          const l = c.isHoliday ? null : levelFor(c.hours);
          const cls = [
            'heatmap-day',
            c.isHoliday && 'holiday',
            l === 1 && 'l1',
            l === 2 && 'l2',
            l === 3 && 'l3',
            l === 4 && 'l4',
            c.isToday && 'today',
            c.isFuture && 'future',
          ].filter(Boolean).join(' ');
          const delay = `${i * 14}ms`;
          const tip = c.isHoliday
            ? `${c.day}.${month + 1} · ${c.holidayNote}`
            : `${c.day}.${month + 1} · ${c.hours > 0 ? c.hours.toFixed(1) + ' ש׳' : '—'}`;
          return (
            <div key={i} className={cls} style={{ animationDelay: delay }}>
              {c.day}
              <div className="heatmap-day-tip">{tip}</div>
            </div>
          );
        })}
      </div>
      <div className="heatmap-legend">
        <span>פחות</span>
        <span className="cell l0" />
        <span className="cell l1" />
        <span className="cell l2" />
        <span className="cell l3" />
        <span className="cell l4" />
        <span>יותר</span>
      </div>
    </div>
  );
}
