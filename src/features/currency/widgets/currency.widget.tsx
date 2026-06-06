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
    <Link to="/currency">
      <Card className="h-full">
        <CardTitle>1 USD</CardTitle>
        <p className="text-sm">{clp != null ? formatMoney(clp, 'CLP') : '—'}</p>
        <p className="text-sm">{rub != null ? formatMoney(rub, 'RUB') : '—'}</p>
      </Card>
    </Link>
  );
}
