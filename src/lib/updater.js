// Service-worker-free self-updater.
//
// Each build is stamped with __BUILD_ID__ (see vite.config.js) and ships a
// matching version.json at the site root. The running app polls version.json
// with cache-busting; when the deployed id differs from the one baked into the
// running bundle, a newer build is live and we notify the app so it can offer
// a reload. This is what lets iOS Safari users — who have no hard-refresh and
// a very sticky index.html cache — actually pick up new deploys.

const CURRENT_BUILD_ID =
  typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';

const POLL_MS = 5 * 60 * 1000;   // background poll every 5 min
const MIN_GAP_MS = 30 * 1000;    // don't check more than every 30s

async function fetchDeployedBuildId() {
  const url = `${import.meta.env.BASE_URL}version.json?t=${Date.now()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.buildId || null;
}

// Starts polling. Calls onUpdate(newId) once, when a newer build is detected.
// Returns a cleanup function.
export function startUpdateChecker(onUpdate) {
  let lastCheck = 0;
  let notified = false;
  let timer = null;

  const check = async () => {
    if (notified) return;
    if (Date.now() - lastCheck < MIN_GAP_MS) return;
    lastCheck = Date.now();
    try {
      const deployed = await fetchDeployedBuildId();
      if (deployed && deployed !== CURRENT_BUILD_ID) {
        notified = true;
        onUpdate(deployed);
      }
    } catch {
      // offline / version.json missing (e.g. dev) — ignore, try again later
    }
  };

  const onVisible = () => { if (document.visibilityState === 'visible') check(); };

  check();
  timer = setInterval(check, POLL_MS);
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', check);

  return () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', check);
  };
}

// Hard reload that defeats a cached index.html: a changed query string makes
// Safari treat the document as a new resource and refetch it (and the fresh
// asset hashes it points to). The URL API dedupes any prior ?v= param.
export function reloadToLatest(buildId) {
  const url = new URL(location.href);
  url.searchParams.set('v', buildId || String(Date.now()));
  location.replace(url.toString());
}
