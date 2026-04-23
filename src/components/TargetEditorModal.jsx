import { useState } from 'react';
import { HEB_DAYS, HOLIDAY_TYPES, ISRAELI_HOLIDAYS } from '../constants';
import { parseYmd, fmtHours } from '../utils/date';
import { getHolidayInfo, getDailyTarget } from '../utils/business';

export default function TargetEditorModal({ date, settings, setSettings, onClose }) {
  const d = parseYmd(date);
  const holidayInfo = getHolidayInfo(d, settings);
  const dow = d.getDay();
  const isWeekend = dow === 5 || dow === 6;
  const defaultHours = isWeekend ? 0 : (settings.standardHours?.[dow] ?? 0);
  const currentTarget = getDailyTarget(d, settings);

  const existingOverride = settings.overrides?.[date];
  const builtinHoliday = ISRAELI_HOLIDAYS[date];
  const isDisabledBuiltin = (settings.disabledHolidays || []).includes(date);

  const [hours, setHours] = useState(String(currentTarget));
  const [note, setNote] = useState(existingOverride?.note || '');

  const save = () => {
    const n = parseFloat(hours);
    if (isNaN(n) || n < 0 || n > 24) {
      alert('הזן מספר שעות תקין (בין 0 ל־24)');
      return;
    }
    setSettings({
      ...settings,
      overrides: {
        ...settings.overrides,
        [date]: {
          hours: n,
          note: note.trim() || (builtinHoliday ? builtinHoliday.note : 'חריגה'),
          type: 'custom',
        }
      }
    });
    onClose();
  };

  const reset = () => {
    const { [date]: _, ...restOverrides } = settings.overrides || {};
    const next = { ...settings, overrides: restOverrides };
    if (isDisabledBuiltin) {
      next.disabledHolidays = (settings.disabledHolidays || []).filter(k => k !== date);
    }
    setSettings(next);
    onClose();
  };

  const markRegular = () => {
    const { [date]: _, ...restOverrides } = settings.overrides || {};
    const next = { ...settings, overrides: restOverrides };
    if (builtinHoliday && !isDisabledBuiltin) {
      next.disabledHolidays = [...(settings.disabledHolidays || []), date];
    }
    setSettings(next);
    onClose();
  };

  let sourceLabel, sourceDetail;
  if (existingOverride) {
    sourceLabel = 'חריגה מותאמת אישית';
    sourceDetail = existingOverride.note || '—';
  } else if (holidayInfo?.source === 'builtin') {
    sourceLabel = HOLIDAY_TYPES[holidayInfo.type]?.label || 'חג';
    sourceDetail = holidayInfo.note;
  } else if (isWeekend) {
    sourceLabel = 'סוף שבוע';
    sourceDetail = 'ימי שישי ושבת אינם ימי עבודה';
  } else {
    sourceLabel = 'תקן יומי רגיל';
    sourceDetail = `ברירת מחדל ליום ${HEB_DAYS[dow]}: ${fmtHours(defaultHours)}`;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          עריכת יעד ליום {HEB_DAYS[dow]}, {d.getDate()}.{d.getMonth() + 1}.{d.getFullYear()}
        </div>

        <div style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 13 }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>מקור היעד הנוכחי</div>
          <div style={{ fontWeight: 500 }}>{sourceLabel} — {fmtHours(currentTarget)}</div>
          <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{sourceDetail}</div>
        </div>

        <div className="form-group">
          <label className="form-label">מספר שעות יעד</label>
          <input
            type="number" step="0.25" min="0" max="24"
            value={hours}
            onChange={e => setHours(e.target.value)}
            autoFocus
          />
          <div className="hint">הזן 0 ליום חופש מלא. חריגה מותאמת אישית גוברת על כל הגדרה אחרת.</div>
        </div>

        <div className="form-group">
          <label className="form-label">תיאור (אופציונלי)</label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="סיבה לשינוי, למשל: יום קצר, חצי חג, אירוע חברה..."
          />
        </div>

        <div className="form-actions" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={save}>שמירה</button>
            <button className="btn btn-secondary" onClick={onClose}>ביטול</button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(existingOverride || isDisabledBuiltin) && (
              <button className="btn btn-ghost btn-sm" onClick={reset} title="החזרה להגדרת ברירת המחדל">
                איפוס לברירת מחדל
              </button>
            )}
            {builtinHoliday && !isDisabledBuiltin && !existingOverride && (
              <button className="btn btn-ghost btn-sm" onClick={markRegular} title="ביטול החג ליום זה בלבד">
                סמן כיום עבודה רגיל
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
