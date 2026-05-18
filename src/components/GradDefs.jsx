// Shared SVG gradient defs referenced by ring-style components
// (quarterly cards, donut). Renders an offscreen 0×0 <svg> with <defs>.
export default function GradDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <linearGradient id="gradPrimary" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  stopColor="#0f766e" />
          <stop offset="55%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="gradSuccess" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  stopColor="#16a34a" />
          <stop offset="100%" stopColor="#84cc16" />
        </linearGradient>
      </defs>
    </svg>
  );
}
