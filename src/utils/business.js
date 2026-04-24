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

/**
 * Personal daily target — respects the user's job percentage (אחוזי משרה).
 *
 * Rules:
 *  • 100% (full time)  → use admin standard hours as-is (Sun-Wed 9h, Thu 8.5h).
 *  • < 100% (part time) → all weekdays equal: baseHours × (pct/100).
 *    The "base" is Sun's standard hours (typically 9h).
 *    Thursday gets no reduction because part-timers work uniform days.
 *  • Holidays / overrides → always scaled by (pct/100), rounded to ¼h.
 *  • Fri/Sat → always 0.
 */
export function getPersonalDailyTarget(date, settings, jobPercent = 100, daysOff = []) {
  // If this date is a day off for the user, target is 0
  if (daysOff.includes(ymd(date))) return 0;

  const pct = (jobPercent ?? 100) / 100;
  const dow = date.getDay();

  if (dow === 5 || dow === 6) return 0;

  const info = getHolidayInfo(date, settings);
  if (info) {
    // Scale holiday hours by job percent, round to nearest ¼h
    return Math.round(info.hours * pct * 4) / 4;
  }

  if (pct >= 1) {
    // Full time: use admin standard hours verbatim (includes Thu=8.5h)
    return settings.standardHours?.[dow] ?? 0;
  }

  // Part time: uniform hours across all weekdays (no Thursday reduction)
  const baseHours = settings.standardHours?.[0] ?? 9; // Sunday = base weekday
  return Math.round(baseHours * pct * 4) / 4;
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

/** Like getRangeStats but uses getPersonalDailyTarget for the user's job percent and days off. */
export function getPersonalRangeStats(entries, settings, from, to, jobPercent = 100, daysOff = []) {
  const days = daysInRange(from, to);
  let target = 0, worked = 0;
  for (const d of days) {
    target += getPersonalDailyTarget(d, settings, jobPercent, daysOff);
    worked += getWorkedOnDate(entries, d);
  }
  return { target, worked, diff: worked - target };
}
