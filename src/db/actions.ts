import { addDays, format, parseISO } from 'date-fns';
import { db, TABLES } from './schema';
import { envelopeStats } from '../lib/budget';
import { periodFor, todayISO, iso } from '../lib/period';
import { applyRollover, leftover, type PlanItem, type RolloverMode } from '../lib/rollover';
import type { Debt, Envelope, Expense, Period } from '../lib/types';

const now = () => new Date().toISOString();

export async function finishOnboarding(o: { currency: string; incomeDay: number; income: number; plan: PlanItem[] }) {
  await db.transaction('rw', db.settings, db.periods, db.envelopes, async () => {
    await db.settings.put({ id: 'singleton', currency: o.currency, incomeDay: o.incomeDay, onboarded: true });
    const { startDate, endDate } = periodFor(todayISO(), o.incomeDay);
    const periodId = await db.periods.add({ startDate, endDate, income: o.income, carryover: 0, status: 'active' });
    await db.envelopes.bulkAdd(o.plan.map((p, i) => ({ ...p, order: i, periodId })));
  });
}

export const addExpense = (e: Omit<Expense, 'id' | 'createdAt'>) => db.expenses.add({ ...e, createdAt: now() });
export const updateExpense = (id: number, patch: Partial<Expense>) => db.expenses.update(id, patch);
export const deleteExpense = (id: number) => db.expenses.delete(id);
export const deleteTransfer = (id: number) => db.transfers.delete(id);

export const addTransfer = (periodId: number, fromEnvelopeId: number, toEnvelopeId: number, amount: number, date = todayISO()) =>
  db.transfers.add({ periodId, fromEnvelopeId, toEnvelopeId, amount, date });

/** Cover an overspend by moving money first, then log the expense, atomically. */
export async function addExpenseWithTransfer(e: Omit<Expense, 'id' | 'createdAt'>, fromEnvelopeId: number, moveAmount: number) {
  await db.transaction('rw', db.expenses, db.transfers, async () => {
    await addTransfer(e.periodId, fromEnvelopeId, e.envelopeId, moveAmount, e.date);
    await addExpense(e);
  });
}

/**
 * Save an edited plan for the current period. Envelopes that already have expenses or transfers
 * can't be deleted (that would lose history); throws with a readable message.
 */
export async function savePlan(period: Period, income: number, plan: (PlanItem & { id?: number })[]) {
  await db.transaction('rw', db.periods, db.envelopes, db.expenses, db.transfers, async () => {
    const existing = await db.envelopes.where('periodId').equals(period.id!).toArray();
    const keep = new Set(plan.map((p) => p.id).filter(Boolean));
    for (const old of existing.filter((e) => !keep.has(e.id))) {
      const used = (await db.expenses.where('envelopeId').equals(old.id!).count()) +
        (await db.transfers.where('periodId').equals(period.id!).filter((t) => t.fromEnvelopeId === old.id || t.toEnvelopeId === old.id).count());
      if (used) throw new Error(`"${old.name}" has expenses this month, so it can't be deleted. Set it to 0 instead.`);
      await db.envelopes.delete(old.id!);
    }
    await db.envelopes.bulkPut(plan.map((p, i) => ({ ...p, order: i, periodId: period.id! })));
    await db.periods.update(period.id!, { income });
  });
}

export async function updateSettings(patch: { currency?: string; incomeDay?: number }) {
  await db.transaction('rw', db.settings, db.periods, async () => {
    await db.settings.update('singleton', patch);
    if (patch.incomeDay) {
      // Re-anchor the active period's end so the new income day applies from the next period.
      const active = await db.periods.where('status').equals('active').first();
      if (active) {
        const { endDate } = periodFor(active.startDate, patch.incomeDay);
        if (endDate >= todayISO()) await db.periods.update(active.id!, { endDate });
      }
    }
  });
}

/** Close the active period, carry money over, open the period containing today with last month's plan. */
export async function startNewPeriod(income: number, mode: RolloverMode) {
  await db.transaction('rw', db.settings, db.periods, db.envelopes, db.expenses, db.transfers, async () => {
    const settings = (await db.settings.get('singleton'))!;
    const old = (await db.periods.where('status').equals('active').first())!;
    const [envs, exps, trs] = await Promise.all([
      db.envelopes.where('periodId').equals(old.id!).sortBy('order'),
      db.expenses.where('periodId').equals(old.id!).toArray(),
      db.transfers.where('periodId').equals(old.id!).toArray(),
    ]);
    const items = envs.map((env) => ({ env, remaining: envelopeStats(env, exps, trs).remaining }));
    const left = leftover(items);
    const savingsBalance = Math.max(0, items.find((i) => i.env.isSavings)?.remaining ?? 0);
    // Savings keeps only its balance; any income the user planned into it last month is re-planned below as normal.
    const plan = applyRollover(envs.map(({ id: _i, periodId: _p, ...rest }) => rest), left, mode, savingsBalance);

    await db.periods.update(old.id!, { status: 'closed' });
    // Called once today is past the old end; if months were skipped, jump straight to the current period.
    const start = periodFor(todayISO(), settings.incomeDay);
    const periodId = await db.periods.add({ ...start, income, carryover: left + savingsBalance, status: 'active' });
    // If the income changed, the difference shows as "unassigned" in the plan editor.
    await db.envelopes.bulkAdd(plan.map((p, i) => ({ ...p, order: i, periodId })));
  });
}

export const addDebt = (d: Omit<Debt, 'id' | 'paid'>) => db.debts.add({ ...d, paid: 0 });
export const deleteDebt = (id: number) => db.debts.delete(id);

export async function payDebt(debt: Debt, amount: number, fromEnvelope?: Envelope) {
  await db.transaction('rw', db.debts, db.expenses, async () => {
    await db.debts.update(debt.id!, { paid: Math.min(debt.amount, debt.paid + amount) });
    if (fromEnvelope) {
      await addExpense({ periodId: fromEnvelope.periodId, envelopeId: fromEnvelope.id!, amount, note: `Debt: ${debt.person}`, date: todayISO() });
    }
  });
}

/* ---------- Backup ---------- */

const BACKUP_VERSION = 1;

export async function exportBackup(): Promise<Blob> {
  const data: Record<string, unknown> = { app: '7isab', version: BACKUP_VERSION, exportedAt: now() };
  for (const t of TABLES) data[t] = await db.table(t).toArray();
  await db.settings.update('singleton', { lastBackupAt: now() });
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}

const isInt = (n: unknown) => Number.isInteger(n);

/** Validate an untrusted backup file, then replace all data. Throws a readable error on bad input. */
export async function importBackup(text: string) {
  let data: Record<string, unknown>;
  try { data = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  if (!data || data.app !== '7isab' || typeof data.version !== 'number') throw new Error('This is not a 7isab backup.');
  if (data.version > BACKUP_VERSION) throw new Error('This backup is from a newer version of 7isab.');
  for (const t of TABLES) if (!Array.isArray(data[t])) throw new Error(`Backup is missing "${t}".`);
  const settings = (data.settings as Record<string, unknown>[])[0];
  if (!settings || settings.id !== 'singleton' || typeof settings.currency !== 'string' || !isInt(settings.incomeDay)) {
    throw new Error('Backup settings are damaged.');
  }
  const moneyOk = (rows: unknown, keys: string[]) =>
    (rows as Record<string, unknown>[]).every((r) => r && typeof r === 'object' && keys.every((k) => isInt(r[k])));
  if (!moneyOk(data.periods, ['id', 'income']) || !moneyOk(data.envelopes, ['id', 'periodId', 'planned']) ||
      !moneyOk(data.expenses, ['id', 'periodId', 'envelopeId', 'amount']) || !moneyOk(data.transfers, ['id', 'amount']) ||
      !moneyOk(data.debts, ['id', 'amount', 'paid'])) {
    throw new Error('Backup contains damaged records.');
  }
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear();
      await db.table(t).bulkAdd(data[t] as object[]);
    }
  });
}

export async function resetAll() {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) await db.table(t).clear();
  });
  try { localStorage.clear(); } catch { /* ignore */ }
}

/* ---------- Demo data (hidden button in Settings) ---------- */

const DEMO_PLAN: PlanItem[] = [
  { name: 'Rent', icon: 'home-2', type: 'fixed', planned: 350_000, order: 0 },
  { name: 'Bills', icon: 'bolt', type: 'fixed', planned: 65_000, order: 1 },
  { name: 'Food', icon: 'tools-kitchen-2', type: 'flexible', planned: 220_000, order: 2 },
  { name: 'Transport', icon: 'bus', type: 'flexible', planned: 90_000, order: 3 },
  { name: 'Fun', icon: 'device-gamepad-2', type: 'flexible', planned: 115_000, order: 4 },
];
const INCOME = DEMO_PLAN.reduce((a, b) => a + b.planned, 0);

export async function loadDemo() {
  await resetAll();
  const today = todayISO();
  const incomeDay = 1;
  await db.settings.put({ id: 'singleton', currency: 'EGP', incomeDay, onboarded: true, lastBackupAt: now() });

  // Spend targets per envelope: [Rent, Bills, Food, Transport, Fun]; current period mirrors the design file.
  const months: { offset: number; spend: number[]; status: Period['status'] }[] = [
    { offset: -3, spend: [350_000, 65_000, 238_000, 82_000, 70_000], status: 'closed' },
    { offset: -2, spend: [350_000, 61_000, 241_000, 88_000, 64_000], status: 'closed' },
    { offset: -1, spend: [350_000, 63_000, 236_000, 85_000, 80_000], status: 'closed' },
    { offset: 0, spend: [350_000, 65_000, 165_000, 56_000, 107_000], status: 'active' },
  ];
  const cur = periodFor(today, incomeDay);
  const notes = ['Groceries', 'Koshary', 'Coffee', 'Metro', 'Uber', 'Cinema', 'Lunch', 'Snacks'];

  await db.transaction('rw', db.periods, db.envelopes, db.expenses, db.debts, async () => {
    for (const m of months) {
      const anchor = new Date(parseISO(cur.startDate).getFullYear(), parseISO(cur.startDate).getMonth() + m.offset, 1);
      const { startDate, endDate } = periodFor(format(anchor, 'yyyy-MM-dd'), incomeDay);
      const periodId = await db.periods.add({ startDate, endDate, income: INCOME, carryover: 0, status: m.status });
      const lastDay = m.status === 'active' ? today : endDate;
      const days = Math.max(1, Math.round((parseISO(lastDay).getTime() - parseISO(startDate).getTime()) / 864e5) + 1);
      for (const [i, p] of DEMO_PLAN.entries()) {
        const envelopeId = await db.envelopes.add({ ...p, periodId });
        const total = m.spend[i];
        const chunks = p.type === 'fixed' ? 1 : Math.min(days, 6);
        const base = Math.floor(total / chunks);
        for (let c = 0; c < chunks; c++) {
          const amount = c === chunks - 1 ? total - base * (chunks - 1) : base;
          const date = iso(addDays(parseISO(startDate), Math.floor((c * days) / chunks)));
          await db.expenses.add({ periodId, envelopeId, amount, date, createdAt: now(), note: p.type === 'fixed' ? undefined : notes[(c + i) % notes.length] });
        }
      }
    }
    await db.debts.bulkAdd([
      { person: 'Karim', amount: 50_000, paid: 20_000, date: iso(addDays(new Date(), -20)), note: 'Textbooks' },
      { person: 'Mona', amount: 15_000, paid: 0, date: iso(addDays(new Date(), -5)) },
    ]);
  });
}
