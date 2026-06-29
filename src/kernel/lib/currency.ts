export type CurrencyCode = 'USD' | 'CLP' | 'RUB' | 'GEL' | string;

export interface Rate {
  base: string;
  quote: string;
  rate: number;
}

/** Build a quick lookup map from a flat list of rates. */
export function indexRates(rates: Rate[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rates) map.set(`${r.base}/${r.quote}`, r.rate);
  return map;
}

/**
 * Convert an amount between currencies using a rate map. Tries the direct
 * pair, then the inverse, then triangulates through USD. Returns null if it
 * cannot be computed.
 */
export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Map<string, number>
): number | null {
  if (from === to) return amount;
  const direct = rates.get(`${from}/${to}`);
  if (direct != null) return amount * direct;

  const inverse = rates.get(`${to}/${from}`);
  if (inverse != null && inverse !== 0) return amount / inverse;

  // Triangulate via USD.
  const fromUsd = rates.get(`${from}/USD`) ?? inverseOf(rates, 'USD', from);
  const usdTo = rates.get(`USD/${to}`) ?? inverseOf(rates, to, 'USD');
  if (fromUsd != null && usdTo != null) return amount * fromUsd * usdTo;

  return null;
}

function inverseOf(
  rates: Map<string, number>,
  base: string,
  quote: string
): number | null {
  const v = rates.get(`${base}/${quote}`);
  return v != null && v !== 0 ? 1 / v : null;
}

export function formatMoney(amount: number, currency: CurrencyCode): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      // 1 decimal when it isn't a round number, none when it is (1.5, 2, 1.2).
      minimumFractionDigits: 0,
      maximumFractionDigits: currency === 'CLP' || currency === 'RUB' ? 0 : 1,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString()} ${currency}`;
  }
}
