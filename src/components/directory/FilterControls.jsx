import { useId } from 'react';
import { FIRM_TYPES } from '../../lib/firms';
import { Tag, Label } from '../ui';

const HIRES = [
  { value: 'yes', label: 'Yes' },
  { value: 'unknown', label: 'Unknown' },
  { value: 'all', label: 'All' },
];

function toggle(list, v) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function Group({ label, children }) {
  return (
    <fieldset className="min-w-0">
      <legend className="caps mb-1.5 text-xs text-muted">{label}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

export default function FilterControls({ filters, onChange, markets }) {
  const searchId = useId();
  const moreId = useId();
  const set = (patch) => onChange({ ...filters, ...patch });
  const extraSelected = filters.markets.filter((m) => !markets.featured.some((f) => f.city === m));

  return (
    <div className="grid gap-x-8 gap-y-5 md:grid-cols-[1fr_auto]">
      <Group label="Market">
        {markets.featured.map(({ city, count }) => (
          <Tag key={city} pressed={filters.markets.includes(city)} onClick={() => set({ markets: toggle(filters.markets, city) })}>
            {city} <span className="nums font-mono text-muted">{count}</span>
          </Tag>
        ))}
        {extraSelected.map((city) => (
          <Tag key={city} pressed onClick={() => set({ markets: toggle(filters.markets, city) })}>
            {city}
          </Tag>
        ))}
        {markets.rest.length > 0 && (
          <>
            <label htmlFor={moreId} className="sr-only">
              Add another market
            </label>
            <select
              id={moreId}
              value=""
              onChange={(e) => e.target.value && set({ markets: [...filters.markets, e.target.value] })}
              className="min-h-[44px] rounded-sm border border-rule bg-transparent px-2 text-xs text-muted hover:border-muted md:min-h-[32px]"
            >
              <option value="">More markets…</option>
              {markets.rest
                .filter((m) => !filters.markets.includes(m.city))
                .map(({ city, count }) => (
                  <option key={city} value={city}>
                    {city} ({count})
                  </option>
                ))}
            </select>
          </>
        )}
      </Group>

      <div className="md:w-64">
        <Label htmlFor={searchId}>Search by firm name</Label>
        <input
          id={searchId}
          type="search"
          value={filters.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="e.g. Gray Reed"
          className="block min-h-[44px] w-full rounded-sm border border-muted bg-surface px-3 text-sm placeholder:text-muted md:min-h-[36px]"
        />
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-5 md:col-span-2">
        <Group label="Firm type">
          {FIRM_TYPES.map(({ value, label }) => (
            <Tag key={value} pressed={filters.types.includes(value)} onClick={() => set({ types: toggle(filters.types, value) })}>
              {label}
            </Tag>
          ))}
        </Group>

        <Group label="Hires 1Ls">
          {HIRES.map(({ value, label }) => (
            <Tag key={value} pressed={filters.hires === value} onClick={() => set({ hires: value })}>
              {label}
            </Tag>
          ))}
        </Group>

        <Group label="Window">
          <Tag pressed={filters.open} onClick={() => set({ open: !filters.open })}>
            Open now
          </Tag>
        </Group>
      </div>
    </div>
  );
}
