import { useEffect, useState } from 'react';
import sb from '../lib/supabase';
import { fmtHours, ymd } from '../utils/date';

function weekStart(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - start.getDay());
  return ymd(start);
}

function timeLabel(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

export default function AdminOverview({ users, currentUser, auth }) {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);

  const refresh = async () => {
    try {
      const freshUsers = await auth.loadUsers();
      if (!freshUsers) throw new Error('לא ניתן לטעון את רשימת המשתמשים');
      const today = ymd(new Date());
      const ids = freshUsers.filter((u) => u.status !== 'pending').map((u) => u.id);
      let rows = [];
      if (ids.length) {
        rows = await sb.select(
          'time_entries',
          `select=user_id,date,hours,note,mode&user_id=in.(${ids.join(',')})&date=gte.${weekStart(new Date())}&date=lte.${today}&order=date.desc`
        );
      }
      setEntries(rows);
      setError('');
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e?.message || 'טעינת נתוני הצוות נכשלה');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 60_000);
    return () => clearInterval(timer);
  }, []);

  const today = ymd(new Date());
  const activeUsers = users.filter((u) => u.status !== 'pending');
  const rowsByUser = new Map(activeUsers.map((u) => [u.id, { today: 0, week: 0 }]));
  for (const entry of entries) {
    const totals = rowsByUser.get(entry.user_id);
    if (!totals) continue;
    const hours = Number(entry.hours) || 0;
    totals.week += hours;
    if (entry.date?.slice(0, 10) === today) totals.today += hours;
  }
  const hasStalePunch = (u) => u.punch_state?.start && Date.now() - new Date(u.punch_state.start).getTime() > 16 * 60 * 60 * 1000;
  const clockedIn = activeUsers.filter((u) => u.punch_state?.start && !hasStalePunch(u));
  const todayHours = [...rowsByUser.values()].reduce((sum, x) => sum + x.today, 0);
  const weekHours = [...rowsByUser.values()].reduce((sum, x) => sum + x.week, 0);
  const peopleWithHours = [...rowsByUser.values()].filter((x) => x.today > 0).length;

  const statStyle = {
    border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px',
    background: 'var(--surface)', minWidth: 0,
  };
  const numberStyle = { fontSize: 26, lineHeight: 1.2, fontWeight: 800, fontVariantNumeric: 'tabular-nums' };
  const labelStyle = { color: 'var(--text-muted)', fontSize: 13, marginTop: 5 };

  return (
    <section className="card2" aria-labelledby="admin-overview-title" style={{ marginBottom: 16 }}>
      <div className="card2-title" style={{ alignItems: 'center' }}>
        <div>
          <h3 id="admin-overview-title" style={{ marginBottom: 2 }}>תמונת מצב</h3>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>נתוני הצוות מתעדכנים אוטומטית כל דקה</div>
        </div>
        <button className="btn2 ghost" type="button" onClick={refresh} disabled={loading} style={{ padding: '6px 12px' }}>
          {loading ? 'טוען…' : 'רענון'}
        </button>
      </div>

      {error ? (
        <div role="alert" style={{ color: 'var(--danger)', background: 'var(--danger-soft)', borderRadius: 8, padding: 12, fontSize: 13 }}>
          לא ניתן להציג את נתוני הצוות: {error}. בדוק את הרשאות הקריאה של מנהלים ב־Supabase.
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 18 }}>
            <div style={statStyle}><div style={numberStyle}>{clockedIn.length}</div><div style={labelStyle}>עובדים בשעון כרגע</div></div>
            <div style={statStyle}><div style={numberStyle}>{fmtHours(todayHours)}</div><div style={labelStyle}>שעות שנרשמו היום</div></div>
            <div style={statStyle}><div style={numberStyle}>{peopleWithHours}/{activeUsers.length}</div><div style={labelStyle}>עובדים עם שעות היום</div></div>
            <div style={statStyle}><div style={numberStyle}>{fmtHours(weekHours)}</div><div style={labelStyle}>שעות מתחילת השבוע</div></div>
          </div>

          <div className="table-wrap">
            <table className="table2">
              <thead><tr><th>עובד</th><th>מצב</th><th>התחיל</th><th>היום</th><th>השבוע</th></tr></thead>
              <tbody>
                {activeUsers.map((u) => {
                  const total = rowsByUser.get(u.id) || { today: 0, week: 0 };
                  const punch = u.punch_state?.start;
                  const stale = punch && hasStalePunch(u);
                  return (
                    <tr key={u.id}>
                      <td>{u.name || u.email || 'משתמש'}</td>
                      <td><span className={`pill2 ${punch ? (stale ? 'warning' : 'success') : 'info'}`}>
                        {punch ? (stale ? 'שעון פתוח זמן רב' : 'בעבודה') : 'לא בשעון'}
                      </span></td>
                      <td>{punch ? timeLabel(punch) : '—'}</td>
                      <td>{fmtHours(total.today)}</td>
                      <td>{fmtHours(total.week)}</td>
                    </tr>
                  );
                })}
                {activeUsers.length === 0 && <tr><td colSpan="5" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>אין משתמשים להצגה</td></tr>}
              </tbody>
            </table>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 10 }}>
            {updatedAt ? `עודכן ${timeLabel(updatedAt.toISOString())}` : 'טוען נתונים…'} · {currentUser?.name || 'מנהל'}
          </div>
        </>
      )}
    </section>
  );
}

