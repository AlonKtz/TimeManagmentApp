import { LOCATIONS } from '../constants';
import LocationIcon from './LocationIcon';

export default function LocationPill({ loc }) {
  if (!loc || !LOCATIONS[loc]) return null;
  return (
    <span className={`loc-pill ${loc}`}>
      <LocationIcon loc={loc} />
      {LOCATIONS[loc].label}
    </span>
  );
}
