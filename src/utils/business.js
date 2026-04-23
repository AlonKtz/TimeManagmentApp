import { ISRAELI_HOLIDAYS, HOLIDAY_TYPES } from '../constants';
import { ymd, daysInRange } from './date';

export function hashPwd(pwd) {
  let h = 0;
  for (let i = 0; i < pwd.length; i++) {
    h = ((h << 5) - h) + pwd.charCodeAt(i);
    h |= 0;
  }
  return String(h);
}

export function getHolidayInfo(date, settings) {
  const key = ymd(date);
  const ov = settings.overrides?.[key];
  if (ov) {
    return { source: 'override', hours: ov.hours, note: ov.note, type: ov.type || 'custom' };
  }
  const disabled = settings.disabledHolidays || [];
  if (disabled.includes(key)) return null;
  const h = ISRAELI_HOLIDAYS[key];
  if (h) {
    const hours = settings.holidayHours?.[h.type] ?? HOLIDAY_TYPES[h.type].defaultHours;
    return { source: 'builtin', hours, note: h.note, type: h.type };
  }
  return null;
}

export function getDailyTarget(date, settings) {
  const info = getHolidayInfo(date, settings);
  if (info) return info.hours;
  const dow = date.getDay();
  if (dow === 5 || dow === 6) return 0;
  return settings.standardHours?.[dow] ?? 0;
}

export function getWorkedOnDate(entries, date) {
  const key = ymd(date);
  return entries
    .filter(e => e.date === key)
    .reduce((sum, e) => sum + (e.hours || 0), 0);
}

export function getRangeStats(entries, settings, from, to) {
  const days = daysInRange(from, to);
  let target = 0, worked = 0;
  for (const d of days) {
    target += getDailyTarget(d, settings);
    worked += getWorkedOnDate(entries, d);
  }
  return { target, worked, diff: worked - target };
}
