import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Check,
  Delete,
  History,
  Pencil,
  Trash2,
} from 'lucide-react';
import { convert, formatAmount, indexRates } from '@kernel/lib';
import { usePartner } from '@kernel/auth';
import { Button, Empty, Input, Sheet, useTopBarAction } from '@kernel/ui';
import { useRates } from '../api/currency.queries';
import { ANCHORS, CURRENCIES, isCode, meta, type Code } from '../currencies';

// Shrink the figure as it grows so it never wraps or clips - tool, not poster.
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
  // A named entry is "kept" - it persists across reloads (in localStorage)
  // until deleted. Un-named entries are session-only ("saved in the moment").
  name?: string;
}

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

// "rates updated Xh ago" - a quiet freshness line; gently flagged when old.
function freshness(updatedAt: number | null) {
  if (!updatedAt) return null;
  const h = Math.floor((Date.now() - updatedAt) / 3_600_000);
  if (h < 1) return { text: 'rates just updated', stale: false };
  if (h < 24) return { text: `rates updated ${h}h ago`, stale: false };
  const d = Math.floor(h / 24);
  return { text: `rates ${d}d old - may be off`, stale: d >= 2 };
}

export function CurrencyRoute() {
  const { data: rates, refetch: refetchRates, isRefetching } = useRates();
  const index = useMemo(() => indexRates(rates ?? []), [rates]);
  const { self, isLoading: partnerLoading } = usePartner();

  const [initialPair] = useState(loadPair);
  const [amount, setAmount] = useState('');
  const [from, setFrom] = useState<Code>(initialPair?.from ?? DEFAULT_FROM);
  const [to, setTo] = useState<Code>(initialPair?.to ?? DEFAULT_TO);
  const [editing, setEditing] = useState<'from' | 'to' | null>(null);
  const [history, setHistory] = useState<Entry[]>([]); // session-only
  const [saved, setSaved] = useState<Entry[]>(loadSaved); // named → kept
  const [showHistory, setShowHistory] = useState(false);
  const [historyEdit, setHistoryEdit] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  // After Save we ask for a name; empty → it just stays as a numbers-only entry.
  const [pendingEntry, setPendingEntry] = useState<Entry | null>(null);
  const [pendingName, setPendingName] = useState('');
  const nextId = useRef(1);

  const n = Number(amount) || 0;
  const result = convert(n, from, to, index);
  const shown = amount === '' ? '0' : amount;
  // The figure ONLY. The code is rendered once, after it - `formatMoney` used
  // to prefix the code and the markup appended it again ("CLP 123.4 CLP").
  const resultText = result != null ? formatAmount(result, to) : '-';

  // Whichever of our two everyday currencies isn't already on screen, shown
  // small underneath - so the number we need to tell each other is always
  // there without converting twice.
  const crossRates = ANCHORS.filter((c) => c !== from && c !== to).map(
    (code) => ({ code, value: convert(n, from, code, index) })
  );

  // The OLDEST pair, not the newest: one freshly-written row would otherwise
  // make a table full of stale rates look current - and the rate you're
  // reading right now might be one of the stale ones.
  const updatedAt = useMemo(() => {
    let min = Infinity;
    for (const r of rates ?? []) {
      const t = Date.parse(r.fetched_at);
      if (t < min) min = t;
    }
    return Number.isFinite(min) ? min : null;
  }, [rates]);
  const fresh = freshness(updatedAt);

  // Freshness lives quietly in the top bar (right), not under the figures.
  // Tap it to force a refresh - otherwise rates only heal on an 8h-stale open.
  useTopBarAction(
    fresh ? (
      <button
        type="button"
        onClick={() => void refetchRates()}
        className={`font-sans text-[0.7rem] tracking-[0.02em] ${
          fresh.stale ? 'text-gold/80' : 'text-muted/70'
        }`}
      >
        {isRefetching ? 'refreshing…' : fresh.text}
      </button>
    ) : null,
    [fresh?.text, fresh?.stale, isRefetching]
  );

  // Persist the kept (named) entries whenever they change.
  useEffect(() => {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
    } catch {
      /* storage may be unavailable (private mode) - non-fatal */
    }
  }, [saved]);

  // Seed the result currency from the saved preference - once, fresh device.
  const seeded = useRef(false);
  const touched = useRef(false);
  useEffect(() => {
    if (seeded.current || initialPair || touched.current || partnerLoading)
      return;
    seeded.current = true;
    const pref = self?.preferred_currency;
    const base = self?.currency_from;
    if (isCode(pref) && pref !== to) {
      setTo(pref);
      if (from === pref) setFrom(to);
    }
    // The "from" half of the saved default pair (preferred_currency is "to").
    if (isCode(base) && base !== pref) setFrom(base);
  }, [partnerLoading, self, initialPair, from, to]);

  // Persist the pair whenever it changes.
  useEffect(() => {
    try {
      localStorage.setItem(PAIR_KEY, JSON.stringify({ from, to }));
    } catch {
      /* storage may be unavailable (private mode) - non-fatal */
    }
  }, [from, to]);

  // ── numpad ──
  const tap = (key: string) => {
    setAmount((a) => {
      if (key === '⌫') return a.slice(0, -1);
      if (key === '.') return a.includes('.') ? a : a === '' ? '0.' : a + '.';
      if (a.replace('.', '').length >= 12) return a;
      if (a === '0') return key;
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
      if (code === to) setTo(from);
      setFrom(code);
    } else if (editing === 'to') {
      if (code === from) setFrom(to);
      setTo(code);
    }
    setEditing(null);
  };

  // Save the current reading; then ask for a name (optional). Clears for the next.
  const save = () => {
    if (result == null || n === 0) return;
    const e: Entry = {
      id: `${Date.now()}-${nextId.current++}`,
      amount: n,
      from,
      to,
      result,
    };
    setHistory((h) => [e, ...h].slice(0, 30));
    setAmount('');
    setPendingEntry(e);
    setPendingName('');
  };

  // Resolve the name prompt - a name keeps it forever; empty leaves it transient.
  const resolvePending = () => {
    const name = pendingName.trim();
    if (name && pendingEntry) {
      setSaved((s) => [{ ...pendingEntry, name }, ...s]);
      setHistory((h) => h.filter((x) => x.id !== pendingEntry.id));
    }
    setPendingEntry(null);
    setPendingName('');
  };

  const startRename = (e: Entry) => {
    setRenamingId(e.id);
    setRenameText(e.name ?? '');
  };

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
    closeHistory();
  };

  const closeHistory = () => {
    setShowHistory(false);
    setHistoryEdit(false);
    setRenamingId(null);
  };

  const all = [...saved, ...history];

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Exchange bar - from 🇷🇺 ⇄ 🇨🇱 to, history on the right. */}
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
          className="lift-press absolute bottom-0 right-0 top-0 my-auto flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-gold shadow-[inset_0_0_0_1px_rgba(228,195,106,0.28)] active:text-accent"
        >
          <History className="h-4 w-4" />
        </button>
      </div>

      {/* Inline flag picker - one tap, no menus. */}
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

      {/* The reading - full-width chips, centred in the space between the
          currency picker and the numpad. The cross-rates sit with them, so the
          whole group is what gets centred. */}
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-2">
        <p className="w-full rounded-xl bg-surface-2 px-4 py-2 text-center font-display text-2xl tabular-nums text-muted">
          {meta(from).flag} {shown}{' '}
          <span className="text-base text-muted/70">{from}</span>
        </p>
        {/* Flex-centred rather than relying on line-height: the display serif
            has tall ascenders, so `leading-none` parked the figures against the
            bottom of the box. `gilt-figures` supplies lining tabular numerals
            and the descender room they need. */}
        <p
          className={`flex min-h-[4.5rem] w-full items-center justify-center gap-2 rounded-2xl bg-surface-2 px-5 py-3 text-center font-display ring-1 ring-[rgba(228,195,106,0.18)] ${fit(resultText)} gilt-figures font-semibold tabular-nums text-fg`}
        >
          <span className="min-w-0 truncate">{resultText}</span>
          <span className="shrink-0 text-2xl text-accent">{to}</span>
        </p>

        {/* The other one's number, always in reach. One line if only CLP or RUB
            is missing from the pair, two if neither is on screen. */}
        {crossRates.length > 0 && (
          <div className="flex items-center justify-center gap-2">
            {crossRates.map((c) => (
              <span
                key={c.code}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-surface-2/60 px-3 py-1.5 font-sans text-xs tabular-nums text-muted"
              >
                <span aria-hidden="true">{meta(c.code).flag}</span>
                <span className="truncate font-semibold text-fg/80">
                  {c.value != null ? formatAmount(c.value, c.code) : '-'}
                </span>
                <span className="text-muted/70">{c.code}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Numpad - bare figures, generous targets. */}
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

      {/* Clear - Save - same wine tone, different weight. */}
      <div className="grid shrink-0 grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setAmount('')}
          className="lift-press flex h-12 items-center justify-center rounded-lg bg-[rgba(110,20,35,0.32)] font-sans text-sm font-semibold uppercase tracking-[0.14em] text-fg active:scale-[0.98]"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={save}
          disabled={result == null || n === 0}
          className="lift-press flex h-12 items-center justify-center rounded-lg bg-accent font-sans text-sm font-semibold uppercase tracking-[0.14em] text-accent-fg active:scale-[0.98] disabled:opacity-40"
        >
          Save
        </button>
      </div>

      {/* History - kept + session, no mini-titles, delete only in edit mode. */}
      <Sheet
        open={showHistory}
        onClose={closeHistory}
        title="History"
        size="full"
      >
        {all.length === 0 ? (
          <Empty title="Nothing yet" />
        ) : (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setHistoryEdit((v) => !v)}
              className="lift-press mb-1 self-end font-sans text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-gold/85 active:text-gold"
            >
              {historyEdit ? 'Done' : 'Edit'}
            </button>
            {all.map((e) => (
              <HistoryRow
                key={e.id}
                entry={e}
                editing={historyEdit}
                renaming={renamingId === e.id}
                renameText={renameText}
                onRenameText={setRenameText}
                onStartRename={() => startRename(e)}
                onCommitRename={() => commitRename(e)}
                onRestore={() => restore(e)}
                onDelete={() => removeEntry(e.id)}
              />
            ))}
          </div>
        )}
      </Sheet>

      {/* Name prompt after Save - optional. */}
      <Sheet
        open={!!pendingEntry}
        onClose={resolvePending}
        title="Name it?"
        size="half"
      >
        <div className="space-y-3">
          <Input
            autoFocus
            value={pendingName}
            onChange={(e) => setPendingName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && resolvePending()}
            placeholder="e.g. Groceries - empty just saves the numbers"
          />
          <Button full onClick={resolvePending}>
            {pendingName.trim() ? 'Keep forever' : 'Save'}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

/** One history line - tap to restore; in edit mode, rename or delete. */
function HistoryRow({
  entry,
  editing,
  renaming,
  renameText,
  onRenameText,
  onStartRename,
  onCommitRename,
  onRestore,
  onDelete,
}: {
  entry: Entry;
  editing: boolean;
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
            className="min-w-0 flex-1 rounded-md border border-[rgba(251,245,240,0.18)] bg-[rgba(0,0,0,0.28)] px-3 py-1.5 font-sans text-sm text-fg placeholder:text-[rgba(184,154,134,0.4)] focus:outline-none"
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
              {!entry.name && (
                <Check className="h-3.5 w-3.5 shrink-0 text-success" />
              )}
              <span>
                {meta(entry.from).flag} {formatAmount(entry.amount, entry.from)}{' '}
                {entry.from}
              </span>
              <span className="text-muted/50">→</span>
              <span
                className={entry.name ? 'text-muted' : 'font-semibold text-fg'}
              >
                {meta(entry.to).flag} {formatAmount(entry.result, entry.to)}{' '}
                {entry.to}
              </span>
            </span>
          </button>
          {editing && (
            <>
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
        </>
      )}
    </div>
  );
}

/** A tappable from/to chip - flag + code, nothing more. */
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
