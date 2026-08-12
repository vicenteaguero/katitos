import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { convert, formatAmount, indexRates } from '@kernel/lib';
import { useRates } from '../api/currency.queries';
import { ExchangeIcon } from '../components/exchange-icon';
import { meta } from '../currencies';

// One-tap home button → the fast converter. Shows today's everyday pair
// (1000 ₽ ≈ X $CLP) so the rate is visible before you even open it.
export function CurrencyWidget() {
  const { data: rates } = useRates();
  const index = indexRates(rates ?? []);
  const clp = convert(1000, 'RUB', 'CLP', index);
  return (
    <Link
      to="/currency"
      className="lift-press flex items-center gap-4 rounded-lg bg-surface-2 px-5 py-4 shadow-loge active:scale-[0.99]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg">
        <ExchangeIcon size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-semibold text-fg">
          Currency
        </span>
        <span className="block font-sans text-xs tabular-nums text-muted">
          {meta('RUB').flag} 1000 RUB ≈{' '}
          <span className="font-semibold text-accent">
            {clp != null ? formatAmount(clp, 'CLP') : '—'} CLP
          </span>{' '}
          {meta('CLP').flag}
        </span>
      </span>
      <ArrowRight className="h-5 w-5 shrink-0 text-muted" />
    </Link>
  );
}
