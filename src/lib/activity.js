import sb from './supabase';

// Write `profiles.last_active_at = now()` for the current user, but
// throttled to once per 60 seconds so we don't hammer the DB on every
// tab focus / re-render. Silently no-ops if the column doesn't exist
// (e.g. the migration hasn't been run yet) so the app keeps working.
let lastWriteMs = 0;
let lastWriteUser = null;

export async function touchLastActive(userId) {
  if (!userId) return;
  const now = Date.now();
  // Reset throttle if the user changed (logout → login as someone else)
  if (lastWriteUser !== userId) {
    lastWriteMs = 0;
    lastWriteUser = userId;
  }
  if (now - lastWriteMs < 60_000) return;
  lastWriteMs = now;
  try {
    await sb.updateProfile(userId, { last_active_at: new Date().toISOString() });
  } catch {
    // Column missing or RLS denied — swallow. Admin column will show "—".
  }
}
