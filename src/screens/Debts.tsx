import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, parseISO } from 'date-fns';
import { IconCheck, IconPlus } from '@tabler/icons-react';
import { db } from '../db/schema';
import type { Budget } from '../db/hooks';
import { addDebt, deleteDebt, payDebt } from '../db/actions';
import { formatAmount, formatMoney, toInput, toMinor } from '../lib/money';
import { sum } from '../lib/budget';
import { todayISO } from '../lib/period';
import type { Debt } from '../lib/types';
import { BottomSheet, ConfirmSheet } from '../components/BottomSheet';
import { Field, NeuButton, ProgressBar } from '../components/ui';

export function Debts({ budget }: { budget: Budget }) {
  const debts = useLiveQuery(() => db.debts.toArray()) ?? [];
  const [adding, setAdding] = useState(false);
  const [paying, setPaying] = useState<Debt | null>(null);
  const cur = budget.settings.currency;
  const open = debts.filter((d) => d.paid < d.amount).sort((a, b) => a.date.localeCompare(b.date));
  const settled = debts.filter((d) => d.paid >= d.amount);
  const total = sum(open.map((d) => d.amount - d.paid));

  return (
    <main className="screen">
      <h1 className="header-title" style={{ textAlign: 'center', marginBottom: 0, lineHeight: '44px' }}>Debts</h1>
      <section className="raised hero">
        <p style={{ fontSize: 13, color: 'var(--green-700)' }}>You owe in total</p>
        <p className="hero-amount">{formatMoney(total, cur)}</p>
        <p className="small muted" style={{ marginTop: 4 }}>{open.length} open · {settled.length} settled</p>
      </section>

      <div style={{ margin: '16px 0' }}>
        <NeuButton primary block onClick={() => setAdding(true)}><IconPlus size={18} stroke={2} /> Add debt</NeuButton>
      </div>

      {debts.length === 0 && <p className="empty">No debts. Keep it that way.</p>}
      {[...open, ...settled].map((d) => {
        const done = d.paid >= d.amount;
        return (
          <button key={d.id} type="button" className="raised pressable env" onClick={() => setPaying(d)}>
            <div className="row" style={{ fontSize: 14 }}>
              <span><b style={{ fontWeight: 600 }}>{d.person}</b><span className="small muted"> · {format(parseISO(d.date), 'd MMM')}{d.note ? ` · ${d.note}` : ''}</span></span>
              <span className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {done ? <>Paid <IconCheck size={14} stroke={2} /></> : `${formatAmount(d.amount - d.paid)} left`}
              </span>
            </div>
            <ProgressBar value={d.paid / d.amount} />
            {d.paid > 0 && !done && <p className="small muted" style={{ marginTop: 6 }}>Paid {formatAmount(d.paid)} of {formatAmount(d.amount)}</p>}
          </button>
        );
      })}

      {adding && <AddDebtSheet currency={cur} onClose={() => setAdding(false)} />}
      {paying && <PayDebtSheet budget={budget} debt={paying} onClose={() => setPaying(null)} />}
    </main>
  );
}

function AddDebtSheet({ currency, onClose }: { currency: string; onClose: () => void }) {
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const minor = toMinor(amount) ?? 0;
  const ok = person.trim() && minor > 0 && date;
  return (
    <BottomSheet open onClose={onClose} title="Add debt">
      <div className="stack">
        <Field label="Who do you owe?"><input value={person} onChange={(e) => setPerson(e.target.value)} autoFocus /></Field>
        <Field label={`Amount (${currency})`}><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} /></Field>
        <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Note (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <NeuButton primary block disabled={!ok} onClick={async () => { await addDebt({ person: person.trim(), amount: minor, date, note: note.trim() || undefined }); onClose(); }}>Save</NeuButton>
      </div>
    </BottomSheet>
  );
}

function PayDebtSheet({ budget, debt, onClose }: { budget: Budget; debt: Debt; onClose: () => void }) {
  const left = debt.amount - debt.paid;
  const [amount, setAmount] = useState(toInput(left));
  const [from, setFrom] = useState<number | ''>('');
  const [confirmDel, setConfirmDel] = useState(false);
  const minor = toMinor(amount) ?? 0;
  const cur = budget.settings.currency;
  const ok = minor > 0 && minor <= left;
  return (
    <BottomSheet open onClose={onClose} title={`${debt.person} · ${formatMoney(left, cur)} left`}>
      <div className="stack">
        {left > 0 && (
          <>
            <Field label="Pay amount" hint={minor > left ? `That's more than the ${formatAmount(left)} left.` : undefined}>
              <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} />
            </Field>
            <Field label="Log as an expense from" hint="Optional. Takes the money out of an envelope this month.">
              <select value={from} onChange={(e) => setFrom(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Don't log</option>
                {budget.envelopes.map((v) => <option key={v.env.id} value={v.env.id}>{v.env.name} ({formatAmount(v.stats.remaining)} left)</option>)}
              </select>
            </Field>
            <div className="sheet-actions" style={{ marginTop: 0 }}>
              <NeuButton block disabled={!ok} onClick={async () => { await payDebt(debt, minor, from ? budget.byId.get(from)!.env : undefined); onClose(); }}>Pay part</NeuButton>
              <NeuButton primary block onClick={async () => { await payDebt(debt, left, from ? budget.byId.get(from)!.env : undefined); onClose(); }}>Pay in full</NeuButton>
            </div>
          </>
        )}
        <NeuButton block danger onClick={() => setConfirmDel(true)}>Delete debt</NeuButton>
      </div>
      <ConfirmSheet open={confirmDel} onClose={() => setConfirmDel(false)} danger title="Delete debt?" confirmLabel="Delete"
        message={`Remove ${debt.person} from your debts. Expenses already logged stay in History.`}
        onConfirm={async () => { await deleteDebt(debt.id!); onClose(); }} />
    </BottomSheet>
  );
}
