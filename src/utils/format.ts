/**
 * Defensive currency and numeric formatting utilities.
 * Prevents UI layout overflow and scientific notation spills when dealing with extreme numbers.
 */

export const MAX_SAFE_BID_AMOUNT = 100_000_000_000; // ₹10,000 Crores max limit

/**
 * Safely formats currency amounts in INR.
 * Uses standard Indian number grouping (lakhs/crores) for ordinary values,
 * and adaptive compact notation for astronomical values so UI cards never bleed.
 */
export function formatCurrency(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null) return '₹0';
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount));
  
  if (isNaN(num) || !isFinite(num) || num <= 0) return '₹0';

  // Ordinary values (under 1 Crore / 10,000,000)
  if (num < 10_000_000) {
    return `₹${Math.round(num).toLocaleString('en-IN')}`;
  }

  // Values in Crores (1 Crore to 1,000 Crores)
  if (num < 10_000_000_000) {
    const crores = (num / 10_000_000).toFixed(2).replace(/\.00$/, '');
    return `₹${crores} Cr`;
  }

  // Extreme or exponential numbers (safe compact display)
  try {
    const compact = new Intl.NumberFormat('en-IN', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 2,
    }).format(num);
    return `₹${compact}`;
  } catch {
    return `₹${num.toExponential(2)}`;
  }
}

/**
 * Formats the full exact string for hover/title tooltips.
 */
export function formatCurrencyFull(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null) return '₹0';
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount));
  if (isNaN(num) || !isFinite(num)) return '₹0';
  if (num > Number.MAX_SAFE_INTEGER) return `₹${num.toExponential(4)}`;
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
}

/**
 * Safely formats percentage growth, preventing scientific notation spills like e+145%.
 */
export function formatPercentageIncrease(current: number, base: number): string {
  if (!base || base <= 0 || !isFinite(current) || isNaN(current)) return '+0%';
  const diff = current - base;
  if (diff <= 0) return '+0%';
  
  const pct = (diff / base) * 100;
  if (!isFinite(pct) || pct > 999_999) {
    return '>999,999%';
  }
  return `+${Math.round(pct).toLocaleString('en-IN')}%`;
}
