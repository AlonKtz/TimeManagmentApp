import { useState } from 'react';

const JOB_PRESETS = [
  { label: 'משרה מלאה', sublabel: '100% — א׳–ד׳ 9 שעות, ה׳ 8.5 שעות', value: 100 },
  { label: 'חצי משרה',  sublabel: '50% — כל יום 4.5 שעות',             value: 50  },
  { label: 'אחוז מותאם אישית', sublabel: '',                            value: null },
];

export default function AccountSettings({ user, auth }) {
  const savedPct  = user.jobPercent ?? 100;
  const isCustom  = savedPct !== 100 && savedPct !== 50;
  const [selectedPreset, setSelectedPreset] = useState(isCustom ? null : savedPct);
  const [customPct, setCustomPct]           = useState(isCustom ? String(savedPct) : '');
  const [jobFlash, setJobFlash]             = useState('');

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
      {/* ===== Profile ===== */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">פרטי חשבון</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="user-avatar" style={{ width: 48, height: 48, fontSize: 20, flexShrink: 0 }}>
            {user.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{user.name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }} dir="ltr">{user.email}</div>
            <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {user.role === 'admin'
                ? <span className="pill pill-warning">מנהל</span>
                : <span className="pill pill-muted">עובד</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Job Percent ===== */}
      <div className="card">
        <div className="card-title">אחוזי משרה</div>
        {jobFlash && <div className="form-success">{jobFlash}</div>}

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
                  padding: '12px 14px',
                  border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)',
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
            padding: '10px 14px',
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13,
            color: 'var(--text-muted)',
            marginBottom: 16,
          }}>
            <strong style={{ color: 'var(--text)' }}>תצוגה מקדימה:</strong>{' '}
            {effectivePct >= 100
              ? 'א׳–ד׳: 9 שעות, ה׳: 8.5 שעות'
              : `כל יום עבודה: ${Math.round((9 * effectivePct / 100) * 4) / 4} שעות (כולל יום ה׳)`}
          </div>
        )}

        <div className="form-actions">
          <button
            className="btn btn-primary"
            onClick={saveJobPercent}
            disabled={savedPct === effectivePct}
          >
            שמירת אחוזי משרה
          </button>
        </div>
      </div>
    </div>
  );
}
