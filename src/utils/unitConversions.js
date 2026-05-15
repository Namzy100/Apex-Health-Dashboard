/**
 * Unit conversion utilities for Apex.
 *
 * CANONICAL STORAGE FORMAT (never changes, regardless of display preference):
 *   weight   → lbs
 *   water    → oz
 *   distance → miles
 *   height   → inches
 *
 * The `units` setting in apexStore.settings.units is display-only.
 * All store reads/writes use canonical values.
 * These helpers convert for display and parse user input back to canonical.
 */

// ── Core math ──────────────────────────────────────────────────────────────

export const lbsToKg  = (lbs)   => Math.round(lbs  * 0.453592 * 10) / 10;
export const kgToLbs  = (kg)    => Math.round(kg   / 0.453592 * 10) / 10;

export const ozToMl   = (oz)    => Math.round(oz   * 29.5735);
export const mlToOz   = (ml)    => Math.round(ml   / 29.5735 * 10) / 10;

export const milesToKm = (mi)   => Math.round(mi   * 1.60934 * 10) / 10;
export const kmToMiles = (km)   => Math.round(km   / 1.60934 * 10) / 10;

export const inchesToCm = (in_) => Math.round(in_  * 2.54);
export const cmToInches = (cm)  => Math.round(cm   / 2.54 * 10) / 10;

// ── Display helpers ─────────────────────────────────────────────────────────
// Accept a canonical value and a units string ('imperial' | 'metric').
// Return { value, unit } where value is already converted and rounded.

export function formatWeight(lbs, units = 'imperial') {
  if (units === 'metric') return { value: lbsToKg(lbs), unit: 'kg' };
  return { value: Math.round(lbs * 10) / 10, unit: 'lbs' };
}

export function formatWater(oz, units = 'imperial') {
  if (units === 'metric') return { value: ozToMl(oz), unit: 'ml' };
  return { value: Math.round(oz * 10) / 10, unit: 'oz' };
}

export function formatDistance(miles, units = 'imperial') {
  if (units === 'metric') return { value: milesToKm(miles), unit: 'km' };
  return { value: Math.round(miles * 10) / 10, unit: 'mi' };
}

export function formatHeight(inches, units = 'imperial') {
  if (units === 'metric') return { value: inchesToCm(inches), unit: 'cm' };
  const ft = Math.floor(inches / 12);
  const in_ = Math.round(inches % 12);
  return { value: `${ft}'${in_}"`, unit: '' };
}

// ── Input parsing ───────────────────────────────────────────────────────────
// Convert user-entered value back to canonical (lbs/oz/miles/inches).

export function parseWeightInput(value, units = 'imperial') {
  const n = parseFloat(value);
  if (isNaN(n)) return null;
  return units === 'metric' ? kgToLbs(n) : n;
}

export function parseWaterInput(value, units = 'imperial') {
  const n = parseFloat(value);
  if (isNaN(n)) return null;
  return units === 'metric' ? mlToOz(n) : n;
}

// ── Unit labels ─────────────────────────────────────────────────────────────

export function weightUnit(units = 'imperial') { return units === 'metric' ? 'kg' : 'lbs'; }
export function waterUnit(units = 'imperial')  { return units === 'metric' ? 'ml' : 'oz'; }
export function distanceUnit(units = 'imperial') { return units === 'metric' ? 'km' : 'mi'; }
export function heightUnit(units = 'imperial') { return units === 'metric' ? 'cm' : 'in'; }
