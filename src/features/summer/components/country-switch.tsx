import { cn } from '@kernel/lib';
import { COUNTRIES, type CountryFilter } from '../types';

const OPTIONS: { value: CountryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  ...COUNTRIES.map((c) => ({
    value: c.code as CountryFilter,
    label: `${c.flag} ${c.label}`,
  })),
];

/** Compact All · Türkiye · Georgia filter pill for the Summer hub. */
export function CountrySwitch({
  value,
  onChange,
}: {
  value: CountryFilter;
  onChange: (v: CountryFilter) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1">
      {OPTIONS.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'flex-1 whitespace-nowrap rounded-full px-3 py-1.5 font-sans text-[0.8rem] font-semibold tracking-tight transition-colors',
              active ? 'bg-accent text-accent-fg' : 'text-muted'
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
