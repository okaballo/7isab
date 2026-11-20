import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { IconArrowsExchange, IconSearch } from '@tabler/icons-react';
import { useOpenAddExpense } from '../App';
import type { Budget } from '../db/hooks';
import { deleteExpense, deleteTransfer } from '../db/actions';
import { formatAmount } from '../lib/money';
import { sum } from '../lib/budget';
import { periodLabel } from '../lib/period';
import type { Expense, Transfer } from '../lib/types';
import { BottomSheet, ConfirmSheet } from '../components/BottomSheet';
import { NeuButton } from '../components/ui';
import { EnvIcon } from '../components/icons';

type Row = { kind: 'expense'; item: Expense } | { kind: 'transfer'; item: Transfer };

export function History({ budget }: { budget: Budget }) {
  const [q, setQ] = useState('');
  const [env, setEnv] = useState<number | ''>('');
  return (
    <main className="screen">
      <h1 className="header-title" style={{ textAlign: 'center', marginBottom: 18, lineHeight: '44px' }}>History · {periodLabel(budget.period.startDate)}</h1>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <IconSearch size={18} stroke={1.75} color="var(--green-500)" style={{ position: 'absolute', left: 12, top: 13 }} aria-hidden />
          <input type="search" aria-label="Search notes" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 38 }} />
        </div>
        <select aria-label="Filter by envelope" value={env} onChange={(e) => setEnv(e.target.value ? Number(e.target.value) : '')} style={{ width: 140 }}>
          <option value="">All</option>
          {budget.envelopes.map((v) => <option key={v.env.id} value={v.env.id}>{v.env.name}</option>)}
        </select>
      </div>
      <ExpenseList budget={budget} envelopeId={env || undefined} query={q} />
    </main>
  );
}

/** Expenses + transfers of the active period grouped by day. Tap a row to edit or delete it. */
export function ExpenseList({ budget, envelopeId, query = '' }: { budget: Budget; envelopeId?: number; query?: string }) {
  const openAdd = useOpenAddExpense();
  const [selected, setSelected] = useState<Row | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);
  const name = (id: number) => budget.byId.get(id)?.env.name ?? 'Deleted';

  const groups = useMemo(() => {
    const ql = query.trim().toLowerCase();
    const rows: Row[] = [
      ...budget.expenses
        .filter((e) => !envelopeId || e.envelopeId === envelopeId)
        .filter((e) => !ql || (e.note ?? '').toLowerCase().includes(ql) || name(e.envelopeId).toLowerCase().includes(ql))
        .map((item) => ({ kind: 'expense' as const, item })),
      ...budget.transfers
        .filter((t) => !envelopeId || t.fromEnvelopeId === envelopeId || t.toEnvelopeId === envelopeId)
        .filter(() => !ql || 'moved transfer'.includes(ql))
        .map((item) => ({ kind: 'transfer' as const, item })),
    ];
    rows.sort((a, b) => b.item.date.localeCompare(a.item.date) || (b.item.id ?? 0) - (a.item.id ?? 0));
    const byDay = new Map<string, Row[]>();
    for (const r of rows) byDay.set(r.item.date, [...(byDay.get(r.item.date) ?? []), r]);
    return [...byDay.entries()];
  }, [budget, envelopeId, query]);

  if (groups.length === 0) return <p className="empty">{query ? 'Nothing matches your search.' : 'No expenses yet this month.'}</p>;

  return (
    <>
      {groups.map(([day, rows]) => (
        <section key={day}>
          <h3 className="day-head">
            <span>{format(parseISO(day), 'EEE d MMM')}</span>
            <span>{formatAmount(sum(rows.filter((r) => r.kind === 'expense').map((r) => r.item.amount)))}</span>
          </h3>
          {rows.map((r) => (
            <button key={`${r.kind}${r.item.id}`} type="button" className="raised pressable list-item" onClick={() => setSelected(r)}>
              {r.kind === 'expense' ? (
                <>
                  <span className="inset list-icon"><EnvIcon name={budget.byId.get(r.item.envelopeId)?.env.icon ?? 'wallet'} size={18} /></span>
                  <span className="list-main"><p>{r.item.note || name(r.item.envelopeId)}</p><p>{name(r.item.envelopeId)}</p></span>
                  <span className="list-amount">−{formatAmount(r.item.amount)}</span>
                </>
              ) : (
                <>
                  <span className="inset list-icon"><IconArrowsExchange size={18} stroke={1.75} /></span>
                  <span className="list-main"><p>Moved money</p><p>{name(r.item.fromEnvelopeId)} → {name(r.item.toEnvelopeId)}</p></span>
                  <span className="list-amount muted">{formatAmount(r.item.amount)}</span>
                </>
              )}
            </button>
          ))}
        </section>
      ))}

      <BottomSheet open={!!selected} onClose={() => setSelected(null)} title={selected?.kind === 'transfer' ? 'Transfer' : 'Expense'}>
        <div className="stack">
          {selected?.kind === 'expense' && (
            <NeuButton primary block onClick={() => { const e = selected.item; setSelected(null); openAdd({ expense: e }); }}>Edit</NeuButton>
          )}
          <NeuButton block danger onClick={() => { setConfirmDelete(selected); setSelected(null); }}>Delete</NeuButton>
        </div>
      </BottomSheet>
      <ConfirmSheet open={!!confirmDelete} onClose={() => setConfirmDelete(null)} danger confirmLabel="Delete"
        title={confirmDelete?.kind === 'transfer' ? 'Delete transfer?' : 'Delete expense?'}
        message={confirmDelete?.kind === 'transfer' ? 'The money goes back to the envelope it came from.' : 'The amount goes back into its envelope.'}
        onConfirm={() => confirmDelete && (confirmDelete.kind === 'expense' ? deleteExpense(confirmDelete.item.id!) : deleteTransfer(confirmDelete.item.id!))} />
    </>
  );
}
