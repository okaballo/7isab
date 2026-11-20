import { useLiveQuery } from 'dexie-react-hooks';
import { IconBulb } from '@tabler/icons-react';
import { db } from '../db/schema';
import type { Budget } from '../db/hooks';
import { envelopeStats } from '../lib/budget';
import { insights, type PeriodSummary } from '../lib/insights';
import { formatAmount } from '../lib/money';
import { shortLabel } from '../lib/period';
import { NeuCard, ProgressBar } from '../components/ui';

/** Current period + up to 3 before it, oldest first. */
function useHistory(currentStart: string) {
  return useLiveQuery(async () => {
    const periods = (await db.periods.orderBy('startDate').toArray()).filter((p) => p.startDate <= currentStart).slice(-4);
    return Promise.all(periods.map(async (p): Promise<PeriodSummary> => {
      const [envs, exps, trs] = await Promise.all([
        db.envelopes.where('periodId').equals(p.id!).sortBy('order'),
        db.expenses.where('periodId').equals(p.id!).toArray(),
        db.transfers.where('periodId').equals(p.id!).toArray(),
      ]);
      return {
        label: shortLabel(p.startDate),
        rows: envs.filter((e) => !e.isSavings).map((e) => {
          const s = envelopeStats(e, exps, trs);
          return { name: e.name, available: s.available, spent: s.spent };
        }),
      };
    }));
  }, [currentStart]);
}

export function Insights({ budget }: { budget: Budget }) {
  const history = useHistory(budget.period.startDate) ?? [];
  const cur = budget.settings.currency;
  const tips = insights(history, cur);
  const now = budget.envelopes.filter((v) => !v.env.isSavings);
  const past = history.slice(0, -1);

  return (
    <main className="screen">
      <h1 className="header-title" style={{ textAlign: 'center', marginBottom: 18, lineHeight: '44px' }}>Insights</h1>

      {tips.map((t) => (
        <NeuCard key={t} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12, fontSize: 14, lineHeight: 1.4 }}>
          <IconBulb size={20} stroke={1.75} color="var(--green-700)" style={{ flexShrink: 0 }} />{t}
        </NeuCard>
      ))}

      <h2 className="section-title" style={{ margin: '8px 0 12px' }}>This month: spent vs plan</h2>
      <NeuCard>
        {now.map((v) => {
          const over = v.stats.spent > v.stats.available;
          return (
            <div key={v.env.id} className="bar-row">
              <div className="row">
                <span>{v.env.name}</span>
                <span className={over ? 'over' : 'muted'}>{formatAmount(v.stats.spent)} / {formatAmount(v.stats.available)}</span>
              </div>
              <ProgressBar value={v.stats.used} warn={over} height={12} />
            </div>
          );
        })}
      </NeuCard>

      <h2 className="section-title" style={{ margin: '24px 0 12px' }}>Compared with past months</h2>
      {past.length === 0 ? (
        <p className="empty">Comparisons appear after your first full month.</p>
      ) : (
        <NeuCard style={{ overflowX: 'auto' }}>
          <table className="compare">
            <thead>
              <tr><th scope="col">Spent</th>{history.map((h) => <th key={h.label} scope="col">{h.label}</th>)}</tr>
            </thead>
            <tbody>
              {now.map((v) => (
                <tr key={v.env.id}>
                  <td>{v.env.name}</td>
                  {history.map((h) => {
                    const r = h.rows.find((x) => x.name === v.env.name);
                    return <td key={h.label} className={r && r.spent > r.available ? 'over' : undefined}>{r ? formatAmount(r.spent) : '—'}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small muted" style={{ marginTop: 8 }}>Red = over plan that month.</p>
        </NeuCard>
      )}
    </main>
  );
}
