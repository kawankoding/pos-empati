/**
 * Currency formatting utilities.
 */

/** Format a plain number with Indonesian locale grouping, e.g. 245500 → "245.500" */
export function formatNumber(value: number): string {
  return value.toLocaleString("id-ID");
}

/** Format a number as Rupiah, e.g. 245500 → "Rp 245.500" */
export function formatIdr(value: number): string {
  return `Rp ${formatNumber(value)}`;
}

/**
 * Format a number as currency with the given symbol prefix.
 * Defaults to "Rp" (Indonesian Rupiah). Supports common overrides like "$" or "SGD".
 *
 * Examples:
 *   formatCurrency(245500)          → "Rp  245.500"
 *   formatCurrency(100, { symbol: "$" }) → "$ 100"
 */
export function formatCurrency(value: number, options?: { symbol?: string }): string {
  const symbol = options?.symbol ?? "Rp";
  return `${symbol} ${formatNumber(value)}`;
}

/** Format with rounding to nearest thousand for large values */
export function formatIdrCompact(value: number): string {
  if (value >= 1_000_000) {
    return formatIdr(Math.round(value / 1000) * 1000);
  }
  return formatIdr(value);
}
