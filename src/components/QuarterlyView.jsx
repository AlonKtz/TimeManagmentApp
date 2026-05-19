import { fmtHours } from '../utils/date';
import { getPersonalRangeStats } from '../utils/business';
import useAnimatedNumber from '../hooks/useAnimatedNumber';

const QUARTERS = [
  { id: 'Q1', label: 'Q1', months: 'ינואר – מרץ',     start: [0, 1], end: [2,  31] },
  { id: 'Q2', label: 'Q2', months: 'אפריל – יוני',    start: [3, 1], end: [5,  30] },
  { id: 'Q3', label: 'Q3', months: 'יולי – ספטמבר',   start: [6, 1], end: [8,  30] },
  { id: 'Q4', label: 'Q4', months: 'אוקטובר – דצמבר', start: [9, 1], end: [11, 31] },
];

function getQuarterDates(year, q) {
  const from = new Date(year, q.start[0], q.start[1]);
  const to   = new Date(year, q.end[0] + 1, 0); // last day of end month
  return { from, to };
}

export default function QuarterlyView({ user, entries, settings }) {
  const year             = new Date().getFullYear();
  const jobPercent       = user.jobPercent ?? 100;
  const customDailyHours = user.customDailyHours || null;
  const currentQ         = Math.floor(new Date().getMonth() / 3);

  const rows = QUARTERS.map((q, idx) => {
    const { from, to } = getQuarterDates(year, q);
    const stats = getPersonalRangeStats(entries, settings, from, to, jobPercent, customDailyHours);
    const pct   = stats.target > 0 ? (stats.worked / stats.target) * 100 : 0;
    const state = idx === currentQ ? 'current' : idx > currentQ ? 'future' : 'past';
    return { ...q, ...stats, pct, state };
  });

  const totalWorked = rows.reduce((s, r) => s + r.worked, 0);
  const totalTarget = rows.reduce((s, r) => s + r.target, 0);
  const totalDiff   = totalWorked - totalTarget;
  const totalPct    = totalTarget > 0 ? (totalWorked / totalTarget) * 100 : 0;

  return (
    <div>
      <div className="topbar2">
        <div className="topbar2-left">
          <div className="topbar2-eyebrow">שנת {year} · אחוזי משרה {jobPercent}%</div>
          <div className="topbar2-title">סיכום רבעוני</div>
        </div>
      </div>

      <div
        className="card2"
        style={{ marginBottom: 16, background: 'color-mix(in oklab, var(--surface) 70%, transparent)' }}
      >
        <div className="row" style={{ gap: 12, color: 'var(--text-muted)', fontSize: 13 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'var(--primary-soft)', color: 'var(--primary)',
            display: 'grid', placeItems: 'center', flex: '0 0 auto',
            fontSize: 18, fontWeight: 700,
          }}>✦</div>
          <div>
            שעות נצברות בתוך כל רבעון (עודפים מחודש לחודש ברבעון), אך{' '}
            <b style={{ color: 'var(--text)' }}>לא</b> עוברות בין רבעונים.
          </div>
        </div>
      </div>

      {/* ===== 4 quarter ring cards ===== */}
      <div className="q-grid stagger" style={{ marginBottom: 16 }}>
        {rows.map((q) => <QCard key={q.id} q={q} />)}
      </div>

      {/* ===== Detail table ===== */}
      <div className="card2">
        <div className="card2-title"><h3>פירוט רבעוני</h3></div>
        <div className="table-wrap" style={{ overflowX: 'auto' }}>
          <table className="table2">
            <thead>
              <tr>
                <th>רבעון</th>
                <th>תקופה</th>
                <th>יעד</th>
                <th>בפועל</th>
                <th>הפרש</th>
                <th style={{ width: 220 }}>התקדמות</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q.id} className={q.state === 'current' ? 'current' : ''}>
                  <td>
                    <div className="row">
                      <strong>{q.label}</strong>
                      {q.state === 'current' && <span className="pill2 primary">נוכחי</span>}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{q.months}</td>
                  <td>{fmtHours(q.target)}</td>
                  <td>
                    {q.state === 'future'
                      ? <span style={{ color: 'var(--text-soft)' }}>—</span>
                      : <b>{fmtHours(q.worked)}</b>}
                  </td>
                  <td>
                    {q.state === 'future' ? (
                      <span style={{ color: 'var(--text-soft)' }}>—</span>
                    ) : (
                      <span className={`pill2 ${q.diff >= 0 ? 'success' : 'danger'}`}>
                        {q.diff >= 0 ? '+' : ''}{fmtHours(q.diff)}
                      </span>
                    )}
                  </td>
                  <td>
                    {q.state === 'future' ? (
                      <span style={{ color: 'var(--text-soft)' }}>—</span>
                    ) : (
                      <div className="row" style={{ gap: 10 }}>
                        <div className="stat2-bar" style={{ flex: 1, marginTop: 0 }}>
                          <div
                            className={`stat2-bar-fill ${q.pct >= 100 ? 'over' : ''}`}
                            style={{ width: Math.min(100, q.pct) + '%' }}
                          />
                        </div>
                        <span className="num" style={{ fontSize: 13, fontWeight: 600, minWidth: 36, textAlign: 'end' }}>
                          {Math.round(q.pct)}%
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--surface-2)' }}>
                <td colSpan={2}><strong>סה״כ שנתי</strong></td>
                <td>{fmtHours(totalTarget)}</td>
                <td><b>{fmtHours(totalWorked)}</b></td>
                <td>
                  <span className={`pill2 ${totalDiff >= 0 ? 'success' : 'danger'}`}>
                    {totalDiff >= 0 ? '+' : ''}{fmtHours(totalDiff)}
                  </span>
                </td>
                <td>
                  <div className="row" style={{ gap: 10 }}>
                    <div className="stat2-bar" style={{ flex: 1, marginTop: 0 }}>
                      <div
                        className={`stat2-bar-fill ${totalPct >= 100 ? 'over' : ''}`}
                        style={{ width: Math.min(100, totalPct) + '%' }}
                      />
                    </div>
                    <span className="num" style={{ fontSize: 13, fontWeight: 600, minWidth: 36, textAlign: 'end' }}>
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

function QCard({ q }) {
  const animPct = useAnimatedNumber(Math.min(100, q.pct), { duration: 1100 });
  const r  = 50;
  const c  = 2 * Math.PI * r;
  const fg = (animPct / 100) * c;

  return (
    <div className={`q-card ${q.state}`}>
      <div className="q-card-label">{q.label}</div>
      <div className="q-card-months">{q.months}</div>
      <div className="q-card-ring">
        <svg viewBox="0 0 120 120">
          <circle className="bg" cx="60" cy="60" r={r} />
          <circle
            className={`fg ${q.pct >= 100 ? 'over' : ''}`}
            cx="60" cy="60" r={r}
            strokeDasharray={`${fg} ${c}`}
          />
        </svg>
        <div className="q-card-ring-center">
          <div>
            <div className="big">
              {q.state === 'future' ? '—' : Math.round(animPct) + '%'}
            </div>
            <div className="small">
              {q.state === 'future' ? 'טרם החל'
                : q.state === 'current' ? 'מתעדכן' : 'הסתיים'}
            </div>
          </div>
        </div>
      </div>
      <div className="q-card-stats">
        <span><b>{Math.round(q.worked)}</b> בפועל</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span><b>{Math.round(q.target)}</b> יעד</span>
      </div>
    </div>
  );
}
