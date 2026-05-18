import useAnimatedNumber from '../hooks/useAnimatedNumber';

// Donut showing office vs home hours, with animated legend bars.
// Accepts pre-summed numbers (computed in Dashboard from real entries).
export default function LocationSplit({ office, home }) {
  const total     = office + home;
  const officePct = total > 0 ? (office / total) * 100 : 0;
  const homePct   = total > 0 ? (home   / total) * 100 : 0;

  const officePctA = useAnimatedNumber(officePct, { duration: 1100, deps: [officePct] });
  const totalA     = useAnimatedNumber(total,     { duration: 1100, deps: [total] });

  const r = 56;
  const c = 2 * Math.PI * r;
  const officeLen = (officePctA / 100) * c;

  return (
    <div className="donut-wrap">
      <div className="donut">
        <svg viewBox="0 0 140 140">
          <circle className="ring-bg" cx="70" cy="70" r={r} />
          {total > 0 && (
            <>
              <circle
                className="ring-fg"
                cx="70" cy="70" r={r}
                stroke="url(#gradPrimary)"
                strokeDasharray={`${officeLen} ${c}`}
              />
              <circle
                className="ring-fg"
                cx="70" cy="70" r={r}
                stroke="#a3e635"
                strokeDasharray={`${c - officeLen} ${c}`}
                strokeDashoffset={`${-officeLen}`}
              />
            </>
          )}
        </svg>
        <div className="donut-center">
          <div>
            <div className="big">{totalA.toFixed(0)}</div>
            <div className="small">סה״כ ש׳</div>
          </div>
        </div>
      </div>

      <div className="legend2">
        <div className="legend2-row">
          <div style={{ flex: 1 }}>
            <div className="legend2-text">
              <strong>
                <span className="legend2-dot" style={{ background: 'var(--grad-primary)' }} />{' '}
                מהמשרד
              </strong>
              <span>{office.toFixed(1)} ש׳ · {Math.round(officePct)}%</span>
            </div>
            <div className="legend2-bar">
              <div className="fill" style={{ width: officePctA + '%', background: 'var(--grad-primary)' }} />
            </div>
          </div>
        </div>
        <div className="legend2-row">
          <div style={{ flex: 1 }}>
            <div className="legend2-text">
              <strong>
                <span className="legend2-dot" style={{ background: '#a3e635' }} />{' '}
                מהבית
              </strong>
              <span>{home.toFixed(1)} ש׳ · {Math.round(homePct)}%</span>
            </div>
            <div className="legend2-bar">
              <div className="fill" style={{ width: (100 - officePctA) + '%', background: 'linear-gradient(90deg,#84cc16,#22d3ee)' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
