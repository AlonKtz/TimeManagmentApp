import { useState, useEffect } from 'react';
import sb from '../lib/supabase';
import { loadToken, saveToken, savePunch } from '../utils/storage';

// Map DB profile row (snake_case) → app-friendly object
function normalizeProfile(p) {
  return {
    ...p,
    jobPercent: p.job_percent ?? 100,
    username: p.email,        // compat alias (shown in account/admin UI)
    status: 'active',         // all Supabase accounts are active
    twoFactorSecret: null,    // TOTP not used in Supabase version
    createdAt: p.created_at,
  };
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsersState] = useState([]);   // admin-only: all profiles
  const [authLoaded, setAuthLoaded] = useState(false);

  // ── Restore session on mount ───────────────────────────────────────────────
  useEffect(() => {
    const session = loadToken();
    if (session?.access_token) {
      sb._token = session.access_token;
      sb.getUser().then(async (u) => {
        if (u?.id) {
          await refreshProfile(u.id);
        } else if (session.refresh_token) {
          // Access token expired — try to refresh
          const res = await sb.refreshSession(session.refresh_token);
          if (res.access_token) {
            sb._token = res.access_token;
            saveToken({ access_token: res.access_token, refresh_token: res.refresh_token });
            await refreshProfile(res.user.id);
          } else {
            saveToken(null);
            setAuthLoaded(true);
          }
        } else {
          saveToken(null);
          setAuthLoaded(true);
        }
      });
    } else {
      setAuthLoaded(true);
    }
  }, []);

  const refreshProfile = async (userId) => {
    try {
      const rows = await sb.select('profiles', `id=eq.${userId}`);
      if (rows[0]) {
        setCurrentUser(normalizeProfile(rows[0]));
      } else {
        // Profile not yet created by trigger — retry once after a short delay
        await new Promise((r) => setTimeout(r, 1500));
        const rows2 = await sb.select('profiles', `id=eq.${userId}`);
        if (rows2[0]) setCurrentUser(normalizeProfile(rows2[0]));
      }
    } catch (e) {
      console.error('[auth] profile load:', e);
    }
    setAuthLoaded(true);
  };

  // ── register ─────────────────────────────────────────────────────────────
  const register = async ({ email, password, name }) => {
    email = (email || '').trim().toLowerCase();
    name  = (name  || '').trim();
    if (!email || !password || !name) return { error: 'נא למלא את כל השדות' };
    if (password.length < 6) return { error: 'הסיסמה חייבת להיות לפחות 6 תווים' };
    const emailOk = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email);
    if (!emailOk) return { error: 'כתובת האימייל אינה תקינה (דוגמה: user@company.com)' };

    const res = await sb.signUp(email, password, name);
    if (res.error) return { error: res.error.message || String(res.error) };

    if (res.access_token) {
      sb._token = res.access_token;
      saveToken({ access_token: res.access_token, refresh_token: res.refresh_token });
      await refreshProfile(res.user.id);
    }
    return { ok: true, needsConfirm: !res.access_token };
  };

  // ── login ────────────────────────────────────────────────────────────────
  const login = async ({ email, password }) => {
    email = (email || '').trim().toLowerCase();
    const res = await sb.signIn(email, password);

    if (res.error || !res.access_token) {
      const msg = (res.error_description || res.error?.message || '').toLowerCase();
      if (msg.includes('email not confirmed')) {
        return {
          error: 'האימייל טרם אומת. בדוק את תיבת הדואר שלך ולחץ על קישור האישור.',
          pendingVerification: true,
        };
      }
      if (msg.includes('invalid login') || msg.includes('user not found') || msg.includes('no user')) {
        try {
          const rows = await sb.select('profiles', `email=eq.${encodeURIComponent(email)}&select=id`);
          if (Array.isArray(rows) && rows.length === 0) return { notRegistered: true };
          return { error: 'הסיסמה שגויה — נסה שוב' };
        } catch {}
      }
      return { error: 'אימייל או סיסמה שגויים' };
    }

    if (res.user?.email_confirmed_at === null) {
      return {
        error: 'האימייל טרם אומת. בדוק את תיבת הדואר שלך ולחץ על קישור האישור.',
        pendingVerification: true,
      };
    }

    sb._token = res.access_token;
    saveToken({ access_token: res.access_token, refresh_token: res.refresh_token });
    await refreshProfile(res.user.id);
    return { ok: true };
  };

  // ── logout ───────────────────────────────────────────────────────────────
  const logout = async () => {
    await sb.signOut();
    saveToken(null);
    savePunch(null);
    setCurrentUser(null);
  };

  // ── Admin: load all profiles ──────────────────────────────────────────────
  const loadUsers = async () => {
    try {
      const rows = await sb.select('profiles', 'order=created_at.asc');
      setUsersState(rows.map(normalizeProfile));
    } catch (e) {
      console.error('[auth] loadUsers:', e);
    }
  };

  // Admin: update user role(s) then reload list
  const setUsers = async (updatedList) => {
    for (const u of updatedList) {
      const orig = users.find((x) => x.id === u.id);
      if (orig && orig.role !== u.role) {
        try {
          await sb.update('profiles', { role: u.role }, 'id', u.id);
        } catch (e) {
          console.error('[auth] setUsers role update:', e);
        }
      }
    }
    await loadUsers();
  };

  // Admin: delete all entries + profile row for a user
  const deleteUser = async (userId) => {
    try {
      await sb.delete('time_entries', 'user_id', userId);
      await sb.delete('profiles', 'id', userId);
    } catch (e) {
      console.error('[auth] deleteUser:', e);
    }
    setUsersState((prev) => prev.filter((u) => u.id !== userId));
  };

  // ── Update job percent ───────────────────────────────────────────────────
  const updateJobPercent = async ({ userId, percent }) => {
    try {
      await sb.updateProfile(userId, { job_percent: percent });
      setCurrentUser((u) => u ? { ...u, job_percent: percent, jobPercent: percent } : u);
    } catch (e) {
      console.error('[auth] updateJobPercent:', e);
    }
  };

  // No-ops kept for component interface compat (no pending approval in Supabase)
  const approveUser = () => {};
  const rejectUser  = () => {};

  return {
    currentUser,
    users,
    authLoaded,
    register,
    login,
    logout,
    loadUsers,
    setUsers,
    deleteUser,
    updateJobPercent,
    approveUser,
    rejectUser,
  };
}
