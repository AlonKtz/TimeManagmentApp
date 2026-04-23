import { useState, useEffect } from 'react';
import PasswordInput from './PasswordInput';

export default function LoginScreen({ auth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | '2fa'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [tempUserId, setTempUserId] = useState(null);
  const [otpToken, setOtpToken] = useState('');
  const isFirstUser = auth.users.length === 0;

  useEffect(() => {
    if (isFirstUser) setMode('register');
  }, [isFirstUser]);

  const submit = (e) => {
    e.preventDefault();
    setError(''); setInfo('');
    if (mode === 'login') {
      const res = auth.login({ username, password });
      if (res.error) { setError(res.error); return; }
      if (res.needs2FA) {
        setTempUserId(res.tempUserId);
        setMode('2fa');
      }
    } else if (mode === 'register') {
      const res = auth.register({ username, password, name });
      if (res.error) { setError(res.error); return; }
      if (res.firstAdmin) setInfo('נרשמת כמנהל המערכת');
      if (res.pending) setInfo('ההרשמה בוצעה בהצלחה. חשבונך ממתין לאישור מנהל המערכת.');
    }
  };

  const submit2FA = (e) => {
    e.preventDefault();
    setError('');
    const res = auth.completeTwoFactorLogin({ userId: tempUserId, token: otpToken });
    if (res.error) setError(res.error);
  };

  if (mode === '2fa') {
    return (
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-logo" style={{ background: 'var(--info)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="11" width="14" height="10" rx="2"/>
              <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
            </svg>
          </div>
          <h1 className="login-title">אימות דו-שלבי</h1>
          <p className="login-subtitle">הזן את הקוד מאפליקציית האימות שלך</p>

          {error && <div className="form-error">{error}</div>}

          <form onSubmit={submit2FA}>
            <div className="form-group">
              <label className="form-label">קוד אימות</label>
              <input
                type="text"
                inputMode="numeric"
                value={otpToken}
                onChange={e => { setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                placeholder="000000"
                dir="ltr"
                autoFocus
                style={{ textAlign: 'center', fontSize: 28, letterSpacing: 8, fontVariantNumeric: 'tabular-nums' }}
              />
              <div className="hint" style={{ textAlign: 'center' }}>הקוד מתחדש כל 30 שניות</div>
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={otpToken.length !== 6}>
              אימות וכניסה
            </button>
          </form>

          <div className="toggle-auth">
            <button type="button" onClick={() => { setMode('login'); setOtpToken(''); setError(''); setTempUserId(null); }}>
              ← חזרה לכניסה
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <h1 className="login-title">מעקב שעות צוות</h1>
        <p className="login-subtitle">
          {mode === 'login' ? 'התחברות למערכת' : (isFirstUser ? 'יצירת חשבון מנהל ראשון' : 'יצירת חשבון חדש')}
        </p>

        {error && <div className="form-error">{error}</div>}
        {info && <div className="form-success">{info}</div>}
        {isFirstUser && mode === 'register' && (
          <div className="form-success">ברוך הבא! המשתמש הראשון הופך אוטומטית למנהל המערכת.</div>
        )}

        <form onSubmit={submit}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">שם מלא</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="ישראל ישראלי" autoComplete="name" />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">שם משתמש</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="לדוגמה: yossi" autoComplete="username" dir="ltr" style={{ textAlign: 'right' }} />
          </div>
          <div className="form-group">
            <label className="form-label">סיסמה</label>
            <PasswordInput
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block btn-lg">
            {mode === 'login' ? 'כניסה' : 'הרשמה'}
          </button>
        </form>

        {!isFirstUser && (
          <div className="toggle-auth">
            {mode === 'login' ? (
              <>אין לך חשבון?
                <button type="button" onClick={() => { setMode('register'); setError(''); setInfo(''); }}>הרשמה</button>
              </>
            ) : (
              <>יש לך חשבון?
                <button type="button" onClick={() => { setMode('login'); setError(''); setInfo(''); }}>כניסה</button>
              </>
            )}
          </div>
        )}

        {!isFirstUser && mode === 'login' && (
          <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4 }}><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
            מערכת פרטית — רק משתמשים מאושרים יכולים להיכנס
          </div>
        )}
      </div>
    </div>
  );
}
