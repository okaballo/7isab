// Shared data shapes. All money is integer minor units (piastres); dates are 'yyyy-MM-dd'.
export type EnvelopeType = 'fixed' | 'flexible';

export interface Settings {
  id: 'singleton';
  currency: string;
  incomeDay: number;
  onboarded: boolean;
  lastBackupAt?: string;
}

export interface Period {
  id?: number;
  startDate: string;
  endDate: string;
  income: number;
  /** Money carried in from the previous period (rolled leftovers + savings). */
  carryover: number;
  status: 'active' | 'closed';
}

export interface Envelope {
  id?: number;
  periodId: number;
  name: string;
  icon: string;
  type: EnvelopeType;
  planned: number;
  order: number;
  isSavings?: boolean;
}

export interface Expense {
  id?: number;
  periodId: number;
  envelopeId: number;
  amount: number;
  note?: string;
  date: string;
  createdAt: string;
}

export interface Transfer {
  id?: number;
  periodId: number;
  fromEnvelopeId: number;
  toEnvelopeId: number;
  amount: number;
  date: string;
}

export interface Debt {
  id?: number;
  person: string;
  amount: number;
  paid: number;
  date: string;
  note?: string;
}
