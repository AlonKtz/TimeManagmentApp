import { useState } from 'react';
import PasswordInput from './PasswordInput';

export default function LoginScreen({ auth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setInfo('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await auth.login({ email, password });
        if (res.error)          { setError(res.error); return; }
        if (res.notRegistered)  { setError('כתובת האימייל אינה רשומה. צור חשבון חדש.'); return; }
      } else {
        const res = await auth.register({ email, password, name });
        if (res.error)         { setError(res.error); return; }
        if (res.needsConfirm)  { setInfo('נשלח אימייל אישור. בדוק את תיבת הדואר ולחץ על הקישור.'); return; }
      }
    } finally {
      setLoading(false);
    }
  };

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
          {mode === 'login' ? 'התחברות למערכת' : 'יצירת חשבון חדש'}
        </p>

        {error && <div className="form-error">{error}</div>}
        {info  && <div className="form-success">{info}</div>}

        <form onSubmit={submit}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">שם מלא</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ישראל ישראלי"
                autoComplete="name"
                required
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">אימייל</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
              autoComplete="email"
              dir="ltr"
              style={{ textAlign: 'right' }}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">סיסמה</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
          >
            {loading ? 'טוען...' : mode === 'login' ? 'כניסה' : 'הרשמה'}
          </button>
        </form>

        <div className="toggle-auth">
          {mode === 'login' ? (
            <>
              אין לך חשבון?{' '}
              <button type="button" onClick={() => { setMode('register'); setError(''); setInfo(''); }}>
                הרשמה
              </button>
            </>
          ) : (
            <>
              יש לך חשבון?{' '}
              <button type="button" onClick={() => { setMode('login'); setError(''); setInfo(''); }}>
                כניסה
              </button>
            </>
          )}
        </div>

        {mode === 'login' && (
          <div style={{
            marginTop: 16,
            padding: '10px 12px',
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 12,
            color: 'var(--text-muted)',
            textAlign: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4 }}>
              <rect x="5" y="11" width="14" height="10" rx="2"/>
              <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
            </svg>
            מערכת פרטית — רק משתמשים מאושרים יכולים להיכנס
          </div>
        )}
      </div>
    </div>
  );
}
