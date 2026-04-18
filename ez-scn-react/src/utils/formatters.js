// ============================================
// PennyWise — Formatting Utilities
//
// Single source of truth for currency and
// percentage display across the entire app.
// ============================================

/**
 * Format a monetary amount as PKR string.
 * Always rounds to nearest whole number.
 * Guards against null, undefined, NaN.
 *
 * @param {number} amount - The monetary value
 * @returns {string} e.g. "PKR 50,000"
 */
export const formatPKR = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return 'PKR 0';
  return 'PKR ' + Math.round(amount).toLocaleString('en-PK');
};

/**
 * Format just the number part (no "PKR" prefix).
 * Useful inside inputs or compact displays.
 *
 * @param {number} amount
 * @returns {string} e.g. "50,000"
 */
export const formatNumber = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '0';
  return Math.round(amount).toLocaleString('en-PK');
};

/**
 * Safe percentage calculation.
 * Returns 0 if divisor is 0. Caps at maxPct if provided.
 *
 * @param {number} part - numerator
 * @param {number} total - denominator
 * @param {number} [maxPct] - optional cap (e.g. 100)
 * @returns {number} percentage value (e.g. 42)
 */
export const safePct = (part, total, maxPct) => {
  if (!total || total === 0 || isNaN(part) || isNaN(total)) return 0;
  const pct = (part / total) * 100;
  if (maxPct !== undefined) return Math.min(Math.round(pct), maxPct);
  return Math.round(pct);
};
