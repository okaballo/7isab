import { useEffect } from 'react';
import { IconBackspace } from '@tabler/icons-react';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

/** Apply one key to an amount string: max 2 decimals, max 7 integer digits, no leading zeros. */
export function pressKey(value: string, key: string): string {
  if (key === '⌫') return value.slice(0, -1);
  if (key === '.') return value.includes('.') ? value : (value || '0') + '.';
  const [int, dec] = value.split('.');
  if (dec !== undefined) return dec.length >= 2 ? value : value + key;
  if (int.length >= 7) return value;
  return int === '0' ? key : value + key;
}

/** Big numeric keypad. Also listens to a physical keyboard while mounted. */
export function Keypad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key === 'Backspace' ? '⌫' : e.key === ',' ? '.' : e.key;
      if (KEYS.includes(k)) { e.preventDefault(); onChange(pressKey(value, k)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [value, onChange]);

  return (
    <div className="keypad">
      {KEYS.map((k) => (
        <button key={k} type="button" className="raised pressable key" aria-label={k === '⌫' ? 'Delete' : k} onClick={() => onChange(pressKey(value, k))}>
          {k === '⌫' ? <IconBackspace size={22} stroke={1.75} /> : k}
        </button>
      ))}
    </div>
  );
}
