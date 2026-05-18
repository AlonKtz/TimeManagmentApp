import { useState, useEffect } from 'react';

// Renders HH:MM (large) + :SS (smaller) counting up from `startMs`.
// Used inside the hero punch panel while a punch is active.
export default function LiveTimer({ startMs, paused }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [paused]);

  const ms    = Math.max(0, now - startMs);
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="hero-timer" dir="ltr">
      <span>{pad(h)}:{pad(m)}</span>
      <span className="sec">:{pad(s)}</span>
    </div>
  );
}
