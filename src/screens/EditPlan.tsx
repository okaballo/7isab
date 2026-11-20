import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Budget } from '../db/hooks';
import { savePlan } from '../db/actions';
import { formatMoney, toInput, toMinor } from '../lib/money';
import { Field, NeuButton, TopBar } from '../components/ui';
import { draftUnassigned, fromDrafts, PlanEditor, toDraft, UnassignedLine } from './PlanEditor';

export function EditPlan({ budget }: { budget: Budget }) {
  const nav = useNavigate();
  const { period, settings } = budget;
  const [income, setIncome] = useState(toInput(period.income));
  const [items, setItems] = useState(() => budget.envelopes.map((v) => toDraft(v.env)));
  const [error, setError] = useState('');
  const incomeMinor = toMinor(income);
  const total = (incomeMinor ?? 0) + period.carryover;
  const ok = incomeMinor !== null && incomeMinor > 0 && items.length > 0 && draftUnassigned(total, items) === 0;

  const save = async () => {
    const plan = fromDrafts(items);
    if (!plan || !ok) return;
    try {
      await savePlan(period, incomeMinor!, plan);
      nav('/');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <main className="screen">
      <TopBar title="Edit plan" />
      <div className="stack">
        <Field label={`Income this month (${settings.currency})`}
          hint={period.carryover > 0 ? `Plus ${formatMoney(period.carryover, settings.currency)} carried over from last month.` : undefined}>
          <input inputMode="decimal" value={income} onChange={(e) => setIncome(e.target.value.replace(/[^\d.,]/g, ''))} />
        </Field>
        <div className="sticky-status"><UnassignedLine total={total} items={items} currency={settings.currency} /></div>
      </div>
      <div style={{ marginTop: 14 }}><PlanEditor items={items} onChange={setItems} showType /></div>
      {error && <p className="error" role="alert" style={{ marginTop: 12 }}>{error}</p>}
      <div style={{ marginTop: 16 }}><NeuButton primary block disabled={!ok} onClick={save}>Save plan</NeuButton></div>
    </main>
  );
}
