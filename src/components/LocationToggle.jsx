import { LOCATIONS } from '../constants';
import LocationIcon from './LocationIcon';

export default function LocationToggle({ value, onChange }) {
  return (
    <div className="loc-segment" role="group" aria-label="מיקום עבודה">
      {Object.entries(LOCATIONS).map(([key, meta]) => (
        <button
          key={key}
          type="button"
          className={value === key ? 'active' : ''}
          onClick={() => onChange(key)}
          aria-pressed={value === key}
        >
          <LocationIcon loc={key} />
          {meta.label}
        </button>
      ))}
    </div>
  );
}
