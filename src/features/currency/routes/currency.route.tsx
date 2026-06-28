import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Check,
  Delete,
  History,
  Pencil,
  Trash2,
} from 'lucide-react';
import { convert, formatMoney, indexRates } from '@kernel/lib';
import { usePartner } from '@kernel/auth';
import { Empty, Sheet, useTopBarAction } from '@kernel/ui';
import { useRates } from '../api/currency.queries';
import { CURRENCIES, isCode, meta, type Code } from '../currencies';

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
  id: string;
  amount: number;
  from: Code;
  to: Code;
  result: number;
  // A named entry is "kept" — it persists across reloads (in localStorage)
  // until deleted. Un-named entries are session-only ("saved in the moment").
  name?: string;
}

// Last pair survives reloads; the preferred currency only seeds the very first
// visit (afterwards their own last choice wins).
const PAIR_KEY = 'currency:pair';
const SAVED_KEY = 'katitos:currency:saved';
const DEFAULT_FROM: Code = 'RUB';
const DEFAULT_TO: Code = 'CLP';

function loadSaved(): Entry[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr))
      return arr.filter(
        (e) => isCode(e?.from) && isCode(e?.to) && typeof e?.result === 'number'
      );
  } catch {
    /* ignore malformed storage */
  }
  return [];
}

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
  const [history, setHistory] = useState<Entry[]>([]); // session-only
  const [saved, setSaved] = useState<Entry[]>(loadSaved); // named → kept
  const [showHistory, setShowHistory] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
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

  // Freshness lives quietly in the top bar (right), not under the figures.
  useTopBarAction(
    fresh ? (
      <span
        className={`font-sans text-[0.7rem] tracking-[0.02em] ${
          fresh.stale ? 'text-gold/80' : 'text-muted/70'
        }`}
      >
        {fresh.text}
      </span>
    ) : null,
    [fresh?.text, fresh?.stale]
  );

  // Persist the kept (named) entries whenever they change.
  useEffect(() => {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
    } catch {
      /* storage may be unavailable (private mode) — non-fatal */
    }
  }, [saved]);

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

  // Auto-log conversions "in the moment": once typing settles, record the
  // reading to the session history (deduped against the most recent). No Add
  // button — you just convert, and it's there if you want to keep it.
  useEffect(() => {
    if (n === 0 || result == null) return;
    const t = window.setTimeout(() => {
      setHistory((h) => {
        const top = h[0];
        if (top && top.amount === n && top.from === from && top.to === to)
          return h;
        return [
          {
            id: `${Date.now()}-${nextId.current++}`,
            amount: n,
            from,
            to,
            result,
          },
          ...h,
        ].slice(0, 20);
      });
    }, 1100);
    return () => window.clearTimeout(t);
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

  const startRename = (e: Entry) => {
    setRenamingId(e.id);
    setRenameText(e.name ?? '');
  };

  // Naming an entry keeps it forever (moves it into the persisted `saved` list);
  // an empty name leaves it where it is (still session-only).
  const commitRename = (e: Entry) => {
    const name = renameText.trim();
    setRenamingId(null);
    if (!name) return;
    setSaved((s) => [{ ...e, name }, ...s.filter((x) => x.id !== e.id)]);
    setHistory((h) => h.filter((x) => x.id !== e.id));
  };

  const removeEntry = (id: string) => {
    setSaved((s) => s.filter((x) => x.id !== id));
    setHistory((h) => h.filter((x) => x.id !== id));
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

      {/* The reading — what I have, what I get. Each figure sits in its own
          quiet tinted chip; no dead air between them. */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5">
        <p className="rounded-xl bg-surface/50 px-4 py-1.5 font-display text-2xl tabular-nums text-muted">
          {meta(from).flag} {shown}{' '}
          <span className="text-base text-muted/70">{from}</span>
        </p>
        <p
          className={`rounded-2xl bg-surface/70 px-5 py-2 font-display ${fit(resultText)} font-semibold leading-none tabular-nums text-fg`}
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

      {/* Saved + session log. */}
      <Sheet
        open={showHistory}
        onClose={() => setShowHistory(false)}
        title="History"
        size="full"
      >
        {saved.length === 0 && history.length === 0 ? (
          <Empty
            title="Nothing yet"
            hint="Convert something — it lands here. Rename one to keep it forever."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {saved.length > 0 && (
              <section className="flex flex-col gap-2">
                <p className="eyebrow">Kept</p>
                {saved.map((e) => (
                  <HistoryRow
                    key={e.id}
                    entry={e}
                    renaming={renamingId === e.id}
                    renameText={renameText}
                    onRenameText={setRenameText}
                    onStartRename={() => startRename(e)}
                    onCommitRename={() => commitRename(e)}
                    onRestore={() => restore(e)}
                    onDelete={() => removeEntry(e.id)}
                  />
                ))}
              </section>
            )}
            {history.length > 0 && (
              <section className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="eyebrow">Recent</p>
                  <button
                    type="button"
                    onClick={() => setHistory([])}
                    className="lift-press flex items-center gap-1 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted active:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Clear
                  </button>
                </div>
                {history.map((e) => (
                  <HistoryRow
                    key={e.id}
                    entry={e}
                    renaming={renamingId === e.id}
                    renameText={renameText}
                    onRenameText={setRenameText}
                    onStartRename={() => startRename(e)}
                    onCommitRename={() => commitRename(e)}
                    onRestore={() => restore(e)}
                    onDelete={() => removeEntry(e.id)}
                  />
                ))}
              </section>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}

/** One history line — tap to restore, pencil to name-&-keep, trash to delete. */
function HistoryRow({
  entry,
  renaming,
  renameText,
  onRenameText,
  onStartRename,
  onCommitRename,
  onRestore,
  onDelete,
}: {
  entry: Entry;
  renaming: boolean;
  renameText: string;
  onRenameText: (v: string) => void;
  onStartRename: () => void;
  onCommitRename: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2.5">
      {renaming ? (
        <>
          <input
            autoFocus
            value={renameText}
            onChange={(e) => onRenameText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onCommitRename()}
            placeholder="Name it to keep…"
            className="min-w-0 flex-1 rounded-md border border-[rgba(251,245,240,0.18)] bg-[rgba(0,0,0,0.28)] px-3 py-1.5 font-sans text-sm text-fg placeholder:text-muted focus:outline-none"
          />
          <button
            type="button"
            onClick={onCommitRename}
            aria-label="Keep"
            className="lift-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg"
          >
            <Check className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onRestore}
            className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
          >
            {entry.name && (
              <span className="max-w-full truncate font-sans text-sm font-semibold text-fg">
                {entry.name}
              </span>
            )}
            <span className="flex items-center gap-2 font-sans text-sm tabular-nums text-muted">
              <span>
                {meta(entry.from).flag} {formatMoney(entry.amount, entry.from)}
              </span>
              <span className="text-muted/50">→</span>
              <span
                className={entry.name ? 'text-muted' : 'font-semibold text-fg'}
              >
                {meta(entry.to).flag} {formatMoney(entry.result, entry.to)}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={onStartRename}
            aria-label="Rename"
            className="lift-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted active:text-accent"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete"
            className="lift-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted active:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
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
