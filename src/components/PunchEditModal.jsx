import { useState } from 'react';
import { ymd, fmtTime24, normalizeTimeStr } from '../utils/date';
import Time24Input from './Time24Input';

export default function PunchEditModal({ activePunch, onSave, onClose }) {
  const originalStart = new Date(activePunch.start);
  const originalDate = ymd(originalStart);
  const originalTime = fmtTime24(originalStart);

  const [date, setDate] = useState(originalDate);
  const [time, setTime] = useState(originalTime);
  const [error, setError] = useState('');

  const save = () => {
    if (!time || !date) {
      setError('נא למלא תאריך ושעה');
      return;
    }
    const newStart = new Date(`${date}T${normalizeTimeStr(time)}:00`);
    if (isNaN(newStart.getTime())) {
      setError('תאריך או שעה לא תקינים');
      return;
    }
    const now = new Date();
    if (newStart > now) {
      setError('שעת הכניסה לא יכולה להיות בעתיד');
      return;
    }
    const hoursAgo = (now - newStart) / 3600000;
    if (hoursAgo > 24) {
      if (!confirm('שעת הכניסה שהזנת היא יותר מ־24 שעות אחורה. להמשיך בכל זאת?')) return;
    }
    onSave(newStart.toISOString());
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">עריכת שעת כניסה</div>

        <div style={{ padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 13 }}>
          <div style={{ color: 'var(--text-muted)' }}>נרשמה כניסה בפועל ב־</div>
          <div style={{ fontWeight: 600, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
            {originalTime}, {originalStart.getDate()}.{originalStart.getMonth() + 1}.{originalStart.getFullYear()}
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="form-row">
          <div>
            <label className="form-label">תאריך</label>
            <input type="date" value={date} onChange={e => { setDate(e.target.value); setError(''); }} />
          </div>
          <div>
            <label className="form-label">שעת כניסה</label>
            <Time24Input value={time} onChange={(v) => { setTime(v); setError(''); }} />
            <div className="hint">פורמט 24 שעות, לדוגמה 09:15</div>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" onClick={save}>שמירה</button>
          <button className="btn btn-secondary" onClick={onClose}>ביטול</button>
        </div>
      </div>
    </div>
  );
}
