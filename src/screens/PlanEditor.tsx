import { useState } from 'react';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { BottomSheet } from '../components/BottomSheet';
import { ENVELOPE_ICONS, EnvIcon } from '../components/icons';
import { NeuButton, Segmented } from '../components/ui';
import { formatMoney, toInput, toMinor } from '../lib/money';
import { unassigned } from '../lib/budget';
import type { EnvelopeType } from '../lib/types';
import type { PlanItem } from '../lib/rollover';

export interface DraftItem {
  key: string;
  id?: number;
  name: string;
  icon: string;
  type: EnvelopeType;
  amount: string;
  isSavings?: boolean;
}

let seq = 0;
export const newKey = () => `k${++seq}`;

export const toDraft = (p: PlanItem & { id?: number }): DraftItem => ({
  key: newKey(), id: p.id, name: p.name, icon: p.icon, type: p.type, amount: p.planned ? toInput(p.planned) : '', isSavings: p.isSavings,
});

/** Convert drafts to plan items; null when any row is invalid. */
export function fromDrafts(items: DraftItem[]): (PlanItem & { id?: number })[] | null {
  const out = items.map((d, i) => ({ id: d.id, name: d.name.trim(), icon: d.icon, type: d.type, planned: d.amount === '' ? 0 : toMinor(d.amount), order: i, isSavings: d.isSavings }));
  return out.every((o) => o.name && o.planned !== null) ? (out as (PlanItem & { id?: number })[]) : null;
}

export function draftUnassigned(total: number, items: DraftItem[]): number | null {
  const plan = fromDrafts(items);
  return plan ? unassigned(total, plan) : null;
}

/** Live "Unassigned: X" line. */
export function UnassignedLine({ total, items, currency }: { total: number; items: DraftItem[]; currency: string }) {
  const u = draftUnassigned(total, items);
  if (u === null) return <p className="error" role="status">Each envelope needs a name and a valid amount.</p>;
  const ok = u === 0;
  return (
    <p role="status" style={{ fontSize: 14, fontWeight: 600, color: ok ? 'var(--green-700)' : 'var(--red-text-2)' }}>
      {ok ? 'Fully assigned ✓' : u > 0 ? `Unassigned: ${formatMoney(u, currency)}` : `Over-assigned by ${formatMoney(-u, currency)}`}
    </p>
  );
}

export function PlanEditor({ items, onChange, showType, showAmounts = true }: { items: DraftItem[]; onChange: (i: DraftItem[]) => void; showType?: boolean; showAmounts?: boolean }) {
  const [iconFor, setIconFor] = useState<string | null>(null);
  const patch = (key: string, p: Partial<DraftItem>) => onChange(items.map((i) => (i.key === key ? { ...i, ...p } : i)));

  return (
    <div>
      {items.map((it) => (
        <div key={it.key} className="raised card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button type="button" className="raised pressable icon-btn" aria-label={`Change icon for ${it.name || 'envelope'}`} onClick={() => setIconFor(it.key)}>
              <EnvIcon name={it.icon} />
            </button>
            <input aria-label="Envelope name" value={it.name} placeholder="Name" onChange={(e) => patch(it.key, { name: e.target.value })} disabled={it.isSavings} />
            {showAmounts && (
              <input aria-label={`${it.name} amount`} inputMode="decimal" placeholder="0" value={it.amount} style={{ width: 110, textAlign: 'right' }}
                onChange={(e) => patch(it.key, { amount: e.target.value.replace(/[^\d.,]/g, '') })} />
            )}
            {!it.isSavings && (
              <button type="button" className="icon-btn" aria-label={`Delete ${it.name}`} onClick={() => onChange(items.filter((i) => i.key !== it.key))}>
                <IconTrash size={18} stroke={1.75} color="var(--green-500)" />
              </button>
            )}
          </div>
          {showType && !it.isSavings && (
            <div style={{ marginTop: 10 }}>
              <Segmented label={`${it.name} type`} value={it.type} onChange={(type) => patch(it.key, { type })}
                options={[{ value: 'fixed', label: 'Fixed · paid once' }, { value: 'flexible', label: 'Flexible' }]} />
            </div>
          )}
        </div>
      ))}
      <NeuButton block onClick={() => onChange([...items, { key: newKey(), name: '', icon: 'wallet', type: 'flexible', amount: '' }])}>
        <IconPlus size={18} stroke={1.75} /> Add envelope
      </NeuButton>

      <BottomSheet open={iconFor !== null} onClose={() => setIconFor(null)} title="Choose an icon">
        <div className="icon-grid">
          {Object.keys(ENVELOPE_ICONS).map((name) => {
            const on = items.find((i) => i.key === iconFor)?.icon === name;
            return (
              <button key={name} type="button" aria-label={name} aria-pressed={on} className={on ? 'inset' : 'raised pressable'}
                onClick={() => { patch(iconFor!, { icon: name }); setIconFor(null); }}>
                <EnvIcon name={name} />
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </div>
  );
}
