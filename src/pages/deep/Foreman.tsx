import type { ReactNode } from 'react';
import type { Project } from '../../content/projects';
import { BarRow, DeepIndex, DeepSection, Figure, FlowDown, Stat, type DeepEntry } from '../../components/Deep';
import { Accent, Quiet } from '../../components/Marketing';

/**
 * Foreman, explained (DI-T-8.2). Laid out like the thing it describes: every
 * section carries a code the way Foreman's records carry human IDs, and reads
 * top to bottom as a ledger — why, how it is used, how it is built, what it
 * decided, how it was made, what it refuses to be.
 *
 * Every number here comes from Foreman's own repository or its FRM records
 * (FRM-ADR-012, apps/server/src/domain/attribution.ts and drift.ts, the P10
 * cutover report). The drift breakdown is FRM's own, as of 2026-09-27.
 */

const ENTRIES: DeepEntry[] = [
  { id: 'why', label: 'Why' },
  { id: 'walkthrough', label: 'Walkthrough' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'trace', label: 'Traceability' },
  { id: 'attribution', label: 'Attribution' },
  { id: 'drift', label: 'Drift' },
  { id: 'mcp', label: 'MCP' },
  { id: 'decisions', label: 'Decisions' },
  { id: 'build', label: 'How it was built' },
  { id: 'not', label: 'What it is not' },
];

const code = (n: number) => `FRM · ${String(n).padStart(2, '0')}`;

/* ---------------------------------------------------------------- Why */

const VAULT_FILES = 534;
const LARGEST_SHARE = 0.39;
const COLS = 30;

/** 534 cells, one per file in the old vault; the largest project's share lit. */
function Waffle({ accent }: { accent: string }) {
  const lit = Math.round(VAULT_FILES * LARGEST_SHARE);
  const rows = Math.ceil(VAULT_FILES / COLS);
  const cells = Array.from({ length: VAULT_FILES }, (_, i) => {
    // Column-major, so the one project's share reads as a single block on the left.
    const x = Math.floor(i / rows);
    const y = i % rows;
    return { x, y, on: i < lit };
  });
  return (
    <svg
      viewBox={`0 0 ${COLS * 10} ${rows * 10}`}
      className="h-auto w-full"
      role="img"
      aria-label={`${VAULT_FILES} squares, one per file in the old planning vault. ${lit} of them — 39% — belong to a single project.`}
    >
      {cells.map((c) => (
        <rect
          key={`${c.x}-${c.y}`}
          x={c.x * 10 + 1}
          y={c.y * 10 + 1}
          width="8"
          height="8"
          rx="1.5"
          className={c.on ? undefined : 'fill-border-field'}
          style={c.on ? { fill: accent } : undefined}
        />
      ))}
    </svg>
  );
}

function Why({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="why"
      code={code(1)}
      label="Why it exists"
      title={
        <>
          534 files, and not one question <Accent>you could ask across them.</Accent>
        </>
      }
      lede="Before Foreman, every plan lived in an Obsidian vault. The trouble was never Markdown. It was that nothing in it could be asked a question — and the two chains that mattered most were being kept by hand."
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-center">
        <Figure caption="Each square is one file in the vault. The lit block is a single project — 39% of everything. Four projects had no files at all.">
          <Waffle accent={accent} />
        </Figure>
        <div className="grid grid-cols-2 gap-8">
          <Stat value="39%" label="of every file belonged to one project" />
          <Stat value="4" label="projects had no plan on disk at all" />
          <Stat value="127" label="audit findings — the largest dataset, and the most deeply buried" />
          <Stat value="0" label="questions that could be asked across projects" />
        </div>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- Walkthrough */

interface Step {
  title: string;
  who: string;
  body: string;
  screen: ReactNode;
}

const STEPS: Step[] = [
  {
    title: 'Plan it',
    who: 'You and Claude',
    body: 'An interview becomes records, not files: requirements with IDs, phases, tasks, decisions. Each requirement is checked against EARS — warned, never blocked.',
    screen: (
      <>
        <span className="text-fg">FRM-REQ-106</span> <Quiet>M · EARS ✓</Quiet>
        {'\n'}
        <Quiet>Foreman shall attribute a commit to a Task by agent declaration first…</Quiet>
      </>
    ),
  },
  {
    title: 'Ask where it stands',
    who: 'Claude, over MCP',
    body: 'A session opens with one call. The brief is a few hundred tokens: the phase in flight, what is next, what is blocked and why, CI, drift.',
    screen: (
      <>
        <Quiet>›</Quiet> foreman_brief FRM{'\n'}
        <Quiet>phase </Quiet>P-11 The Fleet · 4/4{'\n'}
        <Quiet>ci    </Quiet>success · 8f7da9f{'\n'}
        <Quiet>drift </Quiet>47
      </>
    ),
  },
  {
    title: 'Build',
    who: 'Claude, in the repo',
    body: 'Work lands as ordinary commits. GitHub tells Foreman; the receiver queues the delivery before it answers, so nothing is dropped.',
    screen: (
      <>
        <span className="text-fg">8f7da9f</span> FRM-T-11.4: a cancelled{'\n'}
        task is closed, so done-or-{'\n'}
        cancelled work reads 100%
      </>
    ),
  },
  {
    title: 'Say what it was for',
    who: 'Claude declares, you confirm',
    body: 'Claude declares which task a commit served. That is a proposal until a person confirms it — a guess is never counted as done.',
    screen: (
      <>
        <Quiet>›</Quiet> foreman_attribute{'\n'}
        <Quiet>  </Quiet>8f7da9f → FRM-T-11.4{'\n'}
        <Quiet>source </Quiet>declared · 1.0{'\n'}
        <Quiet>state  </Quiet>proposed → confirmed
      </>
    ),
  },
  {
    title: 'Find where it drifted',
    who: 'Foreman, every night',
    body: 'Plan and reality are compared: uncovered requirements, stale tasks, fired tripwires, gates that would fail today. Each is named, so it can be fixed.',
    screen: (
      <>
        <Quiet>coverage-hole    </Quiet>26{'\n'}
        <Quiet>failed-exit-gate </Quiet>10{'\n'}
        <Quiet>orphan-adr       </Quiet>11{'\n'}
        <Quiet>stale-task       </Quiet>0
      </>
    ),
  },
];

function Walkthrough({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="walkthrough"
      code={code(2)}
      label="A walkthrough"
      title={
        <>
          Five steps, <Accent>one loop.</Accent>
        </>
      }
      lede="How a piece of work moves through Foreman — from the line in the plan to the commit that satisfied it, and back to the plan when the two disagree."
      sunken
    >
      <div className="relative">
        {/* The loop's track, with a dot running along it (desktop). */}
        <span aria-hidden="true" className="absolute top-5 right-10 left-10 hidden h-px bg-border-field lg:block">
          <span className="flow-x absolute -top-0.75 size-2 rounded-full" style={{ backgroundColor: accent }} />
        </span>
        <ol className="relative grid gap-6 lg:grid-cols-5 lg:gap-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-4">
              <span
                className="flex size-10 items-center justify-center rounded-full border border-border-field bg-bg font-mono text-14 text-fg"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="text-16 font-semibold text-fg">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </h3>
                <p className="font-mono text-11 tracking-label text-fg-faint uppercase">{step.who}</p>
              </div>
              <p className="text-14 text-fg-muted">{step.body}</p>
              <pre className="mt-auto rounded-md border border-border bg-surface p-4 font-mono text-12 break-words whitespace-pre-wrap text-fg-muted">
                {step.screen}
              </pre>
            </li>
          ))}
        </ol>
        <p className="mt-10 flex items-center gap-3 text-14 text-fg-muted">
          <span aria-hidden="true" className="font-mono text-fg-faint">
            ↺
          </span>
          Drift is a list of things to plan next, so step five feeds step one.
        </p>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- Architecture */

function Box({
  title,
  kicker,
  children,
  accent,
  strong = false,
}: {
  title: string;
  kicker?: string;
  children?: ReactNode;
  accent?: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border bg-surface p-5 ${strong ? 'border-border-field' : 'border-border'}`}
      style={accent ? { borderTopColor: accent, borderTopWidth: 3 } : undefined}
    >
      {kicker && <span className="font-mono text-11 tracking-label text-fg-faint uppercase">{kicker}</span>}
      <span className="text-16 font-semibold text-fg">{title}</span>
      {children && <span className="text-13 text-fg-muted">{children}</span>}
    </div>
  );
}

function Architecture({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="architecture"
      code={code(3)}
      label="Architecture"
      title={
        <>
          Two front doors, <Accent>one ledger.</Accent>
        </>
      }
      lede="The console and the MCP server are equal peers: anything you can see or change in one, Claude can in the other. Both sit on the same API, the same shapes and the same database — and nothing in it calls a language model."
    >
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div role="img" aria-label="Architecture: you, Claude and GitHub reach Foreman through a Cloudflare Tunnel. One Express server serves the console, the REST API, the MCP endpoint and a webhook receiver. It stores everything in PostgreSQL 16, which also holds the job queue a worker drains." className="flex flex-col">
          <div className="grid gap-3 sm:grid-cols-3" aria-hidden="true">
            <Box kicker="You" title="The console">
              React 19 on @d3cloud/ui, served by the server itself
            </Box>
            <Box kicker="Claude" title="MCP">
              A local stdio shim with a scoped token, or remote /mcp signed in by D3 Auth
            </Box>
            <Box kicker="GitHub" title="The GitHub App">
              Commits, files, check runs and releases, as webhooks
            </Box>
          </div>
          <FlowDown accent={accent} />
          <div
            aria-hidden="true"
            className="rounded-full border border-dashed border-border-field px-5 py-2.5 text-center text-13 text-fg-muted"
          >
            Cloudflare Tunnel · <span className="text-fg">no host ports</span>
          </div>
          <FlowDown accent={accent} />
          <div aria-hidden="true" className="flex flex-col gap-3 rounded-lg border border-border-field bg-bg-sunken p-4">
            <span className="px-1 font-mono text-11 tracking-label text-fg-faint uppercase">
              Foreman server · Node 22 · Express
            </span>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Box title="Console statics" accent={accent} />
              <Box title="REST API" accent={accent}>
                Writes need If-Match — a stale edit is refused
              </Box>
              <Box title="/mcp" accent={accent}>
                12 tools, and documents as resources
              </Box>
              <Box title="Webhook receiver" accent={accent}>
                Checks the HMAC, queues, then answers
              </Box>
            </div>
            <Box title="Dual login">
              Its own password with Argon2id and TOTP, or Sign in with D3 Auth — linked by issuer and subject, never by
              email
            </Box>
          </div>
          <FlowDown accent={accent} />
          <div aria-hidden="true" className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,3fr)_auto_minmax(0,2fr)]">
            <Box kicker="State" title="PostgreSQL 16" strong>
              43 models. Every write leaves an audit event and can be undone. The job queue lives here too — no Redis.
            </Box>
            <span className="hidden items-center font-mono text-16 text-fg-faint lg:flex">⇄</span>
            <Box kicker="Worker" title="Drains the queue" strong>
              Ingest · backfill · nightly reconcile · backup · restore drill. Stages are replayable.
            </Box>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
            <span className="font-mono text-11 tracking-label text-fg-faint uppercase">One source of truth</span>
            <span className="text-16 font-semibold text-fg">packages/shared</span>
            <span className="text-13 text-fg-muted">
              Every entity is declared once. API validation, console types and the MCP tool schemas are generated from
              it, and a contract test fails if they disagree.
            </span>
            <svg viewBox="0 0 200 84" className="h-auto w-full" aria-hidden="true">
              <rect x="70" y="4" width="60" height="22" rx="4" className="fill-surface-raised stroke-border-field" />
              <text x="100" y="19" textAnchor="middle" className="fill-fg font-mono text-11">shared</text>
              {[30, 100, 170].map((x, i) => (
                <g key={x}>
                  <path d={`M100 26 C100 44 ${x} 40 ${x} 58`} fill="none" strokeWidth="1.5" style={{ stroke: accent }} />
                  <rect x={x - 28} y="58" width="56" height="22" rx="4" className="fill-bg stroke-border" />
                  <text x={x} y="73" textAnchor="middle" className="fill-fg-muted font-mono text-11">
                    {['API', 'console', 'MCP'][i]}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border-field p-5">
            <span className="font-mono text-11 tracking-label text-fg-faint uppercase">Deliberately missing</span>
            <span className="text-16 font-semibold text-fg line-through decoration-danger decoration-2">
              A language model
            </span>
            <span className="text-13 text-fg-muted">
              The server never calls one. Claude is Foreman’s user, not its dependency — and a test fails if an AI SDK
              appears in any package.json.
            </span>
          </div>
        </aside>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- Traceability */

function Chain({ links, accent, label }: { links: { kind: string; id: string }[]; accent: string; label: string }) {
  return (
    <ol aria-label={label} className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0">
      {links.map((link, index) => (
        <li key={link.kind} className="flex flex-col items-stretch sm:flex-1 sm:flex-row sm:items-center">
          <span className="flex flex-1 flex-col gap-1 rounded-md border border-border bg-surface px-4 py-3">
            <span className="font-mono text-11 tracking-label text-fg-faint uppercase">{link.kind}</span>
            <span className="font-mono text-13 text-fg">{link.id}</span>
          </span>
          {index < links.length - 1 && (
            <span aria-hidden="true" className="flex items-center justify-center py-1 sm:px-2 sm:py-0">
              <svg width="24" height="12" viewBox="0 0 24 12" className="rotate-90 sm:rotate-0">
                <path d="M1 6 H21 M16 1 L22 6 L16 11" fill="none" strokeWidth="1.5" strokeLinecap="round" style={{ stroke: accent }} />
              </svg>
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function Traceability({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="trace"
      code={code(4)}
      label="Traceability"
      title={
        <>
          The two chains, <Accent>made first-class.</Accent>
        </>
      }
      lede="These were kept by hand in YAML frontmatter, and a chain kept by hand breaks silently. In Foreman each arrow is a row — cite an ID anywhere and the backlink is built for you."
      sunken
    >
      <div className="flex flex-col gap-10">
        <Figure caption="A real chain: the requirement for attribution, the task that built it, and the proof it shipped.">
          <Chain
            label="Requirement to check run"
            accent={accent}
            links={[
              { kind: 'Requirement', id: 'FRM-REQ-106' },
              { kind: 'Task', id: 'FRM-T-5.7' },
              { kind: 'Commit', id: 'sha, attributed' },
              { kind: 'Check run', id: 'CI · success' },
            ]}
          />
        </Figure>
        <Figure caption="And for audits: a finding, where it points, the commit that fixed it, and the decision it led to. A fix counts only once its commit is known.">
          <Chain
            label="Finding to decision"
            accent={accent}
            links={[
              { kind: 'Finding', id: 'BND-CR-119' },
              { kind: 'File:line', id: 'path, in the repo' },
              { kind: 'Fix commit', id: 'sha, ingested' },
              { kind: 'Decision', id: 'ADR, if one' },
            ]}
          />
        </Figure>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- Attribution */

function Dumbbell({
  repo,
  planned,
  measured,
  detail,
  accent,
}: {
  repo: string;
  planned: number;
  measured: number;
  detail: string;
  accent: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-16 font-semibold text-fg">{repo}</span>
        <span className="font-mono text-13 text-fg-muted">{detail}</span>
      </div>
      <div className="relative h-6" aria-hidden="true">
        <span className="absolute top-1/2 right-0 left-0 h-px bg-border-field" />
        <span
          className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-fg-faint"
          style={{ left: `${measured}%`, width: `${planned - measured}%` }}
        />
        <span
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-fg-faint bg-bg"
          style={{ left: `${planned}%` }}
        />
        <span
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${measured}%`, backgroundColor: accent }}
        />
      </div>
      <div className="flex justify-between font-mono text-11 text-fg-faint" aria-hidden="true">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
      <p className="text-14 text-fg-muted">
        The plan recorded <span className="text-fg">{planned}%</span> of commits citing a task. Measured by the parser
        itself: <span className="text-fg">{measured}%</span>.
      </p>
    </div>
  );
}

function Attribution({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="attribution"
      code={code(5)}
      label="Attribution"
      title={
        <>
          Which task was that commit for? <Accent>Three signals, ranked.</Accent>
        </>
      }
      lede="The plan said file overlap would answer it. Measured against the real corpus, only 60 of 363 tasks named their files — so the ranking was rebuilt around what the history actually contains."
    >
      <div className="grid gap-16 lg:grid-cols-2">
        <Figure caption="The confidence Foreman gives each signal. The order decides which proposal is offered, not which is true.">
          <div className="flex flex-col gap-6">
            <BarRow label="1 · Claude declares it" value="1.0" fraction={1} accent={accent} note="A fact: Claude knows what it was working on." />
            <BarRow label="2 · The message cites it" value="0.9" fraction={0.9} accent={accent} note="“T-13.9” in the subject — bare IDs too, because nobody types the project code." />
            <BarRow label="3 · Files overlap" value="0.3" fraction={0.3} accent={accent} muted note="A hint, never more. Only 17% of tasks declare their files." />
          </div>
        </Figure>
        <Figure caption="Planned (hollow) against measured (filled), over every non-bot commit: 31 of 160 in Bindery, 59 of 107 in D3 Auth. Recorded as FRM-ADR-012.">
          <div className="flex flex-col gap-10">
            <Dumbbell repo="Bindery" planned={56} measured={19} detail="31 / 160" accent={accent} />
            <Dumbbell repo="D3 Auth" planned={65} measured={55} detail="59 / 107" accent={accent} />
          </div>
        </Figure>
      </div>
      <div className="flex flex-col gap-3 rounded-lg border border-border-field p-6 sm:flex-row sm:items-center sm:gap-6">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-fg">
          <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="12" cy="16" r="1.6" style={{ fill: accent }} />
        </svg>
        <p className="text-16 text-fg">
          An unconfirmed attribution is never truth.{' '}
          <Quiet>
            No coverage, status, brief or drift figure may read one, and a test holds that line — a file-path
            coincidence must never mark work complete.
          </Quiet>
        </p>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- Drift */

const DRIFT = [
  { key: 'coverage-hole', label: 'Coverage hole', what: 'A Must with no task, or a task citing no requirement', n: 26 },
  { key: 'failed-exit-gate', label: 'Failed exit gate', what: 'A phase marked done that would not pass its gate today', n: 10 },
  { key: 'orphan-adr', label: 'Orphan decision', what: 'Accepted but cited by nothing, or a broken supersedes chain', n: 11 },
  { key: 'stale-task', label: 'Stale task', what: 'In progress, with no commits touching its files', n: 0 },
  { key: 'fired-tripwire', label: 'Fired tripwire', what: 'A risk whose named condition has been met', n: 0 },
];

/** Plan against reality: a straight intention and the wandering line that happened. */
function PlanVsReality({ accent }: { accent: string }) {
  const gaps = [
    { x: 250, a: 105, b: 132 },
    { x: 420, a: 76, b: 44 },
    { x: 560, a: 52, b: 92 },
  ];
  return (
    <svg viewBox="0 0 640 180" className="h-auto w-full" role="img" aria-label="Two lines: the plan, straight and dashed, and what actually happened, wandering away from it. The gaps between them are drift.">
      <path d="M20 150 L620 40" fill="none" strokeWidth="2" strokeDasharray="6 7" className="stroke-fg-faint" />
      <path
        d="M20 150 C90 140 150 150 200 128 S260 140 300 118 S380 40 440 44 S520 100 580 90 L620 70"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="stroke-fg"
      />
      {gaps.map((g) => (
        <g key={g.x}>
          <line x1={g.x} y1={g.a} x2={g.x} y2={g.b} strokeWidth="1.5" strokeDasharray="2 3" style={{ stroke: accent }} />
          <circle cx={g.x} cy={(g.a + g.b) / 2} r="5" className="animate-twinkle" style={{ fill: accent }} />
        </g>
      ))}
      <text x="620" y="30" textAnchor="end" className="fill-fg-muted text-12">the plan</text>
      <text x="330" y="150" className="fill-fg text-12">what happened</text>
    </svg>
  );
}

function Drift({ accent }: { accent: string }) {
  const total = DRIFT.reduce((sum, d) => sum + d.n, 0);
  return (
    <DeepSection
      id="drift"
      code={code(6)}
      label="Drift"
      title={
        <>
          One engine, <Accent>three places it shows.</Accent>
        </>
      }
      lede="Drift is the distance between what the plan says and what is true. It is computed once and shown three ways — the drift screen, a badge on the portfolio, a line in the brief — so the badge can never disagree with the page it links to."
      sunken
    >
      <PlanVsReality accent={accent} />

      <div className="grid gap-12 lg:grid-cols-2">
        <Figure caption={`Foreman's drift on its own plan, FRM, on 27 September 2026: ${total} items, every one named.`}>
          <div className="flex h-6 overflow-hidden rounded-full bg-surface-raised" aria-hidden="true">
            {DRIFT.filter((d) => d.n > 0).map((d, i) => (
              <span
                key={d.key}
                className="bar h-full border-r-2 border-bg-sunken"
                style={{ width: `${(d.n / total) * 100}%`, backgroundColor: accent, opacity: 1 - i * 0.28 }}
              />
            ))}
          </div>
          <dl className="flex flex-col divide-y divide-border">
            {DRIFT.map((d, i) => (
              <div key={d.key} className="flex items-start gap-4 py-3">
                <span
                  aria-hidden="true"
                  className={`mt-1.5 size-2.5 shrink-0 rounded-full ${d.n === 0 ? 'border border-fg-faint' : ''}`}
                  style={d.n > 0 ? { backgroundColor: accent, opacity: 1 - i * 0.28 } : undefined}
                />
                <dt className="flex flex-1 flex-col gap-0.5">
                  <span className="text-14 font-semibold text-fg">{d.label}</span>
                  <span className="text-13 text-fg-muted">{d.what}</span>
                </dt>
                <dd className="font-mono text-16 text-fg">{d.n}</dd>
              </div>
            ))}
          </dl>
        </Figure>

        <Figure caption="The same query behind all three. A test asserts they agree.">
          <div className="flex flex-col">
            <div className="rounded-lg border border-border-field bg-surface p-5 text-center">
              <span className="font-mono text-11 tracking-label text-fg-faint uppercase">drift.ts</span>
              <p className="text-16 font-semibold text-fg">One query layer, five categories</p>
            </div>
            <FlowDown accent={accent} />
            <div className="grid grid-cols-3 gap-3">
              {['Drift screen', 'Portfolio badge', 'The brief'].map((surface) => (
                <div key={surface} className="flex flex-col items-center gap-2 rounded-lg border border-border bg-bg p-4 text-center">
                  <span className="font-display text-display-sm text-fg">{total}</span>
                  <span className="text-13 text-fg-muted">{surface}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-14 text-fg-muted">
              And the strongest check of all: <span className="text-fg">a phase cannot be marked complete while its
              exit gate fails</span> — the refusal names exactly what is in the way.
            </p>
          </div>
        </Figure>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- MCP */

const READS = ['foreman_brief', 'foreman_get', 'foreman_search', 'foreman_coverage', 'foreman_findings', 'foreman_portfolio'];
const WRITES = ['foreman_create', 'foreman_update', 'foreman_set_status', 'foreman_link', 'foreman_attribute', 'foreman_delete'];

function ToolGrid({ title, tools, accent, filled }: { title: string; tools: string[]; accent: string; filled: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="font-mono text-11 tracking-label text-fg-faint uppercase">{title}</span>
      <ul className="grid grid-cols-2 gap-2">
        {tools.map((tool) => (
          <li
            key={tool}
            className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2.5 font-mono text-12 text-fg"
          >
            <span
              aria-hidden="true"
              className={`size-2 shrink-0 rounded-full ${filled ? '' : 'border-2'}`}
              style={filled ? { backgroundColor: accent } : { borderColor: accent }}
            />
            <span className="truncate">{tool.replace('foreman_', '')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Mcp({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="mcp"
      code={code(7)}
      label="The MCP surface"
      title={
        <>
          Twelve verbs. <Accent>The ceiling is full.</Accent>
        </>
      }
      lede="A large graph behind a small surface. Every tool Claude sees costs context in every session, so the count is capped at twelve and the definitions' size is budgeted — both asserted by contract tests."
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-4" role="img" aria-label="12 of 12 tool slots used">
            <span className="flex gap-1.5" aria-hidden="true">
              {Array.from({ length: 12 }, (_, i) => (
                <span key={i} className="h-6 w-2.5 rounded-xs" style={{ backgroundColor: accent }} />
              ))}
            </span>
            <span className="font-mono text-14 text-fg">12 / 12</span>
          </div>
          <div className="grid gap-8 sm:grid-cols-2">
            <ToolGrid title="Read" tools={READS} accent={accent} filled={false} />
            <ToolGrid title="Write" tools={WRITES} accent={accent} filled />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Figure caption="Long content is a resource, fetched one section at a time — never tool output.">
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5">
              <span className="font-mono text-12 text-fg">foreman://FRM/architecture</span>
              {['#overview', '#data-model', '#deployment', '#security'].map((section) => {
                const on = section === '#deployment';
                return (
                  <span
                    key={section}
                    className={`flex items-center justify-between rounded-sm px-3 py-2 font-mono text-12 ${on ? 'bg-surface-raised text-fg' : 'text-fg-faint'}`}
                  >
                    {section}
                    {on && (
                      <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: accent }} />
                    )}
                  </span>
                );
              })}
            </div>
          </Figure>
          <Figure caption="Forward progress just happens. Anything regressive or irreversible asks you first, through the protocol's own round-trip.">
            <ol className="flex flex-col gap-2 text-13">
              <li className="self-start rounded-md border border-border bg-surface px-3 py-2 font-mono text-fg">
                set_status FRM-P-10 → done
              </li>
              <li className="self-end rounded-md border border-border-field px-3 py-2 text-fg-muted">
                Completing a phase — confirm?
              </li>
              <li className="flex items-center gap-2 self-start px-3 py-2 font-mono text-fg">
                <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: accent }} />
                you confirm · written, audited, undoable
              </li>
            </ol>
          </Figure>
        </div>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- Decisions */

const ADRS = [
  { id: 'FRM-ADR-002', title: 'A small verb surface over a large graph', why: 'Tool definitions cost context in every session. Twelve verbs reach every kind of record.' },
  { id: 'FRM-ADR-004', title: 'Dual login, forever', why: 'Anyone who clones it can run it, and it still offers Sign in with D3 Auth. Identities link by issuer and subject, never email.' },
  { id: 'FRM-ADR-005', title: 'Attribution is declared, not inferred', why: 'A guess that marks work done is worse than no answer. Claude says what it did; a person confirms.' },
  { id: 'FRM-ADR-008', title: 'IDs are prefixed and permanent', why: 'A code is embedded in every citation forever. Renumbering would break every document that cites one.' },
  { id: 'FRM-ADR-009', title: 'One cutover, not a migration window', why: 'Two sources of truth is none. Nine projects moved on one day and the vault was frozen behind them.' },
  { id: 'FRM-ADR-012', title: '19%, not 56%', why: 'The parser measured the plan’s own assumption and found it three times too high — which made declaring load-bearing.' },
];

function Decisions({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="decisions"
      code={code(8)}
      label="Decisions"
      title={
        <>
          Why it is built <Accent>this way.</Accent>
        </>
      }
      lede="Seventeen decisions are recorded on Foreman's own plan. These six shaped it most."
      sunken
    >
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ADRS.map((adr) => (
          <li key={adr.id} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-6">
            <span className="flex items-center gap-2 font-mono text-12 text-fg-muted">
              <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: accent }} />
              {adr.id}
            </span>
            <span className="text-16 font-semibold text-fg">{adr.title}</span>
            <span className="text-14 text-fg-muted">{adr.why}</span>
          </li>
        ))}
      </ul>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- Build */

const PHASES = [
  { n: 0, name: 'Foundation', mark: '17 Sep', note: 'Scaffolded' },
  { n: 1, name: 'Where Are We' },
  { n: 2, name: 'Write-Back & Custody' },
  { n: 3, name: 'Traceability', mark: '18 Sep', note: 'Deployed' },
  { n: 4, name: 'The Record' },
  { n: 5, name: 'Reality' },
  { n: 6, name: 'Findings' },
  { n: 7, name: 'Signal & Operations' },
  { n: 8, name: 'The Importer' },
  { n: 9, name: 'Hardening' },
  { n: 10, name: 'The Cutover', mark: '20 Sep', note: 'Source of truth' },
  { n: 11, name: 'The Fleet', mark: '25 Sep', note: '4 of 4 done' },
];

const CUTOVER = [
  { label: 'Tasks', n: 724 },
  { label: 'Requirements', n: 439 },
  { label: 'Findings', n: 127 },
  { label: 'Documents', n: 122 },
  { label: 'Decisions', n: 36 },
  { label: 'Projects', n: 9 },
];

function Build({ accent }: { accent: string }) {
  const max = CUTOVER[0].n;
  return (
    <DeepSection
      id="build"
      code={code(9)}
      label="How it was built"
      title={
        <>
          Twelve phases, <Accent>then it took over.</Accent>
        </>
      }
      lede="Foreman was planned in the vault it would replace, built phase by phase against its own exit gates, and then asked to hold its own remaining work. It tracks itself as FRM."
    >
      <ol className="relative flex flex-col gap-0 lg:grid lg:grid-cols-12 lg:gap-2">
        <span aria-hidden="true" className="absolute top-2 bottom-2 left-2 w-px bg-border-field lg:top-2 lg:right-4 lg:bottom-auto lg:left-4 lg:h-px lg:w-auto" />
        {PHASES.map((phase) => (
          <li key={phase.n} className="relative flex gap-4 pb-5 pl-0 lg:flex-col lg:gap-3 lg:pb-0">
            <span
              aria-hidden="true"
              className={`relative z-10 mt-0.5 size-4 shrink-0 rounded-full border-2 lg:mt-0 ${phase.mark ? '' : 'border-fg-faint bg-bg'}`}
              style={phase.mark ? { backgroundColor: accent, borderColor: accent } : undefined}
            />
            <span className="flex flex-col gap-1">
              <span className="font-mono text-11 text-fg-faint">P{phase.n}</span>
              <span className="text-13 text-fg">{phase.name}</span>
              {phase.mark && (
                <span className="font-mono text-11 text-fg-muted">
                  {phase.mark} · {phase.note}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <Figure caption="What moved in at the cutover on 20 September 2026: nine projects, and not one source file left unmapped.">
          <div className="flex flex-col gap-4">
            {CUTOVER.map((row) => (
              <BarRow key={row.label} label={row.label} value={row.n} fraction={row.n / max} accent={accent} />
            ))}
          </div>
        </Figure>
        <div className="grid grid-cols-2 gap-8">
          <Stat value="0" label="files unmapped by the importer — silence is the failure it exists to prevent" />
          <Stat value="10" label="importer bugs found at the cutover, none visible to a report that only counted files" />
          <Stat value="107" label="end-to-end tests, and axe clean on twenty screens in both themes" />
          <Stat value="<15ms" label="every endpoint at p95, over 210 real requirements" />
        </div>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- Not */

const NOT = [
  'Sprints, velocity, story points',
  'Time tracking',
  'Assignees, comments, notifications',
  'Due dates and Gantt charts',
  'A freeform wiki',
  'Public or shareable views',
  'A general issue tracker',
  'A server-side LLM call',
  'Redis',
];

function Not() {
  return (
    <DeepSection
      id="not"
      code={code(10)}
      label="What it is not"
      title={
        <>
          The refusals are <Accent>requirements too.</Accent>
        </>
      }
      lede="Each of these is recorded as a requirement asserting its absence, so none of them can quietly arrive. The one that matters most: no freeform wiki — the guardrail that stops Foreman decaying back into the vault."
      sunken
    >
      <ul className="flex flex-wrap gap-3">
        {NOT.map((item) => (
          <li
            key={item}
            className="rounded-full border border-border px-4 py-2 text-14 text-fg-muted line-through decoration-fg-faint"
          >
            {item}
          </li>
        ))}
      </ul>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- Page */

export function ForemanDeepDive({ project }: { project: Project }) {
  const accent = project.accent;
  return (
    <>
      <DeepIndex entries={ENTRIES} accent={accent} />
      <Why accent={accent} />
      <Walkthrough accent={accent} />
      <Architecture accent={accent} />
      <Traceability accent={accent} />
      <Attribution accent={accent} />
      <Drift accent={accent} />
      <Mcp accent={accent} />
      <Decisions accent={accent} />
      <Build accent={accent} />
      <Not />
    </>
  );
}
