import { useState, useMemo } from 'react';
import { IPencil } from './icons';
import { HEB_DAYS, DEFAULT_SETTINGS } from '../constants';

const JOB_PRESETS = [
  { label: 'משרה מלאה',         sublabel: '100% — א׳–ד׳ 9 שעות, ה׳ 8.5 שעות', value: 100 },
  { label: 'חצי משרה',           sublabel: '50% — כל יום 4.5 שעות',             value: 50  },
  { label: 'אחוז מותאם אישית',   sublabel: '',                                  value: null },
];

// Compare two day-hours maps for equality. Treats {} / null as equal-to-defaults.
function sameDays(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  for (const k of [0, 1, 2, 3, 4]) {
    if (Number(a[k] ?? 0) !== Number(b[k] ?? 0)) return false;
  }
  return true;
}

export default function AccountSettings({ user, auth, settings }) {
  const savedPct = user.jobPercent ?? 100;
  const isCustom = savedPct !== 100 && savedPct !== 50;
  const [selectedPreset, setSelectedPreset] = useState(isCustom ? null : savedPct);
  const [customPct, setCustomPct]           = useState(isCustom ? String(savedPct) : '');
  const [jobFlash, setJobFlash]             = useState('');

  // ── Custom weekly hours (per-user) ────────────────────────────────────
  const companyDefault = settings?.standardHours || DEFAULT_SETTINGS.standardHours;
  const initialHours = user.customDailyHours || companyDefault;
  const [hours, setHours] = useState(() => ({
    0: initialHours[0] ?? 0,
    1: initialHours[1] ?? 0,
    2: initialHours[2] ?? 0,
    3: initialHours[3] ?? 0,
    4: initialHours[4] ?? 0,
  }));
  const [hoursFlash, setHoursFlash] = useState('');

  const weeklySum = useMemo(() =>
    [0, 1, 2, 3, 4].reduce((s, k) => s + (Number(hours[k]) || 0), 0),
    [hours]
  );

  const matchesCompany = sameDays(hours, companyDefault);
  const matchesSaved   = sameDays(hours, user.customDailyHours || companyDefault);

  const updateDay = (dow, val) => {
    const n = parseFloat(val);
    setHours((h) => ({ ...h, [dow]: isNaN(n) ? 0 : Math.max(0, Math.min(24, n)) }));
  };

  const saveHours = async () => {
    // Saving the company default → store null (use shared standard)
    const toSave = matchesCompany ? null : { 0: hours[0], 1: hours[1], 2: hours[2], 3: hours[3], 4: hours[4] };
    await auth.updateCustomHours({ userId: user.id, customDailyHours: toSave });
    setHoursFlash(matchesCompany
      ? 'חזרת לתקן החברה ✓'
      : `שעות אישיות נשמרו (${weeklySum.toFixed(1)} ש׳/שבוע) ✓`);
    setTimeout(() => setHoursFlash(''), 3000);
  };

  const resetToCompany = () => {
    setHours({
      0: companyDefault[0] ?? 0,
      1: companyDefault[1] ?? 0,
      2: companyDefault[2] ?? 0,
      3: companyDefault[3] ?? 0,
      4: companyDefault[4] ?? 0,
    });
  };

  const effectivePct = selectedPreset !== null ? selectedPreset : parseFloat(customPct) || 0;

  const saveJobPercent = () => {
    const pct = selectedPreset !== null ? selectedPreset : parseFloat(customPct);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      alert('הזן אחוז תקין בין 1 ל-100');
      return;
    }
    auth.updateJobPercent({ userId: user.id, percent: pct });
    setJobFlash(`אחוזי משרה עודכנו ל-${pct}% ✓`);
    setTimeout(() => setJobFlash(''), 3000);
  };

  return (
    <div>
      <div className="topbar2">
        <div className="topbar2-left">
          <div className="topbar2-eyebrow">פרופיל אישי</div>
          <div className="topbar2-title">החשבון שלי</div>
        </div>
      </div>

      {/* ===== Hero card ===== */}
      <div className="account-hero">
        <div className="account-avatar">{(user.name || '?').slice(0, 1)}</div>
        <div className="account-info">
          <h2>{user.name}</h2>
          <div className="role" dir="ltr" style={{ textAlign: 'right' }}>{user.email}</div>
          <div className="stats">
            <div><b>{user.role === 'admin' ? 'מנהל' : 'עובד'}</b>תפקיד</div>
            <div><b>{savedPct}%</b>אחוז משרה</div>
            {user.createdAt && (
              <div><b>{new Date(user.createdAt).toLocaleDateString('he-IL')}</b>הצטרפת למערכת</div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Job percent card ===== */}
      <div className="card2" style={{ marginTop: 16 }}>
        <div className="card2-title">
          <h3>אחוזי משרה</h3>
          <IPencil style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
        </div>

        {jobFlash && (
          <div style={{ background: 'var(--success-soft)', color: 'var(--success)', padding: '10px 14px', borderRadius: 10, marginBottom: 14, fontSize: 13, fontWeight: 600 }}>
            ✓ {jobFlash}
          </div>
        )}

        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
          קובע את יעד השעות היומי שלך. הגדרה זו משפיעה על הסטטיסטיקות האישיות שלך בלבד.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {JOB_PRESETS.map((preset) => {
            const isSelected = preset.value === null
              ? selectedPreset === null
              : selectedPreset === preset.value;
            return (
              <label
                key={preset.label}
                onClick={() => setSelectedPreset(preset.value)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '14px 16px',
                  border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 14,
                  background: isSelected ? 'var(--primary-soft)' : 'var(--surface)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <input
                  type="radio"
                  name="jobPreset"
                  checked={isSelected}
                  onChange={() => setSelectedPreset(preset.value)}
                  style={{ marginTop: 3, accentColor: 'var(--primary)', flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{preset.label}</div>
                  {preset.sublabel && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{preset.sublabel}</div>
                  )}
                  {preset.value === null && isSelected && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        min="1" max="100" step="1"
                        value={customPct}
                        onChange={(e) => setCustomPct(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="לדוגמה: 75"
                        style={{ width: 90, padding: '6px 8px', textAlign: 'center' }}
                      />
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>%</span>
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        {effectivePct > 0 && (
          <div style={{
            padding: '12px 14px',
            background: 'var(--surface-2)',
            borderRadius: 12,
            fontSize: 13,
            color: 'var(--text-muted)',
            marginBottom: 16,
          }}>
            <strong style={{ color: 'var(--text)' }}>תצוגה מקדימה: </strong>
            {effectivePct >= 100
              ? 'א׳–ד׳: 9 שעות, ה׳: 8.5 שעות'
              : `כל יום עבודה: ${Math.round((9 * effectivePct / 100) * 4) / 4} שעות (כולל יום ה׳)`}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn2 primary"
            onClick={saveJobPercent}
            disabled={savedPct === effectivePct}
            style={savedPct === effectivePct ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            שמירת אחוזי משרה
          </button>
        </div>
      </div>

      {/* ===== Custom weekly hours (per-user override) ===== */}
      <div className="card2" style={{ marginTop: 16 }}>
        <div className="card2-title">
          <h3>תקן שעות שבועי אישי</h3>
          <span className="pill2 info">{weeklySum.toFixed(1)} ש׳ / שבוע</span>
        </div>

        {hoursFlash && (
          <div style={{ background: 'var(--success-soft)', color: 'var(--success)', padding: '10px 14px', borderRadius: 10, marginBottom: 14, fontSize: 13, fontWeight: 600 }}>
            ✓ {hoursFlash}
          </div>
        )}

        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14 }}>
          הגדר שעות עבודה יומיות מותאמות אישית. ערכים אלה יחליפו את חישוב אחוזי המשרה
          ויחושבו ביעד היומי שלך. חגים ימשיכו להשתמש בתקן החברה.
        </div>

        <div className="form-row2" style={{ marginBottom: 14 }}>
          {[0, 1, 2, 3, 4].map((dow) => (
            <div className="field" key={dow}>
              <label className="field-label">יום {HEB_DAYS[dow]}</label>
              <input
                type="number" step="0.25" min="0" max="24"
                value={hours[dow]}
                onChange={(e) => updateDay(dow, e.target.value)}
                style={{ textAlign: 'center', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
              />
            </div>
          ))}
        </div>

        <div style={{
          padding: '14px 16px',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 14,
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              סך שעות שבועיות
            </div>
            <div style={{
              fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em',
              color: 'var(--text)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
              marginTop: 2,
            }}>
              {weeklySum.toFixed(2)} <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>ש׳</span>
            </div>
          </div>
          {matchesCompany ? (
            <span className="pill2 muted">תקן החברה</span>
          ) : (
            <span className="pill2 primary">מותאם אישית</span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn2 ghost"
            onClick={resetToCompany}
            disabled={matchesCompany}
            style={matchesCompany ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            חזרה לתקן החברה
          </button>
          <button
            type="button"
            className="btn2 primary"
            onClick={saveHours}
            disabled={matchesSaved}
            style={matchesSaved ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            שמירה
          </button>
        </div>
      </div>
    </div>
  );
}
