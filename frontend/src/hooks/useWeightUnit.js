import useUnitStore from '../store/unitStore';

const LBS_PER_KG = 2.20462;

/** Convert a lbs value for display in the current unit. */
export function toDisplay(lbs, unit) {
  if (lbs == null) return null;
  return unit === 'kg' ? Math.round((lbs / LBS_PER_KG) * 100) / 100 : lbs;
}

/** Convert a user-entered value back to lbs for the API. */
export function fromDisplay(value, unit) {
  const num = parseFloat(value);
  if (isNaN(num)) return NaN;
  return unit === 'kg' ? Math.round(num * LBS_PER_KG * 10) / 10 : num;
}

export default function useWeightUnit() {
  const unit       = useUnitStore((s) => s.unit);
  const toggleUnit = useUnitStore((s) => s.toggleUnit);
  return {
    unit,
    toggleUnit,
    toDisplay: (lbs) => toDisplay(lbs, unit),
    fromDisplay: (value) => fromDisplay(value, unit),
  };
}
