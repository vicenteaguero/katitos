import { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { convert, formatMoney, indexRates } from '@kernel/lib';
import { Card, Field, IconButton, Input, PageHeader, Select } from '@kernel/ui';
import { useRates } from '../api/currency.queries';

const CURRENCIES = ['USD', 'CLP', 'RUB'];

export function CurrencyRoute() {
  const { data: rates } = useRates();
  const index = indexRates(rates ?? []);
  const [amount, setAmount] = useState('1');
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('CLP');

  const n = Number(amount) || 0;
  const result = convert(n, from, to, index);

  return (
    <div className="space-y-4">
      <PageHeader title="Currency" subtitle="RUB · CLP · USD" />
      <Card className="space-y-3">
        <Field label="Amount">
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <div className="flex items-end gap-2">
          <Field label="From">
            <Select value={from} onChange={(e) => setFrom(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <IconButton
            label="Swap"
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
            className="mb-1"
          >
            <ArrowLeftRight className="h-5 w-5" />
          </IconButton>
          <Field label="To">
            <Select value={to} onChange={(e) => setTo(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="rounded-lg bg-surface-2 p-3 text-center">
          <p className="text-2xl font-bold text-accent">
            {result != null ? formatMoney(result, to) : '—'}
          </p>
        </div>
      </Card>
    </div>
  );
}
