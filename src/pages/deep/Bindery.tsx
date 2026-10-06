import type { CSSProperties, ReactNode } from 'react';
import type { Project } from '../../content/projects';
import { BarRow, DeepIndex, DeepSection, Figure, FlowDown, Stat, type DeepEntry } from '../../components/Deep';
import { Accent, Quiet } from '../../components/Marketing';

/**
 * Bindery, explained. Laid out the way Bindery thinks about paper: each
 * section is a page (`p. 01`), and the drawings are pages, bundles, page
 * ranges and seams.
 *
 * Every number is a property of the product, traceable to its repository:
 * search and Ask latency at 100,000 pages (CLAUDE.md, "Ask, health and
 * hardening"), the seam weights (worker/segment/heuristics/*, BOUNDARY_THRESHOLD
 * and AMBIGUOUS_FLOOR in worker/stages/segment.py), the filing gate's weights
 * (worker/classify/gate.py), Ask's page limit (api/ask.py), the known forms
 * (api/forms/seed/), the vault's lock and chunking (api/vault/session.py,
 * chunked.py, crypto.py, and store.py for the lock → check → unlink rule), the
 * two delete paths (tests/test_no_destructive_paths.py; api/account_purge.py and
 * api/account_deletion.py for the week's grace). Example documents and page numbers are illustrations,
 * and their captions say so.
 */

const ENTRIES: DeepEntry[] = [
  { id: 'problem', label: 'The problem' },
  { id: 'walkthrough', label: 'Walkthrough' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'bundles', label: 'Bundles' },
  { id: 'search', label: 'Search' },
  { id: 'ask', label: 'Ask' },
  { id: 'filing', label: 'Filing' },
  { id: 'vault', label: 'Private vault' },
  { id: 'safekeeping', label: 'Safekeeping' },
];

const code = (n: number) => `p. ${String(n).padStart(2, '0')}`;

const tint = (accent: string, opacity: number): CSSProperties => ({ backgroundColor: accent, opacity });

/** A small window frame for an illustrative screen. */
function Screen({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col overflow-hidden rounded-lg border border-border bg-surface ${className}`}>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2" aria-hidden="true">
        <span className="size-1.5 rounded-full bg-border-field" />
        <span className="size-1.5 rounded-full bg-border-field" />
        <span className="size-1.5 rounded-full bg-border-field" />
        <span className="ml-1 truncate font-mono text-11 text-fg-faint">{title}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4 font-mono text-12 break-words text-fg-muted">{children}</div>
    </div>
  );
}

/** A labelled box in a diagram. */
function Box({
  title,
  kicker,
  children,
  accent,
  dashed = false,
}: {
  title: string;
  kicker?: string;
  children?: ReactNode;
  accent?: string;
  dashed?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border p-5 ${dashed ? 'border-dashed border-border-field' : 'border-border bg-surface'}`}
      style={accent ? { borderTopColor: accent, borderTopWidth: 3 } : undefined}
    >
      {kicker && <span className="font-mono text-11 tracking-label text-fg-faint uppercase">{kicker}</span>}
      <span className="text-16 font-semibold text-fg">{title}</span>
      {children && <span className="text-13 text-fg-muted">{children}</span>}
    </div>
  );
}

/** A right-pointing arrow that turns downward on a phone. */
function Arrow({ accent }: { accent: string }) {
  return (
    <span aria-hidden="true" className="flex items-center justify-center py-1 sm:px-2 sm:py-0">
      <svg width="24" height="12" viewBox="0 0 24 12" className="rotate-90 sm:rotate-0">
        <path
          d="M1 6 H21 M16 1 L22 6 L16 11"
          fill="none"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{ stroke: accent }}
        />
      </svg>
    </span>
  );
}

/* ---------------------------------------------------------------- p. 01 The problem */

const BUNDLE_PAGES = 100;
const LIT_PAGE = 63;
const GRID_COLS = 10;

/** One hundred pages, one of which is the one you need. */
function PageGrid({ accent }: { accent: string }) {
  const pw = 24;
  const ph = 32;
  const gap = 6;
  const rows = Math.ceil(BUNDLE_PAGES / GRID_COLS);
  return (
    <div className="relative overflow-hidden">
      <svg
        viewBox={`0 0 ${GRID_COLS * (pw + gap) - gap} ${rows * (ph + gap) - gap}`}
        className="h-auto w-full"
        role="img"
        aria-label={`A bundle of ${BUNDLE_PAGES} scanned pages drawn as a grid. Every page has been read; page ${LIT_PAGE} is lit — the one that answers the search.`}
      >
        {Array.from({ length: BUNDLE_PAGES }, (_, i) => {
          const x = (i % GRID_COLS) * (pw + gap);
          const y = Math.floor(i / GRID_COLS) * (ph + gap);
          const lit = i + 1 === LIT_PAGE;
          return (
            <g key={i} className={lit ? 'animate-twinkle' : undefined}>
              <rect
                x={x}
                y={y}
                width={pw}
                height={ph}
                rx="2"
                className={lit ? undefined : 'fill-surface stroke-border-field'}
                style={lit ? { fill: accent } : undefined}
                strokeWidth="1"
              />
              {[8, 13, 18].map((ly, j) => (
                <rect
                  key={ly}
                  x={x + 4}
                  y={y + ly}
                  width={j === 2 ? pw - 12 : pw - 8}
                  height="1.6"
                  rx="0.8"
                  className={lit ? 'fill-bg' : 'fill-border-field'}
                />
              ))}
            </g>
          );
        })}
      </svg>
      {/* A reading line sweeping the bundle. At rest (reduced motion) it is simply not there. */}
      <span
        aria-hidden="true"
        className="flow-y pointer-events-none absolute inset-x-0 top-0 h-0.5 rounded-full opacity-0"
        style={{ backgroundColor: accent }}
      />
    </div>
  );
}

function Problem({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="problem"
      code={code(1)}
      label="The problem"
      title={
        <>
          The file has a name. <Accent>The page doesn’t.</Accent>
        </>
      }
      lede="Important paper rarely arrives one document at a time. A service record comes back as one long scan, a house closing as a single packet, a year of statements as one PDF. A file search can tell you which file mentions what you need. It can’t tell you where in the file it is — so you scroll, page by page, hoping you recognise it."
    >
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <Figure caption="What most document tools give you: the right file, and the whole of it to read.">
          <Screen title="Search · a typical document manager">
            <span className="rounded-sm border border-border-field bg-bg px-3 py-2 text-fg">DD-214</span>
            <span className="mt-2 flex items-start justify-between gap-3 rounded-sm bg-surface-raised px-3 py-2">
              <span className="flex flex-col gap-0.5">
                <span className="text-fg">service-records.pdf</span>
                <span>100 pages · a match somewhere inside</span>
              </span>
              <span aria-hidden="true" className="flex h-16 w-1.5 shrink-0 flex-col rounded-full bg-border">
                <span className="h-2 w-full rounded-full bg-fg-faint" />
              </span>
            </span>
            <span className="mt-2 text-fg-faint">…page 1 of 100. Keep scrolling.</span>
          </Screen>
        </Figure>
        <Figure caption="Illustration: the same 100-page bundle in Bindery. Every page is read and indexed on its own, so the answer is a page — here, page 63 — not a file.">
          <div className="mx-auto w-full max-w-sm">
            <PageGrid accent={accent} />
          </div>
        </Figure>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {[
          ['Bundled scans', 'Many documents inside one file, with nothing marking where one ends.'],
          ['Unread images', 'A photo of a receipt or a scanned letter has no words a computer can search until something reads it.'],
          ['Filing fatigue', 'Naming, tagging and sorting every page by hand is the step that never gets done.'],
        ].map(([title, body]) => (
          <li key={title} className="flex flex-col gap-1 border-t border-border pt-4">
            <span className="text-14 font-semibold text-fg">{title}</span>
            <span className="text-14 text-fg-muted">{body}</span>
          </li>
        ))}
      </ul>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- p. 02 Walkthrough */

interface Step {
  title: string;
  body: string;
  screen: string;
  lines: ReactNode;
}

function Tick({ accent }: { accent: string }) {
  return <span aria-hidden="true" className="inline-block size-1.5 rounded-full align-middle" style={{ backgroundColor: accent }} />;
}

function walkthroughSteps(accent: string): Step[] {
  return [
    {
      title: 'Drop it in',
      body: 'Drag files onto the page, or save them into the watched folder on the server. PDFs, photos, Office files and videos are all accepted.',
      screen: 'Add files',
      lines: (
        <>
          <span className="rounded-sm border border-dashed border-border-field px-3 py-4 text-center">Drop files here</span>
          <span className="text-fg">service-records.pdf</span>
          <span>100 pages · received</span>
        </>
      ),
    },
    {
      title: 'It reads every page',
      body: 'Each page is run through OCR and indexed on its own. You can watch the file move through each stage.',
      screen: 'Pipeline',
      lines: (
        <>
          {['normalize', 'page', 'segment', 'embed'].map((s) => (
            <span key={s} className="flex items-center justify-between">
              {s} <Tick accent={accent} />
            </span>
          ))}
          <span className="flex items-center justify-between text-fg-faint">
            classify <span aria-hidden="true">…</span>
          </span>
        </>
      ),
    },
    {
      title: 'The bundle becomes documents',
      body: 'The file is split into the documents it really contains, as page ranges. The original stays exactly as it arrived.',
      screen: 'service-records.pdf',
      lines: (
        <>
          <span>pp. 1–4 · Cover letter</span>
          <span>pp. 5–62 · Medical record</span>
          <span className="text-fg">pp. 63–66 · DD-214</span>
          <span>pp. 67–100 · Award letters</span>
        </>
      ),
    },
    {
      title: 'Search lands on the page',
      body: 'Type what you are looking for. Results are pages, and opening one takes you straight to it.',
      screen: 'Search',
      lines: (
        <>
          <span className="rounded-sm border border-border-field bg-bg px-3 py-1.5 text-fg">dd 214</span>
          <span className="flex items-center gap-2 text-fg">
            <Tick accent={accent} /> DD-214 · p. 63
          </span>
          <span>service-records.pdf</span>
        </>
      ),
    },
    {
      title: 'Check anything it decided',
      body: 'Click a field to see the sentence and page it came from. Any automated decision — a split, a tag, a filing — can be undone.',
      screen: 'Why this value',
      lines: (
        <>
          <span>Type</span>
          <span className="text-fg">DD-214</span>
          <span>Matched a known form by rule · p. 63</span>
          <span className="text-fg underline decoration-border-field underline-offset-4">Undo</span>
        </>
      ),
    },
  ];
}

function Walkthrough({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="walkthrough"
      code={code(2)}
      label="A walkthrough"
      title={
        <>
          From a pile of paper <Accent>to the right page.</Accent>
        </>
      }
      lede="What using Bindery looks like, start to finish. The screens are simplified, and the documents in them are examples."
      sunken
    >
      <div className="relative">
        <span aria-hidden="true" className="absolute top-5 right-10 left-10 hidden h-px bg-border-field lg:block">
          <span className="flow-x absolute -top-0.75 size-2 rounded-full" style={{ backgroundColor: accent }} />
        </span>
        <ol className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
          {walkthroughSteps(accent).map((step, index) => (
            <li key={step.title} className="flex flex-col gap-4">
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
              <div aria-hidden="true" className="mt-auto">
                <Screen title={step.screen}>{step.lines}</Screen>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- p. 03 Architecture */

function Architecture({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="architecture"
      code={code(3)}
      label="Architecture"
      title={
        <>
          A few containers on your own machine. <Accent>Nothing else required.</Accent>
        </>
      }
      lede="Bindery runs with Docker Compose next to your files. The web app, the API and a background worker share one PostgreSQL database — which is also the job queue and the channel for live updates, so there is nothing else to run."
    >
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div
          role="img"
          aria-label="Architecture: you, in a browser, and your files, added by upload or a watched folder, reach Bindery through a Cloudflare Tunnel with no ports published on the host. Inside, a web container serves the app, an API handles sign-in, search, Ask and the vault, and a worker runs the OCR pipeline. Both store their state in PostgreSQL 16 and keep originals on disk, write-once."
          className="flex flex-col"
        >
          <div aria-hidden="true" className="grid gap-3 sm:grid-cols-2">
            <Box kicker="You" title="A browser">
              The web app, in any modern browser. Sign in with its own password and authenticator, or single sign-on
              over OpenID Connect.
            </Box>
            <Box kicker="Your files" title="Upload or watched folder">
              Drag files in, or drop them into a folder on the server — one folder per library.
            </Box>
          </div>
          <FlowDown accent={accent} />
          <div
            aria-hidden="true"
            className="rounded-full border border-dashed border-border-field px-5 py-2.5 text-center text-13 text-fg-muted"
          >
            Cloudflare Tunnel · <span className="text-fg">no ports published on the host</span>
          </div>
          <FlowDown accent={accent} />
          <div aria-hidden="true" className="flex flex-col gap-3 rounded-lg border border-border-field bg-bg-sunken p-4">
            <span className="px-1 font-mono text-11 tracking-label text-fg-faint uppercase">Bindery · Docker Compose</span>
            <div className="grid gap-3 md:grid-cols-3">
              <Box title="web" accent={accent}>
                nginx serving the React app, and passing through the API and live updates
              </Box>
              <Box title="api" accent={accent}>
                Python and FastAPI: sign-in, search, Ask, the vault, and serving your originals
              </Box>
              <Box title="worker" accent={accent}>
                The pipeline: OCRmyPDF and Tesseract, LibreOffice for Office files, ffmpeg for video
              </Box>
            </div>
          </div>
          <FlowDown accent={accent} />
          <div aria-hidden="true" className="grid gap-3 md:grid-cols-2">
            <Box kicker="State" title="PostgreSQL 16">
              Full-text index over every page, trigram suggestions, local embeddings with pgvector, the job queue and
              live updates. No Redis.
            </Box>
            <Box kicker="Originals" title="Your files, on disk">
              Stored by content hash, written once and made read-only. Nothing in Bindery edits them.
            </Box>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <Box kicker="Optional" title="An AI key" dashed>
            Claude, through a single adapter, suggests titles, tags and correspondents and answers Ask. Without a key,
            reading, splitting and search all still work — only that one step waits.
          </Box>
          <Box kicker="Optional" title="An offsite copy" dashed>
            An S3 bucket you own, encrypted with your KMS key, holding daily and weekly copies.
          </Box>
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5">
            <span className="font-mono text-11 tracking-label text-fg-faint uppercase">Live, not polled</span>
            <span className="text-13 text-fg-muted">
              When the worker finishes something, the database announces it and every open screen refreshes. A change
              that rolls back is never announced.
            </span>
          </div>
        </aside>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- p. 04 Pipeline */

const STAGES: { name: string; does: string; ai?: 'never' | 'some' | 'key' }[] = [
  { name: 'Normalize', does: 'OCR every page; Office files become PDFs first; photos give up their date and camera' },
  { name: 'Page', does: 'Split the text by page and index each one for search' },
  { name: 'Segment', does: 'Find where one document ends and the next begins', ai: 'some' },
  { name: 'Embed', does: 'Compute similarity locally, to spot documents like ones already filed' },
  { name: 'Classify', does: 'Suggest a title, date, tags and correspondent, with the evidence for each', ai: 'key' },
  { name: 'Rules', does: 'Apply known forms and your own rules, then decide whether to file or ask you' },
];

function Pipeline({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="pipeline"
      code={code(4)}
      label="The pipeline"
      title={
        <>
          Searchable before <Accent>any AI is involved.</Accent>
        </>
      }
      lede="Every file goes through the same stages. Each one saves what it produced and can be re-run on its own — so improving how documents are classified never means reading them all again."
      sunken
    >
      <Figure caption="The stages in order. The bar underneath shows what works with no AI key: everything up to and including search. Segmenting asks the model only about the seams it could not settle itself.">
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {STAGES.map((stage, index) => (
            <li key={stage.name} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
              <span className="flex items-center justify-between gap-2">
                <span className="font-mono text-11 text-fg-faint">{String(index + 1).padStart(2, '0')}</span>
                {stage.ai && (
                  <span className="rounded-full border border-border-field px-2 py-0.5 font-mono text-11 text-fg-muted">
                    {stage.ai === 'key' ? 'needs a key' : 'hard seams only'}
                  </span>
                )}
              </span>
              <span className="text-16 font-semibold text-fg">{stage.name}</span>
              <span className="text-13 text-fg-muted">{stage.does}</span>
            </li>
          ))}
        </ol>
        <div aria-hidden="true" className="mt-2 grid gap-3 lg:grid-cols-6">
          <div className="flex flex-col gap-2 lg:col-span-4">
            <span className="bar block h-2 rounded-full" style={{ backgroundColor: accent }} />
            <span className="text-13 text-fg">Works offline, with no key — the archive is fully searchable here</span>
          </div>
          <div className="flex flex-col gap-2 lg:col-span-2">
            <span className="block h-2 rounded-full border border-dashed border-border-field" />
            <span className="text-13 text-fg-muted">With a key: filing suggestions. Without one: they wait, and nothing else does</span>
          </div>
        </div>
      </Figure>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['Scans and photos', 'PDF, JPEG, PNG, TIFF and HEIC go straight to OCR. A page the OCR tool skips as already digital, yet which has no words, is read again with OCR forced.'],
          ['Office documents', 'Word, Excel, PowerPoint, OpenDocument, RTF, CSV and text are rendered to PDF and then take the ordinary path. The original file is kept as-is.'],
          ['Videos', 'Not read or classified — probed for date, camera and length, given a poster frame, and made findable by those.'],
        ].map(([title, body]) => (
          <div key={title} className="flex flex-col gap-2 border-t border-border pt-4">
            <span className="text-14 font-semibold text-fg">{title}</span>
            <span className="text-14 text-fg-muted">{body}</span>
          </div>
        ))}
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- p. 05 Bundles */

const STRIP_PAGES = 24;
const DOCS = [
  { key: 'A', from: 1, to: 3, name: 'Cover letter', seam: '' },
  { key: 'B', from: 4, to: 15, name: 'Medical record', seam: 'a blank separator page' },
  { key: 'C', from: 16, to: 19, name: 'DD-214', seam: 'a known form number appears' },
  { key: 'D', from: 20, to: 24, name: 'Award letter', seam: '“Page 1 of 5” starts again' },
];

function BundleStrip({ accent }: { accent: string }) {
  const cols: CSSProperties = { gridTemplateColumns: `repeat(${STRIP_PAGES}, minmax(0, 1fr))` };
  const starts = new Set(DOCS.slice(1).map((d) => d.from));
  return (
    <div
      role="img"
      aria-label="A 24-page original drawn as a strip of pages. Brackets above it mark four documents as page ranges — pages 1 to 3, 4 to 15, 16 to 19 and 20 to 24. The strip itself is unchanged."
      className="flex flex-col gap-2"
    >
      <div aria-hidden="true" className="grid gap-0.5" style={cols}>
        {DOCS.map((doc) => (
          <div key={doc.key} className="flex flex-col items-center gap-1" style={{ gridColumn: `${doc.from} / ${doc.to + 1}` }}>
            <span className="font-mono text-12 text-fg">{doc.key}</span>
            <span className="block h-2.5 w-full rounded-t-sm border-x-2 border-t-2" style={{ borderColor: accent }} />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="grid gap-0.5" style={cols}>
        {Array.from({ length: STRIP_PAGES }, (_, i) => (
          <span key={i} className="flex h-12 flex-col gap-1 rounded-xs border border-border-field bg-surface p-0.5 sm:h-16 sm:p-1">
            <span className="block h-0.5 w-full rounded-full bg-border-field" />
            <span className="block h-0.5 w-3/4 rounded-full bg-border-field" />
          </span>
        ))}
      </div>
      <div aria-hidden="true" className="grid gap-0.5" style={cols}>
        {Array.from({ length: STRIP_PAGES }, (_, i) => (
          <span key={i} className="flex justify-start">
            {starts.has(i + 1) && <span className="-ml-1 size-2 rounded-full" style={{ backgroundColor: accent }} />}
          </span>
        ))}
      </div>
      <p aria-hidden="true" className="flex items-center gap-2 font-mono text-12 text-fg-muted">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-fg-muted">
          <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        the original · 24 pages · read-only, unchanged
      </p>
    </div>
  );
}

const SIGNALS = [
  { label: 'A known form’s number', w: 1.5, note: 'Fires alone.' },
  { label: 'A blank page', w: 1.0, note: 'Fires alone.' },
  { label: '“Page 1 of N” again', w: 1.0, note: 'Fires alone.' },
  { label: 'Footer number back to 1', w: 0.5, note: 'Needs company — it could be a numbered exhibit list.' },
  { label: 'The layout changes', w: 0.4, note: 'Needs company.' },
];

/** The seam score, 0 to 1.5, in its three zones. */
function SeamScale({ accent }: { accent: string }) {
  const max = 1.5;
  const zones = [
    { from: 0, to: 0.3, label: 'Ignored', style: undefined, cls: 'bg-surface-raised' },
    { from: 0.3, to: 0.9, label: 'Ambiguous — shown to the model', style: undefined, cls: 'bg-border-field' },
    { from: 0.9, to: max, label: 'A boundary', style: { backgroundColor: accent }, cls: '' },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-4 overflow-hidden rounded-full" aria-hidden="true">
        {zones.map((z) => (
          <span
            key={z.label}
            className={`h-full border-r-2 border-bg last:border-r-0 ${z.cls}`}
            style={{ ...z.style, width: `${((z.to - z.from) / max) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between font-mono text-11 text-fg-faint" aria-hidden="true">
        <span>0</span>
        <span>0.3</span>
        <span>0.9</span>
        <span>1.5</span>
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        {zones.map((z) => (
          <div key={z.label} className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className={`mt-1.5 size-2.5 shrink-0 rounded-full ${z.cls}`}
              style={z.style}
            />
            <div className="flex flex-col gap-0.5">
              <dt className="text-14 font-semibold text-fg">{z.label}</dt>
              <dd className="font-mono text-12 text-fg-muted">
                {z.to === max ? `${z.from} and up` : `${z.from}–${z.to}`}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Bundles({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="bundles"
      code={code(5)}
      label="Bundles"
      title={
        <>
          Split into documents. <Accent>Never cut.</Accent>
        </>
      }
      lede="A document in Bindery is a range of pages over a file you added. A bundle is divided by drawing brackets over it, not by slicing it into new files — so the original is always intact, and a split you disagree with is one click to change or undo."
    >
      <Figure caption="Illustration: a 24-page scan holding four documents. Each lit dot is a seam Bindery found; the list says why.">
        <BundleStrip accent={accent} />
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DOCS.map((doc) => (
            <li key={doc.key} className="flex flex-col gap-0.5 border-t border-border pt-3">
              <span className="text-14 text-fg">
                <span className="font-mono">{doc.key}</span> · {doc.name}
              </span>
              <span className="font-mono text-12 text-fg-muted">
                pp. {doc.from}–{doc.to}
              </span>
              <span className="text-13 text-fg-muted">{doc.seam ? `Starts where ${doc.seam}` : 'Starts the file'}</span>
            </li>
          ))}
        </ul>
      </Figure>

      <div className="grid gap-16 lg:grid-cols-2">
        <Figure caption="Cheap, deterministic checks vote on every seam between two pages. One strong signal, or two weaker ones that agree, makes a boundary.">
          <div className="flex flex-col gap-5">
            {SIGNALS.map((s) => (
              <BarRow key={s.label} label={s.label} value={s.w.toFixed(1)} fraction={s.w / 1.5} accent={accent} muted={s.w < 0.9} note={s.note} />
            ))}
          </div>
        </Figure>
        <Figure caption="Only the ambiguous seams ever reach the model, with two pages either side — so the cost of splitting follows how hard a file is, not how long it is.">
          <SeamScale accent={accent} />
          <div className="mt-6 grid grid-cols-2 gap-8">
            <Stat value="0" label="bytes of your original changed by a split" />
            <Stat value="0" label="pages that can fall between documents — every split must cover the whole file" />
          </div>
        </Figure>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- p. 06 Search */

const LATENCY = [
  { label: 'Search', ms: 15, budget: 300 },
  { label: 'Jump to (⌘K)', ms: 15, budget: 100 },
];

function Search({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="search"
      code={code(6)}
      label="Search"
      title={
        <>
          Results are pages, <Accent>not files.</Accent>
        </>
      }
      lede="Every page has its own entry in a PostgreSQL full-text index. Quoted phrases and -exclusions work as you would expect, titles and tags that nearly match are offered as you type, and searching for a form by name puts the recognised form first. None of it touches the network."
      sunken
    >
      <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
        <Figure caption="Illustration: a search, and the pages it lands on. Opening a result opens the document at that page, with the words highlighted.">
          <Screen title="Search">
            <span className="rounded-sm border border-border-field bg-bg px-3 py-2 text-fg">separation date -worksheet</span>
            {[
              { title: 'DD-214', where: 'p. 63 · service-records.pdf', snip: '…12b. SEPARATION DATE THIS PERIOD…', top: true },
              { title: 'VA rating decision', where: 'p. 2 · va-letters-2019.pdf', snip: '…based on your separation date from active service…' },
              { title: 'Award letter', where: 'p. 71 · service-records.pdf', snip: '…effective the day after your separation date…' },
            ].map((r) => (
              <span key={r.where} className={`mt-2 flex flex-col gap-1 rounded-sm px-3 py-2 ${r.top ? 'bg-surface-raised' : ''}`}>
                <span className="flex items-center gap-2 text-fg">
                  {r.top && <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />}
                  {r.title}
                </span>
                <span>{r.where}</span>
                <span className="text-fg-faint">{r.snip}</span>
              </span>
            ))}
          </Screen>
        </Figure>

        <div className="flex flex-col gap-10">
          <Figure caption="Measured at 100,000 pages, 95th percentile. The full track is the budget each one is held to; the bar is how much of it is used. One term that matches a fifth of the archive is slower — about 650–800 ms — and is reported rather than hidden.">
            <div className="flex flex-col gap-6">
              {LATENCY.map((l) => (
                <BarRow
                  key={l.label}
                  label={l.label}
                  value={`${l.ms} ms`}
                  fraction={l.ms / l.budget}
                  accent={accent}
                  note={`Budget ${l.budget} ms — ${Math.round((l.ms / l.budget) * 100)}% of it used.`}
                />
              ))}
            </div>
          </Figure>
          <div className="grid grid-cols-2 gap-8">
            <Stat value="15 ms" label="to search 100,000 pages" />
            <Stat value="41 ms" label="to find the pages an Ask question needs" />
          </div>
        </div>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- p. 07 Ask */

function Outcome({
  kicker,
  title,
  body,
  accent,
  lit = false,
  struck = false,
}: {
  kicker: string;
  title: string;
  body: string;
  accent: string;
  lit?: boolean;
  struck?: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5"
      style={lit ? { borderTopColor: accent, borderTopWidth: 3 } : undefined}
    >
      <span className="font-mono text-11 tracking-label text-fg-faint uppercase">{kicker}</span>
      <span className={`text-16 font-semibold text-fg ${struck ? 'line-through decoration-danger decoration-2' : ''}`}>{title}</span>
      <span className="text-13 text-fg-muted">{body}</span>
    </div>
  );
}

function Ask({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="ask"
      code={code(7)}
      label="Ask"
      title={
        <>
          An answer with a page, <Accent>or no answer at all.</Accent>
        </>
      }
      lede="Ask takes a question in plain words. It finds the pages first, then lets the model answer only from those pages — and only an answer that cites them is shown. A caveat gets skimmed; an answer gets believed. So an uncited answer is thrown away."
    >
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div
          role="img"
          aria-label="Flow: a question goes to page retrieval in the database, which needs no AI key. Then one of three things happens: with no key, you get the matching pages; if the answer cites its pages, you get the answer and the page each part came from; if the answer cites nothing, it is discarded and you get the matching pages."
          className="flex flex-col"
        >
          <div aria-hidden="true" className="mx-auto w-full max-w-lg rounded-lg border border-border-field bg-bg p-5 text-center">
            <span className="font-mono text-11 tracking-label text-fg-faint uppercase">You ask</span>
            <p className="text-16 text-fg">“When did I last get the brakes done?”</p>
          </div>
          <FlowDown accent={accent} />
          <div aria-hidden="true" className="mx-auto w-full max-w-lg">
            <Box title="Find the pages" accent={accent}>
              In the database, no key needed. All the meaningful words first; if that finds too little, the four rarest
              of them. Up to 20 pages go forward.
            </Box>
          </div>
          <FlowDown accent={accent} />
          <div aria-hidden="true" className="grid gap-3 md:grid-cols-3">
            <Outcome kicker="No AI key" title="The matching pages" body="Ask still works as a smarter search." accent={accent} />
            <Outcome
              kicker="Answer cites its pages"
              title="The answer, with its pages"
              body="Each claim links to the page it came from."
              accent={accent}
              lit
            />
            <Outcome
              kicker="Answer cites nothing"
              title="The answer"
              body="Discarded. You get the matching pages instead."
              accent={accent}
              struck
            />
          </div>
        </div>
        <aside className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
            <span className="font-mono text-11 tracking-label text-fg-faint uppercase">Why the page number is right</span>
            <span className="text-13 text-fg-muted">
              The model never types a page number. Its citations point at the exact blocks of text it was given, and
              Bindery looks the page up from those.
            </span>
            <div aria-hidden="true" className="flex flex-col gap-2 font-mono text-12">
              <span className="text-fg-muted">cites block 3 →</span>
              <div className="grid grid-cols-4 gap-1.5">
                {[12, 40, 63, 71].map((page, i) => (
                  <span
                    key={page}
                    className={`flex flex-col items-center gap-0.5 rounded-sm border px-1 py-2 ${i === 2 ? 'border-border-field bg-surface-raised text-fg' : 'border-border text-fg-faint'}`}
                  >
                    <span>b{i + 1}</span>
                    <span>p.{page}</span>
                    {i === 2 && <span className="size-1.5 rounded-full" style={{ backgroundColor: accent }} />}
                  </span>
                ))}
              </div>
              <span className="text-fg">→ page 63</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border-field p-5">
            <span className="font-mono text-11 tracking-label text-fg-faint uppercase">Deliberately missing</span>
            <span className="text-16 font-semibold text-fg">Answers from memory</span>
            <span className="text-13 text-fg-muted">
              It answers about your documents, from your documents. Something the model merely “knows” cannot point at one of your pages, so it is never shown.
            </span>
          </div>
        </aside>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- p. 08 Filing */

const FORMS = [
  'DD-214',
  'DD-215',
  'W-2',
  '1098',
  '1099',
  'Deed',
  'Mortgage note',
  'Vehicle title',
  'Passport',
  'Birth certificate',
  'Marriage licence',
  'Insurance declarations',
  'VA award letter',
  'VA rating decision',
];

const RULE = [
  { op: 'All of', terms: ['“certificate of release or discharge from active duty”'] },
  { op: 'Any of', terms: ['DD 214', 'DD Form 214', '“date entered AD this period”'] },
  { op: 'None of', terms: ['“correction to DD Form 214”', 'DD Form 215', '“worksheet”'] },
];

const GATE_MAX = 3;
const GATE_THRESHOLD = 2;

const SCENARIOS: { title: string; parts: { label: string; w: number }[]; zeroed?: string }[] = [
  { title: 'A recognised DD-214', parts: [{ label: 'Known form', w: 2 }] },
  {
    title: 'A bill from a company you already file under',
    parts: [
      { label: 'Existing tags', w: 1 },
      { label: 'Existing correspondent', w: 1 },
      { label: 'Labelled date', w: 1 },
    ],
  },
  {
    title: 'Familiar tags, a new sender',
    parts: [
      { label: 'Existing tags', w: 1 },
      { label: 'Resembles a filed document', w: 0.5 },
    ],
  },
  {
    title: 'The model returned a tag that isn’t yours',
    parts: [],
    zeroed: 'Any unknown ID sets the score to zero',
  },
];

function GateChart({ accent }: { accent: string }) {
  const thresholdLeft = `${(GATE_THRESHOLD / GATE_MAX) * 100}%`;
  return (
    <div className="flex flex-col gap-7">
      {SCENARIOS.map((s) => {
        const score = s.parts.reduce((sum, p) => sum + p.w, 0);
        const filed = score >= GATE_THRESHOLD;
        return (
          <div key={s.title} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-14 text-fg">{s.title}</span>
              <span className="shrink-0 font-mono text-13 text-fg">
                {score.toFixed(1)} · {filed ? 'filed' : 'asks you'}
              </span>
            </div>
            <div className="relative" aria-hidden="true">
              <div className="flex h-4 overflow-hidden rounded-full bg-surface-raised">
                {s.parts.map((p, i) => (
                  <span
                    key={p.label}
                    className="bar h-full border-r-2 border-bg"
                    style={{ ...tint(accent, filed ? 1 - i * 0.25 : 0.55 - i * 0.2), width: `${(p.w / GATE_MAX) * 100}%` }}
                  />
                ))}
              </div>
              <span className="absolute -top-1 -bottom-1 w-0.5 bg-fg" style={{ left: thresholdLeft }} />
            </div>
            <span className="text-13 text-fg-muted">{s.zeroed ?? s.parts.map((p) => `${p.label} ${p.w.toFixed(1)}`).join(' + ')}</span>
          </div>
        );
      })}
      <p className="flex items-center gap-2 text-13 text-fg-muted">
        <span aria-hidden="true" className="inline-block h-3 w-0.5 bg-fg" /> The line is the bar to file on its own: 2.0.
      </p>
    </div>
  );
}

function Filing({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="filing"
      code={code(8)}
      label="Filing"
      title={
        <>
          Filed on evidence, <Accent>not on confidence.</Accent>
        </>
      }
      lede="A language model’s confidence in its own answer is a poor guide to whether it is right. So Bindery decides whether to file a document on its own by counting facts it can check — and when the facts are not enough, it asks you."
      sunken
    >
      <div className="grid gap-16 lg:grid-cols-2">
        <div className="flex flex-col gap-10">
          <Figure caption="How a DD-214 is recognised: by rule, the same way every time. A correction form that mentions the DD-214 by name is excluded.">
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
              <span className="flex items-center gap-2 font-mono text-12 text-fg">
                <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: accent }} />
                DD-214 · any page · up to 4 pages long
              </span>
              {RULE.map((r) => (
                <div key={r.op} className="grid gap-2 border-t border-border pt-3 sm:grid-cols-[5rem_minmax(0,1fr)]">
                  <span className="font-mono text-11 tracking-label text-fg-faint uppercase">{r.op}</span>
                  <span className="flex flex-wrap gap-1.5">
                    {r.terms.map((t) => (
                      <span
                        key={t}
                        className={`rounded-sm border px-2 py-1 font-mono text-12 ${r.op === 'None of' ? 'border-dashed border-border-field text-fg-muted line-through decoration-fg-faint' : 'border-border-field text-fg'}`}
                      >
                        {t}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </Figure>
          <Figure caption="The fourteen forms recognised out of the box, each a short rule file you can read and extend.">
            <ul className="flex flex-wrap gap-2">
              {FORMS.map((f) => (
                <li key={f} className="rounded-full border border-border px-3 py-1.5 text-13 text-fg-muted">
                  {f}
                </li>
              ))}
            </ul>
          </Figure>
        </div>

        <div className="flex flex-col gap-10">
          <Figure caption="Illustration: four documents and the score each reaches. Scores come only from checkable facts; the decision can be replayed later from what was stored.">
            <GateChart accent={accent} />
          </Figure>
          <dl className="grid gap-3 text-14">
            {[
              ['2.0 each', 'A known form, or a rule you wrote'],
              ['1.0 each', 'Every tag already exists · the correspondent already exists · the date came from a labelled field'],
              ['0.5', 'At least 60% similar to a document already filed'],
            ].map(([w, what]) => (
              <div key={w} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 border-t border-border pt-3">
                <dt className="font-mono text-fg">{w}</dt>
                <dd className="text-fg-muted">{what}</dd>
              </div>
            ))}
            <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 border-t border-border pt-3">
              <dt className="font-mono text-fg-faint">0</dt>
              <dd className="text-fg-muted">
                <span className="text-fg line-through decoration-danger decoration-2">The model’s own confidence</span> — shown
                to you, never counted
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- p. 09 Vault */

function KeyNode({ title, note, accent }: { title: string; note?: string; accent?: string }) {
  return (
    <div
      className="flex flex-col gap-1 rounded-md border border-border bg-surface px-4 py-3"
      style={accent ? { borderTopColor: accent, borderTopWidth: 3 } : undefined}
    >
      <span className="text-14 font-semibold text-fg">{title}</span>
      {note && <span className="font-mono text-11 text-fg-muted">{note}</span>}
    </div>
  );
}

const VAULT_ROWS: { where: string; locked: string; unlocked: string; readable?: boolean }[] = [
  { where: 'Search and the archive', locked: 'Hidden', unlocked: 'Hidden' },
  { where: 'Photos', locked: 'Hidden', unlocked: 'Hidden' },
  { where: 'The vault screen', locked: 'Shut', unlocked: 'Readable', readable: true },
  { where: 'Idle', locked: '—', unlocked: 'Locks after 15 min' },
];

function Vault({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="vault"
      code={code(9)}
      label="The private vault"
      title={
        <>
          A second lock, <Accent>for what you’d otherwise leave out.</Accent>
        </>
      }
      lede="Some papers are too private for an ordinary archive. Put them in the vault and they are encrypted at rest under a second passphrase, and they stay out of search and every other view — whether the vault is open or not."
    >
      <div className="grid gap-16 lg:grid-cols-2">
        <Figure caption="The key hierarchy. One random data key is wrapped twice: by your passphrase, which is the durable copy, and by a daily PIN, a convenience that can be replaced without re-encrypting anything.">
          <div
            role="img"
            aria-label="Passphrase through Argon2id gives one key; PIN plus a host secret through Argon2id gives another. Each wraps the same data key, which derives a key per file. Files are encrypted with AES-256-GCM in 1 MiB chunks."
            className="flex flex-col"
          >
            <div aria-hidden="true" className="grid grid-cols-2 gap-3">
              <KeyNode title="Your passphrase" note="Argon2id" />
              <KeyNode title="Your PIN + host secret" note="Argon2id" />
            </div>
            <div aria-hidden="true" className="grid grid-cols-2">
              <FlowDown accent={accent} />
              <FlowDown accent={accent} />
            </div>
            <div aria-hidden="true" className="mx-auto w-full max-w-xs">
              <KeyNode title="One data key" note="wrapped by each, stored by neither in the clear" accent={accent} />
            </div>
            <FlowDown accent={accent} />
            <div aria-hidden="true" className="mx-auto w-full max-w-xs">
              <KeyNode title="A key per file" note="AES-256-GCM" />
            </div>
            <FlowDown accent={accent} />
            <div aria-hidden="true" className="flex flex-col gap-2">
              <div className="flex gap-1">
                {Array.from({ length: 12 }, (_, i) => (
                  <span key={i} className="h-6 flex-1 rounded-xs" style={tint(accent, i === 4 ? 1 : 0.35)} />
                ))}
              </div>
              <span className="font-mono text-12 text-fg-muted">
                1 MiB chunks · opening page 5 decrypts only the chunk it needs
              </span>
            </div>
          </div>
        </Figure>

        <div className="flex flex-col gap-10">
          <Figure caption="Where a vaulted document shows. Unlocking lets you read the vault; it never lets the vault leak into the rest of the archive.">
            <table className="w-full text-left text-14">
              <thead>
                <tr className="border-b border-border-field">
                  <th scope="col" className="py-2 pr-3 font-mono text-11 font-normal tracking-label text-fg-faint uppercase">
                    Where
                  </th>
                  <th scope="col" className="py-2 pr-3 font-mono text-11 font-normal tracking-label text-fg-faint uppercase">
                    Locked
                  </th>
                  <th scope="col" className="py-2 font-mono text-11 font-normal tracking-label text-fg-faint uppercase">
                    Unlocked
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {VAULT_ROWS.map((r) => (
                  <tr key={r.where}>
                    <th scope="row" className="py-3 pr-3 font-normal text-fg">
                      {r.where}
                    </th>
                    <td className="py-3 pr-3 text-fg-muted">{r.locked}</td>
                    <td className="py-3 text-fg-muted">
                      <span className="flex items-center gap-2">
                        {r.readable && <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: accent }} />}
                        <span className={r.readable ? 'text-fg' : undefined}>{r.unlocked}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Figure>
          <ul className="flex flex-col gap-4 text-14 text-fg-muted">
            <li className="border-t border-border pt-3">
              <span className="text-fg">Nothing to fingerprint.</span> Vaulted files are stored under random names, so
              someone holding a copy of a file cannot confirm your archive has it.
            </li>
            <li className="border-t border-border pt-3">
              <span className="text-fg">No plaintext index.</span> Searching inside the vault decrypts in memory rather
              than writing an index to disk — slower, and said so, rather than leaking.
            </li>
            <li className="border-t border-border pt-3">
              <span className="text-fg">Moved in, then verified.</span> The plain copy is removed only after the
              encrypted one has been written, read back from disk and checked against it — and only if no file
              outside the vault holds the same bytes, asked again under the lock every upload takes, so another
              library’s copy of the same file is never the one removed.
            </li>
          </ul>
        </div>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- p. 10 Safekeeping */

const BACKUP = [
  { step: 'Check', what: 'An integrity check first — a backup refuses to run over a failing one' },
  { step: 'Dump', what: 'The database, nightly' },
  { step: 'Copy', what: 'Originals — safe to copy after the dump, because they never change' },
  { step: 'Offsite', what: 'Daily and weekly copies to your S3 bucket, its expiry rules audited hourly' },
  { step: 'Drill', what: 'Restore into a throwaway copy, then search it for a known document' },
];

const PRINCIPLES = [
  ['Your originals are never modified', 'Every split, tag and correction is a record about the file, not a change to it. Export hands back exactly what you added.'],
  ['Nothing is deleted unless someone asked', 'Only two code paths remove anything, and a test scans the code to keep it to those two: moving a document into the vault replaces its plain copy, and deleting an account waits a week, which an administrator can cancel, then takes only what nobody else could see. Documents in a library other people share stay.'],
  ['Search never depends on AI', 'OCR, splitting and search run locally. If the AI service is down or you never add a key, the archive still finds everything.'],
  ['Every automatic decision can be undone', 'Filing, splitting, tagging — each shows its evidence and reverses in one click. Your own corrections are never quietly overwritten later.'],
  ['Nothing fails silently', 'A file that could not be read, a stalled queue, a missed backup — each shows up on a screen you will see, not in a log you won’t.'],
  ['Readable without Bindery', 'The export is a plain folder tree with a self-contained index page — no scripts, nothing external — that opens with the stack switched off.'],
];

function Safekeeping({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="safekeeping"
      code={code(10)}
      label="Safekeeping"
      title={
        <>
          Built to be trusted <Accent>with the only copy.</Accent>
        </>
      }
      lede="An archive often holds the one copy of something that cannot be replaced. These are the rules Bindery keeps so that it deserves to — each one enforced in code or by a test, not left to good intentions."
      sunken
    >
      <Figure caption="The backup, in the order that makes it safe. A backup nobody has restored is a hope, so the last step restores it and searches the result.">
        <ol aria-label="Backup steps" className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0">
          {BACKUP.map((b, index) => (
            <li key={b.step} className="flex flex-col items-stretch sm:flex-1 sm:flex-row sm:items-center">
              <span
                className="flex flex-1 flex-col gap-1 self-stretch rounded-md border border-border bg-surface px-4 py-3"
                style={index === BACKUP.length - 1 ? { borderTopColor: accent, borderTopWidth: 3 } : undefined}
              >
                <span className="font-mono text-11 tracking-label text-fg-faint uppercase">
                  {String(index + 1).padStart(2, '0')} · {b.step}
                </span>
                <span className="text-13 text-fg-muted">{b.what}</span>
              </span>
              {index < BACKUP.length - 1 && <Arrow accent={accent} />}
            </li>
          ))}
        </ol>
      </Figure>

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PRINCIPLES.map(([title, why]) => (
          <li key={title} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-6">
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
              <span className="text-16 font-semibold text-fg">{title}</span>
            </span>
            <span className="text-14 text-fg-muted">{why}</span>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
        <Stat value="5" label="gates every change passes in order — lint, unit, integration, end-to-end, images" />
        <Stat value="0" label="ports published on the host" />
        <Stat value="1h" label="between audits of the offsite bucket’s expiry rules" />
        <Stat value="404" label="not 403, for a library you can’t see — a probe learns nothing" />
      </div>
      <p className="text-14 text-fg-muted">
        <Quiet>Libraries are the boundary between people sharing one install: </Quiet>
        <span className="text-fg">
          every read path is swept by a leak test with three users and a document that must never cross.
        </span>
      </p>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- Page */

export function BinderyDeepDive({ project }: { project: Project }) {
  const accent = project.accent;
  return (
    <>
      <DeepIndex entries={ENTRIES} accent={accent} />
      <Problem accent={accent} />
      <Walkthrough accent={accent} />
      <Architecture accent={accent} />
      <Pipeline accent={accent} />
      <Bundles accent={accent} />
      <Search accent={accent} />
      <Ask accent={accent} />
      <Filing accent={accent} />
      <Vault accent={accent} />
      <Safekeeping accent={accent} />
    </>
  );
}
