import { useState, useEffect, useMemo } from 'react';
import * as OTPAuth from 'otpauth';
import { STORAGE_KEYS } from '../constants';
import { saveData, loadAllData } from '../utils/storage';
import { hashPwd } from '../utils/business';

function makeTOTP(username, secretBase32) {
  return new OTPAuth.TOTP({
    issuer: 'מעקב שעות',
    label: username,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

export function useAuth() {
  const [users, setUsers] = useState([]);
  const [session, setSession] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  // Load from localforage on mount
  useEffect(() => {
    loadAllData([STORAGE_KEYS.users, STORAGE_KEYS.session]).then((data) => {
      setUsers(data[STORAGE_KEYS.users] || []);
      setSession(data[STORAGE_KEYS.session] || null);
      setAuthLoaded(true);
    });
  }, []);

  // Save users on change (after loaded)
  useEffect(() => {
    if (!authLoaded) return;
    saveData(STORAGE_KEYS.users, users);
  }, [users, authLoaded]);

  // Save session on change (after loaded)
  useEffect(() => {
    if (!authLoaded) return;
    if (session) {
      saveData(STORAGE_KEYS.session, session);
    } else {
      saveData(STORAGE_KEYS.session, null);
    }
  }, [session, authLoaded]);

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
      status: isFirst ? 'active' : 'pending',
      twoFactorSecret: null,
      jobPercent: 100,
      createdAt: new Date().toISOString(),
    };
    setUsers(prev => [...prev, newUser]);
    if (isFirst) setSession({ userId: newUser.id });
    return { ok: true, firstAdmin: isFirst, pending: !isFirst };
  };

  const login = ({ username, password }) => {
    const u = username.trim().toLowerCase();
    const user = users.find(x => x.username === u);
    if (!user) return { error: 'שם משתמש או סיסמה שגויים' };
    if (user.passwordHash !== hashPwd(password)) return { error: 'שם משתמש או סיסמה שגויים' };
    if (user.status === 'pending') return { error: 'החשבון שלך ממתין לאישור מנהל המערכת' };
    if (user.twoFactorSecret) return { needs2FA: true, tempUserId: user.id };
    setSession({ userId: user.id });
    return { ok: true };
  };

  const completeTwoFactorLogin = ({ userId, token }) => {
    const user = users.find(u => u.id === userId);
    if (!user?.twoFactorSecret) return { error: 'שגיאת אימות' };
    try {
      const totp = makeTOTP(user.username, user.twoFactorSecret);
      const delta = totp.validate({ token: token.replace(/\s/g, ''), window: 1 });
      if (delta !== null) {
        setSession({ userId });
        return { ok: true };
      }
      return { error: 'קוד לא תקין. נסה שנית.' };
    } catch {
      return { error: 'קוד לא תקין. נסה שנית.' };
    }
  };

  const enableTwoFactor = ({ userId, secret, token }) => {
    try {
      const user = users.find(u => u.id === userId);
      const totp = makeTOTP(user.username, secret);
      const delta = totp.validate({ token: token.replace(/\s/g, ''), window: 1 });
      if (delta === null) return { error: 'קוד לא תקין. נסה שנית.' };
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, twoFactorSecret: secret } : u));
      return { ok: true };
    } catch {
      return { error: 'קוד לא תקין. נסה שנית.' };
    }
  };

  const disableTwoFactor = ({ userId, token }) => {
    const user = users.find(u => u.id === userId);
    if (!user?.twoFactorSecret) return { error: 'שגיאה' };
    try {
      const totp = makeTOTP(user.username, user.twoFactorSecret);
      const delta = totp.validate({ token: token.replace(/\s/g, ''), window: 1 });
      if (delta === null) return { error: 'קוד לא תקין' };
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, twoFactorSecret: null } : u));
      return { ok: true };
    } catch {
      return { error: 'קוד לא תקין' };
    }
  };

  const updateJobPercent = ({ userId, percent }) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, jobPercent: percent } : u));
  };

  const approveUser = (userId) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'active' } : u));
  };

  const rejectUser = (userId) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const logout = () => setSession(null);

  const currentUser = useMemo(
    () => users.find(u => u.id === session?.userId) || null,
    [users, session]
  );

  return {
    users, setUsers, currentUser, authLoaded,
    register, login, logout,
    completeTwoFactorLogin,
    enableTwoFactor, disableTwoFactor,
    updateJobPercent,
    approveUser, rejectUser,
  };
}
