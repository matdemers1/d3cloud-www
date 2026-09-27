import type { ReactNode } from 'react';
import type { Project } from '../../content/projects';
import { BarRow, DeepIndex, DeepSection, Figure, FlowDown, type DeepEntry } from '../../components/Deep';
import { Accent, Quiet } from '../../components/Marketing';

/**
 * D3 QR, explained (DI-REQ-039). Laid out like the thing it prints: every
 * section is a cell on a label sheet — A1 to B3 — framed by dashed cut lines.
 *
 * Every number comes from the d3-qr repository: src/lib/pdf-layout.ts (page
 * sizes and the page layout, in points), src/lib/qr.ts (512 px images, the
 * one-module margin, the logo's 22% pad and 18% size), the error-correction
 * options in src/components/config/ConfigPanel.tsx, the 500-row notice in
 * src/components/batch/BatchSizeWarning.tsx, the CSV header names in
 * src/lib/csv.ts, the file names in src/lib/zip.ts and the CSP in
 * src/worker.ts. The QR codes drawn here are illustrations; they do not scan.
 */

const ENTRIES: DeepEntry[] = [
  { id: 'walkthrough', label: 'Walkthrough' },
  { id: 'inputs', label: 'Your list' },
  { id: 'tab', label: 'In the tab' },
  { id: 'anatomy', label: 'Inside a code' },
  { id: 'exports', label: 'What comes out' },
  { id: 'why', label: 'Why no server' },
];

/* ---------------------------------------------------------------- Shared drawing parts */

/** A cell on the sheet: dashed cut lines, its coordinate in the corner. */
function Cell({ at, children, className = '' }: { at?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`relative flex flex-col gap-4 rounded-md border border-dashed border-border-field bg-surface p-5 ${className}`}>
      {at && (
        <span aria-hidden="true" className="absolute top-2 right-3 font-mono text-11 text-fg-faint">
          {at}
        </span>
      )}
      {children}
    </div>
  );
}

function MonoLabel({ children }: { children: ReactNode }) {
  return <span className="font-mono text-11 tracking-label text-fg-faint uppercase">{children}</span>;
}

/** "This goes into that" — points down on a phone, right when there is room. */
function Arrow({ accent, tone = 'accent' }: { accent: string; tone?: 'accent' | 'faint' | 'crossed' }) {
  return (
    <span aria-hidden="true" className="flex items-center justify-center py-1 lg:px-1 lg:py-0">
      <svg width="28" height="14" viewBox="0 0 28 14" className="rotate-90 lg:rotate-0">
        <path
          d="M1 7 H25 M19 1 L26 7 L19 13"
          fill="none"
          strokeWidth="1.5"
          strokeLinecap="round"
          className={tone === 'accent' ? undefined : 'stroke-fg-faint'}
          style={tone === 'accent' ? { stroke: accent } : undefined}
        />
        {tone === 'crossed' && (
          <path d="M9 2 L17 12 M17 2 L9 12" fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-danger" />
        )}
      </svg>
    </span>
  );
}

/* ---------------------------------------------------------------- A module grid */

/**
 * A 25×25 grid laid out like a version-2 QR code: three finder patterns, their
 * separators, the timing lines, one alignment pattern, the format strips and
 * the dark module are placed where the standard puts them. The data modules
 * are a deterministic scramble — this looks like a QR code, it is not one.
 */
const N = 25;
type Kind = 'finder' | 'separator' | 'timing' | 'align' | 'format' | 'data';

function kindAt(x: number, y: number): Kind {
  const near = (a: number, b: number, size: number) =>
    (a < size && b < size) || (a >= N - size && b < size) || (a < size && b >= N - size);
  if (near(x, y, 7)) return 'finder';
  if (near(x, y, 8)) return 'separator';
  if (Math.abs(x - 18) <= 2 && Math.abs(y - 18) <= 2) return 'align';
  if (y === 6 || x === 6) return 'timing';
  if ((y === 8 && (x <= 8 || x >= N - 8)) || (x === 8 && (y <= 8 || y >= N - 8))) return 'format';
  return 'data';
}

function scramble(x: number, y: number): boolean {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h & 1) === 1;
}

function isDark(x: number, y: number, kind: Kind): boolean {
  switch (kind) {
    case 'finder': {
      const cx = x < 7 ? 3 : N - 4;
      const cy = y < 7 ? 3 : N - 4;
      return Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== 2;
    }
    case 'separator':
      return false;
    case 'align':
      return Math.max(Math.abs(x - 18), Math.abs(y - 18)) !== 1;
    case 'timing':
      return (x + y) % 2 === 0;
    case 'format':
      return (x === 8 && y === N - 8) || scramble(x + 3, y + 5);
    case 'data':
      return scramble(x, y);
  }
}

/** One SVG path per kind of module, each dark module a unit square. */
const PATHS: Record<Kind, string> = (() => {
  const out: Record<Kind, string> = { finder: '', separator: '', timing: '', align: '', format: '', data: '' };
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const kind = kindAt(x, y);
      if (isDark(x, y, kind)) out[kind] += `M${x} ${y}h1v1h-1z`;
    }
  }
  return out;
})();

const ALL_DARK = Object.values(PATHS).join('');

/** A plain code, `margin` modules of blank paper around it. */
function PlainCode({ margin = 1, className = '', children }: { margin?: number; className?: string; children?: ReactNode }) {
  const size = N + margin * 2;
  return (
    <svg viewBox={`${-margin} ${-margin} ${size} ${size}`} className={className} aria-hidden="true" shapeRendering="crispEdges">
      <rect x={-margin} y={-margin} width={size} height={size} className="fill-surface" />
      <path d={ALL_DARK} className="fill-fg" />
      {children}
    </svg>
  );
}

/* ---------------------------------------------------------------- A1 Walkthrough */

function MiniQr() {
  return <PlainCode className="size-12 shrink-0 rounded-xs" />;
}

const STEPS: { title: string; body: string; screen: ReactNode }[] = [
  {
    title: 'Paste your list',
    body: 'One link per line, straight from a spreadsheet, a doc or a bulleted list — bullets and dashes are stripped.',
    screen: (
      <div className="flex flex-col gap-3">
        <div className="rounded-sm border border-border-field bg-bg p-3 font-mono text-12 text-fg">
          example.com/menu
          <br />
          <Quiet>– </Quiet>example.com/wifi
          <br />
          <Quiet>• </Quiet>example.com/rsvp
        </div>
        <div className="flex items-center justify-between gap-2 text-12">
          <Quiet>3 URLs ready</Quiet>
          <span className="rounded-sm bg-fg px-2.5 py-1 text-bg">Add 3 to batch</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Check the rows',
    body: 'Each link becomes a row you can label, reorder or fix. A bare address gets https:// in front; anything that is not really a link is flagged.',
    screen: (
      <ol className="flex flex-col divide-y divide-border rounded-sm border border-border-field bg-bg text-12">
        {[
          { url: 'https://example.com/menu', label: 'Table menu' },
          { url: 'https://example.com/wifi', label: 'Guest Wi-Fi' },
          { url: 'javascript:alert(1)', label: '—', flag: true },
        ].map((row, i) => (
          <li key={row.url} className="grid grid-cols-[1rem_minmax(0,1fr)] gap-x-2 px-3 py-2">
            <span className="font-mono text-fg-faint">{i + 1}</span>
            <span className="truncate font-mono text-fg">{row.url}</span>
            <span />
            <span className={row.flag ? 'text-warning' : 'text-fg-muted'}>
              {row.flag ? '⚠ Looks like a script, not a link' : row.label}
            </span>
          </li>
        ))}
      </ol>
    ),
  },
  {
    title: 'Set up the page',
    body: 'Letter or A4, a header and footer, colours, how much damage each code should survive. The preview is the page you will print.',
    screen: (
      <div className="flex items-start gap-3">
        <div className="flex aspect-[612/792] w-20 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xs border border-border-field bg-bg p-2">
          <span className="h-1 w-8 rounded-full bg-fg" />
          <MiniQr />
          <span className="h-0.5 w-10 rounded-full bg-fg-faint" />
        </div>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1 text-12">
          <dt className="text-fg-faint">Page</dt>
          <dd className="text-fg">Letter</dd>
          <dt className="text-fg-faint">Header</dt>
          <dd className="truncate text-fg">Spring gala</dd>
          <dt className="text-fg-faint">Error corr.</dt>
          <dd className="text-fg">Medium</dd>
          <dt className="text-fg-faint">Numbers</dt>
          <dd className="text-fg">On</dd>
        </dl>
      </div>
    ),
  },
  {
    title: 'Download',
    body: 'A print-ready PDF, or every code as its own PNG or SVG in one zip. Save the batch as a file if you want to come back to it.',
    screen: (
      <div className="flex flex-col gap-1.5 text-12">
        {['Download PDF (3 pages)', 'Download all PNGs (3)', 'Download all SVGs (3)'].map((label, i) => (
          <span
            key={label}
            className={`rounded-sm px-3 py-1.5 ${i === 0 ? 'bg-fg text-bg' : 'border border-border-field bg-bg text-fg'}`}
          >
            {label}
          </span>
        ))}
        <span className="px-3 py-1 text-fg-muted">Save batch</span>
      </div>
    ),
  },
];

function Walkthrough({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="walkthrough"
      code="A1"
      label="A walkthrough"
      title={
        <>
          Paste a list, <Accent>print a stack.</Accent>
        </>
      }
      lede="Menus for every table, badges for an event, a tag on every piece of equipment that links to its record — the job is the same: a list of links in, a pile of codes out."
    >
      <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((step, index) => (
          <li key={step.title}>
            <Cell at={`A${index + 1}`} className="h-full">
              <span className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-8 items-center justify-center rounded-full border border-border-field font-mono text-13 text-fg"
                  style={{ borderColor: accent }}
                >
                  {index + 1}
                </span>
                <h3 className="text-16 font-semibold text-fg">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </h3>
              </span>
              <p className="text-14 text-fg-muted">{step.body}</p>
              <div role="img" aria-label={`Illustration: ${step.title}`} className="mt-auto rounded-md bg-bg-sunken p-3">
                <div aria-hidden="true">{step.screen}</div>
              </div>
            </Cell>
          </li>
        ))}
      </ol>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- A2 Your list */

const WAYS_IN: { title: string; body: string }[] = [
  { title: 'Type one', body: 'A single link and an optional label, previewed as you type.' },
  { title: 'Paste many', body: 'One per line. Bullets, dashes and arrows at the start of a line are dropped.' },
  { title: 'Drop a CSV', body: 'Exported from any spreadsheet. The columns are found by their names.' },
  { title: 'Load a batch', body: 'A batch you saved earlier, rows and settings together, as a small JSON file.' },
];

const CSV_ROWS = [
  ['Front desk', 'example.com/desk', 'lobby'],
  ['Printer 2', 'example.com/assets/0042', 'room 3'],
  ['Guest Wi-Fi', 'example.com/wifi', ''],
];

function Inputs({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="inputs"
      code="A2"
      label="Your list"
      title={
        <>
          However your list arrives, <Accent>it fits.</Accent>
        </>
      }
      lede="Most lists already live in a spreadsheet. Drop the CSV in and the link and label columns are picked out by their headings; other columns are ignored."
      sunken
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Figure caption="A CSV with a Name, a Link and a Notes column. “Link” is recognised as the address (so are url, href and address); “Name” as the label (so are label, title and description). Without a header row, the first column is the link and the second the label.">
          <div
            role="img"
            aria-label="A three-column spreadsheet — Name, Link, Notes — becomes three rows. Each row keeps the Name as its label and the Link, with https:// added, as its address. The Notes column is ignored."
            className="flex flex-col gap-2 lg:flex-row lg:items-center"
          >
            <div aria-hidden="true" className="min-w-0 flex-1 overflow-hidden rounded-md border border-border-field bg-surface">
              <div className="grid grid-cols-[minmax(0,4fr)_minmax(0,6fr)_minmax(0,3fr)] font-mono text-12">
                {['Name', 'Link', 'Notes'].map((head, i) => (
                  <span
                    key={head}
                    className={`border-b-2 px-3 py-2 ${i === 2 ? 'border-border text-fg-faint' : 'text-fg'}`}
                    style={i < 2 ? { borderBottomColor: accent } : undefined}
                  >
                    {head}
                  </span>
                ))}
                {CSV_ROWS.map((row) =>
                  row.map((cell, i) => (
                    <span
                      key={`${row[0]}-${i}`}
                      className={`truncate border-b border-border px-3 py-2 ${i === 2 ? 'text-fg-faint line-through' : 'text-fg-muted'}`}
                    >
                      {cell || ' '}
                    </span>
                  )),
                )}
              </div>
            </div>
            <Arrow accent={accent} />
            <ol aria-hidden="true" className="flex min-w-0 flex-1 flex-col gap-2">
              {CSV_ROWS.map(([label, url]) => (
                <li key={label} className="flex min-w-0 items-center gap-3 rounded-md border border-border bg-surface p-2.5">
                  <PlainCode className="size-10 shrink-0 rounded-xs" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-13 font-semibold text-fg">{label}</span>
                    <span className="truncate font-mono text-11 text-fg-muted">https://{url}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </Figure>

        <div className="flex flex-col gap-4">
          <ul className="grid gap-3 sm:grid-cols-2">
            {WAYS_IN.map((way) => (
              <li key={way.title} className="flex flex-col gap-1 rounded-md border border-border bg-surface p-4">
                <span className="text-14 font-semibold text-fg">{way.title}</span>
                <span className="text-13 text-fg-muted">{way.body}</span>
              </li>
            ))}
          </ul>
          <p className="text-14 text-fg-muted">
            There is no cap on how many. Past <span className="font-mono text-fg">500</span> rows a notice suggests
            splitting the batch, because a very large one can slow the browser down.
          </p>
          <p className="text-14 text-fg-muted">
            Links starting <span className="font-mono text-fg">javascript:</span>,{' '}
            <span className="font-mono text-fg">data:</span>, <span className="font-mono text-fg">file:</span> or{' '}
            <span className="font-mono text-fg">vbscript:</span>, or with no real host, are flagged before they are
            printed.
          </p>
        </div>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- A3 In the tab */

function Stage({ title, detail, accent }: { title: string; detail: string; accent?: string }) {
  return (
    <div
      className="flex min-w-0 flex-1 flex-col gap-1 rounded-md border border-border bg-surface p-4"
      style={accent ? { borderTopColor: accent, borderTopWidth: 3 } : undefined}
    >
      <span className="text-14 font-semibold text-fg">{title}</span>
      <span className="text-13 text-fg-muted">{detail}</span>
    </div>
  );
}

function InTheTab({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="tab"
      code="A3"
      label="How it works"
      title={
        <>
          Everything happens <Accent>in this tab.</Accent>
        </>
      }
      lede="The page arrives once, as a handful of static files. After that your list is read, encoded and drawn by code running in your browser, and the results go straight to your Downloads folder. There is no step where anything is sent anywhere."
    >
      <div
        role="img"
        aria-label="Architecture. The site sends static files to your browser once. Inside the browser tab, your list is read, encoded into QR codes, and drawn as a PDF, PNGs or SVGs, which are saved to your Downloads folder. The path from the tab to any other server is crossed out: the page is not allowed to send data anywhere."
        className="flex flex-col"
      >
        <div aria-hidden="true" className="mx-auto flex flex-col items-center gap-1 rounded-full border border-dashed border-border-field px-5 py-2.5 text-center text-13 text-fg-muted">
          <span>
            <span className="text-fg">qr.d3cloud.io</span> · static files, sent once
          </span>
        </div>
        <FlowDown accent={accent} />

        <div aria-hidden="true" className="flex flex-col gap-4 rounded-lg border border-border-field bg-bg-sunken p-4 sm:p-5">
          <MonoLabel>Your computer</MonoLabel>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-md border border-border-field bg-bg p-4">
              <MonoLabel>This browser tab</MonoLabel>
              <div className="flex flex-col lg:flex-row lg:items-center">
                <Stage title="Your list" detail="Typed, pasted, a CSV or a saved batch" />
                <Arrow accent={accent} />
                <Stage title="Read" detail="Rows parsed and checked — papaparse for CSV" accent={accent} />
                <Arrow accent={accent} />
                <Stage title="Encode" detail="Each link becomes a module grid — the qrcode library" accent={accent} />
                <Arrow accent={accent} />
                <Stage title="Draw" detail="Canvas for PNGs, pdf-lib for the PDF, JSZip to bundle" accent={accent} />
              </div>
            </div>
            <Arrow accent={accent} />
            <div className="flex flex-col justify-center gap-1 rounded-md border border-border-field bg-surface p-4 lg:w-48">
              <span className="text-14 font-semibold text-fg">Your Downloads</span>
              <span className="font-mono text-12 text-fg-muted">qr-codes-….pdf</span>
              <span className="font-mono text-12 text-fg-muted">qr-pngs-….zip</span>
              <span className="font-mono text-12 text-fg-muted">qr-svgs-….zip</span>
            </div>
          </div>
        </div>

        <div aria-hidden="true" className="flex flex-col items-center">
          <span className="flex h-10 w-px items-center justify-center bg-border-field">
            <span className="rounded-full bg-bg px-1 font-mono text-16 text-danger">✕</span>
          </span>
          <div className="flex w-full max-w-md flex-col gap-1 rounded-md border border-dashed border-border-field p-4 text-center">
            <span className="text-14 font-semibold text-fg-muted line-through decoration-danger decoration-2">
              Anyone else’s server
            </span>
            <span className="text-13 text-fg-muted">No upload, no account, no analytics, no log of what you made.</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Cell>
          <MonoLabel>Enforced, not promised</MonoLabel>
          <code className="font-mono text-13 break-words text-fg">connect-src &apos;self&apos;; form-action &apos;none&apos;</code>
          <p className="text-13 text-fg-muted">
            The page’s security policy forbids it from sending data to any other address, and from submitting a form at
            all. Its own address serves static files and nothing else. You can check: open your browser’s network panel
            and make a batch.
          </p>
        </Cell>
        <Cell>
          <MonoLabel>Nothing kept</MonoLabel>
          <p className="text-13 text-fg-muted">
            Your list lives in the tab’s memory. Close it and it is gone — the only thing the page remembers is whether
            you chose light or dark. To pick up later, save the batch as a file on your own machine.
          </p>
        </Cell>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- B1 Inside a code */

const MARGIN = 3;

const LEGEND: { kind: Kind | 'quiet'; title: string; body: string }[] = [
  { kind: 'finder', title: 'Finder patterns', body: 'Three squares in the corners tell a camera there is a code, where it is and which way up.' },
  { kind: 'timing', title: 'Timing lines', body: 'Alternating dark and light between the finders, so the reader can count the grid.' },
  { kind: 'align', title: 'Alignment pattern', body: 'A smaller target that keeps a tilted or curved code readable.' },
  { kind: 'format', title: 'Format strips', body: 'Which error-correction level and mask were used, stored twice.' },
  { kind: 'data', title: 'Data', body: 'Your link, plus extra error-correction bytes that rebuild it if part of the code is lost.' },
  { kind: 'quiet', title: 'Quiet zone', body: 'Blank paper around the edge, so the finders stand out from whatever is printed next to them.' },
];

function Swatch({ kind, accent }: { kind: Kind | 'quiet'; accent: string }) {
  const base = 'size-4 shrink-0 rounded-xs';
  switch (kind) {
    case 'finder':
      return <span className={`${base} border border-fg-faint`} style={{ backgroundColor: accent }} />;
    case 'align':
      return <span className={`${base} bg-info`} />;
    case 'timing':
      return <span className={`${base} bg-fg`} />;
    case 'format':
      return <span className={`${base} bg-warning`} />;
    case 'data':
      return <span className={`${base} bg-fg-faint`} />;
    default:
      return <span className={`${base} border border-dashed border-fg-muted`} />;
  }
}

function ZonedCode({ accent }: { accent: string }) {
  const size = N + MARGIN * 2;
  return (
    <svg
      viewBox={`${-MARGIN} ${-MARGIN} ${size} ${size}`}
      className="h-auto w-full max-w-md"
      role="img"
      aria-label="Illustration of a QR code's parts: finder squares in three corners, timing lines between them, a small alignment square near the bottom right, format strips beside the finders, data filling the rest, and a blank quiet zone around the edge."
      shapeRendering="crispEdges"
    >
      <rect x={-MARGIN} y={-MARGIN} width={size} height={size} rx="0.6" className="fill-surface" />
      <rect
        x={-MARGIN + 0.6}
        y={-MARGIN + 0.6}
        width={size - 1.2}
        height={size - 1.2}
        fill="none"
        strokeWidth="0.12"
        strokeDasharray="0.5 0.4"
        className="stroke-fg-muted"
        shapeRendering="geometricPrecision"
      />
      <path d={PATHS.data} className="fill-fg-faint" />
      <path d={PATHS.format} className="fill-warning" />
      <path d={PATHS.timing} className="fill-fg" />
      <path d={PATHS.align} className="fill-info" />
      <path d={PATHS.finder} style={{ fill: accent }} />
      {[
        [0, 0],
        [N - 7, 0],
        [0, N - 7],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="7" height="7" fill="none" strokeWidth="0.15" className="stroke-fg-muted" />
      ))}
    </svg>
  );
}

const ECL = [
  { level: 'L', name: 'Low', pct: 7, note: 'Smallest code, least tolerance' },
  { level: 'M', name: 'Medium', pct: 15, note: 'The default' },
  { level: 'Q', name: 'Quartile', pct: 25, note: 'More tolerance, a denser code' },
  { level: 'H', name: 'High', pct: 30, note: 'Forced on whenever a logo is added' },
];

function Anatomy({ accent }: { accent: string }) {
  // The logo drawing uses the export's real proportions: a one-module margin,
  // a pad cleared across 22% of the image and the logo drawn at 18%.
  const img = N + 2;
  const pad = img * 0.22;
  const logo = img * 0.18;
  return (
    <DeepSection
      id="anatomy"
      code="B1"
      label="Inside a code"
      title={
        <>
          A small grid, <Accent>built to survive.</Accent>
        </>
      }
      lede="A QR code is a grid of squares with a few landmarks a camera looks for first. Everything else is your link, written with enough redundancy that a scuff, a fold or a logo in the middle does not stop it scanning."
      sunken
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
        <Figure caption="An illustration generated from a module grid laid out like a small QR code, with each part coloured. It is not a real code and will not scan.">
          <ZonedCode accent={accent} />
        </Figure>
        <ul className="flex flex-col gap-4">
          {LEGEND.map((item) => (
            <li key={item.kind} className="flex items-start gap-3">
              <span aria-hidden="true" className="pt-0.5">
                <Swatch kind={item.kind} accent={accent} />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-14 font-semibold text-fg">{item.title}</span>
                <span className="text-13 text-fg-muted">{item.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Figure caption="The four error-correction levels you can choose, and roughly how much of a code each can lose and still be read.">
          <div className="flex flex-col gap-5">
            {ECL.map((row) => (
              <BarRow
                key={row.level}
                label={`${row.level} · ${row.name}`}
                value={`~${row.pct}%`}
                fraction={row.pct / 30}
                accent={accent}
                muted={row.level !== 'M' && row.level !== 'H'}
                note={row.note}
              />
            ))}
          </div>
        </Figure>
        <Cell>
          <div className="flex items-center gap-5">
            <PlainCode className="size-28 shrink-0 rounded-xs">
              <rect x={(N - pad) / 2} y={(N - pad) / 2} width={pad} height={pad} className="fill-surface" />
              <rect x={(N - logo) / 2} y={(N - logo) / 2} width={logo} height={logo} rx="0.8" style={{ fill: accent }} />
            </PlainCode>
            <div className="flex flex-col gap-1">
              <MonoLabel>Your logo in the middle</MonoLabel>
              <span className="text-13 text-fg-muted">
                PNG or SVG. The middle <span className="font-mono text-fg">22%</span> is cleared and the logo drawn at{' '}
                <span className="font-mono text-fg">18%</span> of the width — so High is switched on to cover the
                modules it hides.
              </span>
            </div>
          </div>
          <p className="text-13 text-fg-muted">
            JPEGs are turned away: with no transparent background, their white box breaks the contrast the camera
            needs.
          </p>
        </Cell>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- B2 What comes out */

/** Page furniture, in the PDF's own points (Letter, 612 × 792), measured from the top. */
const PAGE = { w: 612, h: 792, margin: 36, qr: 300 };
const QR_X = (PAGE.w - PAGE.qr) / 2;
const QR_Y = (PAGE.h - PAGE.qr) / 2;
const LABEL_BASE = QR_Y - 30;
const URL_BASE = QR_Y + PAGE.qr + 24;

const CALLOUTS: { n: number; x: number; y: number; title: string; body: string }[] = [
  { n: 1, x: PAGE.margin, y: PAGE.margin - 22, title: 'Header', body: 'Text on the left, an image on the right. The same on every page.' },
  { n: 2, x: PAGE.w / 2 - 110, y: LABEL_BASE - 10, title: 'Label', body: 'The row’s label in bold, above its code.' },
  { n: 3, x: QR_X - 40, y: QR_Y + 20, title: 'The code', body: '300 points square, centred — just over four inches.' },
  { n: 4, x: PAGE.w / 2 - 150, y: URL_BASE - 4, title: 'The link', body: 'Printed under the code, shortened past 80 characters. Can be turned off.' },
  { n: 5, x: PAGE.margin, y: PAGE.h - PAGE.margin + 16, title: 'Footer', body: 'A second line of text and an image, smaller.' },
  { n: 6, x: PAGE.w - PAGE.margin - 20, y: PAGE.h - PAGE.margin + 16, title: 'Page number', body: '“Page 3 of 40”, bottom right. Optional.' },
];

function PdfPage({ accent }: { accent: string }) {
  return (
    <div className="relative mx-auto w-full max-w-xs">
      {/* Two pages behind: one code per page. */}
      <span aria-hidden="true" className="absolute inset-0 translate-x-3 translate-y-3 rounded-sm border border-border bg-surface-raised" />
      <span aria-hidden="true" className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-sm border border-border bg-surface-raised" />
      <svg viewBox={`0 0 ${PAGE.w} ${PAGE.h}`} className="relative block h-auto w-full" aria-hidden="true">
        <rect width={PAGE.w} height={PAGE.h} rx="6" className="fill-surface stroke-border-field" strokeWidth="2" />
        {/* Header text and image. */}
        <rect x={PAGE.margin} y={PAGE.margin - 9} width="170" height="9" rx="2" className="fill-fg-muted" />
        <rect x={PAGE.w - PAGE.margin - 72} y={PAGE.margin} width="72" height="36" rx="4" className="fill-fg-faint" />
        {/* Label, bold. */}
        <rect x={PAGE.w / 2 - 70} y={LABEL_BASE - 11} width="140" height="11" rx="2" className="fill-fg" />
        {/* The code, at its real size on the page. */}
        <svg x={QR_X} y={QR_Y} width={PAGE.qr} height={PAGE.qr} viewBox={`-1 -1 ${N + 2} ${N + 2}`} shapeRendering="crispEdges">
          <path d={ALL_DARK} className="fill-fg" />
        </svg>
        {/* The link. */}
        <rect x={PAGE.w / 2 - 110} y={URL_BASE - 8} width="220" height="7" rx="2" className="fill-fg-faint" />
        {/* Footer text and page number. */}
        <rect x={PAGE.margin} y={PAGE.h - PAGE.margin - 7} width="130" height="7" rx="2" className="fill-fg-faint" />
        <rect x={PAGE.w - PAGE.margin - 70} y={PAGE.h - PAGE.margin - 7} width="70" height="7" rx="2" className="fill-fg-faint" />
      </svg>
      {CALLOUTS.map((c) => (
        <span
          key={c.n}
          aria-hidden="true"
          className="absolute flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-bg font-mono text-11 text-fg"
          style={{ left: `${(c.x / PAGE.w) * 100}%`, top: `${(c.y / PAGE.h) * 100}%`, borderColor: accent }}
        >
          {c.n}
        </span>
      ))}
    </div>
  );
}

const FILES = [
  { name: 'Front-desk', note: 'from its label' },
  { name: 'Printer-2', note: 'from its label' },
  { name: 'example-com-wifi', note: 'no label: from the link' },
  { name: 'Front-desk-2', note: 'a repeat gets a number' },
];

function Exports({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="exports"
      code="B2"
      label="What comes out"
      title={
        <>
          A page per code, <Accent>or a file per code.</Accent>
        </>
      }
      lede="The PDF is for printing and handing out: every code on its own page, labelled, ready for a guillotine or a clipboard. The images are for putting codes into something else — a label template, a slide, a sign."
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Figure caption="One page of the PDF, drawn from the layout the PDF is built with: Letter here (612 × 792 points), A4 the other choice, 36-point margins.">
          <div
            role="img"
            aria-label="A PDF page: a header across the top, the label in bold above a large centred QR code, the link below it, a footer and a page number at the bottom. More pages sit behind it, one per code."
            className="flex flex-col gap-8 sm:flex-row sm:items-start lg:flex-col"
          >
            <PdfPage accent={accent} />
            <ol aria-hidden="true" className="flex flex-col gap-3">
              {CALLOUTS.map((c) => (
                <li key={c.n} className="flex items-start gap-3">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 bg-bg font-mono text-11 text-fg" style={{ borderColor: accent }}>
                    {c.n}
                  </span>
                  <span className="text-13 text-fg-muted">
                    <span className="font-semibold text-fg">{c.title}.</span> {c.body}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </Figure>

        <div className="flex flex-col gap-6">
          <Figure caption="Inside the zip: one image per row, named after its label, or its link when it has none. Both zips use the same names.">
            <div
              role="img"
              aria-label="A sheet of four image files: Front-desk.png, Printer-2.png, example-com-wifi.png and Front-desk-2.png."
              className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-dashed border-border-field bg-border sm:grid-cols-4"
            >
              {FILES.map((file) => (
                <div key={file.name} aria-hidden="true" className="flex min-w-0 flex-col items-center gap-2 bg-surface p-4">
                  <PlainCode className="size-16 rounded-xs" />
                  <span className="max-w-full truncate font-mono text-11 text-fg">{file.name}.png</span>
                  <span className="text-center text-11 text-fg-faint">{file.note}</span>
                </div>
              ))}
            </div>
          </Figure>

          <div className="grid gap-4 sm:grid-cols-3">
            <Cell at="PNG">
              <span className="font-display text-display-sm text-fg">512 px</span>
              <span className="text-13 text-fg-muted">Square images for documents and slides, all in one zip.</span>
            </Cell>
            <Cell at="SVG">
              <span className="font-display text-display-sm text-fg">Vector</span>
              <span className="text-13 text-fg-muted">Sharp at any size — for sign makers, label software and large print.</span>
            </Cell>
            <Cell at="JSON">
              <span className="font-display text-display-sm text-fg">The batch</span>
              <span className="text-13 text-fg-muted">Rows and settings, saved to your machine to load again later.</span>
            </Cell>
          </div>
          <p className="text-14 text-fg-muted">
            Codes print in black on white unless you pick other colours — keep the dark one dark and the light one
            light, or cameras struggle.
          </p>
        </div>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- B3 Why no server */

function Lane({ title, steps, accent, struck = false }: { title: string; steps: string[]; accent: string; struck?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <MonoLabel>{title}</MonoLabel>
      <ol className="flex flex-col lg:flex-row lg:items-center">
        {steps.map((step, i) => (
          <li key={step} className="flex flex-col lg:flex-1 lg:flex-row lg:items-center">
            <span
              className={`flex-1 rounded-md border px-4 py-3 text-13 ${struck ? 'border-dashed border-border-field text-fg-muted' : 'border-border bg-surface text-fg'}`}
            >
              {step}
            </span>
            {i < steps.length - 1 && <Arrow accent={accent} tone={struck ? 'faint' : 'accent'} />}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Why({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="why"
      code="B3"
      label="Why no server"
      title={
        <>
          Nothing to charge for, <Accent>nothing to leak.</Accent>
        </>
      }
      lede="Online generators put a server in the middle because a server is something to bill for: an account to create, a trial to run out, a batch limit to lift. Making a QR code does not need one. Leave it out and there is nothing to meter and nowhere for your list to end up."
      sunken
    >
      <div className="flex flex-col gap-8">
        <Lane
          title="The usual way"
          accent={accent}
          struck
          steps={['Paste your links', 'Uploaded to their server', 'Create an account', 'Trial, then a plan', 'Download']}
        />
        <Lane title="This way" accent={accent} steps={['Paste your links', 'Made in your browser', 'Download']} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Cell>
          <MonoLabel>Static codes</MonoLabel>
          <div role="img" aria-label="A static code points straight at your link. A redirecting code points at the generator's server first, which stops forwarding when the subscription ends." className="flex flex-col gap-3">
            <div aria-hidden="true" className="flex flex-wrap items-center gap-2 text-13">
              <span className="rounded-sm border border-border-field px-2 py-1 text-fg">Code</span>
              <Arrow accent={accent} />
              <span className="rounded-sm border border-border-field px-2 py-1 text-fg">Your link</span>
            </div>
            <div aria-hidden="true" className="flex flex-wrap items-center gap-2 text-13">
              <span className="rounded-sm border border-dashed border-border-field px-2 py-1 text-fg-muted">Code</span>
              <Arrow accent={accent} />
              <span className="rounded-sm border border-dashed border-border-field px-2 py-1 text-fg-muted">Their redirect</span>
              <Arrow accent={accent} tone="crossed" />
              <span className="rounded-sm border border-dashed border-border-field px-2 py-1 text-fg-muted">Your link</span>
            </div>
          </div>
          <p className="text-13 text-fg-muted">
            Every code here holds your link itself. Many paid services print a link to their own server instead, and
            forward it only while you keep paying. A static code works for as long as your link does.
          </p>
        </Cell>
        <Cell>
          <MonoLabel>Your list stays yours</MonoLabel>
          <p className="text-13 text-fg-muted">
            An asset register, a guest list, the links behind a private event — none of it passes through anyone’s
            logs, because it never leaves your machine. There is no account to breach and no copy to delete.
          </p>
          <p className="text-13 text-fg-muted">
            And with no server doing the work, there is nothing to ration: no limit on how many codes you make, and
            no reason to add one.
          </p>
        </Cell>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- The page */

export function QrDeepDive({ project }: { project: Project }) {
  const accent = project.accent;
  return (
    <>
      <DeepIndex entries={ENTRIES} accent={accent} />
      <Walkthrough accent={accent} />
      <Inputs accent={accent} />
      <InTheTab accent={accent} />
      <Anatomy accent={accent} />
      <Exports accent={accent} />
      <Why accent={accent} />
    </>
  );
}
