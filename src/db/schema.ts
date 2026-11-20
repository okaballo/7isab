import Dexie, { type Table } from 'dexie';
import type { Debt, Envelope, Expense, Period, Settings, Transfer } from '../lib/types';

export class BudgetDB extends Dexie {
  settings!: Table<Settings, string>;
  periods!: Table<Period, number>;
  envelopes!: Table<Envelope, number>;
  expenses!: Table<Expense, number>;
  transfers!: Table<Transfer, number>;
  debts!: Table<Debt, number>;

  constructor() {
    super('7isab');
    this.version(1).stores({
      settings: 'id',
      periods: '++id, status, startDate',
      envelopes: '++id, periodId',
      expenses: '++id, periodId, envelopeId, date',
      transfers: '++id, periodId',
      debts: '++id',
    });
  }
}

export const db = new BudgetDB();
export const TABLES = ['settings', 'periods', 'envelopes', 'expenses', 'transfers', 'debts'] as const;
