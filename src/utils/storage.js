// ── Token (Supabase JWT session) ─────────────────────────────────────────────
const TOKEN_KEY = 'tt_session';

export const loadToken = () => {
  try {
    const v = localStorage.getItem(TOKEN_KEY);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
};

export const saveToken = (session) => {
  try {
    if (session) {
      localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {}
};

// ── Active punch (persisted locally as a fallback for offline resilience) ───
const PUNCH_KEY = 'tt_punch';

export const loadPunch = () => {
  try {
    const v = localStorage.getItem(PUNCH_KEY);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
};

export const savePunch = (punch) => {
  try {
    if (punch) {
      localStorage.setItem(PUNCH_KEY, JSON.stringify(punch));
    } else {
      localStorage.removeItem(PUNCH_KEY);
    }
  } catch {}
};

// ── Generic JSON helpers (used for non-sensitive flags) ─────────────────────
export const loadJSON = (k, fallback) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

export const saveJSON = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};
