import { useState, useEffect } from 'react';

// Add-to-home-screen helper.
//
// Chromium (Android + desktop) fires `beforeinstallprompt`, which we stash so a
// button can trigger a real one-tap install. iOS Safari exposes no such API —
// the user must go through the Share sheet — so there we only surface
// instructions. `isStandalone` lets the caller hide the button once installed.
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBIP = (e) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  // iPhone/iPod, plus iPadOS which reports as Macintosh but is touch-capable.
  const isIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (/Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);

  const isStandalone =
    typeof window !== 'undefined' &&
    ((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true);

  const promptInstall = async () => {
    if (!deferred) return 'unavailable';
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    return outcome;
  };

  return { canPrompt: !!deferred, isIOS, isStandalone, installed, promptInstall };
}
