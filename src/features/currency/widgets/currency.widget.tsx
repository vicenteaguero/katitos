import { Link } from 'react-router';
import { convert, formatMoney, indexRates } from '@kernel/lib';
import { useRates } from '../api/currency.queries';

// Compact single-line dashboard row — a minor widget in the editorial flow.
export function CurrencyWidget() {
  const { data: rates } = useRates();
  const index = indexRates(rates ?? []);
  const clp = convert(1, 'USD', 'CLP', index);
  const rub = convert(1, 'USD', 'RUB', index);
  return (
    <Link to="/currency" className="lift-press block">
      <div className="flex items-baseline justify-between gap-3 rounded-lg bg-surface px-6 py-4">
        <span className="font-sans text-sm text-muted">1 USD</span>
        <span className="font-display text-lg tabular-nums text-fg">
          {clp != null ? formatMoney(clp, 'CLP') : '—'}
          <span className="px-1.5 text-muted">·</span>
          {rub != null ? formatMoney(rub, 'RUB') : '—'}
        </span>
      </div>
    </Link>
  );
}
