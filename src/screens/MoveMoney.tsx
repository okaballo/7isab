import { useState } from 'react';
import type { Budget } from '../db/hooks';
import { addTransfer } from '../db/actions';
import { formatMoney, toMinor } from '../lib/money';
import { BottomSheet } from '../components/BottomSheet';
import { Field, NeuButton } from '../components/ui';

/** Explicit transfer between envelopes; logged in History. */
export function MoveMoneySheet({ budget, toId, onClose }: { budget: Budget; toId: number; onClose: () => void }) {
  const { envelopes, settings, period } = budget;
  const others = envelopes.filter((v) => v.env.id !== toId);
  const [from, setFrom] = useState(others.sort((a, b) => b.stats.remaining - a.stats.remaining)[0]?.env.id);
  const [to, setTo] = useState(toId);
  const [amount, setAmount] = useState('');
  const minor = toMinor(amount) ?? 0;
  const src = budget.byId.get(from ?? -1);
  const tooMuch = !!src && minor > src.stats.remaining;
  const ok = !!from && from !== to && minor > 0 && !tooMuch;

  const label = (id: number) => {
    const v = budget.byId.get(id)!;
    return `${v.env.name} (${formatMoney(v.stats.remaining, settings.currency)} left)`;
  };

  return (
    <BottomSheet open onClose={onClose} title="Move money">
      <div className="stack">
        <Field label="From">
          <select value={from} onChange={(e) => setFrom(Number(e.target.value))}>
            {envelopes.map((v) => <option key={v.env.id} value={v.env.id}>{label(v.env.id!)}</option>)}
          </select>
        </Field>
        <Field label="To">
          <select value={to} onChange={(e) => setTo(Number(e.target.value))}>
            {envelopes.map((v) => <option key={v.env.id} value={v.env.id}>{label(v.env.id!)}</option>)}
          </select>
        </Field>
        <Field label={`Amount (${settings.currency})`}>
          <input inputMode="decimal" value={amount} placeholder="0" onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} />
        </Field>
        {tooMuch && <p className="error">{src!.env.name} only has {formatMoney(Math.max(0, src!.stats.remaining), settings.currency)} left.</p>}
        {from === to && <p className="error">Pick two different envelopes.</p>}
        <NeuButton primary block disabled={!ok} onClick={async () => { await addTransfer(period.id!, from!, to, minor); onClose(); }}>Move money</NeuButton>
      </div>
    </BottomSheet>
  );
}
