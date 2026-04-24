import { useState } from 'react';
import TwoFactorSetup from './TwoFactorSetup';

const JOB_PRESETS = [
  { label: 'משרה מלאה', sublabel: '100% — א׳–ד׳ 9 שעות, ה׳ 8.5 שעות', value: 100 },
  { label: 'חצי משרה',  sublabel: '50% — כל יום 4.5 שעות',             value: 50  },
  { label: 'אחוז מותאם אישית', sublabel: '',                            value: null },
];

export default function AccountSettings({ user, auth }) {
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [disableToken, setDisableToken] = useState('');
  const [disableError, setDisableError] = useState('');
  const [flash, setFlash] = useState('');

  // Job percent state
  const savedPct = user.jobPercent ?? 100;
  const isCustom = savedPct !== 100 && savedPct !== 50;
  const [selectedPreset, setSelectedPreset] = useState(isCustom ? null : savedPct);
  const [customPct, setCustomPct] = useState(isCustom ? String(savedPct) : '');
  const [jobFlash, setJobFlash] = useState('');

  const has2FA = !!user.twoFactorSecret;

  const handleEnable = ({ secret, token }) => {
    const res = auth.enableTwoFactor({ userId: user.id, secret, token });
    if (res.error) return res;
    setShowSetup(false);
    setFlash('אימות דו-שלבי הופעל בהצלחה ✓');
    setTimeout(() => setFlash(''), 3000);
    return { ok: true };
  };

  const handleDisable = (e) => {
    e.preventDefault();
    const res = auth.disableTwoFactor({ userId: user.id, token: disableToken });
    if (res.error) { setDisableError(res.error); return; }
    setShowDisable(false);
    setDisableToken('');
    setFlash('אימות דו-שלבי בוטל');
    setTimeout(() => setFlash(''), 3000);
  };

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

  const effectivePct = selectedPreset !== null ? selectedPreset : parseFloat(customPct) || 0;

  return (
    <div>
      {flash && <div className="form-success" style={{ marginBottom: 16 }}>{flash}</div>}

      {/* ===== Profile ===== */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">פרטי חשבון</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="user-avatar" style={{ width: 48, height: 48, fontSize: 20, flexShrink: 0 }}>
            {user.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{user.name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }} dir="ltr">{user.username}</div>
            <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {user.role === 'admin'
                ? <span className="pill pill-warning">מנהל</span>
                : <span className="pill pill-muted">עובד</span>
              }
              {has2FA && <span className="pill pill-success">2FA מופעל</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Job Percent ===== */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">אחוזי משרה</div>
        {jobFlash && <div className="form-success">{jobFlash}</div>}

        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
          קובע את יעד השעות היומי שלך. הגדרה זו משפיעה על הסטטיסטיקות האישיות שלך בלבד.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {JOB_PRESETS.map(preset => {
            const isSelected = preset.value === null
              ? selectedPreset === null
              : selectedPreset === preset.value;
            return (
              <label
                key={preset.label}
                onClick={() => { setSelectedPreset(preset.value); }}
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
                        onChange={e => setCustomPct(e.target.value)}
                        onClick={e => e.stopPropagation()}
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

        {/* Preview */}
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
              : `כל יום עבודה: ${Math.round((9 * effectivePct / 100) * 4) / 4} שעות (כולל יום ה׳)`
            }
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

      {/* ===== 2FA ===== */}
      <div className="card">
        <div className="card-title">אימות דו-שלבי (2FA)</div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: has2FA ? 'var(--success)' : 'var(--border-strong)' }} />
              <span style={{ fontWeight: 600 }}>{has2FA ? 'מופעל' : 'מכובה'}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {has2FA
                ? 'בכל כניסה תתבקש להזין קוד מאפליקציית Google Authenticator / Authy.'
                : 'הפעל כדי לאבטח את חשבונך. תזדקק לאפליקציית Google Authenticator, Authy או כל TOTP אחר.'
              }
            </div>
          </div>
          <div>
            {has2FA ? (
              <button className="btn btn-danger btn-sm" onClick={() => { setShowDisable(true); setDisableError(''); setDisableToken(''); }}>
                ביטול 2FA
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={() => setShowSetup(true)}>
                הפעלת 2FA
              </button>
            )}
          </div>
        </div>

        {showDisable && (
          <div style={{ marginTop: 20, padding: 16, background: 'var(--danger-soft)', borderRadius: 'var(--radius-sm)', border: '1px solid #fecaca' }}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--danger)' }}>ביטול אימות דו-שלבי</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>הזן קוד מהאפליקציה כדי לאשר.</div>
            {disableError && <div className="form-error">{disableError}</div>}
            <form onSubmit={handleDisable} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <input
                  type="text" inputMode="numeric"
                  value={disableToken}
                  onChange={e => { setDisableToken(e.target.value.replace(/\D/g, '').slice(0, 6)); setDisableError(''); }}
                  placeholder="000000" dir="ltr" autoFocus
                  style={{ textAlign: 'center', fontSize: 20, letterSpacing: 4 }}
                />
              </div>
              <button type="submit" className="btn btn-danger" disabled={disableToken.length !== 6}>אישור ביטול</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowDisable(false)}>ביטול</button>
            </form>
          </div>
        )}
      </div>

      {showSetup && (
        <TwoFactorSetup user={user} onSave={handleEnable} onClose={() => setShowSetup(false)} />
      )}
    </div>
  );
}
