import { useEffect, useRef, useState } from 'react';
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
  const nextId = useRef(1);

  const n = Number(amount) || 0;
  const result = convert(n, from, to, index);
  const shown = amount === '' ? '0' : amount;

  // Auto-save: once you stop typing on a real amount, the conversion settles
  // into history on its own — no button, no thinking about it.
  useEffect(() => {
    if (result == null || n === 0) return;
    const id = window.setTimeout(() => {
      setHistory((h) => {
        const top = h[0];
        if (top && top.amount === n && top.from === from && top.to === to)
          return h;
        return [
          { id: nextId.current++, amount: n, from, to, result },
          ...h,
        ].slice(0, 30);
      });
    }, 800);
    return () => window.clearTimeout(id);
  }, [n, from, to, result]);

  // ── numpad ──
  const tap = (key: string) => {
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

  const restore = (e: Entry) => {
    setAmount(String(e.amount));
    setFrom(e.from);
    setTo(e.to);
    setShowHistory(false);
  };

  return (
    <div className="curtain-reveal flex flex-col gap-6">
      {/* Currency selector + history shortcut. */}
      <div className="relative flex items-center justify-center gap-3">
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
        <div className="curtain-reveal -mt-2 flex justify-center gap-2">
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

      {/* The reading: amount → gold total. No box, no bar — just the figures. */}
      <div className="py-2 text-center">
        <p className="font-display text-4xl tabular-nums tracking-tight text-muted">
          {shown}
        </p>
        <p className="gilt-text gilt-figures gold-shimmer mt-2 font-display text-[3.25rem] font-semibold tracking-tight">
          {result != null ? formatMoney(result, to) : '—'}
        </p>
      </div>

      {/* Minimal numpad — bare figures, generous targets. */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-1">
        {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'].map(
          (k) => (
            <button
              key={k}
              type="button"
              onClick={() => tap(k)}
              className="lift-press flex h-14 items-center justify-center rounded-lg font-display text-[1.75rem] tabular-nums text-fg transition-colors active:bg-fg/10"
            >
              {k === '⌫' ? <Delete className="h-6 w-6 text-muted" /> : k}
            </button>
          )
        )}
      </div>

      <button
        type="button"
        onClick={() => setAmount('')}
        className="lift-press mx-auto font-sans text-xs font-semibold uppercase tracking-[0.2em] text-muted active:text-accent"
      >
        Clear
      </button>

      {/* Session history — no database, gone on reload. */}
      <Sheet
        open={showHistory}
        onClose={() => setShowHistory(false)}
        title="This session"
        size="half"
      >
        {history.length === 0 ? (
          <Empty title="Nothing yet" hint="Conversions land here as you go." />
        ) : (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setHistory([])}
                className="lift-press flex items-center gap-1 font-sans text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-muted active:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear all
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {history.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => restore(e)}
                  className="lift-press flex items-center justify-between gap-3 rounded-lg bg-surface px-4 py-3 text-left active:bg-fg/5"
                >
                  <span className="font-sans text-sm tabular-nums text-muted">
                    {meta(e.from).flag} {formatMoney(e.amount, e.from)}
                  </span>
                  <span className="font-display text-base font-semibold tabular-nums text-fg">
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
