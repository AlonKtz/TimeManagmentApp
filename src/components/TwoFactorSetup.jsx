import { useState, useEffect } from 'react';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

export default function TwoFactorSetup({ user, onSave, onClose }) {
  const [secret, setSecret] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState('setup'); // 'setup' | 'verify'
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const s = new OTPAuth.Secret({ size: 20 });
    const base32 = s.base32;
    const totp = new OTPAuth.TOTP({
      issuer: 'מעקב שעות',
      label: user.username,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(base32),
    });
    setSecret(base32);
    QRCode.toDataURL(totp.toString(), { width: 220, margin: 2 }).then(setQrDataUrl);
  }, []);

  const copySecret = () => {
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-title">הגדרת אימות דו-שלבי (2FA)</div>

        {step === 'setup' && (
          <>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
              סרוק את קוד ה-QR עם <strong>Google Authenticator</strong>, <strong>Authy</strong> או כל אפליקציית TOTP אחרת.
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              {qrDataUrl
                ? <img src={qrDataUrl} alt="QR Code 2FA" style={{ width: 220, height: 220, borderRadius: 8, border: '1px solid var(--border)' }} />
                : <div style={{ width: 220, height: 220, background: 'var(--surface-2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>טוען...</div>
              }
            </div>

            <div className="form-group">
              <label className="form-label">לא ניתן לסרוק? הזן ידנית:</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{
                  flex: 1, fontFamily: 'monospace', background: 'var(--surface-2)',
                  padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 12,
                  letterSpacing: 2, wordBreak: 'break-all', border: '1px solid var(--border)'
                }}>
                  {secret}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={copySecret}
                  style={{ flexShrink: 0 }}
                >
                  {copied ? '✓ הועתק' : 'העתק'}
                </button>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-primary" onClick={() => setStep('verify')} disabled={!qrDataUrl}>
                המשך לאימות ←
              </button>
              <button className="btn btn-secondary" onClick={onClose}>ביטול</button>
            </div>
          </>
        )}

        {step === 'verify' && (
          <>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
              הזן את הקוד שמוצג באפליקציה כדי לאשר שהכל הוגדר נכון.
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">קוד אימות (6 ספרות)</label>
              <input
                type="text"
                inputMode="numeric"
                value={token}
                onChange={e => { setToken(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                placeholder="000000"
                dir="ltr"
                autoFocus
                style={{ textAlign: 'center', fontSize: 26, letterSpacing: 6, fontVariantNumeric: 'tabular-nums' }}
                onKeyDown={e => e.key === 'Enter' && token.length === 6 && onSave({ secret, token })}
              />
            </div>

            <div className="form-actions">
              <button
                className="btn btn-primary"
                onClick={() => {
                  const res = onSave({ secret, token });
                  if (res?.error) setError(res.error);
                }}
                disabled={token.length !== 6}
              >
                אישור והפעלת 2FA
              </button>
              <button className="btn btn-ghost" onClick={() => { setStep('setup'); setError(''); setToken(''); }}>
                ← חזרה
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
