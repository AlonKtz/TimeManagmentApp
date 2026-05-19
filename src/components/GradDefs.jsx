// Shared SVG gradient defs referenced by ring-style components
// (quarterly cards, donut). Stop colors are wired to CSS custom
// properties so they re-color automatically with the active theme
// (teal in light, orange in dark).
export default function GradDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <linearGradient id="gradPrimary" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   style={{ stopColor: 'var(--primary)' }} />
          <stop offset="55%"  style={{ stopColor: 'var(--accent)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--accent-2)' }} />
        </linearGradient>
        <linearGradient id="gradSuccess" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   style={{ stopColor: 'var(--success)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--accent-3)' }} />
        </linearGradient>
      </defs>
    </svg>
  );
}
