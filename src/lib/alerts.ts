import type { EnvelopeStats } from './budget';
import type { Envelope } from './types';
import { formatAmount } from './money';

export const WARN_USED = 0.9;
/** Pace warning only when spending runs this far ahead of time, so day 1 doesn't warn after one coffee. */
export const PACE_MARGIN = 0.15;

export type Status = 'ok' | 'pace' | 'warn' | 'over';

export function envelopeStatus(env: Envelope, s: EnvelopeStats, elapsed: number): Status {
  if (env.isSavings) return 'ok';
  if (s.remaining < 0) return 'over';
  // Fixed envelopes (rent, bills) are paid in one go; 100% used is normal ("Paid").
  if (env.type === 'fixed') return 'ok';
  if (s.spent > 0 && s.used >= WARN_USED) return 'warn';
  if (s.used - elapsed >= PACE_MARGIN) return 'pace';
  return 'ok';
}

export const isRed = (st: Status) => st !== 'ok';

export interface Alert {
  envelopeId: number;
  status: Exclude<Status, 'ok'>;
  message: string;
}

const RANK: Record<Alert['status'], number> = { over: 0, warn: 1, pace: 2 };

/** Alerts sorted most urgent first. */
export function buildAlerts(
  items: { env: Envelope; stats: EnvelopeStats; status: Status }[],
  daysLeft: number,
  elapsed: number,
): Alert[] {
  const out: Alert[] = [];
  for (const { env, stats, status } of items) {
    if (status === 'ok') continue;
    const pct = Math.round(stats.used * 100);
    const days = `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
    const message =
      status === 'over'
        ? `${env.name} is over budget by ${formatAmount(-stats.remaining)}`
        : status === 'warn'
          ? `${env.name} is ${pct}% used with ${days}`
          : `${env.name} is ${pct}% used but only ${Math.round(elapsed * 100)}% of the month has passed`;
    out.push({ envelopeId: env.id!, status, message });
  }
  return out.sort((a, b) => RANK[a.status] - RANK[b.status]);
}
