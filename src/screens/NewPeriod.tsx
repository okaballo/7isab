import { useState } from 'react';
import type { Budget } from '../db/hooks';
import { startNewPeriod } from '../db/actions';
import { leftover, type RolloverMode } from '../lib/rollover';
import { formatMoney, toInput, toMinor } from '../lib/money';
import { periodLabel } from '../lib/period';
import { Field, NeuButton, NeuCard, Segmented } from '../components/ui';

/** Shown on launch once the active period has ended. */
export function NewPeriod({ budget }: { budget: Budget }) {
  const { period, settings, envelopes } = budget;
  const cur = settings.currency;
  const left = leftover(envelopes.map((v) => ({ env: v.env, remaining: v.stats.remaining })));
  const [income, setIncome] = useState(toInput(period.income));
  const [mode, setMode] = useState<RolloverMode>('savings');
  const [busy, setBusy] = useState(false);
  const minor = toMinor(income);

  return (
    <main className="screen no-nav">
      <h1 style={{ fontSize: 24, fontWeight: 600, marginTop: 12 }}>A new month 🎉</h1>
      <p className="muted" style={{ fontSize: 14, margin: '6px 0 18px' }}>{periodLabel(period.startDate)} is over. Let's set up the next one with last month's plan.</p>

      <div className="stack">
        <Field label={`Income this month (${cur})`} hint="Pre-filled with last month's amount.">
          <input inputMode="decimal" value={income} onChange={(e) => setIncome(e.target.value.replace(/[^\d.,]/g, ''))} />
        </Field>

        {left > 0 && (
          <NeuCard>
            <p style={{ fontSize: 15 }}>You have <b>{formatMoney(left, cur)}</b> left over. Nice!</p>
            <p className="small muted" style={{ margin: '4px 0 12px' }}>What should happen to it?</p>
            <Segmented label="Leftover money" value={mode} onChange={setMode}
              options={[{ value: 'savings', label: 'Move to Savings' }, { value: 'roll', label: 'Roll into envelopes' }]} />
          </NeuCard>
        )}

        <NeuButton primary block disabled={!minor || busy} onClick={async () => { setBusy(true); await startNewPeriod(minor!, mode); }}>
          Start the new month
        </NeuButton>
        {minor !== null && minor !== period.income && (
          <p className="small muted">Your income changed. You'll be asked to adjust your envelopes on the home screen.</p>
        )}
      </div>
    </main>
  );
}
