import type { Envelope } from './types';
import { sum } from './budget';

export type RolloverMode = 'savings' | 'roll';
export type PlanItem = Omit<Envelope, 'id' | 'periodId'>;

/** Unspent money left in non-savings envelopes (overspent envelopes count as 0). */
export function leftover(items: { env: Envelope; remaining: number }[]): number {
  return sum(items.filter((i) => !i.env.isSavings).map((i) => Math.max(0, i.remaining)));
}

/**
 * Build next period's plan from last period's.
 * - Every non-savings envelope keeps its planned amount.
 * - The savings envelope (if any) starts with `savingsBalance` (what was left in it).
 * - 'savings': `left` is added to the savings envelope (created if missing).
 * - 'roll': `left` is spread over flexible envelopes in proportion to their plan; rounding remainder goes to the largest.
 * Sum of the result = sum(non-savings planned) + savingsBalance + left, exactly.
 */
export function applyRollover(plan: PlanItem[], left: number, mode: RolloverMode, savingsBalance = 0): PlanItem[] {
  const next = plan.map((p) => ({ ...p, planned: p.isSavings ? savingsBalance : p.planned }));
  if (left <= 0) return next;

  const targets = mode === 'roll' ? next.filter((p) => p.type === 'flexible' && !p.isSavings) : [];
  if (mode === 'savings' || targets.length === 0) {
    let sav = next.find((p) => p.isSavings);
    if (!sav) {
      sav = { name: 'Savings', icon: 'pig-money', type: 'flexible', planned: 0, order: next.length, isSavings: true };
      next.push(sav);
    }
    sav.planned += left;
    return next;
  }

  const base = sum(targets.map((t) => t.planned));
  let given = 0;
  for (const t of targets) {
    const share = base > 0 ? Math.floor((left * t.planned) / base) : Math.floor(left / targets.length);
    t.planned += share;
    given += share;
  }
  const largest = targets.reduce((a, b) => (b.planned > a.planned ? b : a));
  largest.planned += left - given;
  return next;
}
