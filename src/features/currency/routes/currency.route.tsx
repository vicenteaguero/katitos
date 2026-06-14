import { useRef, useState } from 'react';
import { ArrowLeftRight, Delete, History, Trash2 } from 'lucide-react';
import { convert, formatMoney, indexRates } from '@kernel/lib';
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
  const nextId = useRef(1);

  const n = Number(amount) || 0;
  const result = convert(n, from, to, index);
  const shown = amount === '' ? '0' : amount;

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

  const save = () => {
    if (result == null || n === 0) return;
    setHistory((h) => [
      { id: nextId.current++, amount: n, from, to, result },
      ...h,
    ]);
  };

  const restore = (e: Entry) => {
    setAmount(String(e.amount));
    setFrom(e.from);
    setTo(e.to);
    setEditing(null);
  };

  return (
    <div className="curtain-reveal space-y-7 pb-4">
      {/* ── The reading: from amount → converted total ── */}
      <section className="space-y-4">
        {/* Currency selector: two chips with a swap between. */}
        <div className="flex items-center justify-center gap-3">
          <CurrencyChip
            code={from}
            open={editing === 'from'}
            onClick={() => setEditing(editing === 'from' ? null : 'from')}
          />
          <button
            type="button"
            onClick={swap}
            aria-label="Swap currencies"
            className="lift-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-accent active:scale-90"
          >
            <ArrowLeftRight className="h-5 w-5" />
          </button>
          <CurrencyChip
            code={to}
            open={editing === 'to'}
            onClick={() => setEditing(editing === 'to' ? null : 'to')}
          />
        </div>

        {/* Inline 4-flag picker — one tap, no menus. */}
        {editing && (
          <div className="curtain-reveal flex justify-center gap-2">
            {CURRENCIES.map((c) => {
              const active = (editing === 'from' ? from : to) === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => pick(c.code)}
                  className={`lift-press flex flex-col items-center gap-0.5 rounded-lg px-4 py-2 transition-colors ${
                    active ? 'bg-accent text-accent-fg' : 'bg-surface text-fg'
                  }`}
                >
                  <span className="text-xl leading-none">{c.flag}</span>
                  <span className="font-sans text-[0.625rem] font-semibold uppercase tracking-[0.12em]">
                    {c.code}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Big stacked figures. */}
        <div className="rounded-lg bg-surface-2 px-6 py-7 text-center">
          <p className="font-display text-3xl tabular-nums tracking-tight text-muted">
            {shown}{' '}
            <span className="font-sans text-base font-semibold text-muted/70">
              {from}
            </span>
          </p>
          <p className="my-3 font-sans text-xs uppercase tracking-[0.3em] text-accent/60">
            {meta(from).flag} → {meta(to).flag}
          </p>
          <p className="gold-shimmer font-display text-5xl font-semibold tabular-nums tracking-tight text-accent">
            {result != null ? formatMoney(result, to) : '—'}
          </p>
        </div>
      </section>

      {/* ── Numpad ── */}
      <section className="space-y-3">
        <div className="grid grid-cols-3 gap-2.5">
          {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'].map(
            (k) => (
              <button
                key={k}
                type="button"
                onClick={() => tap(k)}
                className="lift-press flex h-16 items-center justify-center rounded-lg bg-surface font-display text-2xl tabular-nums text-fg transition-colors active:bg-fg/10"
              >
                {k === '⌫' ? <Delete className="h-6 w-6 text-muted" /> : k}
              </button>
            )
          )}
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => setAmount('')}
            className="lift-press flex-1 rounded-lg bg-surface py-3 font-sans text-sm font-semibold uppercase tracking-[0.14em] text-muted active:bg-fg/10"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={save}
            disabled={result == null || n === 0}
            className="lift-press flex-[2] rounded-lg bg-accent py-3 font-sans text-sm font-semibold uppercase tracking-[0.14em] text-accent-fg shadow-loge transition active:scale-[0.98] disabled:opacity-40"
          >
            Save to history
          </button>
        </div>
      </section>

      {/* ── Session history (no database — gone on reload) ── */}
      {history.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="flex items-center gap-1.5 font-sans text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-muted">
              <History className="h-3.5 w-3.5" /> This session
            </p>
            <button
              type="button"
              onClick={() => setHistory([])}
              aria-label="Clear history"
              className="lift-press flex items-center gap-1 font-sans text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-muted active:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
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
                  {formatMoney(e.amount, e.from)} {meta(e.from).flag}
                </span>
                <span className="font-display text-base font-semibold tabular-nums text-fg">
                  {formatMoney(e.result, e.to)} {meta(e.to).flag}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** A tappable from/to chip — flag + code, glows when its picker is open. */
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
      className={`lift-press flex min-w-[7rem] items-center justify-center gap-2 rounded-lg px-5 py-3 transition-colors ${
        open ? 'bg-accent text-accent-fg' : 'bg-surface text-fg'
      }`}
    >
      <span className="text-2xl leading-none">{c.flag}</span>
      <span className="text-left">
        <span className="block font-display text-lg font-semibold leading-none">
          {c.code}
        </span>
        <span className="block font-sans text-[0.625rem] uppercase tracking-[0.12em] opacity-70">
          {c.name}
        </span>
      </span>
    </button>
  );
}
