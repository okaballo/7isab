import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { IconAlertTriangle, IconChevronLeft } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { EnvIcon } from './icons';

export function NeuCard({ children, warn, className = '', ...rest }: { children: ReactNode; warn?: boolean; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return <div className={`raised card ${warn ? 'warn' : ''} ${className}`} {...rest}>{children}</div>;
}

/** `primary` = the one solid dark-green pill per screen. Everything else is neumorphic. */
export function NeuButton({ primary, block, danger, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean; block?: boolean; danger?: boolean }) {
  const look = primary ? 'primary' : 'raised pressable';
  return <button type="button" className={`btn ${look} ${block ? 'block' : ''} ${danger ? 'danger' : ''} ${className}`} {...rest} />;
}

export function IconButton({ label, children, dot, onClick }: { label: string; children: ReactNode; dot?: boolean; onClick?: () => void }) {
  return (
    <button type="button" className="raised pressable icon-btn" aria-label={label} onClick={onClick}>
      {children}
      {dot && <span className="dot" style={{ top: 9, right: 10 }} />}
    </button>
  );
}

export function ProgressBar({ value, warn, height = 8 }: { value: number; warn?: boolean; height?: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="inset track" style={{ height, background: warn ? 'var(--red-track)' : undefined }} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="fill" style={{ width: `${pct}%`, background: warn ? 'var(--red-600)' : 'var(--green-700)' }} />
    </div>
  );
}

export function AlertBanner({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" className="alert" onClick={onClick} role="alert">
      <span className="alert-badge"><IconAlertTriangle size={18} color="var(--cream)" stroke={1.75} /></span>
      <span>{children}</span>
    </button>
  );
}

export function Chip({ icon, label, active, warn, onClick }: { icon: string; label: string; active?: boolean; warn?: boolean; onClick?: () => void }) {
  const color = active ? 'var(--green-900)' : warn ? 'var(--red-text-2)' : 'var(--green-500)';
  return (
    <button type="button" className="chip" style={{ color }} onClick={onClick} aria-pressed={active}>
      <span className={`${active ? 'inset' : 'raised pressable'} chip-box`}>
        <EnvIcon name={icon} color={active ? 'var(--green-900)' : warn ? 'var(--red-600)' : 'var(--green-700)'} />
        {warn && <span className="dot" style={{ top: 5, right: 5 }} />}
      </span>
      {label}
    </button>
  );
}

/** Sub-screen header: back button, title, optional right slot. */
export function TopBar({ title, right }: { title: string; right?: ReactNode }) {
  const nav = useNavigate();
  return (
    <div className="row topbar">
      <IconButton label="Back" onClick={() => nav(-1)}><IconChevronLeft size={20} stroke={1.75} /></IconButton>
      <h1 className="topbar-title">{title}</h1>
      <div style={{ width: 44, display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="small muted" style={{ display: 'block', marginTop: 6 }}>{hint}</span>}
    </label>
  );
}

/** Two-option neumorphic toggle (selected = pressed in). */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value}
          className={value === o.value ? 'inset seg-on' : 'raised pressable'} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
