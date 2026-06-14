import { useRef, useState } from 'react';
import { ArrowLeftRight, Delete, History, Trash2 } from 'lucide-react';
import { convert, formatMoney, indexRates } from '@kernel/lib';
import { Empty, Sheet } from '@kernel/ui';
import { useRates } from '../api/currency.queries';

// ── The bench ──────────────────────────────────────────────────────────────
// RUB and CLP lead (our everyday pair), then GEL for Georgia, USD as the
// anchor. Order here is the order the picker shows.
const CURRENCIES = [
  { code: 'RUB', flag: '🇷🇺', name: 'Ruble' },
  { code: 'CLP', flag: '🇨🇱', name: 'Peso' },
  { code: 'GEL', flag: '🇬🇪', name: 'Lari' },
  { code: 'USD', flag: '🇺🇸', name: 'Dollar' },
] as const;

type Code = (typeof CURRENCIES)[number]['code'];
const meta = (code: string) =>
  CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];

// Shrink the figure as it grows so it never wraps or clips — tool, not poster.
const fit = (s: string) =>
  s.length > 14
    ? 'text-3xl'
    : s.length > 11
      ? 'text-4xl'
      : s.length > 8
        ? 'text-5xl'
        : 'text-6xl';

interface Entry {
  id: number;
  amount: number;
  from: Code;
  to: Code;
  result: number;
}

export function CurrencyRoute() {
  const { data: rates } = useRates();
  const index = indexRates(rates ?? []);

  const [amount, setAmount] = useState('');
  const [from, setFrom] = useState<Code>('RUB');
  const [to, setTo] = useState<Code>('CLP');
  const [editing, setEditing] = useState<'from' | 'to' | null>(null);
  const [history, setHistory] = useState<Entry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [saved, setSaved] = useState(false);
  const nextId = useRef(1);

  const n = Number(amount) || 0;
  const result = convert(n, from, to, index);
  const shown = amount === '' ? '0' : amount;
  const resultText = result != null ? formatMoney(result, to) : '—';

  // ── numpad ──
  const tap = (key: string) => {
    setSaved(false);
    setAmount((a) => {
      if (key === '⌫') return a.slice(0, -1);
      if (key === '.') return a.includes('.') ? a : a === '' ? '0.' : a + '.';
      if (a.replace('.', '').length >= 12) return a; // sane cap
      if (a === '0') return key; // no leading zeros
      return a + key;
    });
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const pick = (code: Code) => {
    if (editing === 'from') {
      if (code === to) setTo(from); // keep the pair distinct
      setFrom(code);
    } else if (editing === 'to') {
      if (code === from) setFrom(to);
      setTo(code);
    }
    setEditing(null);
  };

  const save = () => {
    if (result == null || n === 0) return;
    setHistory((h) =>
      [{ id: nextId.current++, amount: n, from, to, result }, ...h].slice(0, 30)
    );
    setSaved(true);
  };

  const restore = (e: Entry) => {
    setAmount(String(e.amount));
    setFrom(e.from);
    setTo(e.to);
    setSaved(false);
    setShowHistory(false);
  };

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Exchange bar — from 🇷🇺 ⇄ 🇨🇱 to, history on the right. */}
      <div className="relative flex shrink-0 items-center justify-center gap-1">
        <CurrencyChip
          code={from}
          open={editing === 'from'}
          onClick={() => setEditing(editing === 'from' ? null : 'from')}
        />
        <button
          type="button"
          onClick={swap}
          aria-label="Swap currencies"
          className="lift-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-accent active:scale-90"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <CurrencyChip
          code={to}
          open={editing === 'to'}
          onClick={() => setEditing(editing === 'to' ? null : 'to')}
        />
        <button
          type="button"
          onClick={() => setShowHistory(true)}
          aria-label="History"
          className="lift-press absolute right-0 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted active:text-accent"
        >
          <History className="h-4 w-4" />
        </button>
      </div>

      {/* Inline 4-flag picker — one tap, no menus. */}
      {editing && (
        <div className="curtain-reveal flex shrink-0 justify-center gap-2">
          {CURRENCIES.map((c) => {
            const active = (editing === 'from' ? from : to) === c.code;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => pick(c.code)}
                className={`lift-press flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
                  active ? 'bg-accent/15 text-accent' : 'text-fg'
                }`}
              >
                <span className="text-lg leading-none">{c.flag}</span>
                <span className="font-sans text-[0.7rem] font-semibold uppercase tracking-[0.1em]">
                  {c.code}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* The reading — what I have, what I get. Plain figures, big, fluid. */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
        <p className="font-display text-2xl tabular-nums text-muted">
          {meta(from).flag} {shown}{' '}
          <span className="text-base text-muted/70">{from}</span>
        </p>
        <p
          className={`font-display ${fit(resultText)} font-semibold leading-none tabular-nums text-fg`}
        >
          {resultText} <span className="text-2xl text-accent">{to}</span>
        </p>
      </div>

      {/* Numpad — bare figures, generous targets. */}
      <div className="grid shrink-0 grid-cols-3 gap-2">
        {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'].map(
          (k) => (
            <button
              key={k}
              type="button"
              onClick={() => tap(k)}
              className="lift-press flex h-14 items-center justify-center rounded-lg font-display text-3xl tabular-nums text-fg transition-colors active:bg-fg/10"
            >
              {k === '⌫' ? <Delete className="h-6 w-6 text-muted" /> : k}
            </button>
          )
        )}
      </div>

      {/* One action — save. */}
      <button
        type="button"
        onClick={save}
        disabled={result == null || n === 0}
        className="lift-press shrink-0 rounded-lg bg-accent py-3.5 font-sans text-sm font-semibold uppercase tracking-[0.16em] text-accent-fg transition active:scale-[0.98] disabled:opacity-40"
      >
        {saved ? 'Saved ✓' : 'Save'}
      </button>

      {/* Session history — no database, gone on reload. */}
      <Sheet
        open={showHistory}
        onClose={() => setShowHistory(false)}
        title="History"
        size="full"
      >
        {history.length === 0 ? (
          <Empty title="Nothing saved yet" hint="Hit Save and it lands here." />
        ) : (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setHistory([])}
              className="lift-press mb-1 flex items-center gap-1 self-end font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted active:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear all
            </button>
            {history.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => restore(e)}
                className="lift-press flex items-center justify-between gap-2 rounded-lg bg-surface px-4 py-3 text-left font-sans text-base tabular-nums active:bg-fg/5"
              >
                <span className="text-muted">
                  {meta(e.from).flag} {formatMoney(e.amount, e.from)}
                </span>
                <span className="text-muted/50">→</span>
                <span className="font-semibold text-fg">
                  {meta(e.to).flag} {formatMoney(e.result, e.to)}
                </span>
              </button>
            ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}

/** A tappable from/to chip — flag + code, nothing more. */
function CurrencyChip({
  code,
  open,
  onClick,
}: {
  code: Code;
  open: boolean;
  onClick: () => void;
}) {
  const c = meta(code);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`lift-press flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors ${
        open ? 'bg-accent/15' : ''
      }`}
    >
      <span className="text-2xl leading-none">{c.flag}</span>
      <span className="font-display text-lg font-semibold leading-none text-fg">
        {c.code}
      </span>
    </button>
  );
}
