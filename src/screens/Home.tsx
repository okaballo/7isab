import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBell, IconCheck, IconCloudUpload, IconMenu2, IconPlus } from '@tabler/icons-react';
import { useOpenAddExpense } from '../App';
import type { Budget, EnvelopeView } from '../db/hooks';
import { formatAmount, formatMoney } from '../lib/money';
import { periodLabel } from '../lib/period';
import { isRed } from '../lib/alerts';
import { unassigned } from '../lib/budget';
import { AlertBanner, Chip, IconButton, NeuButton, ProgressBar } from '../components/ui';
import { BottomSheet } from '../components/BottomSheet';
import { EnvIcon } from '../components/icons';

const BACKUP_EVERY_MS = 30 * 864e5;

export function Home({ budget }: { budget: Budget }) {
  const nav = useNavigate();
  const openAdd = useOpenAddExpense();
  const [showAlerts, setShowAlerts] = useState(false);
  const { settings, period, envelopes, alerts, daysLeft, safeToSpend, flexLeft, flexTotal } = budget;
  const cur = settings.currency;
  const top = alerts[0];
  const free = unassigned(period.income + period.carryover, envelopes.map((v) => v.env));
  const backupDue = !settings.lastBackupAt || Date.now() - Date.parse(settings.lastBackupAt) > BACKUP_EVERY_MS;

  return (
    <main className="screen">
      <header className="row">
        <IconButton label="Settings" onClick={() => nav('/settings')}><IconMenu2 size={18} stroke={1.75} /></IconButton>
        <span className="header-title">7isab</span>
        <IconButton label={alerts.length ? `${alerts.length} alerts` : 'No alerts'} dot={alerts.length > 0} onClick={() => setShowAlerts(true)}>
          <IconBell size={18} stroke={1.75} />
        </IconButton>
      </header>

      <section className="raised hero" aria-label="Safe to spend today">
        <p style={{ fontSize: 12, color: 'var(--green-500)' }}>{periodLabel(period.startDate)} · {daysLeft} day{daysLeft === 1 ? '' : 's'} left</p>
        <p style={{ fontSize: 13, color: 'var(--green-700)', marginTop: 8 }}>Safe to spend today</p>
        <p className="hero-amount">{formatMoney(safeToSpend, cur)}</p>
        <div style={{ marginTop: 12 }}><ProgressBar value={flexTotal > 0 ? 1 - flexLeft / flexTotal : 0} height={10} /></div>
        <p style={{ fontSize: 12, color: 'var(--green-500)', marginTop: 8 }}>
          {flexLeft >= 0 ? `${formatAmount(flexLeft)} left of ${formatAmount(flexTotal)}` : `${formatAmount(-flexLeft)} over ${formatAmount(flexTotal)}`}
        </p>
      </section>

      {top && <AlertBanner onClick={() => nav(`/envelope/${top.envelopeId}`)}>{top.message}</AlertBanner>}

      {free !== 0 && (
        <button type="button" className="raised pressable card" style={{ width: '100%', marginTop: 16, textAlign: 'left', fontSize: 13 }} onClick={() => nav('/plan')}>
          <b>{free > 0 ? `${formatMoney(free, cur)} has no envelope yet.` : `Your envelopes are ${formatMoney(-free, cur)} more than your income.`}</b>
          <span className="muted"> Tap to fix your plan.</span>
        </button>
      )}

      {backupDue && (
        <button type="button" className="raised pressable card" style={{ width: '100%', marginTop: 16, display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left', fontSize: 13 }} onClick={() => nav('/settings')}>
          <IconCloudUpload size={20} stroke={1.75} color="var(--green-700)" />
          <span><b>Back up your data.</b> <span className="muted">iPhone may clear app storage if unused. Export a backup monthly.</span></span>
        </button>
      )}

      <nav className="chips" aria-label="Envelopes">
        {envelopes.map((v) => (
          <Chip key={v.env.id} icon={v.env.icon} label={v.env.name} warn={isRed(v.status)} onClick={() => nav(`/envelope/${v.env.id}`)} />
        ))}
      </nav>

      <div className="row" style={{ margin: '6px 0 4px' }}>
        <h2 className="section-title">Envelopes</h2>
        <button type="button" className="small muted" style={{ minHeight: 44, padding: '0 4px' }} onClick={() => nav('/plan')}>Edit plan</button>
      </div>

      {envelopes.map((v) => <EnvelopeCard key={v.env.id} v={v} onClick={() => nav(`/envelope/${v.env.id}`)} />)}

      <div className="cta-wrap">
        <NeuButton primary block className="cta" onClick={() => openAdd()}><IconPlus size={18} stroke={2} /> Add expense</NeuButton>
      </div>

      <BottomSheet open={showAlerts} onClose={() => setShowAlerts(false)} title="Alerts">
        {alerts.length === 0 ? <p className="empty">All envelopes are on track.</p> : alerts.map((a) => (
          <AlertBanner key={a.envelopeId} onClick={() => { setShowAlerts(false); nav(`/envelope/${a.envelopeId}`); }}>{a.message}</AlertBanner>
        ))}
      </BottomSheet>
    </main>
  );
}

export function EnvelopeCard({ v, onClick }: { v: EnvelopeView; onClick?: () => void }) {
  const red = isRed(v.status);
  const { remaining } = v.stats;
  const label = v.paid ? 'Paid' : remaining < 0 ? `${formatAmount(-remaining)} over` : `${formatAmount(remaining)} left`;
  return (
    <button type="button" className={`raised env pressable ${red ? 'card warn' : ''}`} onClick={onClick}>
      <div className="row">
        <span className="env-name" style={{ color: red ? 'var(--red-text)' : undefined }}>
          <EnvIcon name={v.env.icon} size={16} color={red ? 'var(--red-600)' : 'var(--green-500)'} />{v.env.name}
        </span>
        <span style={{ color: red ? 'var(--red-text-2)' : 'var(--green-500)', fontWeight: red ? 600 : 400, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {label}{v.paid && <IconCheck size={14} stroke={2} />}
        </span>
      </div>
      <ProgressBar value={v.paid ? 1 : v.stats.used} warn={red} />
    </button>
  );
}
