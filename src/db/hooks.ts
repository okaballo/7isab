import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './schema';
import { envelopeStats, isPaid, isSpendable, safeToSpend, sum, type EnvelopeStats } from '../lib/budget';
import { buildAlerts, envelopeStatus, type Alert, type Status } from '../lib/alerts';
import { daysLeft as calcDaysLeft, elapsedFraction, todayISO } from '../lib/period';
import type { Envelope, Expense, Period, Settings, Transfer } from '../lib/types';

export function useSettings(): Settings | null | undefined {
  return useLiveQuery(async () => (await db.settings.get('singleton')) ?? null);
}

export function useActivePeriod(): Period | null | undefined {
  return useLiveQuery(async () => (await db.periods.where('status').equals('active').first()) ?? null);
}

export interface EnvelopeView {
  env: Envelope;
  stats: EnvelopeStats;
  status: Status;
  paid: boolean;
}

export interface Budget {
  settings: Settings;
  period: Period;
  envelopes: EnvelopeView[];
  byId: Map<number, EnvelopeView>;
  expenses: Expense[];
  transfers: Transfer[];
  daysLeft: number;
  elapsed: number;
  safeToSpend: number;
  flexLeft: number;
  flexTotal: number;
  alerts: Alert[];
}

/** Everything the active-period screens need, live from IndexedDB. undefined while loading, null when not set up. */
export function useBudget(): Budget | null | undefined {
  const raw = useLiveQuery(async () => {
    const settings = await db.settings.get('singleton');
    const period = await db.periods.where('status').equals('active').first();
    if (!settings || !period) return null;
    const [envelopes, expenses, transfers] = await Promise.all([
      db.envelopes.where('periodId').equals(period.id!).sortBy('order'),
      db.expenses.where('periodId').equals(period.id!).toArray(),
      db.transfers.where('periodId').equals(period.id!).toArray(),
    ]);
    return { settings, period, envelopes, expenses, transfers };
  });

  return useMemo(() => {
    if (!raw) return raw;
    const { settings, period, envelopes, expenses, transfers } = raw;
    const today = todayISO();
    const daysLeft = calcDaysLeft(today, period.endDate);
    const elapsed = elapsedFraction(today, period.startDate, period.endDate);
    const views: EnvelopeView[] = envelopes.map((env) => {
      const stats = envelopeStats(env, expenses, transfers);
      return { env, stats, status: envelopeStatus(env, stats, elapsed), paid: isPaid(env, stats) };
    });
    const flex = views.filter((v) => isSpendable(v.env));
    return {
      settings, period, expenses, transfers, daysLeft, elapsed,
      envelopes: views,
      byId: new Map(views.map((v) => [v.env.id!, v])),
      safeToSpend: safeToSpend(flex.map((v) => v.stats.remaining), daysLeft),
      flexLeft: sum(flex.map((v) => v.stats.remaining)),
      flexTotal: sum(flex.map((v) => v.stats.available)),
      alerts: buildAlerts(views, daysLeft, elapsed),
    };
  }, [raw]);
}

const LAST_ENV = '7isab:lastEnvelope';
export const getLastEnvelope = () => {
  try { return Number(localStorage.getItem(LAST_ENV)) || null; } catch { return null; }
};
export const setLastEnvelope = (id: number) => {
  try { localStorage.setItem(LAST_ENV, String(id)); } catch { /* storage unavailable: preselect is a convenience */ }
};
