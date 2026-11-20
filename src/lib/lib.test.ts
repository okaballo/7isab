import { describe, expect, it } from 'vitest';
import { formatAmount, formatMoney, toMinor } from './money';
import { daysLeft, elapsedFraction, periodFor } from './period';
import { envelopeStats, safeToSpend, unassigned } from './budget';
import { buildAlerts, envelopeStatus } from './alerts';
import { applyRollover, leftover, type PlanItem } from './rollover';
import { insights } from './insights';
import type { Envelope } from './types';

const env = (o: Partial<Envelope> = {}): Envelope => ({
  id: 1, periodId: 1, name: 'Food', icon: 'tools-kitchen-2', type: 'flexible', planned: 100_000, order: 0, ...o,
});

describe('integer money', () => {
  it('parses input into minor units without float error', () => {
    expect(toMinor('0.1')! + toMinor('0.2')!).toBe(30);
    expect(toMinor('12.5')).toBe(1250);
    expect(toMinor('1,200.75')).toBe(120075);
    expect(toMinor('0.29')).toBe(29);
    expect(toMinor('7')).toBe(700);
    expect(toMinor('1.234')).toBeNull();
    expect(toMinor('abc')).toBeNull();
    expect(toMinor('')).toBeNull();
  });
  it('formats', () => {
    expect(formatAmount(160000)).toBe('1,600');
    expect(formatAmount(1250)).toBe('12.50');
    expect(formatMoney(14500, 'EGP')).toBe('EGP 145');
    expect(formatMoney(-500, 'EGP')).toBe('−EGP 5');
  });
});

describe('period boundaries', () => {
  it('runs from income day to the day before the next one', () => {
    expect(periodFor('2026-11-20', 1)).toEqual({ startDate: '2026-11-01', endDate: '2026-11-30' });
    expect(periodFor('2026-11-20', 25)).toEqual({ startDate: '2026-10-25', endDate: '2026-11-24' });
    expect(periodFor('2026-11-25', 25)).toEqual({ startDate: '2026-11-25', endDate: '2026-12-24' });
  });
  it('clamps income day 31 to short months', () => {
    expect(periodFor('2026-02-15', 31)).toEqual({ startDate: '2026-01-31', endDate: '2026-02-27' });
    expect(periodFor('2026-02-28', 31)).toEqual({ startDate: '2026-02-28', endDate: '2026-03-30' });
    expect(periodFor('2028-02-29', 31)).toEqual({ startDate: '2028-02-29', endDate: '2028-03-30' }); // leap year
    expect(periodFor('2026-04-30', 31)).toEqual({ startDate: '2026-04-30', endDate: '2026-05-30' }); // 30-day month
  });
  it('handles leap and non-leap February with day 30', () => {
    expect(periodFor('2027-02-10', 30)).toEqual({ startDate: '2027-01-30', endDate: '2027-02-27' });
    expect(periodFor('2028-02-10', 30)).toEqual({ startDate: '2028-01-30', endDate: '2028-02-28' });
  });
  it('wraps the year', () => {
    expect(periodFor('2026-12-31', 5)).toEqual({ startDate: '2026-12-05', endDate: '2027-01-04' });
    expect(periodFor('2027-01-02', 5)).toEqual({ startDate: '2026-12-05', endDate: '2027-01-04' });
  });
  it('counts days left including today', () => {
    expect(daysLeft('2026-11-20', '2026-11-30')).toBe(11);
    expect(daysLeft('2026-11-30', '2026-11-30')).toBe(1);
    expect(daysLeft('2026-12-05', '2026-11-30')).toBe(1);
    expect(elapsedFraction('2026-11-01', '2026-11-01', '2026-11-30')).toBeCloseTo(1 / 30);
    expect(elapsedFraction('2026-11-30', '2026-11-01', '2026-11-30')).toBe(1);
  });
});

describe('budget math', () => {
  it('includes transfers in envelope stats', () => {
    const s = envelopeStats(env(), [
      { periodId: 1, envelopeId: 1, amount: 30_000, date: '', createdAt: '' },
      { periodId: 1, envelopeId: 2, amount: 99_999, date: '', createdAt: '' },
    ], [
      { periodId: 1, fromEnvelopeId: 2, toEnvelopeId: 1, amount: 10_000, date: '' },
      { periodId: 1, fromEnvelopeId: 1, toEnvelopeId: 3, amount: 5_000, date: '' },
    ]);
    expect(s).toMatchObject({ available: 105_000, spent: 30_000, remaining: 75_000 });
  });
  it('safe to spend = flexible remaining ÷ days left; negatives ignored', () => {
    expect(safeToSpend([100_000, 60_000], 11)).toBe(14_500); // 1600/11 = 145.45 → EGP 145
    expect(safeToSpend([55_000, 34_000, 8_000], 11)).toBe(8_800);
    expect(safeToSpend([100_000, -50_000], 10)).toBe(10_000);
    expect(safeToSpend([0], 0)).toBe(0);
  });
  it('unassigned', () => {
    expect(unassigned(800_000, [{ planned: 500_000 }, { planned: 300_000 }])).toBe(0);
    expect(unassigned(800_000, [{ planned: 500_000 }])).toBe(300_000);
  });
});

describe('warning thresholds', () => {
  const st = (spent: number, planned = 100_000) => envelopeStats(env({ planned }), [{ periodId: 1, envelopeId: 1, amount: spent, date: '', createdAt: '' }], []);
  it('warns at >= 90% used', () => {
    expect(envelopeStatus(env(), st(89_000), 0.95)).toBe('ok');
    expect(envelopeStatus(env(), st(90_000), 0.95)).toBe('warn');
    expect(envelopeStatus(env(), st(100_001), 0.95)).toBe('over');
  });
  it('warns when pace is ahead of time', () => {
    expect(envelopeStatus(env(), st(70_000), 0.4)).toBe('pace');
    expect(envelopeStatus(env(), st(50_000), 0.4)).toBe('ok');
  });
  it('fixed envelopes are fine when fully paid, red when over', () => {
    const f = env({ type: 'fixed' });
    expect(envelopeStatus(f, st(100_000), 0.1)).toBe('ok');
    expect(envelopeStatus(f, st(100_100), 0.1)).toBe('over');
  });
  it('sorts alerts by urgency', () => {
    const a = buildAlerts([
      { env: env({ id: 1, name: 'A' }), stats: st(70_000), status: 'pace' },
      { env: env({ id: 2, name: 'B' }), stats: st(93_000), status: 'warn' },
      { env: env({ id: 3, name: 'C' }), stats: st(120_000), status: 'over' },
    ], 11, 0.4);
    expect(a.map((x) => x.envelopeId)).toEqual([3, 2, 1]);
    expect(a[1].message).toBe('B is 93% used with 11 days left');
  });
});

describe('rollover', () => {
  const plan: PlanItem[] = [
    { name: 'Rent', icon: 'home-2', type: 'fixed', planned: 300_000, order: 0 },
    { name: 'Food', icon: 'x', type: 'flexible', planned: 200_000, order: 1 },
    { name: 'Fun', icon: 'x', type: 'flexible', planned: 100_000, order: 2 },
  ];
  const total = (p: PlanItem[]) => p.reduce((a, b) => a + b.planned, 0);

  it('leftover ignores overspent and savings envelopes', () => {
    expect(leftover([
      { env: env(), remaining: 5_000 },
      { env: env(), remaining: -3_000 },
      { env: env({ isSavings: true }), remaining: 50_000 },
    ])).toBe(5_000);
  });
  it('savings mode creates a savings envelope', () => {
    const next = applyRollover(plan, 10_001, 'savings');
    expect(next.find((p) => p.isSavings)!.planned).toBe(10_001);
    expect(total(next)).toBe(600_000 + 10_001);
  });
  it('savings mode keeps the existing savings balance', () => {
    const withSav = [...plan, { name: 'Savings', icon: 'x', type: 'flexible' as const, planned: 1, order: 3, isSavings: true }];
    const next = applyRollover(withSav, 5_000, 'savings', 40_000);
    expect(next.find((p) => p.isSavings)!.planned).toBe(45_000);
  });
  it('roll mode spreads proportionally with an exact sum', () => {
    const next = applyRollover(plan, 10_001, 'roll');
    expect(next[0].planned).toBe(300_000); // fixed untouched
    expect(next[1].planned).toBe(200_000 + 6_667 + 1); // 2/3 share floored, + rounding remainder (largest)
    expect(next[2].planned).toBe(100_000 + 3_333);
    expect(total(next)).toBe(610_001);
    expect(plan[1].planned).toBe(200_000); // input not mutated
  });
});

describe('insights', () => {
  it('flags repeated overspending and suggests a donor', () => {
    const p = (label: string, food: number, fun: number) => ({
      label,
      rows: [
        { name: 'Food', available: 200_000, spent: food },
        { name: 'Fun', available: 100_000, spent: fun },
      ],
    });
    const tips = insights([p('Aug', 230_000, 60_000), p('Sep', 230_000, 60_000), p('Oct', 230_000, 70_000)], 'EGP');
    expect(tips[0]).toBe('Food went over plan 3 months in a row. Consider moving 300 EGP from Fun.');
    // Current month still under plan: past streak still reported.
    const withCurrent = insights([p('Sep', 230_000, 60_000), p('Oct', 230_000, 60_000), p('Nov', 100_000, 20_000)], 'EGP');
    expect(withCurrent[0]).toMatch(/^Food went over plan 2 months in a row/);
  });
});
