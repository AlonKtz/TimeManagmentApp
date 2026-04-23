import { useState } from 'react';
import TwoFactorSetup from './TwoFactorSetup';

export default function AccountSettings({ user, auth }) {
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [disableToken, setDisableToken] = useState('');
  const [disableError, setDisableError] = useState('');
  const [flash, setFlash] = useState('');

  const has2FA = !!user.twoFactorSecret;

  const handleEnable = ({ secret, token }) => {
    const res = auth.enableTwoFactor({ userId: user.id, secret, token });
    if (res.error) return res; // pass error back to setup modal
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

  return (
    <div>
      {flash && <div className="form-success" style={{ marginBottom: 16 }}>{flash}</div>}

      <div className="card">
        <div className="card-title">פרטי חשבון</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="user-avatar" style={{ width: 48, height: 48, fontSize: 20, flexShrink: 0 }}>
              {user.name.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{user.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }} dir="ltr">{user.username}</div>
              <div style={{ marginTop: 4 }}>
                {user.role === 'admin'
                  ? <span className="pill pill-warning">מנהל</span>
                  : <span className="pill pill-muted">עובד</span>
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">אימות דו-שלבי (2FA)</div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: has2FA ? 'var(--success)' : 'var(--border-strong)',
              }} />
              <span style={{ fontWeight: 600 }}>{has2FA ? 'מופעל' : 'מכובה'}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {has2FA
                ? 'בכל כניסה תתבקש להזין קוד מאפליקציית Google Authenticator / Authy.'
                : 'הפעל אימות דו-שלבי כדי לאבטח את חשבונך. תזדקק לאפליקציית Google Authenticator, Authy או כל אפליקציית TOTP אחרת.'
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
          <div style={{ marginTop: 20, padding: '16px', background: 'var(--danger-soft)', borderRadius: 'var(--radius-sm)', border: '1px solid #fecaca' }}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--danger)' }}>ביטול אימות דו-שלבי</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              הזן קוד מהאפליקציה כדי לאשר את הביטול.
            </div>
            {disableError && <div className="form-error">{disableError}</div>}
            <form onSubmit={handleDisable} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={disableToken}
                  onChange={e => { setDisableToken(e.target.value.replace(/\D/g, '').slice(0, 6)); setDisableError(''); }}
                  placeholder="000000"
                  dir="ltr"
                  autoFocus
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
        <TwoFactorSetup
          user={user}
          onSave={handleEnable}
          onClose={() => setShowSetup(false)}
        />
      )}
    </div>
  );
}
