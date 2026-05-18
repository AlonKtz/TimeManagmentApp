import { useState, useEffect, useRef } from 'react';

// RAF-driven number tween from 0 → target with ease-out-cubic.
// Honors the global motion preference (html[data-anim="off"]) by
// snapping to the target instantly.
export default function useAnimatedNumber(target, { duration = 900, deps = [] } = {}) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (typeof document !== 'undefined' &&
        document.documentElement.dataset.anim === 'off') {
      setValue(target);
      return;
    }
    const start = performance.now();
    const from  = 0;
    const tick = (t) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setValue(from + (target - from) * eased);
      if (k < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, ...deps]);

  return value;
}
