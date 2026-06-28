import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, Delete, History, Plus, Trash2, X } from 'lucide-react';
import { convert, formatMoney, indexRates } from '@kernel/lib';
import { usePartner } from '@kernel/auth';
import { Empty, Sheet } from '@kernel/ui';
import { useRates } from '../api/currency.queries';
import { CURRENCIES, isCode, meta, type Code } from '../currencies';
import '../currency.css';

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

// Last pair survives reloads; the preferred currency only seeds the very first
// visit (afterwards their own last choice wins).
const PAIR_KEY = 'currency:pair';
const DEFAULT_FROM: Code = 'RUB';
const DEFAULT_TO: Code = 'CLP';

function loadPair(): { from: Code; to: Code } | null {
  try {
    const raw = localStorage.getItem(PAIR_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (isCode(p?.from) && isCode(p?.to)) return { from: p.from, to: p.to };
  } catch {
    /* ignore malformed storage */
  }
  return null;
}

// "rates updated Xh ago" — a quiet freshness line; gently flagged when old.
function freshness(updatedAt: number | null) {
  if (!updatedAt) return null;
  const h = Math.floor((Date.now() - updatedAt) / 3_600_000);
  if (h < 1) return { text: 'rates just updated', stale: false };
  if (h < 24) return { text: `rates updated ${h}h ago`, stale: false };
  const d = Math.floor(h / 24);
  return { text: `rates ${d}d old · may be off`, stale: d >= 2 };
}

export function CurrencyRoute() {
  const { data: rates } = useRates();
  const index = useMemo(() => indexRates(rates ?? []), [rates]);
  const { self, isLoading: partnerLoading } = usePartner();

  const [initialPair] = useState(loadPair); // read storage once, at mount
  const [amount, setAmount] = useState('');
  const [from, setFrom] = useState<Code>(initialPair?.from ?? DEFAULT_FROM);
  const [to, setTo] = useState<Code>(initialPair?.to ?? DEFAULT_TO);
  const [editing, setEditing] = useState<'from' | 'to' | null>(null);
  const [history, setHistory] = useState<Entry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Running tally — the shopping basket. Lives in the current `to`; count drives
  // the bump animation. Session-only, like history.
  const [tally, setTally] = useState(0);
  const [tallyCount, setTallyCount] = useState(0);
  const nextId = useRef(1);

  const n = Number(amount) || 0;
  const result = convert(n, from, to, index);
  const shown = amount === '' ? '0' : amount;
  const resultText = result != null ? formatMoney(result, to) : '—';

  const updatedAt = useMemo(() => {
    let max = 0;
    for (const r of rates ?? []) {
      const t = Date.parse(r.fetched_at);
      if (t > max) max = t;
    }
    return max || null;
  }, [rates]);
  const fresh = freshness(updatedAt);

  // Seed the result currency from the saved preference — but only on a fresh
  // device with no remembered pair, before the user touches anything, and once.
  const seeded = useRef(false);
  const touched = useRef(false);
  useEffect(() => {
    if (seeded.current || initialPair || touched.current || partnerLoading)
      return;
    seeded.current = true; // one shot, whatever the outcome
    const pref = self?.preferred_currency;
    if (isCode(pref) && pref !== to) {
      setTo(pref);
      if (from === pref) setFrom(to); // keep the pair distinct
    }
  }, [partnerLoading, self, initialPair, from, to]);

  // Persist the pair whenever it changes.
  useEffect(() => {
    try {
      localStorage.setItem(PAIR_KEY, JSON.stringify({ from, to }));
    } catch {
      /* storage may be unavailable (private mode) — non-fatal */
    }
  }, [from, to]);

  // Re-base the running total into the new currency when `to` changes, so the
  // basket stays meaningful even if they switch what they're counting toward.
  const prevTo = useRef(to);
  useEffect(() => {
    if (prevTo.current === to) return;
    const old = prevTo.current;
    prevTo.current = to;
    setTally((t) => (t > 0 ? (convert(t, old, to, index) ?? t) : t));
  }, [to, index]);

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
    touched.current = true;
    setFrom(to);
    setTo(from);
  };

  const pick = (code: Code) => {
    touched.current = true;
    if (editing === 'from') {
      if (code === to) setTo(from); // keep the pair distinct
      setFrom(code);
    } else if (editing === 'to') {
      if (code === from) setFrom(to);
      setTo(code);
    }
    setEditing(null);
  };

  // Add the current reading to the basket, log it, and clear for the next price.
  const add = () => {
    if (result == null || n === 0) return;
    setTally((t) => t + result);
    setTallyCount((c) => c + 1);
    setHistory((h) =>
      [{ id: nextId.current++, amount: n, from, to, result }, ...h].slice(0, 30)
    );
    setAmount('');
  };

  const clearTally = () => {
    setTally(0);
    setTallyCount(0);
  };

  const restore = (e: Entry) => {
    touched.current = true;
    setAmount(String(e.amount));
    setFrom(e.from);
    setTo(e.to);
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

      {/* Inline flag picker — one tap, no menus. Dense vertical chips so all
          five sit in a single tap-friendly row. */}
      {editing && (
        <div className="curtain-reveal flex shrink-0 flex-wrap justify-center gap-1.5">
          {CURRENCIES.map((c) => {
            const active = (editing === 'from' ? from : to) === c.code;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => pick(c.code)}
                className={`lift-press flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5 transition-colors ${
                  active ? 'bg-accent/15 text-accent' : 'text-fg'
                }`}
              >
                <span className="text-xl leading-none">{c.flag}</span>
                <span className="font-sans text-[0.6rem] font-semibold uppercase tracking-[0.08em]">
                  {c.code}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* The reading — what I have, what I get, how fresh, and the basket. */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3">
        <p className="font-display text-2xl tabular-nums text-muted">
          {meta(from).flag} {shown}{' '}
          <span className="text-base text-muted/70">{from}</span>
        </p>
        <p
          className={`font-display ${fit(resultText)} font-semibold leading-none tabular-nums text-fg`}
        >
          {resultText} <span className="text-2xl text-accent">{to}</span>
        </p>
        {fresh && (
          <p
            className={`font-sans text-[0.65rem] tracking-[0.04em] ${
              fresh.stale ? 'text-gold/70' : 'text-muted/60'
            }`}
          >
            {fresh.text}
          </p>
        )}
        {tallyCount > 0 && (
          <div className="curtain-reveal flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5">
            <span className="font-sans text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-accent/70">
              Σ {tallyCount}
            </span>
            <span
              key={tallyCount}
              className="tally-bump font-display text-base font-semibold tabular-nums text-accent"
            >
              {formatMoney(tally, to)}
            </span>
            <button
              type="button"
              onClick={clearTally}
              aria-label="Clear total"
              className="lift-press -mr-1 flex h-5 w-5 items-center justify-center rounded-full text-accent/60 active:text-danger"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
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

      {/* One action — add to the running total (and the log). */}
      <button
        type="button"
        onClick={add}
        disabled={result == null || n === 0}
        className="lift-press flex shrink-0 items-center justify-center gap-2 rounded-lg bg-accent py-3.5 font-sans text-sm font-semibold uppercase tracking-[0.16em] text-accent-fg transition active:scale-[0.98] disabled:opacity-40"
      >
        <Plus className="h-4 w-4" /> Add
      </button>

      {/* Session log — no database, gone on reload. */}
      <Sheet
        open={showHistory}
        onClose={() => setShowHistory(false)}
        title="History"
        size="full"
      >
        {history.length === 0 ? (
          <Empty title="Nothing added yet" hint="Hit Add and it lands here." />
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
