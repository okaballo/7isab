import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { IconChevronRight, IconDownload, IconUpload } from '@tabler/icons-react';
import type { Budget } from '../db/hooks';
import { exportBackup, importBackup, loadDemo, resetAll, updateSettings } from '../db/actions';
import { ConfirmSheet } from '../components/BottomSheet';
import { Field, NeuButton, NeuCard, TopBar } from '../components/ui';

export function Settings({ budget }: { budget: Budget }) {
  const nav = useNavigate();
  const { settings } = budget;
  const [currency, setCurrency] = useState(settings.currency);
  const [day, setDay] = useState(String(settings.incomeDay));
  const [msg, setMsg] = useState('');
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [taps, setTaps] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const changed = currency.trim().toUpperCase() !== settings.currency || Number(day) !== settings.incomeDay;

  const doExport = async () => {
    const blob = await exportBackup();
    const name = `7isab-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    const file = new File([blob], name, { type: 'application/json' });
    // iPhone: the share sheet lets you "Save to Files". Elsewhere: a normal download.
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: '7isab backup' }); setMsg('Backup exported.'); return; }
      catch (e) { if ((e as Error).name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg('Backup downloaded.');
  };

  const onFile = async (f?: File) => {
    if (f) setPendingImport(await f.text());
    if (fileRef.current) fileRef.current.value = '';
  };

  const doImport = async () => {
    try { await importBackup(pendingImport!); setMsg('Backup restored.'); }
    catch (e) { setMsg((e as Error).message); }
  };

  return (
    <main className="screen">
      <TopBar title="Settings" />

      <div className="stack">
        <h2 className="section-title">Plan</h2>
        <button type="button" className="raised pressable list-item" onClick={() => nav('/plan')}>
          <span className="list-main"><p>Income & envelopes</p><p>Edit amounts, names, icons and types</p></span>
          <IconChevronRight size={18} stroke={1.75} />
        </button>
        <NeuCard className="stack">
          <Field label="Currency"><input value={currency} maxLength={5} onChange={(e) => setCurrency(e.target.value)} /></Field>
          <Field label="Income day" hint="Applies from the next month.">
            <select value={day} onChange={(e) => setDay(e.target.value)}>
              {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          </Field>
          <NeuButton block disabled={!changed || !currency.trim()} onClick={async () => { await updateSettings({ currency: currency.trim().toUpperCase(), incomeDay: Number(day) }); setMsg('Saved.'); }}>Save</NeuButton>
        </NeuCard>

        <h2 className="section-title" style={{ marginTop: 24 }}>Backup</h2>
        <p className="small muted" style={{ lineHeight: 1.45 }}>
          Your data lives only on this phone. iOS can clear it if the app goes unused for a while, so export a backup once a month and keep it in Files or iCloud Drive.
          {settings.lastBackupAt ? ` Last backup: ${format(new Date(settings.lastBackupAt), 'd MMM yyyy')}.` : ' No backup yet.'}
        </p>
        <NeuButton primary block onClick={doExport}><IconDownload size={18} stroke={2} /> Export backup</NeuButton>
        <NeuButton block onClick={() => fileRef.current?.click()}><IconUpload size={18} stroke={1.75} /> Import backup</NeuButton>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => onFile(e.target.files?.[0])} />
        {msg && <p role="status" className="small" style={{ color: 'var(--green-700)' }}>{msg}</p>}

        <h2 className="section-title" style={{ marginTop: 24 }}>Danger zone</h2>
        <NeuButton block danger onClick={() => setConfirmReset(true)}>Reset all data</NeuButton>
        {taps >= 5 && <NeuButton block onClick={() => setConfirmDemo(true)}>Load demo data</NeuButton>}

        <button type="button" className="small" style={{ color: 'var(--green-300)', minHeight: 44, width: '100%' }} onClick={() => setTaps((t) => t + 1)}>
          7isab v1.0
        </button>
      </div>

      <ConfirmSheet open={pendingImport !== null} onClose={() => setPendingImport(null)} title="Restore backup?" confirmLabel="Replace my data" danger
        message="Everything on this phone will be replaced by the backup file." onConfirm={doImport} />
      <ConfirmSheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset all data?" confirmLabel="Delete everything" danger
        message="This deletes all envelopes, expenses, debts and history. Export a backup first if you might want it back." onConfirm={resetAll} />
      <ConfirmSheet open={confirmDemo} onClose={() => setConfirmDemo(false)} title="Load demo data?" confirmLabel="Replace with demo" danger
        message="Your current data will be replaced with sample data." onConfirm={() => loadDemo().then(() => nav('/'))} />
    </main>
  );
}
