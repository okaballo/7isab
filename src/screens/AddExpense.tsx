import { useState } from 'react';
import { createPortal } from 'react-dom';
import { IconCheck } from '@tabler/icons-react';
import type { Budget } from '../db/hooks';
import { getLastEnvelope, setLastEnvelope } from '../db/hooks';
import { addExpense, addExpenseWithTransfer, updateExpense } from '../db/actions';
import { formatMoney, toInput, toMinor } from '../lib/money';
import { todayISO } from '../lib/period';
import type { Expense } from '../lib/types';
import { BottomSheet } from '../components/BottomSheet';
import { Keypad } from '../components/Keypad';
import { Chip, NeuButton } from '../components/ui';

export function AddExpense({ budget, initial, onClose }: { budget: Budget; initial: { envelopeId?: number; expense?: Expense }; onClose: () => void }) {
  const { envelopes, byId, period, settings } = budget;
  const editing = initial.expense;
  const firstFlexible = envelopes.find((v) => v.env.type === 'flexible' && !v.env.isSavings) ?? envelopes[0];
  const last = getLastEnvelope();
  const [envelopeId, setEnvelopeId] = useState<number>(
    editing?.envelopeId ?? initial.envelopeId ?? (last && byId.has(last) ? last : firstFlexible.env.id!),
  );
  const [amount, setAmount] = useState(editing ? toInput(editing.amount) : '');
  const [note, setNote] = useState(editing?.note ?? '');
  const today = todayISO();
  const [date, setDate] = useState(editing?.date ?? (today < period.startDate ? period.startDate : today));
  const [stage, setStage] = useState<'form' | 'overdraw' | 'done'>('form');
  const [busy, setBusy] = useState(false);

  const cur = settings.currency;
  const minor = toMinor(amount) ?? 0;
  const view = byId.get(envelopeId)!;
  // When editing within the same envelope, the old amount is already counted as spent.
  const room = view.stats.remaining + (editing && editing.envelopeId === envelopeId ? editing.amount : 0);
  const shortfall = minor - Math.max(0, room);
  const donors = envelopes
    .filter((v) => v.env.id !== envelopeId && v.stats.remaining >= shortfall && !(v.env.type === 'fixed' && !v.paid))
    .sort((a, b) => b.stats.remaining - a.stats.remaining);

  const record = { periodId: period.id!, envelopeId, amount: minor, note: note.trim() || undefined, date };

  const done = () => {
    setLastEnvelope(envelopeId);
    setStage('done');
    setTimeout(onClose, 650);
  };

  const save = async (opts?: { from?: number; force?: boolean }) => {
    if (minor <= 0 || busy) return;
    if (!opts && shortfall > 0) return setStage('overdraw');
    setBusy(true);
    try {
      if (opts?.from) {
        await addExpenseWithTransfer(record, opts.from, shortfall); // only offered for new expenses
      } else if (editing) {
        await updateExpense(editing.id!, record);
      } else {
        await addExpense(record);
      }
      done();
    } finally {
      setBusy(false);
    }
  };

  if (stage === 'done') {
    return createPortal(
      <div className="success" role="status" aria-label="Saved"><div className="success-badge"><IconCheck size={48} stroke={2.25} /></div></div>,
      document.body,
    );
  }

  return (
    <BottomSheet open onClose={onClose} title={editing ? 'Edit expense' : 'Add expense'}>
      {stage === 'form' ? (
        <>
          <div className="amount-display" aria-live="polite" aria-label={`Amount ${amount || 0} ${cur}`}>
            <span className="cur">{cur}</span>{amount || <span style={{ color: 'var(--green-300)' }}>0</span>}<span className="caret" aria-hidden />
          </div>
          <p className="small muted" style={{ textAlign: 'center' }}>
            {view.env.name}: {formatMoney(Math.max(0, room), cur)} left
          </p>

          <div className="picker" role="radiogroup" aria-label="Envelope">
            {envelopes.map((v) => (
              <Chip key={v.env.id} icon={v.env.icon} label={v.env.name} active={v.env.id === envelopeId} onClick={() => setEnvelopeId(v.env.id!)} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <input aria-label="Note" placeholder="Note (optional)" value={note} maxLength={80} onChange={(e) => setNote(e.target.value)} />
            <input aria-label="Date" type="date" value={date} min={period.startDate} max={period.endDate} style={{ width: 150 }}
              onChange={(e) => e.target.value && setDate(e.target.value)} />
          </div>

          <Keypad value={amount} onChange={setAmount} />
          <div style={{ marginTop: 16 }}>
            <NeuButton primary block disabled={minor <= 0 || busy} onClick={() => save()}>{editing ? 'Save changes' : 'Save expense'}</NeuButton>
          </div>
        </>
      ) : (
        <>
          <p style={{ fontSize: 15, lineHeight: 1.45 }}>
            This puts <b>{view.env.name}</b> {formatMoney(shortfall, cur)} over its limit.
            {donors.length > 0 ? ' Move money from another envelope instead?' : ' No other envelope has enough left to cover it.'}
          </p>
          {/* Moving money for an edited expense is done separately via Move money; only new expenses offer it inline. */}
          {!editing && donors.length > 0 && (
            <div className="stack" style={{ marginTop: 16 }}>
              {donors.slice(0, 3).map((d, i) => (
                <NeuButton key={d.env.id} primary={i === 0} block disabled={busy} onClick={() => save({ from: d.env.id })}>
                  Move {formatMoney(shortfall, cur)} from {d.env.name} ({formatMoney(d.stats.remaining, cur)} left)
                </NeuButton>
              ))}
            </div>
          )}
          <div className="sheet-actions">
            <NeuButton block onClick={() => setStage('form')}>Back</NeuButton>
            <NeuButton block danger disabled={busy} onClick={() => save({ force: true })}>Spend anyway</NeuButton>
          </div>
        </>
      )}
    </BottomSheet>
  );
}
