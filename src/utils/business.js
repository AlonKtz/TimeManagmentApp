import { ISRAELI_HOLIDAYS, HOLIDAY_TYPES } from '../constants';
import { ymd, daysInRange } from './date';

// Leave / absence types. All book a full standard day (same target logic) —
// the app tracks presence, not payroll, so vacation/sick/reserve differ only
// by label. Each entry is stored as a time_entry marked by `note` and an `id`
// prefix that survive any DB CHECK constraint on `mode`.
export const LEAVE_TYPES = {
  vacation: { note: 'יום חופש', idPrefix: 'dayoff_', label: 'חופש',   pill: 'info'    },
  sick:     { note: 'יום מחלה', idPrefix: 'sick_',   label: 'מחלה',   pill: 'danger'  },
  reserve:  { note: 'מילואים',  idPrefix: 'miluim_', label: 'מילואים', pill: 'warning' },
};

// Back-compat: the original vacation marker note.
export const DAYOFF_NOTE = LEAVE_TYPES.vacation.note;

// Which leave type is this entry, if any? Returns 'vacation' | 'sick' | 'reserve' | null.
export function leaveKindOf(e) {
  if (!e) return null;
  if (e.id) {
    for (const [kind, t] of Object.entries(LEAVE_TYPES)) {
      if (e.id.startsWith(t.idPrefix)) return kind;
    }
  }
  for (const [kind, t] of Object.entries(LEAVE_TYPES)) {
    if (e.note === t.note) return kind;
  }
  if (e.mode === 'dayoff') return 'vacation'; // legacy rows
  return null;
}

// True for any leave/absence entry (vacation, sick, or reserve).
export function isDayOffEntry(e) {
  return leaveKindOf(e) !== null;
}

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
 * Personal daily target — respects (in priority order):
 *  1. customDailyHours[dow]   — per-user override; takes precedence over jobPercent
 *  2. jobPercent              — admin standard scaled by user's part-time %
 *
 * Rules:
 *  • Fri/Sat → always 0 (not a working day in Israel).
 *  • Holiday / day_override → settings hours × jobPercent (custom hours don't apply).
 *  • Weekday & customDailyHours[dow] is set → use that value verbatim.
 *  • Weekday & no custom → company standard scaled by jobPercent.
 *      - 100% (full time)  → standardHours[dow] as-is.
 *      - < 100% (part time) → uniform Sun-Thu = standardHours[0] × pct.
 */
export function getPersonalDailyTarget(date, settings, jobPercent = 100, customDailyHours = null) {
  const pct = (jobPercent ?? 100) / 100;
  const dow = date.getDay();

  if (dow === 5 || dow === 6) return 0;

  const info = getHolidayInfo(date, settings);
  if (info) {
    // Holidays always use admin's holiday hours × jobPercent (custom doesn't apply)
    return Math.round(info.hours * pct * 4) / 4;
  }

  // User has custom weekday hours → use verbatim (jobPercent ignored for weekdays)
  if (customDailyHours && customDailyHours[dow] != null && customDailyHours[dow] !== '') {
    return Number(customDailyHours[dow]) || 0;
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

/** Like getRangeStats but uses getPersonalDailyTarget for the user's job percent
 *  and optional per-weekday customDailyHours override. */
export function getPersonalRangeStats(entries, settings, from, to, jobPercent = 100, customDailyHours = null) {
  const days = daysInRange(from, to);
  let target = 0, worked = 0;
  for (const d of days) {
    target += getPersonalDailyTarget(d, settings, jobPercent, customDailyHours);
    worked += getWorkedOnDate(entries, d);
  }
  return { target, worked, diff: worked - target };
}
