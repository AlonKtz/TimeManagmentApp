import { useState, useEffect } from 'react';
import PasswordInput from './PasswordInput';

export default function LoginScreen({ auth }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const isFirstUser = auth.users.length === 0;

  useEffect(() => {
    if (isFirstUser) setMode('register');
  }, [isFirstUser]);

  const submit = (e) => {
    e.preventDefault();
    setError(''); setInfo('');
    if (mode === 'login') {
      const res = auth.login({ username, password });
      if (res.error) setError(res.error);
    } else {
      const res = auth.register({ username, password, name });
      if (res.error) setError(res.error);
      else if (res.firstAdmin) setInfo('נרשמת כמנהל המערכת');
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
                <button type="button" onClick={() => { setMode('register'); setError(''); }}>הרשמה</button>
              </>
            ) : (
              <>יש לך חשבון?
                <button type="button" onClick={() => { setMode('login'); setError(''); }}>כניסה</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
