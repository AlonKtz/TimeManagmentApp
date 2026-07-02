// Monthly report → .xlsx in the Clalit ("שירותי בריאות כללית") timesheet layout.
//
// ExcelJS is imported dynamically by the caller so it lands in its own lazy
// chunk and never bloats the main bundle. This module only runs when the user
// actually clicks "ייצוא לאקסל".
//
// Layout (RTL sheet, column A = rightmost):
//   A תאריך · B יום בשבוע · C-E שעות רגילות (התחלה/סיום/סה״כ) ·
//   F-H שעות חריגות (התחלה/סיום/סה״כ) · I כוננות · J הערות
//
// Data the app doesn't track (overtime, on-call, site) is left blank/fillable.

import { HEB_DAYS, HEB_MONTHS } from '../constants';
import { ymd } from './date';
import { getPersonalRangeStats, isDayOffEntry } from './business';

const stripZero = (t) => (t ? String(t).replace(/^0(\d)/, '$1') : '');
// Excel date serial (days since 1899-12-30), computed in UTC so it never picks
// up a local-timezone shift the way a JS Date result would.
const excelSerial = (y, m /* 0-based */, d) =>
  Math.round((Date.UTC(y, m, d) - Date.UTC(1899, 11, 30)) / 86400000);

// "HH:MM" → Excel time as a fraction of a day (so real time math works in-sheet).
const timeToFrac = (t) => {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  if (Number.isNaN(h)) return null;
  return (h + (m || 0) / 60) / 24;
};
const thin = { style: 'thin', color: { argb: 'FF888888' } };
const allBorders = { top: thin, left: thin, bottom: thin, right: thin };

// Try to load a logo dropped into public/. Returns { buffer, extension } or null.
// Guards against the SPA fallback (missing file → index.html with 200).
async function loadLogo() {
  const base = (import.meta.env.BASE_URL || '/');
  for (const name of ['clalit-logo.png', 'clalit-logo.jpg', 'clalit-logo.jpeg']) {
    try {
      const res = await fetch(base + name, { cache: 'no-cache' });
      if (!res.ok) continue;
      const ct = res.headers.get('content-type') || '';
      if (!ct.startsWith('image')) continue;
      const buffer = await res.arrayBuffer();
      const extension = ct.includes('png') ? 'png' : 'jpeg';
      return { buffer, extension };
    } catch { /* try next */ }
  }
  return null;
}

// Aggregate one calendar day's entries into a single report row.
function dayRow(entries, date) {
  const key = ymd(date);
  const dayEntries = entries.filter((e) => e.date === key);
  let decimal = 0;
  const starts = [];
  const ends = [];
  const notes = [];
  for (const e of dayEntries) {
    decimal += e.hours || 0;
    if (!isDayOffEntry(e)) {
      if (e.start) starts.push(e.start);
      if (e.end) ends.push(e.end);
    }
    if (e.note) notes.push(e.note);
  }
  return {
    hasEntry: dayEntries.length > 0,
    // earliest start / latest end across the day's sessions
    start: starts.length ? stripZero(starts.slice().sort()[0]) : '',
    end:   ends.length ? stripZero(ends.slice().sort().at(-1)) : '',
    decimal,
    note: [...new Set(notes)].join(' · '),
  };
}

// Pure workbook builder — no browser globals, so it can be exercised in Node.
// `logo` is an optional pre-loaded { buffer, extension }.
export function buildWorkbook({ ExcelJS, user, entries, settings, year, month, logo = null }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hour Counter by AK';
  // Force Excel/Sheets to recalculate every formula on open, so dates, daily
  // totals and month totals show values immediately (not blank until edited).
  wb.calcProperties.fullCalcOnLoad = true;
  const ws = wb.addWorksheet(`${HEB_MONTHS[month]} ${year}`, {
    views: [{ rightToLeft: true, showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  // ── Column widths (A..J) ────────────────────────────────────────────────
  const widths = [11, 11, 10, 10, 15, 10, 10, 15, 9, 34];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const monthStart = new Date(year, month, 1);
  const monthEnd   = new Date(year, month + 1, 0);
  const stdHours = getPersonalRangeStats(
    entries, settings, monthStart, monthEnd,
    user.jobPercent ?? 100, user.customDailyHours || null,
  ).target;

  // ── Version tag (top-right corner = col A in RTL) ───────────────────────
  const ver = ws.getCell('A1');
  ver.value = 'גירסא 1.1';
  ver.font = { bold: true, size: 9, name: 'Arial' };
  ver.alignment = { horizontal: 'center', vertical: 'middle' };
  ver.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
  ver.border = allBorders;

  // ── Logo slot (centered, rows 1-6) ──────────────────────────────────────
  ws.mergeCells('C1:F6');
  if (logo) {
    const id = wb.addImage({ buffer: logo.buffer, extension: logo.extension });
    // Inset slightly inside the merged range so it doesn't touch borders.
    ws.addImage(id, { tl: { col: 2.2, row: 0.3 }, br: { col: 5.8, row: 5.7 } });
  }

  // ── Info boxes (name/site centered-right, year/month/std on the left) ───
  const labelStyle = (c) => {
    c.font = { bold: false, size: 11, name: 'Arial', color: { argb: 'FF555555' } };
    c.alignment = { horizontal: 'right', vertical: 'middle' };
    c.border = allBorders;
  };
  const valueStyle = (c) => {
    c.font = { bold: true, size: 11, name: 'Arial' };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = allBorders;
  };

  // name / site — below the logo (rows 7-8, col B label / C-D value)
  ws.getCell('B7').value = 'שם עובד';  labelStyle(ws.getCell('B7'));
  ws.mergeCells('C7:D7'); ws.getCell('C7').value = user.name || ''; valueStyle(ws.getCell('C7'));
  ws.getCell('B8').value = 'אתר';      labelStyle(ws.getCell('B8'));
  ws.mergeCells('C8:D8'); ws.getCell('C8').value = '';              valueStyle(ws.getCell('C8'));

  // year / month / standard hours — below the logo, left side (rows 7-9)
  ws.getCell('G7').value = 'שנה';        labelStyle(ws.getCell('G7'));
  ws.mergeCells('H7:I7'); ws.getCell('H7').value = year;       valueStyle(ws.getCell('H7'));
  ws.getCell('G8').value = 'חודש';        labelStyle(ws.getCell('G8'));
  ws.mergeCells('H8:I8'); ws.getCell('H8').value = month + 1;  valueStyle(ws.getCell('H8'));
  ws.getCell('G9').value = 'שעות תקן';    labelStyle(ws.getCell('G9'));
  ws.mergeCells('H9:I9'); ws.getCell('H9').value = Math.round(stdHours * 100) / 100; valueStyle(ws.getCell('H9'));

  // ── Two-level table header (rows 11-12) ─────────────────────────────────
  const HEADER_TOP = 11;
  const HEADER_SUB = 12;
  const DATA_START = 13;

  const headFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
  const headFont = { bold: true, size: 11, name: 'Arial' };
  const headAlign = { horizontal: 'center', vertical: 'middle', wrapText: true };

  const styleHead = (ref, value) => {
    const c = ws.getCell(ref);
    c.value = value;
    c.font = headFont;
    c.alignment = headAlign;
    c.fill = headFill;
    c.border = allBorders;
    return c;
  };

  // single-cell columns span both header rows
  ws.mergeCells(`A${HEADER_TOP}:A${HEADER_SUB}`); styleHead(`A${HEADER_TOP}`, 'תאריך');
  ws.mergeCells(`B${HEADER_TOP}:B${HEADER_SUB}`); styleHead(`B${HEADER_TOP}`, 'יום בשבוע');
  ws.mergeCells(`I${HEADER_TOP}:I${HEADER_SUB}`); styleHead(`I${HEADER_TOP}`, 'כוננות');
  ws.mergeCells(`J${HEADER_TOP}:J${HEADER_SUB}`); styleHead(`J${HEADER_TOP}`, 'הערות');

  // grouped columns
  ws.mergeCells(`C${HEADER_TOP}:E${HEADER_TOP}`); styleHead(`C${HEADER_TOP}`, 'שעות רגילות');
  ws.mergeCells(`F${HEADER_TOP}:H${HEADER_TOP}`); styleHead(`F${HEADER_TOP}`, 'שעות חריגות');
  styleHead(`C${HEADER_SUB}`, 'שעת התחלה');
  styleHead(`D${HEADER_SUB}`, 'שעת סיום');
  styleHead(`E${HEADER_SUB}`, 'סה״כ מחושב (עשרוני)');
  styleHead(`F${HEADER_SUB}`, 'שעת התחלה');
  styleHead(`G${HEADER_SUB}`, 'שעת סיום');
  styleHead(`H${HEADER_SUB}`, 'סה״כ מחושב (עשרוני)');
  ws.getRow(HEADER_TOP).height = 20;
  ws.getRow(HEADER_SUB).height = 30;

  // ── Data rows ─────────────────────────────────────────────────────────────
  // Always 31 rows so the sheet stays a reusable template. The date + weekday
  // are FORMULAS driven by the שנה/חודש cells (H7/H8): change the month and the
  // whole column recalculates; days past the month's end blank themselves out.
  // The regular-hours total (col E) is a live formula = (סיום − התחלה); times are
  // written as real Excel time values so that math works.
  const YEAR_CELL = '$H$7';
  const MONTH_CELL = '$H$8';
  const HEB_WEEKDAY_FORMULA = (a) =>
    `IF(${a}="","",CHOOSE(WEEKDAY(${a}),"ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"))`;

  const ROWS = 31;
  const daysInMonth = monthEnd.getDate();
  const DATA_END = DATA_START + ROWS - 1;
  let totalRegular = 0; // running sum for the cached SUM(E) result

  for (let i = 0; i < ROWS; i++) {
    const day = i + 1;
    const rowIdx = DATA_START + i;
    const inMonth = day <= daysInMonth;
    const date = inMonth ? new Date(year, month, day) : null;
    const r = inMonth ? dayRow(entries, date) : { start: '', end: '', decimal: 0, note: '' };
    const isWeekend = date && (date.getDay() === 5 || date.getDay() === 6);

    const setCell = (col, value, { numFmt, align = 'center' } = {}) => {
      const c = ws.getCell(`${col}${rowIdx}`);
      if (value != null) c.value = value;
      c.border = allBorders;
      c.font = { size: 10, name: 'Arial' };
      c.alignment = { horizontal: align, vertical: 'middle' };
      if (numFmt) c.numFmt = numFmt;
      if (isWeekend) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F7F7' } };
      return c;
    };

    // A: date driven by year/month cells (English month via [$-409]); B: weekday.
    // Every formula carries a cached `result` so values render even in viewers
    // that don't recalculate, while still updating live when the month changes.
    const dateExpr = `DATE(${YEAR_CELL},${MONTH_CELL},1)+${i}`;
    setCell('A', { formula: `IF(MONTH(${dateExpr})=${MONTH_CELL},${dateExpr},"")`, result: inMonth ? excelSerial(year, month, day) : '' }, { numFmt: '[$-409]d-mmm-yy' });
    setCell('B', { formula: HEB_WEEKDAY_FORMULA(`A${rowIdx}`), result: inMonth ? HEB_DAYS[date.getDay()] : '' });

    // C/D punch in-out (real time values); E regular total = live formula from them.
    const startFrac = timeToFrac(r.start);
    const endFrac = timeToFrac(r.end);
    setCell('C', startFrac, { numFmt: 'h:mm' });
    setCell('D', endFrac, { numFmt: 'h:mm' });
    if (startFrac != null && endFrac != null) {
      const eResult = Math.round((endFrac - startFrac) * 24 * 100) / 100;
      totalRegular += eResult;
      setCell('E', { formula: `IF(AND(C${rowIdx}<>"",D${rowIdx}<>""),(D${rowIdx}-C${rowIdx})*24,"")`, result: eResult }, { numFmt: '0.00' });
    } else if (r.decimal > 0) {
      // Leave / manual-hours day: no punch times, so show the hours directly.
      const eVal = Math.round(r.decimal * 100) / 100;
      totalRegular += eVal;
      setCell('E', eVal, { numFmt: '0.00' });
    } else {
      setCell('E', null, { numFmt: '0.00' });
    }

    // F/G overtime punch (blank, fillable); H overtime total = live formula.
    setCell('F', null, { numFmt: 'h:mm' });
    setCell('G', null, { numFmt: 'h:mm' });
    setCell('H', { formula: `IF(AND(F${rowIdx}<>"",G${rowIdx}<>""),(G${rowIdx}-F${rowIdx})*24,"")`, result: '' }, { numFmt: '0.00' });

    // I on-call dropdown; J note
    setCell('I', null);
    ws.getCell(`I${rowIdx}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"כן,לא"'] };
    setCell('J', r.note || null, { align: 'right' });

    ws.getRow(rowIdx).height = 18;
  }
  totalRegular = Math.round(totalRegular * 100) / 100;

  // ── Month totals (right) + signatures (left) ──────────────────────────────
  const SUM_ROW = DATA_END + 2; // one blank spacer row after the table

  const boxLabel = (ref, text) => {
    const c = ws.getCell(ref);
    c.value = text;
    c.font = { bold: true, size: 11, name: 'Arial' };
    c.alignment = { horizontal: 'right', vertical: 'middle' };
    c.border = allBorders;
  };
  const boxValue = (ref, value, numFmt) => {
    const c = ws.getCell(ref);
    if (value != null) c.value = value;
    c.font = { bold: true, size: 11, name: 'Arial' };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = allBorders;
    if (numFmt) c.numFmt = numFmt;
  };

  // Totals box (cols A-C) — cached results so they show without a recalc.
  const totals = [
    ['סה״כ שעות',         `SUM(E${DATA_START}:E${DATA_END})`,        totalRegular, '0.00'],
    ['סה״כ שעות חריגות',  `SUM(H${DATA_START}:H${DATA_END})`,        0,            '0.00'],
    ['סה״כ ימי כוננות',   `COUNTIF(I${DATA_START}:I${DATA_END},"כן")`, 0,          '0'],
  ];
  totals.forEach(([label, formula, result, fmt], i) => {
    const rr = SUM_ROW + i;
    ws.mergeCells(`A${rr}:B${rr}`);
    boxLabel(`A${rr}`, label);
    boxValue(`C${rr}`, { formula, result }, fmt);
    ws.getRow(rr).height = 22;
  });

  // Signatures box (cols E-H)
  const signatures = [
    ['חתימת העובד',       user.name || ''],
    ['חתימת מנהל האתר',   ''],
    ['חתימת מנהל המחשוב', ''],
  ];
  signatures.forEach(([label, value], i) => {
    const rr = SUM_ROW + i;
    ws.mergeCells(`E${rr}:F${rr}`);
    boxLabel(`E${rr}`, label);
    ws.mergeCells(`G${rr}:H${rr}`);
    boxValue(`G${rr}`, value || null);
  });

  return wb;
}

// Browser entry point: load logo, build the workbook, trigger a download.
export async function exportMonthlyReport({ ExcelJS, user, entries, settings, year, month }) {
  const logo = await loadLogo();
  const wb = buildWorkbook({ ExcelJS, user, entries, settings, year, month, logo });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `דוח שעות - ${user.name || 'עובד'} - ${month + 1}.${year}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
