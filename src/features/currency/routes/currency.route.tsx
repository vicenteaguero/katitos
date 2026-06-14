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
    <div className="flex h-full flex-col">
      {/* Currency selector + history shortcut. */}
      <div className="relative flex shrink-0 items-center justify-center gap-3">
        <CurrencyChip
          code={from}
          open={editing === 'from'}
          onClick={() => setEditing(editing === 'from' ? null : 'from')}
        />
        <button
          type="button"
          onClick={swap}
          aria-label="Swap currencies"
          className="lift-press flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-accent active:scale-90"
        >
          <ArrowLeftRight className="h-5 w-5" />
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
          className="lift-press absolute right-0 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted active:text-accent"
        >
          <History className="h-5 w-5" />
        </button>
      </div>

      {/* Inline 4-flag picker — one tap, no menus. */}
      {editing && (
        <div className="curtain-reveal mt-4 flex shrink-0 justify-center gap-2">
          {CURRENCIES.map((c) => {
            const active = (editing === 'from' ? from : to) === c.code;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => pick(c.code)}
                className={`lift-press flex flex-col items-center gap-0.5 rounded-lg px-4 py-2 transition-colors ${
                  active ? 'bg-accent/15 text-accent' : 'text-fg'
                }`}
              >
                <span className="text-2xl leading-none">{c.flag}</span>
                <span className="font-sans text-[0.625rem] font-semibold uppercase tracking-[0.12em]">
                  {c.code}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* The reading — clearly MINE (top, plain) vs WHAT I WANT (the gold,
          haloed in soft wine light so the answer reads at a glance). */}
      <div className="flex flex-1 flex-col items-center justify-center gap-9 py-4">
        <div className="text-center">
          <p className="mb-2 font-sans text-[0.625rem] font-semibold uppercase tracking-[0.28em] text-muted">
            I have · {meta(from).flag} {from}
          </p>
          <p className="font-display text-5xl tabular-nums tracking-tight text-muted">
            <span className="text-3xl text-muted/70">{from} </span>
            {shown}
          </p>
        </div>

        <div className="relative w-full text-center">
          {/* The soft red/pink light zone — the answer's halo. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[170%] w-[116%] -translate-x-1/2 -translate-y-1/2"
            style={{
              background:
                'radial-gradient(50% 50% at 50% 50%, rgba(196,72,98,0.22), rgba(110,20,35,0.08) 55%, transparent 76%)',
            }}
          />
          <div className="relative">
            <p className="mb-3 font-sans text-[0.625rem] font-semibold uppercase tracking-[0.28em] text-accent/80">
              I want · {meta(to).flag} {to}
            </p>
            <p className="gilt-text gilt-figures gold-shimmer font-display text-[3.75rem] font-semibold leading-none tracking-tight">
              {result != null ? formatMoney(result, to) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Minimal numpad — bare figures, generous targets. */}
      <div className="grid shrink-0 grid-cols-3 gap-x-3 gap-y-2">
        {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'].map(
          (k) => (
            <button
              key={k}
              type="button"
              onClick={() => tap(k)}
              className="lift-press flex h-[4.5rem] items-center justify-center rounded-lg font-display text-3xl tabular-nums text-fg transition-colors active:bg-fg/10"
            >
              {k === '⌫' ? <Delete className="h-7 w-7 text-muted" /> : k}
            </button>
          )
        )}
      </div>

      {/* Actions — clear + save (manual, deliberate). */}
      <div className="mt-4 flex shrink-0 items-stretch gap-3">
        <button
          type="button"
          onClick={() => {
            setAmount('');
            setSaved(false);
          }}
          className="lift-press flex-1 rounded-lg bg-surface py-4 font-sans text-sm font-semibold uppercase tracking-[0.16em] text-muted active:bg-fg/10"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={save}
          disabled={result == null || n === 0}
          className="lift-press flex-[2] rounded-lg bg-accent py-4 font-sans text-sm font-semibold uppercase tracking-[0.16em] text-accent-fg shadow-loge transition active:scale-[0.98] disabled:opacity-40"
        >
          {saved ? 'Saved ✓' : 'Save to history'}
        </button>
      </div>

      {/* Session history — no database, gone on reload. */}
      <Sheet
        open={showHistory}
        onClose={() => setShowHistory(false)}
        title="This session"
        size="full"
      >
        {history.length === 0 ? (
          <Empty title="Nothing saved yet" hint="Hit Save and it lands here." />
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setHistory([])}
                className="lift-press flex items-center gap-1 font-sans text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-muted active:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear all
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {history.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => restore(e)}
                  className="lift-press flex items-center justify-between gap-3 rounded-lg bg-surface px-5 py-4 text-left active:bg-fg/5"
                >
                  <span className="font-sans text-base tabular-nums text-muted">
                    {meta(e.from).flag} {formatMoney(e.amount, e.from)}
                  </span>
                  <span className="font-display text-lg font-semibold tabular-nums text-fg">
                    {formatMoney(e.result, e.to)} {meta(e.to).flag}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

/** A tappable from/to chip — the big beautiful flag + code. */
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
      className={`lift-press flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors ${
        open ? 'bg-accent/15' : ''
      }`}
    >
      <span className="text-[1.75rem] leading-none">{c.flag}</span>
      <span className="text-left">
        <span className="block font-display text-lg font-semibold leading-none text-fg">
          {c.code}
        </span>
        <span className="block font-sans text-[0.625rem] uppercase tracking-[0.14em] text-muted">
          {c.name}
        </span>
      </span>
    </button>
  );
}
