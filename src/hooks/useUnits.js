/**
 * useUnits — reads settings.units and returns display helpers.
 * All values in canonical (imperial) storage; these convert for display only.
 */
import { useApexStore } from '../store/apexStore';
import {
  formatWeight, formatHeight, formatDistance, formatWater,
  weightUnit, heightUnit, distanceUnit, waterUnit as waterUnitLabel,
  lbsToKg, kgToLbs, inchesToCm, cmToInches,
  milesToKm, kmToMiles, ozToMl, mlToOz,
  parseWeightInput,
} from '../utils/unitConversions';

export function useUnits() {
  const [store] = useApexStore();
  const units = store.settings?.units || 'imperial';
  const isMetric = units === 'metric';

  return {
    units,
    isMetric,

    // Format a canonical value for display → { value, unit }
    fw:     (lbs)   => formatWeight(lbs, units),
    fh:     (in_)   => formatHeight(in_, units),
    fd:     (miles) => formatDistance(miles, units),
    fwater: (oz)    => formatWater(oz, units),

    // Unit label strings
    wUnit:     weightUnit(units),
    hUnit:     heightUnit(units),
    dUnit:     distanceUnit(units),
    waterUnit: waterUnitLabel(units),

    // Convenience: "178.8 lbs" or "81.1 kg"
    weightStr:  (lbs)   => { const f = formatWeight(lbs, units);  return `${f.value} ${f.unit}`; },
    heightStr:  (in_)   => { const f = formatHeight(in_, units);   return f.unit ? `${f.value} ${f.unit}` : f.value; },

    // Convert display value back to canonical for storage
    toCanonicalWeight: (displayVal) => parseWeightInput(displayVal, units),
    toCanonicalHeight: (displayVal) => {
      const n = parseFloat(displayVal);
      if (isNaN(n)) return null;
      return isMetric ? cmToInches(n) : n;
    },

    // Raw converters — handy for chart axes etc.
    lbsToKg, kgToLbs,
    inchesToCm, cmToInches,
    milesToKm, kmToMiles,
    ozToMl, mlToOz,
  };
}
