import { Link } from 'react-router';
import { convert, formatMoney, indexRates } from '@kernel/lib';
import { Card, CardTitle } from '@kernel/ui';
import { useRates } from '../api/currency.queries';

export function CurrencyWidget() {
  const { data: rates } = useRates();
  const index = indexRates(rates ?? []);
  const clp = convert(1, 'USD', 'CLP', index);
  const rub = convert(1, 'USD', 'RUB', index);
  return (
    <Link to="/currency" className="lift-press block h-full">
      <Card className="flex h-full flex-col">
        <p className="eyebrow !text-success">Ledger</p>
        <CardTitle className="mt-4 gilt-text tabular-nums">1 USD</CardTitle>
        <dl className="mt-4 space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="font-sans text-xs uppercase tracking-[0.18em] text-muted">
              CLP
            </dt>
            <dd className="font-display text-lg tabular-nums text-fg">
              {clp != null ? formatMoney(clp, 'CLP') : '—'}
            </dd>
          </div>
          <hr className="seam" aria-hidden="true" />
          <div className="flex items-baseline justify-between gap-3">
            <dt className="font-sans text-xs uppercase tracking-[0.18em] text-muted">
              RUB
            </dt>
            <dd className="font-display text-lg tabular-nums text-fg">
              {rub != null ? formatMoney(rub, 'RUB') : '—'}
            </dd>
          </div>
        </dl>
      </Card>
    </Link>
  );
}
