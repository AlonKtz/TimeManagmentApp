import { useState, useEffect, useRef } from 'react';

// RAF-driven number tween. Animates from the CURRENT displayed value to
// the new `target` (not from 0), so when `target` updates frequently
// (e.g. a live timer that ticks every second) the bar glides smoothly
// instead of restarting from zero each time.
//
// Honors the global motion preference (html[data-anim="off"]) by snapping
// to the target instantly.
export default function useAnimatedNumber(target, { duration = 900 } = {}) {
  const [value, setValue] = useState(target);
  const fromRef    = useRef(target);
  const targetRef  = useRef(target);
  const startRef   = useRef(0);
  const rafRef     = useRef(0);

  useEffect(() => {
    // Snap when motion is disabled
    if (typeof document !== 'undefined' &&
        document.documentElement.dataset.anim === 'off') {
      fromRef.current   = target;
      targetRef.current = target;
      setValue(target);
      return;
    }

    // Capture the displayed value RIGHT NOW as the new starting point
    fromRef.current   = value;
    targetRef.current = target;
    startRef.current  = performance.now();

    const tick = (t) => {
      const k = Math.min(1, (t - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = fromRef.current + (targetRef.current - fromRef.current) * eased;
      setValue(v);
      if (k < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
    // We intentionally do NOT include `value` in deps — that would cause
    // every animation frame to retrigger the effect. Only react to target.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}
