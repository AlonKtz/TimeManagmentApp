import { useRef, useEffect } from 'react';

export default function Time24Input({ value, onChange, required, id }) {
  const hRef = useRef(null);
  const mRef = useRef(null);
  const lastExternal = useRef(value);

  useEffect(() => {
    if (value !== lastExternal.current) {
      lastExternal.current = value;
      const [h2, m2] = (value || '').split(':');
      if (hRef.current) hRef.current.value = h2 ?? '';
      if (mRef.current) mRef.current.value = m2 ?? '';
    }
  }, [value]);

  useEffect(() => {
    const [h2, m2] = (value || '').split(':');
    if (hRef.current) hRef.current.value = h2 ?? '';
    if (mRef.current) mRef.current.value = m2 ?? '';
    // eslint-disable-next-line
  }, []);

  const clamp = (n, max) => Math.min(max, Math.max(0, parseInt(n, 10) || 0));
  const pad = n => String(n).padStart(2, '0');

  const emit = () => {
    const h = pad(clamp(hRef.current?.value ?? 0, 23));
    const m = pad(clamp(mRef.current?.value ?? 0, 59));
    lastExternal.current = `${h}:${m}`;
    onChange(`${h}:${m}`);
  };

  const onHourInput = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
    e.target.value = raw;
    if (raw.length === 2) {
      mRef.current?.focus();
      mRef.current?.select();
      emit();
    }
  };

  const onHourBlur = () => {
    if (!hRef.current?.value) return;
    hRef.current.value = pad(clamp(hRef.current.value, 23));
    emit();
  };

  const onMinuteInput = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
    e.target.value = raw;
    if (raw.length === 2) emit();
  };

  const onMinuteBlur = () => {
    if (!mRef.current?.value) return;
    mRef.current.value = pad(clamp(mRef.current.value, 59));
    emit();
  };

  const onMinuteKeyDown = (e) => {
    if (e.key === 'Backspace' && mRef.current?.value === '') {
      hRef.current?.focus();
    }
  };

  return (
    <div className="t24">
      <input
        ref={hRef}
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={2}
        placeholder="HH"
        defaultValue=""
        onInput={onHourInput}
        onBlur={onHourBlur}
        onFocus={(e) => e.target.select()}
        aria-label="שעה"
        required={required}
      />
      <span className="t24-sep">:</span>
      <input
        ref={mRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={2}
        placeholder="MM"
        defaultValue=""
        onInput={onMinuteInput}
        onBlur={onMinuteBlur}
        onKeyDown={onMinuteKeyDown}
        onFocus={(e) => e.target.select()}
        aria-label="דקות"
        required={required}
      />
      <span className="t24-hint">24h</span>
    </div>
  );
}
