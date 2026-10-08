import { isDayOffEntry } from './business.js';

const stripZero = (time) => (time ? String(time).replace(/^0(\d)/, '$1') : '');

// The export counts only actual entries recorded at the office or home.
// Leave markers are excluded even when their legacy location is office/home.
export function summarizeWorkdayEntries(entries) {
  const worked = entries.filter(
    (entry) => !isDayOffEntry(entry) && (entry.location === 'office' || entry.location === 'home')
  );
  const starts = worked.map((entry) => entry.start).filter(Boolean).sort();
  const ends = worked.map((entry) => entry.end).filter(Boolean).sort();
  const notes = entries.map((entry) => entry.note).filter(Boolean);

  return {
    hasEntry: entries.length > 0,
    start: starts.length ? stripZero(starts[0]) : '',
    end: ends.length ? stripZero(ends.at(-1)) : '',
    decimal: worked.reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0),
    note: [...new Set(notes)].join(' · '),
  };
}