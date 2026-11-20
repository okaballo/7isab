/** Parse user input like "12", "12.5", "1,200.75" into minor units. Returns null if invalid. */
export function toMinor(input: string): number | null {
  const s = input.replace(/,/g, '').trim();
  const m = /^(\d+)(?:\.(\d{0,2}))?$/.exec(s);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
}

/** Minor units → "1,600" or "12.50" (decimals only when non-zero). */
export function formatAmount(minor: number): string {
  const frac = minor % 100 !== 0 ? 2 : 0;
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: frac, maximumFractionDigits: frac }).format(minor / 100);
}

/** Minor units → "EGP 1,600". */
export function formatMoney(minor: number, currency: string): string {
  return `${minor < 0 ? '−' : ''}${currency} ${formatAmount(Math.abs(minor))}`;
}

/** Minor units → plain input string ("12.5" → "12.50", "1200" → "1200"). */
export function toInput(minor: number): string {
  return minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);
}
