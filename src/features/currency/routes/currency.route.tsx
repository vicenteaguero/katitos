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
    <div className="curtain-reveal space-y-12">
      <PageHeader
        title="Currency"
        subtitle="A brass ledger — RUB · CLP · USD"
      />

      <section className="space-y-7">
        <p className="eyebrow">The Reckoning</p>
        <Card className="space-y-7">
          <Field label="Amount">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-display text-2xl tabular-nums tracking-tight"
            />
          </Field>

          <div className="flex items-end gap-3">
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
              className="mb-1 text-success"
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
        </Card>
      </section>

      {/* The two columns settle on one gold-stitched line — her sum, his sum. */}
      <hr className="seam" aria-hidden="true" />

      <section className="space-y-7">
        <p className="eyebrow">The Total</p>
        <div className="marble gilt-hairline rounded-none p-7 text-center shadow-loge">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.28em] text-accent/70">
            {formatMoney(n, from)} {from} &rarr; {to}
          </p>
          <p className="gold-shimmer mt-4 font-display text-5xl font-semibold tabular-nums tracking-tight text-accent">
            {result != null ? formatMoney(result, to) : '—'}
          </p>
        </div>
      </section>
    </div>
  );
}
