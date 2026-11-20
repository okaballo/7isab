import { useState } from 'react';
import { finishOnboarding } from '../db/actions';
import { toMinor } from '../lib/money';
import { Field, NeuButton } from '../components/ui';
import { draftUnassigned, fromDrafts, newKey, PlanEditor, UnassignedLine, type DraftItem } from './PlanEditor';

const DEFAULTS: DraftItem[] = [
  { key: newKey(), name: 'Rent', icon: 'home-2', type: 'fixed', amount: '' },
  { key: newKey(), name: 'Bills', icon: 'bolt', type: 'fixed', amount: '' },
  { key: newKey(), name: 'Food', icon: 'tools-kitchen-2', type: 'flexible', amount: '' },
  { key: newKey(), name: 'Transport', icon: 'bus', type: 'flexible', amount: '' },
  { key: newKey(), name: 'Fun', icon: 'device-gamepad-2', type: 'flexible', amount: '' },
];

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [income, setIncome] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [day, setDay] = useState(String(new Date().getDate()));
  const [items, setItems] = useState(DEFAULTS);

  const incomeMinor = toMinor(income);
  const step1Ok = !!incomeMinor && incomeMinor > 0 && currency.trim().length > 0;
  const balanced = incomeMinor !== null && draftUnassigned(incomeMinor, items) === 0 && items.length > 0;

  const finish = async () => {
    const plan = fromDrafts(items);
    if (!plan || !balanced) return;
    await finishOnboarding({ currency: currency.trim().toUpperCase(), incomeDay: Number(day), income: incomeMinor!, plan });
  };

  return (
    <main className="screen no-nav">
      <div className="steps" aria-label={`Step ${step + 1} of 3`}>{[0, 1, 2].map((i) => <span key={i} className={i <= step ? 'on' : ''} />)}</div>

      {step === 0 && (
        <section className="stack">
          <h1 style={{ fontSize: 26, fontWeight: 600 }}>Welcome to 7isab</h1>
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.45 }}>Give every pound of your monthly money a job, so the month ends before the money does.</p>
          <Field label="Monthly income">
            <input inputMode="decimal" placeholder="8000" value={income} autoFocus onChange={(e) => setIncome(e.target.value.replace(/[^\d.,]/g, ''))} />
          </Field>
          <Field label="Currency">
            <input value={currency} maxLength={5} onChange={(e) => setCurrency(e.target.value)} autoCapitalize="characters" />
          </Field>
          <Field label="Day of the month it usually arrives" hint="If a month is shorter, it moves to the last day.">
            <select value={day} onChange={(e) => setDay(e.target.value)}>
              {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          </Field>
          <NeuButton primary block disabled={!step1Ok} onClick={() => setStep(1)}>Next</NeuButton>
        </section>
      )}

      {step === 1 && incomeMinor !== null && (
        <section>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Split it into envelopes</h1>
          <p className="muted" style={{ fontSize: 14, margin: '6px 0 14px' }}>Rename, add, delete or change icons. Assign exactly your income: no planning money you don't have.</p>
          <div className="sticky-status"><UnassignedLine total={incomeMinor} items={items} currency={currency} /></div>
          <PlanEditor items={items} onChange={setItems} />
          <div className="sheet-actions">
            <NeuButton block onClick={() => setStep(0)}>Back</NeuButton>
            <NeuButton primary block disabled={!balanced} onClick={() => setStep(2)}>Next</NeuButton>
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Fixed or flexible?</h1>
          <p className="muted" style={{ fontSize: 14, margin: '6px 0 14px' }}>Fixed envelopes (rent, bills) are paid once and show “Paid”. Flexible ones are spent bit by bit and set your daily safe-to-spend.</p>
          <PlanEditor items={items} onChange={setItems} showType showAmounts={false} />
          {!balanced && <p className="error" style={{ marginTop: 12 }}>Your envelopes no longer add up to your income. Go back and fix the amounts.</p>}
          <div className="sheet-actions">
            <NeuButton block onClick={() => setStep(1)}>Back</NeuButton>
            <NeuButton primary block disabled={!balanced} onClick={finish}>Start budgeting</NeuButton>
          </div>
        </section>
      )}
    </main>
  );
}
