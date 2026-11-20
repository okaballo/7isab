import type { Envelope, Expense, Transfer } from './types';

export interface EnvelopeStats {
  planned: number;
  transfersIn: number;
  transfersOut: number;
  /** planned + in − out */
  available: number;
  spent: number;
  /** available − spent (negative when over budget) */
  remaining: number;
  /** spent / available, 0..∞ (1 when nothing available but something spent) */
  used: number;
}

export function envelopeStats(env: Envelope, expenses: Expense[], transfers: Transfer[]): EnvelopeStats {
  const id = env.id!;
  const spent = sum(expenses.filter((e) => e.envelopeId === id).map((e) => e.amount));
  const transfersIn = sum(transfers.filter((t) => t.toEnvelopeId === id).map((t) => t.amount));
  const transfersOut = sum(transfers.filter((t) => t.fromEnvelopeId === id).map((t) => t.amount));
  const available = env.planned + transfersIn - transfersOut;
  const used = available > 0 ? spent / available : spent > 0 ? 1 : 0;
  return { planned: env.planned, transfersIn, transfersOut, available, spent, remaining: available - spent, used };
}

/** Envelopes that count toward day-to-day spending (flexible, not savings). */
export const isSpendable = (e: Envelope) => e.type === 'flexible' && !e.isSavings;

/** (remaining money in flexible envelopes) ÷ (days left incl. today), floored to whole currency units (it's "safe"). */
export function safeToSpend(flexibleRemaining: number[], daysLeft: number): number {
  const pool = sum(flexibleRemaining.map((r) => Math.max(0, r)));
  return Math.floor(pool / Math.max(1, daysLeft) / 100) * 100;
}

/** Money not yet assigned to an envelope. Must be 0 to finish a plan. */
export function unassigned(total: number, envelopes: Pick<Envelope, 'planned'>[]): number {
  return total - sum(envelopes.map((e) => e.planned));
}

export const isPaid = (env: Envelope, s: EnvelopeStats) => env.type === 'fixed' && s.available > 0 && s.spent >= s.available;

export function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}
