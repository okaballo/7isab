import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { IconArrowsExchange, IconCheck } from '@tabler/icons-react';
import { useOpenAddExpense } from '../App';
import type { Budget } from '../db/hooks';
import { addExpense } from '../db/actions';
import { formatAmount, formatMoney } from '../lib/money';
import { todayISO } from '../lib/period';
import { isRed } from '../lib/alerts';
import { NeuButton, NeuCard, ProgressBar, TopBar } from '../components/ui';
import { EnvelopeCard } from './Home';
import { MoveMoneySheet } from './MoveMoney';
import { ExpenseList } from './History';

export function EnvelopeDetail({ budget }: { budget: Budget }) {
  const { id } = useParams();
  const openAdd = useOpenAddExpense();
  const [moving, setMoving] = useState(false);
  const v = budget.byId.get(Number(id));
  if (!v) return <Navigate to="/" replace />;
  const cur = budget.settings.currency;
  const { stats, env } = v;
  const fixedUnpaid = env.type === 'fixed' && !v.paid && stats.remaining > 0;

  const markPaid = () =>
    addExpense({ periodId: budget.period.id!, envelopeId: env.id!, amount: stats.remaining, note: `${env.name} paid`, date: todayISO() });

  return (
    <main className="screen">
      <TopBar title={env.name} />
      <EnvelopeCard v={v} />

      <NeuCard style={{ marginTop: 4 }}>
        <Stat label="Planned" value={formatMoney(stats.planned, cur)} />
        {stats.transfersIn > 0 && <Stat label="Moved in" value={`+${formatAmount(stats.transfersIn)}`} />}
        {stats.transfersOut > 0 && <Stat label="Moved out" value={`−${formatAmount(stats.transfersOut)}`} />}
        <Stat label="Spent" value={formatMoney(stats.spent, cur)} />
        <Stat label={stats.remaining < 0 ? 'Over by' : 'Left'} value={formatMoney(Math.abs(stats.remaining), cur)} red={stats.remaining < 0} />
        {env.type === 'flexible' && !env.isSavings && (
          <>
            <div style={{ margin: '10px 0 6px' }} className="small muted">Spent vs time passed ({Math.round(budget.elapsed * 100)}% of the month)</div>
            <ProgressBar value={stats.used} warn={isRed(v.status)} />
          </>
        )}
      </NeuCard>

      <div className="stack" style={{ marginTop: 16 }}>
        {fixedUnpaid
          ? <NeuButton primary block onClick={markPaid}><IconCheck size={18} stroke={2} /> Mark {formatAmount(stats.remaining)} paid</NeuButton>
          : <NeuButton primary block onClick={() => openAdd({ envelopeId: env.id })}>Add expense to {env.name}</NeuButton>}
        {fixedUnpaid && <NeuButton block onClick={() => openAdd({ envelopeId: env.id })}>Add partial payment</NeuButton>}
        <NeuButton block onClick={() => setMoving(true)}><IconArrowsExchange size={18} stroke={1.75} /> Move money</NeuButton>
      </div>

      <h2 className="section-title" style={{ margin: '24px 0 4px' }}>This month</h2>
      <ExpenseList budget={budget} envelopeId={env.id} />

      {moving && <MoveMoneySheet budget={budget} toId={env.id!} onClose={() => setMoving(false)} />}
    </main>
  );
}

function Stat({ label, value, red }: { label: string; value: string; red?: boolean }) {
  return (
    <div className="row" style={{ fontSize: 14, padding: '4px 0' }}>
      <span className="muted">{label}</span>
      <span style={{ fontWeight: 600, color: red ? 'var(--red-text-2)' : undefined }}>{value}</span>
    </div>
  );
}
