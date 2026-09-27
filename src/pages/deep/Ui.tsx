import { useState, type ReactNode } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Checkbox,
  CountBadge,
  SegmentedControl,
  Skeleton,
  Spinner,
} from '@d3cloud/ui';
import type { Project } from '../../content/projects';
import { BarRow, DeepIndex, DeepSection, Figure, FlowDown, Stat, type DeepEntry } from '../../components/Deep';
import { Accent, Quiet } from '../../components/Marketing';

/**
 * D3 UI, explained — laid out as a specimen sheet. Every section is a set of
 * plates, and most of what is on them is the library itself: the swatches are
 * the real token classes, rendered in both themes at once, and the component
 * board is real components imported from @d3cloud/ui.
 *
 * Numbers, and where they come from (d3-design-system repo):
 *  - The audit: design-system/AUDIT.md — 176 colour values by hue family, 19
 *    rendered type sizes (listed), 170 button recipes, 433 hand-rolled buttons,
 *    5 CSS approaches, 0 shared code, 4 of 5 apps declaring an unloaded face.
 *  - Tokens: src/tokens/build/*.css as installed — 24 semantic colour tokens per
 *    theme, 7 type steps, 12 spacing steps, 5 radii, 0 shadow tokens with the 7
 *    Tailwind shadow utilities switched off.
 *  - Components: d3-ui/src/components — 38.
 *  - Tests: `npx vitest run` in d3-ui on 2026-09-27 — 909 tests in 42 files, 489
 *    of them in stories.test.tsx (244 stories × renders + axe, plus a guard).
 *  - Browser checks: d3-ui/browser — 11 Playwright specs; a11y.spec runs axe on
 *    every story in dark and light.
 */

const ENTRIES: DeepEntry[] = [
  { id: 'sprawl', label: 'The problem' },
  { id: 'walkthrough', label: 'Walkthrough' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'colour', label: 'Colour' },
  { id: 'type', label: 'Type & space' },
  { id: 'elevation', label: 'Elevation' },
  { id: 'components', label: 'Components' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'gates', label: 'Gates' },
  { id: 'why', label: 'Why this way' },
];

const code = (n: number) => `--${String(n).padStart(2, '0')}`;

/* ---------------------------------------------------------------- Specimen parts */

/** A plate on the sheet: crop marks at the corners, a mono slug along the top. */
function Plate({
  slug,
  meta,
  children,
  className = '',
}: {
  slug: string;
  meta?: string;
  children: ReactNode;
  className?: string;
}) {
  const mark = 'pointer-events-none absolute size-3 border-fg-faint';
  return (
    <div className={`relative flex min-w-0 flex-col rounded-md border border-border bg-surface ${className}`}>
      <span aria-hidden="true" className={`${mark} -top-1.5 -left-1.5 border-t border-l`} />
      <span aria-hidden="true" className={`${mark} -top-1.5 -right-1.5 border-t border-r`} />
      <span aria-hidden="true" className={`${mark} -bottom-1.5 -left-1.5 border-b border-l`} />
      <span aria-hidden="true" className={`${mark} -right-1.5 -bottom-1.5 border-r border-b`} />
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-2.5 font-mono text-11 tracking-label text-fg-faint uppercase">
        <span>{slug}</span>
        {meta && <span className="truncate">{meta}</span>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6">{children}</div>
    </div>
  );
}

/**
 * A subtree in a fixed theme. The tokens are custom properties scoped to
 * `[data-theme]` on any element, so a light island inside a dark page (or the
 * reverse) re-points every class beneath it — nothing here is duplicated.
 */
function Island({ theme, children, className = '' }: { theme: 'dark' | 'light'; children: ReactNode; className?: string }) {
  return (
    <div data-theme={theme} className={`flex min-w-0 flex-col gap-4 rounded-md border border-border bg-bg p-4 text-fg sm:p-5 ${className}`}>
      <span className="font-mono text-11 tracking-label text-fg-faint uppercase">data-theme="{theme}"</span>
      {children}
    </div>
  );
}

/** A small lit dot in the product's colour — decorative, like the site's `Dot`. */
function Pip({ accent, className = '' }: { accent: string; className?: string }) {
  return <span aria-hidden="true" className={`inline-block size-2 shrink-0 rounded-full ${className}`} style={{ backgroundColor: accent }} />;
}

/* ---------------------------------------------------------------- 01 Sprawl */

/*
 * The audit's colour count by hue family (AUDIT.md §2). The shades drawn are
 * illustrative — each family's real values are listed there — so these are
 * generated OKLCH values rather than tokens: the sprawl is the subject.
 */
const HUE_FAMILIES = [
  { family: 'Neutral', n: 75, h: 260, c: 0.012 },
  { family: 'Orange / amber', n: 19, h: 65, c: 0.14 },
  { family: 'Blue', n: 18, h: 255, c: 0.14 },
  { family: 'Teal / emerald', n: 16, h: 172, c: 0.11 },
  { family: 'Red', n: 16, h: 25, c: 0.16 },
  { family: 'Violet / indigo', n: 11, h: 285, c: 0.14 },
  { family: 'Yellow', n: 8, h: 95, c: 0.13 },
  { family: 'Green', n: 7, h: 145, c: 0.13 },
  { family: 'Cyan / sky', n: 4, h: 220, c: 0.1 },
  { family: 'Purple', n: 2, h: 315, c: 0.14 },
];
const COLOUR_VALUES = HUE_FAMILIES.reduce((sum, f) => sum + f.n, 0); // 176
const WAFFLE_ROWS = 11;
const WAFFLE_COLS = Math.ceil(COLOUR_VALUES / WAFFLE_ROWS); // 16

function ColourSprawl() {
  const cells = HUE_FAMILIES.flatMap((f) =>
    Array.from({ length: f.n }, (_, k) => {
      const t = f.n > 1 ? k / (f.n - 1) : 0.5;
      const l = f.family === 'Neutral' ? 0.18 + 0.78 * t : 0.45 + 0.4 * t;
      return `oklch(${l.toFixed(3)} ${f.c} ${f.h})`;
    }),
  );
  return (
    <svg
      viewBox={`0 0 ${WAFFLE_COLS * 12} ${WAFFLE_ROWS * 12}`}
      className="h-auto w-full"
      role="img"
      aria-label={`${COLOUR_VALUES} squares, one per distinct colour value found across five apps: 75 neutrals, 19 oranges, 18 blues, 16 teals, 16 reds and 32 more across five other hues.`}
    >
      {cells.map((fill, i) => {
        const x = Math.floor(i / WAFFLE_ROWS);
        const y = i % WAFFLE_ROWS;
        return <rect key={i} x={x * 12 + 1} y={y * 12 + 1} width="10" height="10" rx="2" style={{ fill }} />;
      })}
    </svg>
  );
}

/** The system's semantic colours, as the real utility classes — so this grid follows the theme. */
const TOKEN_CELLS = [
  'bg-bg-sunken', 'bg-bg', 'bg-surface', 'bg-surface-hover', 'bg-surface-raised', 'bg-border',
  'bg-border-field', 'bg-border-float', 'bg-fg-faint', 'bg-fg-muted', 'bg-fg', 'bg-focus',
  'bg-accent-muted', 'bg-accent', 'bg-accent-hover', 'bg-accent-contrast', 'bg-success-muted', 'bg-success',
  'bg-warning-muted', 'bg-warning', 'bg-danger-muted', 'bg-danger', 'bg-info-muted', 'bg-info',
];

function TokenGrid() {
  return (
    <div
      role="img"
      aria-label={`${TOKEN_CELLS.length} squares, one per semantic colour token, drawn with the tokens themselves.`}
      className="grid grid-cols-6 gap-1"
    >
      {TOKEN_CELLS.map((cls) => (
        <span key={cls} aria-hidden="true" className={`aspect-square rounded-xs border border-border ${cls}`} />
      ))}
    </div>
  );
}

/** Every size the audit found on screen (AUDIT.md §3), and the seven the scale keeps. */
const FOUND_SIZES = [9, 10, 10.4, 11, 11.2, 12, 12.8, 13, 13.6, 14, 15, 16, 18, 20, 22, 24, 30, 34, 36];
const KEPT_SIZES = [11, 12, 13, 14, 16, 20, 24];

function TypeRuler({ accent }: { accent: string }) {
  // Narrow viewBox so the labels stay legible at phone width; the four crowded
  // kept sizes (11–14) stagger their labels over two lines.
  const x = (px: number) => 12 + ((px - 8) / 29) * 336;
  const band = { from: x(10), to: x(15) };
  return (
    <svg
      viewBox="0 0 360 116"
      className="h-auto w-full"
      role="img"
      aria-label="A ruler from 8 to 37 pixels with 19 ticks, one per type size found across five apps; ten of them crowd between 10 and 15 pixels. Seven are lit — 11, 12, 13, 14, 16, 20 and 24 — the scale that replaces them."
    >
      <line x1="12" y1="62" x2="348" y2="62" strokeWidth="1" className="stroke-border-field" />
      {FOUND_SIZES.map((px) => {
        const kept = KEPT_SIZES.includes(px);
        const high = kept && px <= 14 && KEPT_SIZES.indexOf(px) % 2 === 1;
        return kept ? (
          <g key={px}>
            <line x1={x(px)} y1="36" x2={x(px)} y2="62" strokeWidth="2" style={{ stroke: accent }} />
            <circle cx={x(px)} cy="34" r="3.5" style={{ fill: accent }} />
            <text x={x(px)} y={high ? 12 : 25} textAnchor="middle" className="fill-fg font-mono text-11">
              {px}
            </text>
          </g>
        ) : (
          <g key={px}>
            <line x1={x(px)} y1="62" x2={x(px)} y2="76" strokeWidth="1" className="stroke-fg-faint" />
            <path d={`M${x(px) - 2} 80 l4 4 M${x(px) + 2} 80 l-4 4`} strokeWidth="1" className="stroke-fg-faint" />
          </g>
        );
      })}
      <path
        d={`M${band.from} 92 v4 H${band.to} v-4`}
        fill="none"
        strokeWidth="1"
        className="stroke-fg-muted"
      />
      <text x={(band.from + band.to) / 2} y="110" textAnchor="middle" className="fill-fg-muted font-mono text-11">
        10 of 19
      </text>
      <text x="348" y="110" textAnchor="end" className="fill-fg-muted font-mono text-11">
        36px
      </text>
    </svg>
  );
}

/** 170 slightly different buttons. Deterministic, so the drawing is the same every visit. */
function ButtonSprawl() {
  const COLS = 17;
  return (
    <svg
      viewBox={`0 0 ${COLS * 36} 200`}
      className="h-auto w-full"
      role="img"
      aria-label="170 small button outlines, each a little different in width, height, corner radius and fill — one per distinct button recipe the audit found."
    >
      {Array.from({ length: 170 }, (_, i) => {
        const w = 20 + ((i * 37) % 13);
        const h = 9 + ((i * 13) % 7);
        const rx = (i * 7) % 8;
        const filled = i % 3 === 0;
        const cx = (i % COLS) * 36 + 18;
        const cy = Math.floor(i / COLS) * 20 + 10;
        return (
          <rect
            key={i}
            x={cx - w / 2}
            y={cy - h / 2}
            width={w}
            height={h}
            rx={Math.min(rx, h / 2)}
            strokeWidth="1"
            className={filled ? 'fill-fg-faint' : 'fill-none stroke-fg-faint'}
          />
        );
      })}
    </svg>
  );
}

function Sprawl({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="sprawl"
      code={code(1)}
      label="The problem"
      title={
        <>
          Without a system, <Accent>every screen invents its own.</Accent>
        </>
      }
      lede="An audit of five real apps built without a shared system counted what was actually on screen. Nothing in it was careless — it is what happens when the only thing between a developer and a new colour is a convention. D3 UI collapses each of these into a small, named set."
    >
      <div className="grid gap-10 lg:grid-cols-2">
        <Plate slug="Colour" meta="176 → 24">
          <div className="grid grid-cols-[minmax(0,3fr)_auto_minmax(0,1.3fr)] items-center gap-3 sm:gap-5">
            <ColourSprawl />
            <span aria-hidden="true" className="font-mono text-16 text-fg-faint">
              →
            </span>
            <TokenGrid />
          </div>
          <p className="text-14 text-fg-muted">
            176 distinct colour values, eighteen of them blues. They become 24 semantic tokens — named for what they do,
            like <code className="font-mono text-13 text-fg">surface</code> or{' '}
            <code className="font-mono text-13 text-fg">danger</code> — which the grid on the right is drawn with. Switch
            the theme and it changes; the sprawl on the left cannot.
          </p>
        </Plate>
        <Plate slug="Type sizes" meta="19 → 7">
          <TypeRuler accent={accent} />
          <p className="text-14 text-fg-muted">
            Nineteen sizes, ten of them within five pixels of each other: 10 and 10.4, 11 and 11.2, 12, 12.8, 13 and
            13.6. None of the differences is visible alone, and all of them are permanent. The scale keeps seven.
          </p>
        </Plate>
        <Plate slug="Buttons" meta="170 → 1" className="lg:col-span-2">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-center">
            <ButtonSprawl />
            <div className="flex flex-col gap-4">
              <p className="text-14 text-fg-muted">
                433 hand-rolled <code className="font-mono text-13 text-fg">&lt;button&gt;</code> elements, 170 distinct
                recipes, and no Button component in any of the five. The library ships one, with five variants and
                three sizes — and the rules for when each is allowed.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="primary" size="sm">
                  Primary
                </Button>
                <Button type="button" variant="secondary" size="sm">
                  Secondary
                </Button>
                <Button type="button" variant="ghost" size="sm">
                  Ghost
                </Button>
                <Button type="button" variant="danger-ghost" size="sm">
                  Delete…
                </Button>
              </div>
            </div>
          </div>
        </Plate>
      </div>
      <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
        <Stat value="5" label="different CSS approaches across five apps — no two agreed" />
        <Stat value="0" label="lines of UI code shared between any two of them" />
        <Stat value="4/5" label="declared a typeface they never actually loaded" />
        <Stat value="357" label="distinct card and container recipes in three of the apps" />
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 02 Walkthrough */

const STEPS: { title: string; body: string; code: ReactNode }[] = [
  {
    title: 'Install',
    body: 'Each release is a packed tarball on GitHub, installed by URL. It is immutable, and your lockfile records its integrity hash.',
    code: (
      <>
        <Quiet>$</Quiet> npm i{' '}
        <span className="break-all">
          https://github.com/matdemers1/d3-design-system/releases/download/v1.2.2/d3cloud-ui-1.2.2.tgz
        </span>
      </>
    ),
  },
  {
    title: 'Load the tokens',
    body: 'Plain CSS custom properties and self-hosted fonts. Tailwind is optional — with v4, one import adds matching utilities.',
    code: (
      <>
        <Quiet>{'/* any app */'}</Quiet>
        {'\n'}import '@d3cloud/ui/tokens.css'{'\n\n'}
        <Quiet>{'/* or, with Tailwind v4 */'}</Quiet>
        {'\n'}@import '@d3cloud/ui/theme.css';
      </>
    ),
  },
  {
    title: 'Frame the app',
    body: 'ThemeProvider owns light, dark and system. AppShell owns the sidebar, the drawer below lg and the one main landmark.',
    code: (
      <>
        {'<ThemeProvider storageKey="app-theme">\n'}
        {'  <AppShell\n'}
        {'    brand={<AppShellBrand name="Acme" href="/" />}\n'}
        {'    nav={<SideNav aria-label="Main">…</SideNav>}>\n'}
        {'    <Page width="wide">…</Page>\n'}
        {'  </AppShell>\n'}
        {'</ThemeProvider>'}
      </>
    ),
  },
  {
    title: 'Compose, then gate',
    body: 'Build pages from components, then add the usage gate to lint. It fails the build on a raw colour, an off-scale size or a shadow.',
    code: (
      <>
        {'<PageHeader title="Invoices"\n'}
        {'  actions={<Button variant="primary">\n'}
        {'    New invoice</Button>} />\n\n'}
        <Quiet>$</Quiet> npx d3-check-usage --tailwind src{'\n'}
        <Quiet>  usage ok — no violations.</Quiet>
      </>
    ),
  },
];

function Walkthrough({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="walkthrough"
      code={code(2)}
      label="Walkthrough"
      title={
        <>
          Four steps from <Accent>npm i to a gated build.</Accent>
        </>
      }
      lede="The library is meant to be adopted in an afternoon and then left to hold the line. This is the whole path, simplified."
      sunken
    >
      <div className="relative">
        <span aria-hidden="true" className="absolute top-5 right-10 left-10 hidden h-px bg-border-field lg:block">
          <span className="flow-x absolute -top-0.75 size-2 rounded-full" style={{ backgroundColor: accent }} />
        </span>
        <ol className="relative grid gap-8 lg:grid-cols-4 lg:gap-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex min-w-0 flex-col gap-4">
              <span
                aria-hidden="true"
                className="flex size-10 items-center justify-center rounded-full border border-border-field bg-bg font-mono text-14 text-fg"
              >
                {index + 1}
              </span>
              <h3 className="text-16 font-semibold text-fg">
                <span className="sr-only">Step {index + 1}: </span>
                {step.title}
              </h3>
              <p className="text-14 text-fg-muted">{step.body}</p>
              <pre className="mt-auto rounded-md border border-border bg-surface p-4 font-mono text-12 break-words whitespace-pre-wrap text-fg">
                {step.code}
              </pre>
            </li>
          ))}
        </ol>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 03 Architecture */

function Box({
  kicker,
  title,
  children,
  accent,
  dashed = false,
}: {
  kicker?: string;
  title: string;
  children?: ReactNode;
  accent?: string;
  dashed?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-2 rounded-lg border bg-surface p-5 ${dashed ? 'border-dashed border-border-field' : 'border-border'}`}
      style={accent ? { borderTopColor: accent, borderTopWidth: 3 } : undefined}
    >
      {kicker && <span className="font-mono text-11 tracking-label text-fg-faint uppercase">{kicker}</span>}
      <span className="text-16 font-semibold text-fg">{title}</span>
      {children && <span className="text-13 text-fg-muted">{children}</span>}
    </div>
  );
}

/** Who wins in the cascade, lowest first — read from the layer order the stylesheet declares. */
const LAYERS = [
  { name: 'theme', note: 'Tailwind’s variables' },
  { name: 'base', note: 'Preflight resets' },
  { name: 'd3-ui', note: 'Every component rule', lit: true },
  { name: 'components', note: 'Yours, if you use it' },
  { name: 'utilities', note: 'className="w-72" wins' },
  { name: 'unlayered', note: 'Your own CSS wins last' },
];

function Architecture({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="architecture"
      code={code(3)}
      label="Architecture"
      title={
        <>
          One source of values, <Accent>four layers down to the screen.</Accent>
        </>
      }
      lede="Values are decided once, as JSON, and checked against the stylesheets built from them. Everything downstream reads names, never numbers — so a value can change in one place and every app that installs the new release follows."
    >
      <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div
          role="img"
          aria-label="Architecture: token sources in JSON are checked against tokens.css, the CSS custom properties per theme. Those feed an optional Tailwind v4 preset of utilities and the React components, which live in their own cascade layer. Your app uses both, and the usage gate runs in your CI."
          className="flex flex-col"
        >
          <div aria-hidden="true" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Box kicker="Source" title="Token JSON">
              Colour, type, space, radius, motion, icon — the only place a value is written
            </Box>
            <div className="flex items-center justify-center rounded-lg border border-dashed border-border-field px-4 py-3 text-center font-mono text-12 text-fg-muted">
              check-tokens · values must agree
            </div>
          </div>
          <FlowDown accent={accent} />
          <div aria-hidden="true">
            <Box kicker="Runtime" title="tokens.css" accent={accent}>
              Custom properties: <span className="font-mono text-fg">--color-surface</span>,{' '}
              <span className="font-mono text-fg">--text-14</span>, <span className="font-mono text-fg">--space-16</span>.
              Colours are scoped to <span className="font-mono text-fg">[data-theme]</span> on any element, so a subtree
              can carry its own mode.
            </Box>
          </div>
          <FlowDown accent={accent} />
          <div aria-hidden="true" className="grid gap-3 sm:grid-cols-2">
            <Box kicker="Optional" title="theme.css — Tailwind v4" dashed>
              Utilities that read the tokens: <span className="font-mono text-fg">bg-surface</span>,{' '}
              <span className="font-mono text-fg">text-fg-muted</span>, <span className="font-mono text-fg">rounded-lg</span>.
              Shadow utilities are switched off.
            </Box>
            <Box kicker="React" title="38 components" accent={accent}>
              Built on Radix where behaviour is hard, styled only from tokens, shipped in the{' '}
              <span className="font-mono text-fg">d3-ui</span> cascade layer.
            </Box>
          </div>
          <FlowDown accent={accent} />
          <div aria-hidden="true" className="flex flex-col gap-3 rounded-lg border border-border-field bg-bg-sunken p-4">
            <span className="px-1 font-mono text-11 tracking-label text-fg-faint uppercase">Your app</span>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Box title="Screens">AppShell → Page → PageHeader, Section, DataList, FormField…</Box>
              <Box title="Your CI" accent={accent}>
                <span className="font-mono text-fg">d3-check-usage src</span> in lint — the same rules the library holds
                itself to
              </Box>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <Figure caption="The cascade, highest at the top. Component rules sit in their own layer after Tailwind’s resets and before its utilities — so a className on a component wins, and a reset never strips one.">
            <ol className="flex flex-col-reverse gap-1.5">
              {LAYERS.map((layer, i) => (
                <li
                  key={layer.name}
                  className={`flex items-center justify-between gap-3 rounded-sm border px-3 py-2 ${layer.lit ? 'border-border-field bg-surface-raised' : 'border-border bg-surface'}`}
                  style={{ marginLeft: `${i * 6}%` }}
                >
                  <span className="flex items-center gap-2 font-mono text-12 text-fg">
                    {layer.lit && <Pip accent={accent} />}
                    {layer.name}
                  </span>
                  <span className="truncate text-12 text-fg-muted">{layer.note}</span>
                </li>
              ))}
            </ol>
          </Figure>
        </aside>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 04 Colour */

const SWATCH_GROUPS: { name: string; tokens: { cls: string; name: string }[] }[] = [
  {
    name: 'Ground',
    tokens: [
      { cls: 'bg-bg-sunken', name: 'bg-sunken' },
      { cls: 'bg-bg', name: 'bg' },
      { cls: 'bg-surface', name: 'surface' },
      { cls: 'bg-surface-hover', name: 'surface-hover' },
      { cls: 'bg-surface-raised', name: 'surface-raised' },
    ],
  },
  {
    name: 'Ink & line',
    tokens: [
      { cls: 'bg-fg', name: 'fg' },
      { cls: 'bg-fg-muted', name: 'fg-muted' },
      { cls: 'bg-fg-faint', name: 'fg-faint' },
      { cls: 'bg-border', name: 'border' },
      { cls: 'bg-border-field', name: 'border-field' },
      { cls: 'bg-border-float', name: 'border-float' },
    ],
  },
  {
    name: 'Accent',
    tokens: [
      { cls: 'bg-accent', name: 'accent' },
      { cls: 'bg-accent-hover', name: 'accent-hover' },
      { cls: 'bg-accent-muted', name: 'accent-muted' },
      { cls: 'bg-accent-contrast', name: 'accent-contrast' },
      { cls: 'bg-focus', name: 'focus' },
    ],
  },
  {
    name: 'Status',
    tokens: [
      { cls: 'bg-success', name: 'success' },
      { cls: 'bg-warning', name: 'warning' },
      { cls: 'bg-danger', name: 'danger' },
      { cls: 'bg-info', name: 'info' },
      { cls: 'bg-success-muted', name: 'success-muted' },
      { cls: 'bg-warning-muted', name: 'warning-muted' },
      { cls: 'bg-danger-muted', name: 'danger-muted' },
      { cls: 'bg-info-muted', name: 'info-muted' },
    ],
  },
];

function SwatchSheet() {
  return (
    <div className="flex flex-col gap-5">
      {SWATCH_GROUPS.map((group) => (
        <div key={group.name} className="flex flex-col gap-2">
          <span className="text-12 font-semibold text-fg-muted">{group.name}</span>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {group.tokens.map((t) => (
              <li key={t.name} className="flex min-w-0 flex-col gap-1.5">
                <span aria-hidden="true" className={`h-10 rounded-sm border border-border ${t.cls}`} />
                <span className="truncate font-mono text-11 text-fg-muted">{t.name}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Colour() {
  return (
    <DeepSection
      id="colour"
      code={code(4)}
      label="Colour"
      title={
        <>
          Twenty-four names, <Accent>two themes, one set of class names.</Accent>
        </>
      }
      lede="Components and screens never name a hue. They name a job — the ground, a raised surface, a line around a field, danger — and each theme answers with its own value. Dark is primary; light is the same names re-pointed."
      sunken
    >
      <Figure caption="Both plates are the same component with the same classes, rendered at once. The only difference is data-theme on the wrapper — which works on any element, so one panel can be light inside a dark app.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Island theme="dark">
            <SwatchSheet />
          </Island>
          <Island theme="light">
            <SwatchSheet />
          </Island>
        </div>
      </Figure>
      <div className="grid gap-4 md:grid-cols-3">
        <Plate slug="Spent on meaning">
          <p className="text-14 text-fg-muted">
            Colour carries state, not decoration. A Badge has three tones —{' '}
            <span className="text-fg">neutral, attention, danger</span> — and no colour prop, so a status cannot quietly
            become a fourth shade of green.
          </p>
        </Plate>
        <Plate slug="Checked in a browser">
          <p className="text-14 text-fg-muted">
            A test runner cannot see colour, so contrast is checked where it can be: axe runs over every story in a real
            browser, <span className="text-fg">in both themes</span>.
          </p>
        </Plate>
        <Plate slug="No primitives">
          <p className="text-14 text-fg-muted">
            The raw palette ships for tooling only. Reading a primitive directly from a component or an app is one of the
            things the usage gate fails on.
          </p>
        </Plate>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 05 Type & space */

const TYPE_STEPS = [
  { cls: 'text-24', px: 24, lh: '1.25', use: 'Page title' },
  { cls: 'text-20', px: 20, lh: '1.35', use: 'Section title' },
  { cls: 'text-16', px: 16, lh: '1.5', use: 'Emphasis, dialog body' },
  { cls: 'text-14', px: 14, lh: '1.55', use: 'Body — the default' },
  { cls: 'text-13', px: 13, lh: '1.4', use: 'Secondary text' },
  { cls: 'text-12', px: 12, lh: '1.5', use: 'Meta, helper text' },
  { cls: 'text-11', px: 11, lh: '1.3', use: 'Labels, badges' },
];

const SPACE_STEPS = [2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64];

const RADII = [
  { cls: 'rounded-xs', name: 'xs', px: '6' },
  { cls: 'rounded-sm', name: 'sm', px: '8' },
  { cls: 'rounded-md', name: 'md', px: '10' },
  { cls: 'rounded-lg', name: 'lg', px: '14' },
  { cls: 'rounded-full', name: 'full', px: '∞' },
];

function TypeAndSpace({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="type"
      code={code(5)}
      label="Type & space"
      title={
        <>
          Seven sizes, twelve steps, <Accent>no in-betweens.</Accent>
        </>
      }
      lede="Interface type runs from 11 to 24 pixels on Inter, self-hosted, with JetBrains Mono for data and metadata. Spacing, radius and type are scales, and a value between two steps is not available — the gate rejects it at the call site."
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Plate slug="Type scale" meta="Inter · 7 steps">
          <ol className="flex flex-col divide-y divide-border">
            {TYPE_STEPS.map((step) => (
              <li key={step.cls} className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-4 py-3">
                <span className="font-mono text-11 text-fg-faint">
                  {step.px}/{step.lh}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className={`${step.cls} truncate font-semibold text-fg`}>Every number lives in a column</span>
                  <span className="text-12 text-fg-muted">
                    <span className="font-mono">{step.cls}</span> · {step.use}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <div className="flex flex-col gap-1 rounded-sm bg-bg-sunken p-4">
            <span className="font-mono text-11 tracking-label text-fg-faint uppercase">JetBrains Mono · tabular by default</span>
            <span className="font-mono text-14 text-fg">1,284.50 · 0,092.07 · 12,000.00</span>
          </div>
        </Plate>

        <div className="flex flex-col gap-10">
          <Plate slug="Spacing" meta="12 steps · px">
            <ul className="flex flex-col gap-2" aria-label="The spacing scale: 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48 and 64 pixels.">
              {SPACE_STEPS.map((px) => (
                <li key={px} className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-3" aria-hidden="true">
                  <span className="text-right font-mono text-11 text-fg-muted">{px}</span>
                  <span className="bar block h-2.5 rounded-xs" style={{ width: `${(px / 64) * 100}%`, backgroundColor: accent }} />
                </li>
              ))}
            </ul>
            <p className="text-13 text-fg-muted">
              Layout components take a step by name — <span className="font-mono text-fg">gap="16"</span> — and a step the
              scale does not have is a type error.
            </p>
          </Plate>
          <Plate slug="Radius" meta="5 steps · px">
            <ul className="grid grid-cols-5 gap-3">
              {RADII.map((r) => (
                <li key={r.name} className="flex flex-col items-center gap-2">
                  <span aria-hidden="true" className={`size-11 border-2 border-fg-faint bg-surface-raised ${r.cls}`} />
                  <span className="font-mono text-11 text-fg-muted">
                    {r.name} · {r.px}
                  </span>
                </li>
              ))}
            </ul>
          </Plate>
        </div>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 06 Elevation */

/** Ground, card, raised row, a floating menu and a modal behind a scrim — all tone and boundary. */
function Layers() {
  return (
    <div className="flex flex-col gap-3 rounded-sm bg-bg-sunken p-3 sm:p-4">
      <span className="font-mono text-11 text-fg-faint">bg-sunken</span>
      <div className="flex flex-col gap-3 rounded-sm bg-bg p-3 sm:p-4">
        <span className="font-mono text-11 text-fg-faint">bg</span>
        <div className="relative flex flex-col gap-3 rounded-md bg-surface p-3 sm:p-4">
          <span className="font-mono text-11 text-fg-faint">surface · a card, no border</span>
          <div className="flex items-center justify-between gap-3 rounded-sm bg-surface-raised px-3 py-2.5">
            <span className="font-mono text-11 text-fg-muted">surface-raised</span>
            <span aria-hidden="true" className="h-1.5 w-12 rounded-full bg-fg-faint" />
          </div>
          <div className="ml-auto flex w-3/4 flex-col gap-1.5 rounded-md border border-border-float bg-surface-raised p-3 sm:w-3/5">
            <span className="font-mono text-11 text-fg-muted">floating · raised + border-float</span>
            <span aria-hidden="true" className="h-1.5 w-3/4 rounded-full bg-fg-faint" />
            <span aria-hidden="true" className="h-1.5 w-1/2 rounded-full bg-fg-faint" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Elevation() {
  return (
    <DeepSection
      id="elevation"
      code={code(6)}
      label="Elevation"
      title={
        <>
          Depth is a tone step. <Accent>There is no shadow token.</Accent>
        </>
      }
      lede="A resting surface sits one tone above what is under it. Something that floats — a menu, a tooltip — takes the raised tone and a one-pixel boundary. A dialog adds a scrim. That is the whole elevation model, and it is the same in both themes."
      sunken
    >
      <Figure caption="The same nesting in both themes. In light, the tonal ladder ends at white — a menu over a white card has no lighter step left — which is why floating layers carry a boundary rather than a second mechanism.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Island theme="dark">
            <Layers />
          </Island>
          <Island theme="light">
            <Layers />
          </Island>
        </div>
      </Figure>
      <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
        <Stat value="0" label="shadow tokens in the system" />
        <Stat value="7" label="Tailwind shadow utilities switched off in the preset, so none can be reached for" />
        <Stat value="3" label="elevation states: resting, floating, modal" />
        <Stat value="1" label="mechanism, running unchanged in dark and light" />
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 07 Components */

const INVENTORY: { group: string; items: string[] }[] = [
  { group: 'Primitives', items: ['Avatar', 'Badge', 'Button', 'IconButton', 'Link', 'Skeleton', 'Spinner'] },
  {
    group: 'Forms',
    items: ['Checkbox', 'CodeInput', 'FormField', 'Input', 'Label', 'PasswordInput', 'Select', 'Textarea', 'FormActions'],
  },
  { group: 'Layers & containers', items: ['Alert', 'Card', 'Modal', 'Tabs', 'SegmentedControl', 'Tooltip'] },
  { group: 'App frame', items: ['AppShell', 'SideNav', 'Menu', 'AccountMenu', 'Theme'] },
  { group: 'Page', items: ['Page', 'PageHeader', 'Section', 'Stack', 'Grid', 'AuthLayout', 'EmptyState'] },
  { group: 'Lists & records', items: ['DataList', 'DescriptionList', 'FilterBar', 'Table'] },
];
const COMPONENT_COUNT = INVENTORY.reduce((sum, g) => sum + g.items.length, 0); // 38

const CheckIcon = (
  <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
    <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Real components from the package, in whatever theme the page is in. */
function LiveBoard() {
  const [range, setRange] = useState('week');
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Plate slug="Button" meta="variant · loading">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="primary">
            Save changes
          </Button>
          <Button type="button" variant="secondary">
            Cancel
          </Button>
          <Button type="button" variant="ghost" pressed>
            Live
          </Button>
          <Button type="button" variant="secondary" loading>
            Exporting
          </Button>
        </div>
      </Plate>
      <Plate slug="Badge · Avatar" meta="tone · count">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="neutral">Draft</Badge>
          <Badge tone="attention">Needs review</Badge>
          <Badge tone="danger">Failed</Badge>
          <CountBadge count={128} max={99} label="unread messages" />
          <span className="flex items-center gap-2">
            <Avatar name="Sam Rivera" size="sm" />
            <span className="text-13 text-fg">Sam Rivera</span>
          </span>
        </div>
      </Plate>
      <Plate slug="Alert" meta="tone · actions">
        <Alert
          tone="warning"
          title="Your card expires this month"
          actions={
            <Button type="button" variant="secondary" size="sm">
              Update card
            </Button>
          }
        >
          Renewal on the 30th will fail without a new one.
        </Alert>
      </Plate>
      <Plate slug="Checkbox · SegmentedControl" meta="state · radiogroup">
        <div className="flex flex-col gap-3">
          <Checkbox label="Select all invoices" defaultChecked="indeterminate" checkIcon={CheckIcon} />
          <Checkbox label="Email me a receipt" defaultChecked checkIcon={CheckIcon} />
        </div>
        <SegmentedControl
          aria-label="Date range"
          value={range}
          onValueChange={setRange}
          items={[
            { value: 'day', label: 'Day' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month', count: 3, countLabel: 'new reports' },
          ]}
        />
      </Plate>
      <Plate slug="Loading" meta="skeleton first" className="md:col-span-2">
        <div className="grid items-center gap-6 sm:grid-cols-[auto_minmax(0,1fr)]">
          <Spinner size="lg" label="Loading invoices" />
          <Skeleton variant="text" lines={3} />
        </div>
        <p className="text-13 text-fg-muted">
          A skeleton when the shape is known, a spinner only when it is not — and a spinner must say what it is waiting
          for, because that is what a screen reader announces.
        </p>
      </Plate>
    </div>
  );
}

function Components({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="components"
      code={code(7)}
      label="Components"
      title={
        <>
          Thirty-eight components, <Accent>from a badge to the app frame.</Accent>
        </>
      }
      lede="Primitives, a full form layer, dialogs and menus, the shell with its sidebar and account menu, and the page patterns that sit inside it. The board below is not a picture — it is the library, running on this page. Switch the theme in the header and watch it follow."
    >
      <LiveBoard />
      <Figure caption={`All ${COMPONENT_COUNT} components, by what they are for. Each ships with its types, a story per variant and per state, and an automated accessibility check.`}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {INVENTORY.map((g) => (
            <div key={g.group} className="flex flex-col gap-3 rounded-lg border border-border p-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-14 font-semibold text-fg">{g.group}</span>
                <span className="font-mono text-12 text-fg-muted">{g.items.length}</span>
              </div>
              <div className="flex gap-0.5" aria-hidden="true">
                {g.items.map((item) => (
                  <span key={item} className="h-1.5 w-5 rounded-full" style={{ backgroundColor: accent }} />
                ))}
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {g.items.map((item) => (
                  <li key={item} className="rounded-sm bg-surface px-2 py-1 font-mono text-12 text-fg-muted">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Figure>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 08 Contracts */

const CONTRACTS: { ok: boolean; code: string; why: string }[] = [
  { ok: true, code: '<Stack gap="16">', why: 'A step on the spacing scale, by name.' },
  { ok: false, code: '<Stack gap="15">', why: 'Type error. 15 is not a step, so it cannot be typed.' },
  { ok: false, code: '<Badge tone="success">', why: 'Type error. A badge is neutral, attention or danger — nothing else.' },
  { ok: false, code: '<Checkbox />', why: 'Type error. It needs a visible label or an aria-label; one or the other.' },
  { ok: false, code: '<SegmentedControl items={…} />', why: 'Type error. A group of choices with no name cannot be placed.' },
  { ok: true, code: '<Alert tone="danger" dynamic>', why: 'Just happened, so it interrupts. Static alerts get no role at all.' },
];

function Contracts({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="contracts"
      code={code(8)}
      label="Contracts"
      title={
        <>
          The rules live <Accent>in the props.</Accent>
        </>
      }
      lede="Documentation is read once. Types are read on every keystroke. Where a rule can be expressed as a type — a scale, a required accessible name, a closed set of tones — it is, so the wrong version does not compile."
      sunken
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          {CONTRACTS.map((c) => (
            <li key={c.code} className="flex items-start gap-4 p-4 sm:p-5">
              <span
                aria-hidden="true"
                className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-11 ${c.ok ? 'border-2 text-fg' : 'border border-danger text-danger'}`}
                style={c.ok ? { borderColor: accent } : undefined}
              >
                {c.ok ? '✓' : '✕'}
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <code className="font-mono text-13 break-all text-fg">
                  <span className="sr-only">{c.ok ? 'Allowed: ' : 'Rejected: '}</span>
                  {c.code}
                </code>
                <span className="text-13 text-fg-muted">{c.why}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-6">
          <Plate slug="Behaviour, tested" meta="contract tests">
            <p className="text-14 text-fg-muted">
              What types cannot hold, tests do. Each component has contract tests for the promises in its spec:
            </p>
            <ul className="flex flex-col gap-2 text-14 text-fg">
              {[
                'A FormField label is really associated with its control',
                'An indeterminate checkbox reads as “mixed”',
                'A loading Button stays focusable, and nothing moves',
                'Read-only stays copyable; disabled does not',
              ].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <Pip accent={accent} className="mt-2" />
                  {line}
                </li>
              ))}
            </ul>
          </Plate>
          <Plate slug="Development warnings">
            <p className="text-14 text-fg-muted">
              Mistakes that fail silently — a virtualized table with no height to measure, so every row renders — warn in
              development and are stripped from production builds.
            </p>
          </Plate>
        </div>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 09 Gates */

const USAGE_RULES = [
  { id: 'raw-hex', what: 'A raw hex colour instead of a semantic token' },
  { id: 'palette-class', what: 'A raw Tailwind palette class, like a numbered blue' },
  { id: 'off-scale-value', what: 'An arbitrary size, gap, radius or weight on a scale the system owns' },
  { id: 'primitive-token', what: 'A primitive palette token read directly' },
  { id: 'shadow', what: 'Any shadow — elevation is tone' },
  { id: 'unknown-token', what: 'A token that does not exist — the silent failure a rename causes' },
];

const PIPELINE = [
  { step: 'check-tokens', note: 'JSON and CSS agree' },
  { step: 'check-usage', note: 'The library passes its own gate' },
  { step: 'typecheck', note: 'Contracts compile' },
  { step: 'test', note: '909 tests' },
  { step: 'build', note: 'Plus a check of what ships' },
  { step: 'browser', note: 'axe in both themes' },
];

const TESTS_TOTAL = 909;
const STORY_TESTS = 489;

function Gates({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="gates"
      code={code(9)}
      label="Gates"
      title={
        <>
          Gates, <Accent>not guidance.</Accent>
        </>
      }
      lede="Every rule on this page is enforced by a script, in the library’s CI and in yours. The usage gate ships inside the package, so an app runs exactly the rules for the tokens it installed."
    >
      <Figure caption="The library’s pipeline, in order. Any step failing stops the release.">
        <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {PIPELINE.map((p, i) => (
            <li key={p.step} className="flex min-w-0 flex-col gap-2 rounded-md border border-border bg-surface p-4">
              <span className="flex items-center gap-2 font-mono text-11 text-fg-faint">
                <Pip accent={accent} />
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="font-mono text-13 text-fg">{p.step}</span>
              <span className="text-12 text-fg-muted">{p.note}</span>
            </li>
          ))}
        </ol>
      </Figure>

      <div className="grid gap-12 lg:grid-cols-2">
        <Figure caption="What d3-check-usage fails on, in any app that runs it. A genuine exception needs a written reason on the line above — an exemption is a decision, not a silence.">
          <dl className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {USAGE_RULES.map((r) => (
              <div key={r.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
                <dt className="font-mono text-12 text-danger sm:w-36 sm:shrink-0">{r.id}</dt>
                <dd className="text-14 text-fg-muted">{r.what}</dd>
              </div>
            ))}
          </dl>
        </Figure>
        <Figure caption={`${TESTS_TOTAL} tests in 42 files. Every story is rendered and swept by axe — a new story file is picked up automatically, and a guard fails the suite if none are found.`}>
          <div className="flex flex-col gap-6">
            <BarRow
              label="Story tests"
              value={STORY_TESTS}
              fraction={STORY_TESTS / TESTS_TOTAL}
              accent={accent}
              note="244 stories, each rendered and checked by axe."
            />
            <BarRow
              label="Contract & unit"
              value={TESTS_TOTAL - STORY_TESTS}
              fraction={(TESTS_TOTAL - STORY_TESTS) / TESTS_TOTAL}
              accent={accent}
              muted
              note="The promises in each component’s spec."
            />
            <div className="grid grid-cols-2 gap-6 border-t border-border pt-6">
              <Stat value="244" label="stories, every one an accessibility check" />
              <Stat value="11" label="browser specs: axe in both themes, focus, geometry, CSP, visual" />
            </div>
          </div>
        </Figure>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 10 Why */

const PRINCIPLES = [
  {
    title: 'Enforced, because conventions drift',
    body: 'A rule written down somewhere is how five apps reached 176 colours. A rule that fails the build is the only kind that holds under deadline.',
  },
  {
    title: 'Names for jobs, not hues',
    body: 'Code that says surface or danger survives a rebrand and a second theme untouched. Code that says a particular blue does not.',
  },
  {
    title: 'Themes as a scope, not a switch',
    body: 'Tokens are scoped to any element with a data-theme, so a light panel can sit inside a dark app. The paired plates on this page do exactly that.',
  },
  {
    title: 'One elevation mechanism',
    body: 'Tone and a boundary work the same in dark and light. Shadows look different in each and vanish on dark grounds.',
  },
  {
    title: 'Accessibility in the API',
    body: 'Required names, closed tone sets and role contracts mean the accessible version is the one that compiles, not the one somebody remembered.',
  },
  {
    title: 'Tailwind optional',
    body: 'The components need only the token stylesheet. Tailwind v4 apps get matching utilities from one import; plain-CSS apps lose nothing.',
  },
];

function Why({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="why"
      code={code(10)}
      label="Why it is built this way"
      title={
        <>
          Fewer choices, <Accent>on purpose.</Accent>
        </>
      }
      lede="Each constraint here removes a decision a team would otherwise make again on every screen, slightly differently each time."
      sunken
    >
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PRINCIPLES.map((p, i) => (
          <li key={p.title} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-6">
            <span className="flex items-center gap-2 font-mono text-12 text-fg-muted">
              <Pip accent={accent} />
              {code(i + 1).replace('--', 'rule-')}
            </span>
            <span className="text-16 font-semibold text-fg">{p.title}</span>
            <span className="text-14 text-fg-muted">{p.body}</span>
          </li>
        ))}
      </ul>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- Page */

export function UiDeepDive({ project }: { project: Project }) {
  const accent = project.accent;
  return (
    <>
      <DeepIndex entries={ENTRIES} accent={accent} />
      <Sprawl accent={accent} />
      <Walkthrough accent={accent} />
      <Architecture accent={accent} />
      <Colour />
      <TypeAndSpace accent={accent} />
      <Elevation />
      <Components accent={accent} />
      <Contracts accent={accent} />
      <Gates accent={accent} />
      <Why accent={accent} />
    </>
  );
}
