import { Suspense, lazy, useCallback, useEffect, useId, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { Badge, Button, Link as UiLink, SegmentedControl, useTheme } from '@d3cloud/ui';
import { Link } from '../../router';
import { WRAP } from '../../components/Marketing';
import { Crumb } from '../Crumb';
import { CORE, chapterPath, specName } from '../spec';
import { formatSize, shortHash } from './format';
import lock from '../../../vendor/d3-floorspec/lock.json';
import type { Diagnostic, Severity } from '../../../vendor/d3-floorspec/engine.js';
import type { Analysis, Check, Segment } from './analyse';
import { SAMPLES, loadSample, type Sample } from './samples';

/**
 * /floorspec/playground (FLR-T-10.2, FLR-REQ-137): drop a Floorspec document or a .floorspec
 * package, and the reference engine — D3 Floorspec's, bundled by scripts/sync-playground.ts —
 * validates it in the browser, draws each level's plan, meshes it in 3D and lists every diagnostic
 * exactly as the engine reports it. No account: the file is read here and never leaves the page —
 * nothing is fetched with it, nothing stores it.
 *
 * Its own chunk; the engine (./analyse) is another, fetched when the page opens, and the 3D view
 * (./View3D — the mesher, manifold-3d's WASM and three.js) a third, fetched for a valid document.
 */

const engine = () => import('./analyse');
const View3D = lazy(() => import('./View3D'));

/** A package can be large (its assets), but past this the page would only run out of memory. */
const MAX_BYTES = 256 * 1024 * 1024;

const SHORT = lock.commit.slice(0, 7);
const ENGINE_REPO = `https://github.com/${lock.repository}`;

type State =
  | { status: 'empty' }
  | { status: 'reading'; name: string }
  | { status: 'ready'; analysis: Analysis; sample?: Sample; id: number }
  | { status: 'refused'; name: string; size: number; reason: string };

const SEVERITY_TONE: Record<Severity, 'danger' | 'attention' | 'neutral'> = { error: 'danger', warning: 'attention', info: 'neutral' };

/** Each of the engine's modules, imported once. */
let analyser: ReturnType<typeof engine> | null = null;
const getAnalyser = () => (analyser ??= engine());

// ---------------------------------------------------------------------------------------------

function Panel({ label, title, children, footer, paper = false }: { label: string; title: string; children: ReactNode; footer?: ReactNode; paper?: boolean }) {
  return (
    <section aria-label={label} className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
        <h2 className="text-14 font-semibold text-fg">{title}</h2>
        {footer}
      </div>
      {/* The plan's own paper is the page's background colour (render2d's palette), so it sits on it. */}
      <div className={`relative aspect-[4/3] w-full ${paper ? 'bg-bg' : ''}`}>{children}</div>
    </section>
  );
}

function Placeholder({ children }: { children: ReactNode }) {
  return <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-14 text-fg-muted">{children}</p>;
}

/** The plan as an image: the renderer's SVG through a blob URL — never parsed into the page. */
function PlanImage({ svg, alt }: { svg: string; alt: string }) {
  const url = useMemo(() => URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })), [svg]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <img src={url} alt={alt} className="absolute inset-0 h-full w-full object-contain p-2" />;
}

/** What can be drawn of a document the engine derives nothing from: its walls' lines, as written. */
function Skeleton({ segments, highlight, label }: { segments: Segment[]; highlight: ReadonlySet<string>; label: string }) {
  const xs = segments.flatMap((s) => [s.a[0], s.b[0]]);
  const ys = segments.flatMap((s) => [s.a[1], s.b[1]]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX || 1;
  const h = Math.max(...ys) - minY || 1;
  const pad = Math.max(w, h) * 0.05;
  const stroke = Math.max(w, h) / 160;
  return (
    <svg role="img" aria-label={label} viewBox={`${minX - pad} ${-(minY + h) - pad} ${w + 2 * pad} ${h + 2 * pad}`} className="absolute inset-0 h-full w-full p-2">
      {segments.map((s) => (
        <line
          key={`${s.kind}:${s.id}`}
          x1={s.a[0]}
          y1={-s.a[1]}
          x2={s.b[0]}
          y2={-s.b[1]}
          strokeWidth={(s.kind === 'wall' ? stroke * 2 : stroke) * (highlight.has(s.id) ? 2 : 1)}
          strokeDasharray={s.kind === 'separator' ? `${stroke * 3} ${stroke * 2}` : undefined}
          strokeLinecap="round"
          className={highlight.has(s.id) ? 'stroke-warning' : 'stroke-fg-muted'}
        />
      ))}
    </svg>
  );
}

function CheckChip({ label, check, unchecked }: { label: string; check: Check; unchecked: string }) {
  const text = check === 'pass' ? `${label} ✓` : check === 'fail' ? `${label} ✗` : `${label}: ${unchecked}`;
  return (
    <Badge tone={check === 'fail' ? 'danger' : 'neutral'} aria-label={check === 'pass' ? `${label}: passed` : check === 'fail' ? `${label}: failed` : `${label}: ${unchecked}`}>
      {text}
    </Badge>
  );
}

function CanonicalLine({ analysis }: { analysis: Analysis }) {
  const serialization = chapterPath(CORE, 'serialization');
  if (!analysis.canonical) {
    if (!analysis.evaluation) return null;
    return (
      <p className="font-mono text-12 text-fg-muted">
        file sha256 {shortHash(analysis.fileSha256)} · no canonical form: the document is not valid
      </p>
    );
  }
  const { hash, byteIdentical } = analysis.canonical;
  return (
    <p className="font-mono text-12 text-fg-muted">
      <Link to={`${serialization}#9.3`} variant="muted" className="no-underline hover:underline">
        <span title={`Content hash (Core 9.3): ${hash}`}>
          canonical sha256 {shortHash(hash)}
        </span>
      </Link>
      {' · '}
      <Link to={`${serialization}#9.2`} variant="muted" className="no-underline hover:underline">
        {byteIdentical ? 'byte-identical' : 'not in canonical form'}
      </Link>
    </p>
  );
}

function ElementIds({ ids }: { ids: string[] }) {
  if (!ids.length) return null;
  const shown = ids.slice(0, 6);
  return (
    <span className="font-mono text-12 break-all text-fg-muted">
      {shown.join(', ')}
      {ids.length > shown.length ? ` +${ids.length - shown.length}` : ''}
    </span>
  );
}

function DiagnosticRow({ d, selected, onSelect }: { d: Diagnostic; selected: boolean; onSelect: () => void }) {
  const where = d.elements.length ? null : d.location.pointer ? `at ${d.location.pointer || '/'}` : null;
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={`grid w-full grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1 border-t border-border px-4 py-3 text-left hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus sm:grid-cols-[8.5rem_4.5rem_1fr_auto] sm:px-5 ${selected ? 'bg-surface-hover' : ''}`}
      >
        <span className="font-mono text-13 text-fg">{d.code}</span>
        <span className="justify-self-end sm:justify-self-start">
          <Badge tone={SEVERITY_TONE[d.severity]} size="sm">
            {d.severity}
          </Badge>
        </span>
        <span className="col-span-2 text-14 text-fg sm:col-span-1">
          {d.message}
          {d.design ? <span className="text-fg-muted"> (in option {d.design})</span> : null}
          {where ? <span className="ml-2 font-mono text-12 text-fg-muted">{where}</span> : null}
        </span>
        <span className="col-span-2 sm:col-span-1 sm:text-right">
          <ElementIds ids={d.elements} />
        </span>
      </button>
    </li>
  );
}

function Diagnostics({ analysis, selected, onSelect }: { analysis: Analysis; selected: number | null; onSelect: (i: number | null) => void }) {
  const titleId = useId();
  const { diagnostics } = analysis;
  const lintLabel = analysis.lints === 0 ? 'no lints' : `${analysis.lints} ${analysis.lints === 1 ? 'lint' : 'lints'}`;
  return (
    <section aria-labelledby={titleId} className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-5">
        <h2 id={titleId} className="text-16 font-semibold text-fg">
          Diagnostics
        </h2>
        {analysis.evaluation && (
          <div className="flex flex-wrap items-center gap-2">
            <CheckChip label="Schema" check={analysis.schema} unchecked="not reached" />
            <CheckChip label="Invariants" check={analysis.invariants} unchecked="not checked" />
            <Badge tone={analysis.lints ? 'attention' : 'neutral'}>{lintLabel}</Badge>
            {analysis.errors > 0 && <Badge tone="danger">{`${analysis.errors} ${analysis.errors === 1 ? 'error' : 'errors'}`}</Badge>}
          </div>
        )}
        <div className="w-full sm:ml-auto sm:w-auto">
          <CanonicalLine analysis={analysis} />
        </div>
      </div>
      {diagnostics.length ? (
        <ol aria-label="Diagnostics, in the engine’s order">
          {diagnostics.map((d, i) => (
            <DiagnosticRow key={`${d.code}:${d.elements.join(',')}:${i}`} d={d} selected={selected === i} onSelect={() => onSelect(selected === i ? null : i)} />
          ))}
        </ol>
      ) : (
        <p className="border-t border-border px-4 py-4 text-14 text-fg-muted sm:px-5">
          {analysis.evaluation ? 'The engine reported nothing: no errors, warnings or lints.' : 'The engine was not run on this file.'}
        </p>
      )}
      {diagnostics.length > 0 && (
        <p className="border-t border-border px-4 py-3 text-13 text-fg-muted sm:px-5">
          Codes, severities and messages are the engine’s own; what each code means is in{' '}
          <Link to={chapterPath(CORE, 'diagnostics')}>Core chapter 10</Link>. Select a row to mark the elements it names
          on the plan and in 3D.
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------

function DropZone({ state, onFile, onSample }: { state: State; onFile: (file: File) => void; onSample: (sample: Sample) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const choose = () => input.current?.click();
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  };

  let body: ReactNode;
  if (state.status === 'ready') {
    const a = state.analysis;
    const facts = [
      a.kind === 'package' && a.package
        ? `${a.package.documentPath}${a.package.files.size ? ` + ${a.package.files.size} asset ${a.package.files.size === 1 ? 'file' : 'files'}` : ''}`
        : null,
      a.declared ? `Floorspec ${a.declared}` : null,
      a.extensions.length ? a.extensions.map(([n]) => n).join(', ') : a.evaluation?.value !== undefined && a.declared ? 'no extensions' : null,
    ].filter(Boolean);
    body = (
      <>
        <p className="max-w-full truncate text-16 font-semibold text-fg" title={a.name}>
          {a.name}
        </p>
        <p className="text-13 text-fg-muted">{[formatSize(a.size), ...facts].join(' · ')}</p>
      </>
    );
  } else if (state.status === 'reading') {
    body = (
      <p role="status" className="text-16 text-fg">
        Reading {state.name}…
      </p>
    );
  } else if (state.status === 'refused') {
    body = (
      <>
        <p className="max-w-full truncate text-16 font-semibold text-fg">{state.name}</p>
        <p className="text-13 text-fg-muted">{formatSize(state.size)}</p>
      </>
    );
  } else {
    body = (
      <>
        <p className="text-16 font-semibold text-fg">Drop a file here</p>
        <p className="text-13 text-fg-muted">A Floorspec document (.json) or a .floorspec package</p>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-5 py-6 text-center transition-colors duration-2 ${over ? 'border-focus bg-surface-hover' : 'border-border-field'}`}
      >
        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fg-muted">
          <path d="M12 19V7M6 12l6-6 6 6M5 3h14" />
        </svg>
        {body}
        <div className="pt-1">
          <Button variant="secondary" size="sm" onClick={choose}>
            {state.status === 'empty' ? 'Choose a file' : 'Choose another file'}
          </Button>
        </div>
        <input
          ref={input}
          type="file"
          accept=".json,.floorspec,application/json,application/zip"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            event.target.value = '';
          }}
        />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-13 text-fg-muted">
          {state.status === 'empty' ? 'No file to hand? Open one of the standard’s starter templates:' : 'Or a starter template:'}
        </p>
        <ul className="flex flex-wrap gap-2">
          {SAMPLES.map((sample) => (
            <li key={sample.file}>
              <Button
                variant={state.status === 'ready' && state.sample === sample ? 'secondary' : 'ghost'}
                size="sm"
                aria-pressed={state.status === 'ready' && state.sample === sample}
                onClick={() => onSample(sample)}
              >
                {sample.name}
                <span className="sr-only">: {sample.blurb}</span>
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

export function PlaygroundPage() {
  const [state, setState] = useState<State>({ status: 'empty' });
  const [selected, setSelected] = useState<number | null>(null);
  const [level, setLevel] = useState<string | undefined>(undefined);
  const [cutaway, setCutaway] = useState(true);
  const [modules, setModules] = useState<Awaited<ReturnType<typeof engine>> | null>(null);
  const { resolved: theme } = useTheme();
  // One file at a time: a slow read that finishes after a newer one is dropped.
  const turn = useRef(0);

  // The engine is fetched as soon as the page opens, so a file dropped a moment later is not kept waiting.
  useEffect(() => {
    let live = true;
    getAnalyser().then((m) => live && setModules(m));
    return () => {
      live = false;
    };
  }, []);

  const show = useCallback(async (name: string, read: () => Promise<Uint8Array>, size: number, sample?: Sample) => {
    const mine = ++turn.current;
    if (size > MAX_BYTES) {
      setState({ status: 'refused', name, size, reason: `This file is ${formatSize(size)}; the playground opens files up to ${formatSize(MAX_BYTES)}.` });
      return;
    }
    setState({ status: 'reading', name });
    setSelected(null);
    try {
      const [bytes, m] = await Promise.all([read(), getAnalyser()]);
      if (mine !== turn.current) return;
      const analysis = m.analyse({ name, bytes });
      setLevel(analysis.levels[0]?.id);
      setState({ status: 'ready', analysis, id: mine, ...(sample && { sample }) });
    } catch (error) {
      if (mine !== turn.current) return;
      setState({ status: 'refused', name, size, reason: `The file could not be read: ${error instanceof Error ? error.message : String(error)}` });
    }
  }, []);

  const onFile = useCallback((file: File) => void show(file.name, async () => new Uint8Array(await file.arrayBuffer()), file.size), [show]);
  const onSample = useCallback(
    (sample: Sample) => void show(sample.file, () => loadSample(sample), 0, sample),
    [show],
  );

  const analysis = state.status === 'ready' ? state.analysis : null;
  const highlight = useMemo(() => (analysis && selected !== null ? (analysis.diagnostics[selected]?.elements ?? []) : []), [analysis, selected]);
  const highlightSet = useMemo(() => new Set(highlight), [highlight]);
  const levelName = analysis?.levels.find((l) => l.id === level)?.name ?? level ?? '';

  const plan = useMemo(() => (analysis && modules ? modules.drawPlan(analysis, level, theme, highlight) : null), [analysis, modules, level, theme, highlight]);
  const segments = useMemo(() => (analysis && modules && plan && 'reason' in plan ? modules.skeleton(analysis, level) : []), [analysis, modules, plan, level]);
  const meshable = useMemo(() => (analysis && modules ? modules.derivedOf(analysis) : null), [analysis, modules]);

  const levelPicker =
    analysis && analysis.levels.length > 1 ? (
      <SegmentedControl
        aria-label="Level"
        size="sm"
        items={analysis.levels.map((l) => ({ value: l.id, label: l.name }))}
        value={level ?? analysis.levels[0]!.id}
        onValueChange={setLevel}
      />
    ) : null;

  return (
    <div className={`${WRAP} flex flex-col gap-8 pt-12 pb-20 lg:pt-16`}>
      <header className="flex flex-col gap-5">
        <Crumb>
          <span>Playground</span>
          <span className="rounded-full bg-warning-muted px-2.5 py-0.5 text-11 text-warning">Draft {CORE.version}</span>
        </Crumb>
        <h1 className="font-display text-display-lg tracking-display text-fg">Drop a Floorspec file.</h1>
        <p className="max-w-3xl text-16 text-fg-muted sm:text-20">
          Validated in your browser by the reference engine — nothing is uploaded. No account needed.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <DropZone state={state} onFile={onFile} onSample={onSample} />

        <Panel label="Plan" title={analysis?.levels.length ? `Plan · ${levelName}` : 'Plan'} footer={levelPicker} paper={Boolean(plan && 'svg' in plan)}>
          {!analysis ? (
            <Placeholder>{state.status === 'reading' ? 'Validating…' : 'Each level’s plan appears here.'}</Placeholder>
          ) : !plan ? (
            <Placeholder>Loading the engine…</Placeholder>
          ) : 'svg' in plan ? (
            <PlanImage svg={plan.svg} alt={`Plan of ${levelName}, drawn by the reference renderer${highlight.length ? `, with ${highlight.join(', ')} marked` : ''}`} />
          ) : segments.length ? (
            <div className="absolute inset-0 flex flex-col">
              <p className="px-4 pt-3 text-13 text-fg-muted">{plan.reason}</p>
              <div className="relative min-h-0 flex-1">
                <Skeleton segments={segments} highlight={highlightSet} label={`The walls of ${levelName} as written`} />
              </div>
            </div>
          ) : (
            <Placeholder>{plan.reason}</Placeholder>
          )}
        </Panel>

        <Panel
          label="3D"
          title="3D"
          footer={
            meshable && analysis && analysis.levels.length > 0 ? (
              <SegmentedControl
                aria-label="3D view"
                size="sm"
                items={[
                  { value: 'cut', label: 'Cutaway' },
                  { value: 'whole', label: 'Whole' },
                ]}
                value={cutaway ? 'cut' : 'whole'}
                onValueChange={(v) => setCutaway(v === 'cut')}
              />
            ) : null
          }
        >
          {!analysis ? (
            <Placeholder>{state.status === 'reading' ? 'Validating…' : 'The house in 3D appears here.'}</Placeholder>
          ) : !modules ? (
            <Placeholder>Loading the engine…</Placeholder>
          ) : meshable ? (
            <Suspense fallback={<Placeholder>Loading the mesher…</Placeholder>}>
              <View3D
                key={state.status === 'ready' ? state.id : 0}
                document={meshable.document}
                derived={meshable.derived}
                level={level}
                cutaway={cutaway}
                highlight={highlight}
                label={`The house in 3D${cutaway ? `, cut away above ${levelName}` : ''}, from the south-west`}
              />
            </Suspense>
          ) : (
            <Placeholder>
              {analysis.notFloorspec
                ? 'Nothing to show.'
                : 'Nothing to mesh: 3D is built from what the engine derives, and it derives nothing from a document with errors.'}
            </Placeholder>
          )}
        </Panel>
      </div>

      {state.status === 'refused' && (
        <div role="alert" className="rounded-lg border border-danger bg-danger-muted px-4 py-3 text-14 text-fg">
          {state.reason}
        </div>
      )}
      {analysis?.notFloorspec && (
        <div role="alert" className="flex flex-col gap-1 rounded-lg border border-warning bg-warning-muted px-4 py-3">
          <p className="text-14 font-semibold text-fg">{analysis.notFloorspec.title}</p>
          <p className="text-14 text-fg">{analysis.notFloorspec.detail}</p>
        </div>
      )}
      {analysis?.package && (analysis.package.missing.length > 0 || analysis.package.ignored.length > 0) && (
        <p className="text-13 text-fg-muted">
          {analysis.package.missing.length > 0 && `${analysis.package.missing.length} asset ${analysis.package.missing.length === 1 ? 'file is' : 'files are'} not in the package. `}
          {analysis.package.ignored.length > 0 && `${analysis.package.ignored.length} ${analysis.package.ignored.length === 1 ? 'file' : 'files'} in it ${analysis.package.ignored.length === 1 ? 'is' : 'are'} named by nothing in the document: ${analysis.package.ignored.slice(0, 5).join(', ')}${analysis.package.ignored.length > 5 ? '…' : ''}.`}
        </p>
      )}

      {analysis && <Diagnostics analysis={analysis} selected={selected} onSelect={setSelected} />}

      <footer className="flex max-w-3xl flex-col gap-2 text-13 text-fg-muted">
        <p>
          Validated by <span className="font-mono">@floorspec/engine {lock.engine.version}</span> from{' '}
          <UiLink href={`${ENGINE_REPO}/tree/${lock.commit}`}>
            {lock.repository}@{SHORT}
          </UiLink>
          , a reader of Floorspec Core {lock.engine.reads.join(', ')} that implements every official extension — the reader D3 Floorspec runs.
          Plans are drawn by its renderer, and 3D by its mesher with manifold-3d. All of it runs on this page; your file is never sent anywhere.
        </p>
        <p>
          A valid document is one the engine finds no errors in, by {specName(CORE)}: it says nothing about whether a house could be built
          or permitted. The samples are the standard’s{' '}
          <UiLink href={`https://github.com/${lock.standard.repository}/tree/${lock.standard.commit}/templates`}>starter templates</UiLink>.
        </p>
      </footer>
    </div>
  );
}
