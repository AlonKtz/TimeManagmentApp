import { fmtHours } from '../utils/date';
import { getPersonalRangeStats } from '../utils/business';

const QUARTERS = [
  { id: 'Q1', label: 'Q1', months: 'ינואר–מרץ',   start: [0, 1],  end: [2, 31] },
  { id: 'Q2', label: 'Q2', months: 'אפריל–יוני',   start: [3, 1],  end: [5, 30] },
  { id: 'Q3', label: 'Q3', months: 'יולי–ספטמבר', start: [6, 1],  end: [8, 30] },
  { id: 'Q4', label: 'Q4', months: 'אוקטובר–דצמבר', start: [9, 1], end: [11, 31] },
];

function getQuarterDates(year, quarter) {
  const from = new Date(year, quarter.start[0], quarter.start[1]);
  // Use last day of month properly
  const toMonth = quarter.end[0];
  const from2 = new Date(year, toMonth + 1, 0); // last day of that month
  return { from, to: from2 };
}

function ProgressBar({ pct }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const cls = pct >= 100 ? 'stat-bar-fill complete' : 'stat-bar-fill';
  return (
    <div className="stat-bar" style={{ width: 120, display: 'inline-block', verticalAlign: 'middle', marginLeft: 8 }}>
      <div className={cls} style={{ width: clamped + '%' }} />
    </div>
  );
}

export default function QuarterlyView({ user, entries, settings, daysOff }) {
  const year = new Date().getFullYear();
  const jobPercent = user.jobPercent ?? 100;
  const userDaysOff = daysOff?.[user.id] || [];

  const rows = QUARTERS.map(q => {
    const { from, to } = getQuarterDates(year, q);
    const stats = getPersonalRangeStats(entries, settings, from, to, jobPercent, userDaysOff);
    const pct = stats.target > 0 ? (stats.worked / stats.target) * 100 : (stats.worked > 0 ? 100 : 0);
    return { ...q, ...stats, pct, from, to };
  });

  const totalWorked = rows.reduce((s, r) => s + r.worked, 0);
  const totalTarget = rows.reduce((s, r) => s + r.target, 0);
  const totalDiff = totalWorked - totalTarget;
  const totalPct = totalTarget > 0 ? (totalWorked / totalTarget) * 100 : 0;

  const currentMonth = new Date().getMonth();
  const currentQuarterIdx = Math.floor(currentMonth / 3);

  return (
    <div>
      <div className="card">
        <div className="card-title">
          סיכום רבעוני {year}
          <span className="count">אחוזי משרה: {jobPercent}%</span>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
          שעות נצברות בתוך כל רבעון (עודפים מחודש לחודש ברבעון), אך <strong>לא</strong> עוברות בין רבעונים.
        </div>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>רבעון</th>
                <th>תקופה</th>
                <th>יעד</th>
                <th>בפועל</th>
                <th>הפרש</th>
                <th>התקדמות</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const isCurrent = idx === currentQuarterIdx;
                const isFuture = idx > currentQuarterIdx;
                return (
                  <tr key={row.id} style={isCurrent ? { background: 'var(--primary-soft)' } : {}}>
                    <td>
                      <strong>{row.label}</strong>
                      {isCurrent && <span className="pill pill-info" style={{ marginRight: 6 }}>נוכחי</span>}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{row.months}</td>
                    <td>{fmtHours(row.target)}</td>
                    <td style={{ fontWeight: 500 }}>
                      {isFuture ? <span style={{ color: 'var(--text-soft)' }}>—</span> : fmtHours(row.worked)}
                    </td>
                    <td>
                      {isFuture ? (
                        <span style={{ color: 'var(--text-soft)' }}>—</span>
                      ) : (
                        <span className={row.diff >= 0 ? 'pill pill-success' : 'pill pill-danger'}>
                          {row.diff >= 0 ? '+' : ''}{fmtHours(row.diff)}
                        </span>
                      )}
                    </td>
                    <td>
                      {isFuture ? (
                        <span style={{ color: 'var(--text-soft)', fontSize: 13 }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ProgressBar pct={row.pct} />
                          <span style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 36 }}>
                            {Math.round(row.pct)}%
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--surface-2)', fontWeight: 600 }}>
                <td colSpan={2}>סה"כ שנתי</td>
                <td>{fmtHours(totalTarget)}</td>
                <td>{fmtHours(totalWorked)}</td>
                <td>
                  <span className={totalDiff >= 0 ? 'pill pill-success' : 'pill pill-danger'}>
                    {totalDiff >= 0 ? '+' : ''}{fmtHours(totalDiff)}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ProgressBar pct={totalPct} />
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 36 }}>
                      {Math.round(totalPct)}%
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
