import { useEffect, useState } from 'react';
import { Bookmark, CalendarPlus, ExternalLink, LayoutGrid, Search, SlidersHorizontal, Table2 } from 'lucide-react';
import { Button, ButtonLink, FilterChip, IconButton, Input, Segmented, Select, Tabs } from '../../components/app/controls';
import { BookmarkToggle, FirmCard, FirmList, MonogramTile, StatusPill } from '../../components/app/firm';
import { BottomSheet, Drawer, FilterMenu } from '../../components/app/overlays';
import { EmptyState, FirmCardSkeleton, FirmRowSkeleton } from '../../components/app/feedback';
import { windowStatus } from '../../lib/status';

const day = (n) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
};

// Sample rows for the gallery only: real firm names, illustrative windows.
const SAMPLE = [
  { id: 'a', name: 'Gray Reed', typeLabel: 'Mid-size', offices: [{ city: 'Dallas' }, { city: 'Houston' }], status: windowStatus({ start: day(-10), end: day(32), kind: 'dated' }) },
  { id: 'b', name: 'Susman Godfrey', typeLabel: 'Litigation boutique', offices: [{ city: 'Houston' }, { city: 'Dallas' }, { city: 'Los Angeles' }], status: windowStatus({ kind: 'rolling' }) },
  { id: 'c', name: 'Porter Hedges', typeLabel: 'Regional full-service', offices: [{ city: 'Houston' }], status: windowStatus({ start: day(12), end: day(60), kind: 'dated' }) },
  { id: 'd', name: 'AZA', typeLabel: 'Litigation boutique', offices: [{ city: 'Houston' }], status: windowStatus({ kind: 'unknown' }) },
  { id: 'e', name: 'Kane Russell Coleman Logan', typeLabel: 'Mid-size', offices: [{ city: 'Dallas' }, { city: 'Houston' }], status: windowStatus({ start: day(-90), end: day(-20), kind: 'dated' }) },
  { id: 'f', name: 'Jones Walker', typeLabel: 'Regional full-service', offices: [{ city: 'New Orleans' }], status: windowStatus({ start: day(80), kind: 'dated' }) },
];

const COLORS = [
  ['Background', '--app-bg', '#F6F7F5'],
  ['Surface', '--app-surface', '#FFFFFF'],
  ['Text', '--app-text', '#14181F'],
  ['Secondary', '--app-text-2', '#5B6470'],
  ['Border', '--app-border', '#E3E6E8'],
  ['Brand', '--app-brand', '#1F5C45'],
  ['Brand hover', '--app-brand-hover', '#174A37'],
  ['Brand tint', '--app-brand-tint', '#E7F0EC'],
  ['Open', '--st-open', '#1F7A4D · label #1A6B43'],
  ['Opening soon', '--st-soon', '#B7791F · label #8A5A12'],
  ['Closed', '--st-closed', '#8A9099 · label #646B73'],
  ['Unknown', '--st-unknown', '#5B6470'],
];

function Section({ title, note, children }) {
  return (
    <section className="border-t border-line py-8">
      <h2 className="text-t20 font-semibold">{title}</h2>
      {note && <p className="mt-1 max-w-2xl text-t14 text-fg-2">{note}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function ComponentsGallery() {
  const [types, setTypes] = useState(['litigation-boutique']);
  const [chips, setChips] = useState({ hires: true, open: false });
  const [selected, setSelected] = useState('a');
  const [saved, setSaved] = useState(new Set(['b']));
  const [view, setView] = useState('table');
  const [tab, setTab] = useState('overview');
  const [drawer, setDrawer] = useState(false);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    document.title = 'Components — Firmward';
  }, []);

  const toggleSave = (f) =>
    setSaved((s) => {
      const n = new Set(s);
      if (n.has(f.id)) n.delete(f.id);
      else n.add(f.id);
      return n;
    });

  return (
    <div className="app min-h-screen">
      <main className="mx-auto max-w-app px-4 py-10 md:px-8">
        <h1 className="text-t32 font-bold tracking-tight">Components</h1>
        <p className="mt-2 max-w-2xl text-t16 text-fg-2">
          The base set for the new Firmward. Everything here is live: click, tab and use the arrow keys. Sample data.
        </p>

        <Section title="Color">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {COLORS.map(([name, v, hex]) => (
              <div key={v} className="flex items-center gap-3 rounded-app border border-line bg-card p-3">
                <span className="h-10 w-10 shrink-0 rounded-app border border-line" style={{ background: `var(${v})` }} />
                <span className="min-w-0">
                  <span className="block text-t14 font-medium">{name}</span>
                  <span className="data block truncate text-t12 text-fg-2">{hex}</span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-t12 text-fg-2">
            The opening-soon and closed colors are 3.6:1 and 3.2:1 on white, under the 4.5:1 AA minimum for text, so labels use a darker shade
            of the same hue. The base colors stay on dots.
          </p>
        </Section>

        <Section title="Type" note="Hanken Grotesk for everything; JetBrains Mono only for dates and counts.">
          <div className="space-y-2">
            <p className="text-t32 font-bold tracking-tight">32 · Firms that hire 1Ls</p>
            <p className="text-t24 font-semibold tracking-tight">24 · Gray Reed</p>
            <p className="text-t20 font-semibold">20 · 1L summer at a glance</p>
            <p className="text-t16">16 · Body text for descriptions and notes.</p>
            <p className="text-t14 text-fg-2">14 · Secondary text, labels, metadata</p>
            <p className="text-t12 text-fg-2">12 · Small print and counts</p>
            <p className="data text-t14">Nov 15 · 86 firms · Oct 12, 2026</p>
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Get free access</Button>
            <ButtonLink href="https://example.com" icon={ExternalLink}>
              Open application
            </ButtonLink>
            <Button variant="secondary" icon={Bookmark}>
              Add to My List
            </Button>
            <Button variant="secondary" icon={CalendarPlus} size="sm">
              Add to calendar
            </Button>
            <Button variant="ghost">Clear all</Button>
            <Button disabled>Saving…</Button>
            <IconButton label="Filters" icon={SlidersHorizontal} />
          </div>
        </Section>

        <Section title="Inputs and selects">
          <div className="grid max-w-3xl gap-4 md:grid-cols-2">
            <Input label="Search" icon={Search} placeholder="Firm, city or practice" />
            <Input label="Email" type="email" placeholder="you@school.edu" />
            <Select label="Class year" placeholder="Select" options={['1L', '2L', '3L']} />
            <Select label="Law school" optional placeholder="Select" options={['Option A', 'Option B']} />
          </div>
        </Section>

        <Section title="Filters" note="Dropdowns hold multi-select options with counts. Applied filters show as removable chips.">
          <div className="flex flex-wrap items-start gap-2">
            <FilterMenu
              label="Firm type"
              value={types}
              onChange={setTypes}
              options={[
                { value: 'litigation-boutique', label: 'Litigation boutique', count: 41 },
                { value: 'specialty-boutique', label: 'Specialty boutique', count: 22 },
                { value: 'plaintiff', label: 'Plaintiff', count: 9 },
                { value: 'mid-size', label: 'Mid-size', count: 79 },
                { value: 'biglaw', label: 'BigLaw', count: 65 },
              ]}
            />
            <FilterMenu label="Market" value={[]} onChange={() => {}} options={[{ value: 'Dallas', label: 'Dallas', count: 11 }]} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <FilterChip selected={chips.hires} onClick={() => setChips({ ...chips, hires: !chips.hires })}>
              Hires 1Ls
            </FilterChip>
            <FilterChip selected={chips.open} onClick={() => setChips({ ...chips, open: !chips.open })}>
              Open now
            </FilterChip>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <FilterChip onRemove={() => {}}>Houston</FilterChip>
            <FilterChip onRemove={() => {}}>Litigation boutique</FilterChip>
            <Button variant="ghost" size="sm">
              Clear all
            </Button>
          </div>
        </Section>

        <Section title="Status pills" note="Every status carries its own words. Color only reinforces them.">
          <div className="flex flex-wrap gap-2">
            {SAMPLE.map((f) => (
              <StatusPill key={f.id} status={f.status} />
            ))}
          </div>
        </Section>

        <Section title="Monogram tiles" note="Generated from the firm name. No scraped logos.">
          <div className="flex items-end gap-4">
            <MonogramTile name="Gray Reed" size="sm" />
            <MonogramTile name="Susman Godfrey" />
            <MonogramTile name="Akerman" size="lg" />
            <BookmarkToggle saved={false} onToggle={() => {}} firmName="Gray Reed" />
            <BookmarkToggle saved onToggle={() => {}} firmName="Gray Reed" />
          </div>
        </Section>

        <Section title="Firm rows" note="72px rows. Click a row, or focus the list and use Up/Down, Home/End. S saves the selected firm.">
          <div className="max-w-xl overflow-hidden rounded-app border border-line bg-canvas">
            <FirmList firms={SAMPLE} selectedId={selected} onSelect={(f) => setSelected(f.id)} savedIds={saved} onToggleSave={toggleSave} label="Sample firms" />
          </div>
        </Section>

        <Section title="Firm cards" note="Collections and similar firms.">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {SAMPLE.slice(0, 4).map((f) => (
              <FirmCard key={f.id} firm={f} />
            ))}
          </div>
        </Section>

        <Section title="Tabs and view switch">
          <div className="max-w-xl space-y-5">
            <Tabs
              label="Firm detail"
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'overview', label: 'Overview' },
                { value: 'offices', label: 'Offices', count: 2 },
                { value: 'positions', label: 'Open positions', count: 3 },
              ]}
            />
            <Segmented
              label="View"
              value={view}
              onChange={setView}
              options={[
                { value: 'table', label: 'Table', icon: Table2 },
                { value: 'board', label: 'Board', icon: LayoutGrid },
              ]}
            />
          </div>
        </Section>

        <Section title="Drawer and bottom sheet" note="One soft shadow, only here. Esc closes; focus stays inside and returns to the button.">
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setDrawer(true)}>
              Open drawer
            </Button>
            <Button variant="secondary" onClick={() => setSheet(true)}>
              Open bottom sheet
            </Button>
          </div>
          <Drawer open={drawer} onClose={() => setDrawer(false)} title="More filters" footer={<Button className="w-full">Show 86 firms</Button>}>
            <div className="space-y-4">
              <Select label="Firm size" placeholder="Any size" options={['Under 50', '50–300', '300+']} />
              <Select label="Last verified" placeholder="Any time" options={['Within 7 days', 'Within 30 days']} />
            </div>
          </Drawer>
          <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Filters" footer={<Button className="w-full">Show 86 firms</Button>}>
            <div className="flex flex-wrap gap-2">
              <FilterChip selected>Hires 1Ls</FilterChip>
              <FilterChip>Open now</FilterChip>
              <FilterChip>Opening soon</FilterChip>
            </div>
          </BottomSheet>
        </Section>

        <Section title="Empty state">
          <div className="max-w-xl">
            <EmptyState title="No firms match these filters" action={<Button variant="secondary">Remove “Open now”</Button>}>
              “Open now” is the filter ruling out the most firms. Remove it to see 23 more.
            </EmptyState>
          </div>
        </Section>

        <Section title="Loading" note="Skeletons match the shapes they replace.">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-app border border-line">
              <FirmRowSkeleton rows={3} />
            </div>
            <FirmCardSkeleton count={2} />
          </div>
        </Section>
      </main>
    </div>
  );
}
