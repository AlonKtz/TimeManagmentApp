import useAnimatedNumber from '../hooks/useAnimatedNumber';
import { IChevronL } from './icons';

// Wrapped chevron renders rotated for "trend" up/down arrows.
const Up   = (p) => <IChevronL {...p} style={{ ...(p.style || {}), transform: 'rotate(90deg)' }} />;
const Down = (p) => <IChevronL {...p} style={{ ...(p.style || {}), transform: 'rotate(-90deg)' }} />;

// Animated stat card with shimmer progress bar.
// label/value/target are the real numbers; pct is recomputed here.
// Treats target=0 as "no target" (shows just the value, no diff line).
export default function StatCard({ label, value, target }) {
  const v       = useAnimatedNumber(value, { duration: 900 });
  const pct     = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const pctAnim = useAnimatedNumber(pct,   { duration: 1100 });
  const diff = value - target;
  const over = diff >= 0;

  return (
    <div className={`stat2 ${target > 0 ? (over ? 'over' : 'under') : ''}`}>
      <div className="stat2-label">{label}</div>
      <div className="stat2-value">
        <span>{v.toFixed(1)}</span>
        <span className="unit">ש׳</span>
      </div>
      {target > 0 && (
        <div className="stat2-target">
          מתוך יעד {target.toFixed(1)} ש׳ · {Math.round(pctAnim)}%
        </div>
      )}
      <div className="stat2-bar">
        <div
          className={`stat2-bar-fill ${over ? 'over' : ''}`}
          style={{ width: (target > 0 ? pctAnim : 0) + '%' }}
        />
      </div>
      {target > 0 && (
        <div className={`stat2-diff ${over ? 'pos' : 'neg'}`}>
          {over ? <Up width="14" height="14" /> : <Down width="14" height="14" />}
          {over ? '+' : ''}{diff.toFixed(1)} ש׳ {over ? 'מעל היעד' : 'עד היעד'}
        </div>
      )}
    </div>
  );
}
