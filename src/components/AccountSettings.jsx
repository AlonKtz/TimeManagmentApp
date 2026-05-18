import { useState } from 'react';
import { IPencil } from './icons';

const JOB_PRESETS = [
  { label: 'משרה מלאה',         sublabel: '100% — א׳–ד׳ 9 שעות, ה׳ 8.5 שעות', value: 100 },
  { label: 'חצי משרה',           sublabel: '50% — כל יום 4.5 שעות',             value: 50  },
  { label: 'אחוז מותאם אישית',   sublabel: '',                                  value: null },
];

export default function AccountSettings({ user, auth }) {
  const savedPct = user.jobPercent ?? 100;
  const isCustom = savedPct !== 100 && savedPct !== 50;
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
    </div>
  );
}
