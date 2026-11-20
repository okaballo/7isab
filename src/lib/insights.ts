import { formatAmount } from './money';

export interface PeriodSummary {
  label: string;
  /** envelope name → planned (available) and spent */
  rows: { name: string; available: number; spent: number }[];
}

/** Round to a friendly step (50 units = 5000 minor). */
const friendly = (minor: number) => Math.max(5000, Math.round(minor / 5000) * 5000);

/**
 * Plain-language tips. `history` is oldest → newest; the last one is the current period.
 * The current period only counts as "over" if it already is.
 */
export function insights(history: PeriodSummary[], currency: string): string[] {
  if (history.length === 0) return [];
  const tips: string[] = [];
  const names = history[history.length - 1].rows.map((r) => r.name);

  for (const name of names) {
    let streak = 0;
    let overTotal = 0;
    const now = history[history.length - 1].rows.find((x) => x.name === name);
    const from = now && now.spent > now.available ? history.length - 1 : history.length - 2; // unfinished month counts only if already over
    for (let i = from; i >= 0; i--) {
      const r = history[i].rows.find((x) => x.name === name);
      if (!r || r.spent <= r.available) break;
      streak++;
      overTotal += r.spent - r.available;
    }
    if (streak < 2) continue;

    // Suggest the envelope that was most under plan over the same periods.
    let donor: { name: string; under: number } | null = null;
    for (const other of names) {
      if (other === name) continue;
      let under = 0;
      for (const p of history.slice(-streak)) {
        const r = p.rows.find((x) => x.name === other);
        if (r) under += r.available - r.spent;
      }
      if (under > 0 && (!donor || under > donor.under)) donor = { name: other, under };
    }
    const avgOver = friendly(overTotal / streak);
    tips.push(
      `${name} went over plan ${streak} months in a row.` +
        (donor ? ` Consider moving ${formatAmount(avgOver)} ${currency} from ${donor.name}.` : ` Consider raising it by ${formatAmount(avgOver)} ${currency}.`),
    );
  }

  const last = history.length >= 2 ? history[history.length - 2] : null;
  if (last && last.rows.every((r) => r.spent <= r.available)) {
    tips.push(`You stayed within plan in every envelope in ${last.label}. Nice.`);
  }
  return tips;
}
