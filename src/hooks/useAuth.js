import { useState, useEffect, useMemo } from 'react';
import { STORAGE_KEYS } from '../constants';
import { loadJSON, saveJSON } from '../utils/storage';
import { hashPwd } from '../utils/business';

export function useAuth() {
  const [users, setUsers] = useState(() => loadJSON(STORAGE_KEYS.users, []));
  const [session, setSession] = useState(() => loadJSON(STORAGE_KEYS.session, null));

  useEffect(() => saveJSON(STORAGE_KEYS.users, users), [users]);
  useEffect(() => {
    if (session) saveJSON(STORAGE_KEYS.session, session);
    else localStorage.removeItem(STORAGE_KEYS.session);
  }, [session]);

  const register = ({ username, password, name }) => {
    const u = username.trim().toLowerCase();
    if (!u || !password || !name.trim()) return { error: 'נא למלא את כל השדות' };
    if (u.length < 3) return { error: 'שם המשתמש חייב להיות לפחות 3 תווים' };
    if (password.length < 4) return { error: 'הסיסמה חייבת להיות לפחות 4 תווים' };
    if (users.find(x => x.username === u)) return { error: 'שם המשתמש כבר קיים' };
    const isFirst = users.length === 0;
    const newUser = {
      id: 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      username: u,
      passwordHash: hashPwd(password),
      name: name.trim(),
      role: isFirst ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
    };
    setUsers(prev => [...prev, newUser]);
    setSession({ userId: newUser.id });
    return { ok: true, firstAdmin: isFirst };
  };

  const login = ({ username, password }) => {
    const u = username.trim().toLowerCase();
    const user = users.find(x => x.username === u);
    if (!user) return { error: 'שם משתמש או סיסמה שגויים' };
    if (user.passwordHash !== hashPwd(password)) return { error: 'שם משתמש או סיסמה שגויים' };
    setSession({ userId: user.id });
    return { ok: true };
  };

  const logout = () => setSession(null);

  const currentUser = useMemo(
    () => users.find(u => u.id === session?.userId) || null,
    [users, session]
  );

  return { users, setUsers, currentUser, register, login, logout };
}
