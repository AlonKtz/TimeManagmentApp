export function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseYmd(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfWeek(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  return x;
}

export function endOfWeek(d) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 4);
  return e;
}

export function daysInRange(from, to) {
  const out = [];
  const cur = new Date(from);
  while (cur <= to) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function fmtHours(h) {
  if (isNaN(h) || h === null || h === undefined) return '0:00';
  const sign = h < 0 ? '-' : '';
  const abs = Math.abs(h);
  const hh = Math.floor(abs);
  const mm = Math.round((abs - hh) * 60);
  if (mm === 60) return `${sign}${hh + 1}:00`;
  return `${sign}${hh}:${String(mm).padStart(2, '0')}`;
}

export function fmtTime24(date) {
  if (!date) return '--:--';
  const d = date instanceof Date ? date : new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function normalizeTimeStr(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(s => parseInt(s, 10));
  if (isNaN(h) || isNaN(m)) return t;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function timeStrToHours(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h + (m || 0) / 60;
}

export function diffHours(startIso, endIso) {
  return (new Date(endIso) - new Date(startIso)) / 3600000;
}

export function sessionDuration(session) {
  if (!session) return 0;
  const end = session.end ? new Date(session.end) : new Date();
  return (end - new Date(session.start)) / 3600000;
}
