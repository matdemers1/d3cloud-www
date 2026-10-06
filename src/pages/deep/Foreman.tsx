import type { ReactNode } from 'react';
import type { Project } from '../../content/projects';
import { BarRow, DeepIndex, DeepSection, Figure, FlowDown, Stat, type DeepEntry } from '../../components/Deep';
import { Accent, Quiet } from '../../components/Marketing';

/**
 * Foreman, explained (DI-T-8.2, DI-REQ-041). Laid out like the thing it
 * describes: every section carries a code the way Foreman's records carry IDs,
 * and reads top to bottom as a ledger — the problem, how it is used, how it is
 * built, the ideas it rests on, how to bring a plan in, what it refuses to be.
 *
 * Written for the reader, not the maker: examples use an illustrative project
 * coded APP. Product facts — the attribution weights, the five drift
 * categories, the twelve tools, the test and latency figures — come from
 * Foreman's repository. Refreshed 2026-10-06 against origin/main fd13023
 * (DI-T-11.1): 47 Prisma models; 146 Playwright tests and 26 axe screens per
 * theme, from CI run 37260334882; task dependencies, status rollup and
 * guidelines (FRM-T-11.1, FRM-T-11.5, FRM-T-009); the ideas-board boundary
 * (FRM-ADR-016, board-stays-in-its-lane.test.ts). The p95 figure is the
 * Phase 9 measurement recorded in Foreman.
 */

const ENTRIES: DeepEntry[] = [
  { id: 'why', label: 'The problem' },
  { id: 'walkthrough', label: 'Walkthrough' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'trace', label: 'Traceability' },
  { id: 'attribution', label: 'Attribution' },
  { id: 'drift', label: 'Drift' },
  { id: 'mcp', label: 'For AI agents' },
  { id: 'principles', label: 'Principles' },
  { id: 'bring', label: 'Bring your plan' },
  { id: 'not', label: 'What it is not' },
];

const code = (n: number) => `LEDGER · ${String(n).padStart(2, '0')}`;

/* ---------------------------------------------------------------- Why */

const QUESTIONS = [
  { q: 'Where is this project, really?', a: 'The phase in flight, what is next, what is blocked and why.' },
  { q: 'What should I work on next?', a: 'Unblocked tasks, in dependency order.' },
  { q: 'What is still open, across everything?', a: 'Every unresolved finding and uncovered requirement, in one list.' },
  { q: 'Is the plan still true?', a: 'Where the plan and the repository have come apart, named.' },
];

/** A plan as documents: links that are only text, and one that quietly broke. */
function DocsVsRecords({ accent }: { accent: string }) {
  const doc = (title: string, rows: string[], broken?: number) => (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-4">
      <span className="font-mono text-12 text-fg">{title}</span>
      {rows.map((row, i) => (
        <span key={row} className={`flex items-center gap-2 font-mono text-11 ${i === broken ? 'text-fg-faint line-through' : 'text-fg-muted'}`}>
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-border-field" />
          {row}
        </span>
      ))}
    </div>
  );
  return (
    <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <Figure caption="In documents, a link between a requirement and the work is a line of text. Nothing notices when it breaks.">
        <div role="img" aria-label="Three documents — requirements, tasks and findings — whose cross-references are plain text; one has silently gone stale." className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
          {doc('requirements.md', ['REQ-12 see T-3.2', 'REQ-13 see T-3.4', 'REQ-14 —'], 1)}
          {doc('tasks.md', ['T-3.2 done?', 'T-3.3 in progress', 'T-3.4 (renamed)'], 2)}
          {doc('findings/', ['finding 41 open', 'finding 42 fixed?', 'finding 43 —'], 1)}
        </div>
      </Figure>
      <span aria-hidden="true" className="text-center font-mono text-20 text-fg-faint md:px-2">→</span>
      <Figure caption="In Foreman, each link is a row. It can be counted, checked and followed both ways.">
        <div role="img" aria-label="The same plan as records: a requirement linked to a task, the task to a commit, the commit to a passing check." className="flex flex-col items-stretch">
          {['APP-REQ-012 · requirement', 'APP-T-3.2 · task', 'a1b2c3d · commit', 'CI · success'].map((row, i, all) => (
            <div key={row} className="flex flex-col">
              <span className="rounded-md border border-border-field bg-surface px-4 py-3 font-mono text-12 text-fg">{row}</span>
              {i < all.length - 1 && <FlowDown accent={accent} className="h-6" />}
            </div>
          ))}
        </div>
      </Figure>
    </div>
  );
}

function Why({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="why"
      code={code(1)}
      label="The problem"
      title={
        <>
          Plans rot quietly, <Accent>and nobody can ask them anything.</Accent>
        </>
      }
      lede="Most projects keep their plan in documents: requirements in one file, tasks in another, decisions and audit findings somewhere else. They read well on the day they are written. After that the code moves on, the links between them are only text, and the simple questions stop having answers."
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {QUESTIONS.map((item, index) => (
          <li key={item.q} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-6">
            <span className="flex items-center gap-2 font-mono text-11 text-fg-faint">
              <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: accent }} />
              Q{index + 1}
            </span>
            <span className="font-display text-display-sm text-fg">{item.q}</span>
            <span className="text-14 text-fg-muted">{item.a}</span>
          </li>
        ))}
      </ul>
      <DocsVsRecords accent={accent} />
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
    who: 'You, or your agent',
    body: 'Requirements, phases, tasks and decisions go in as records with permanent IDs. Each requirement is checked against the EARS pattern — warned, never blocked.',
    screen: (
      <>
        <span className="text-fg">APP-REQ-012</span> <Quiet>Must · EARS ✓</Quiet>
        {'\n'}
        <Quiet>When a user exports a report, the system shall…</Quiet>
      </>
    ),
  },
  {
    title: 'Ask where it stands',
    who: 'An agent, over MCP',
    body: 'A coding session opens with one call. The brief is a few hundred tokens: the phase in flight, the next tasks whose dependencies are done, what is blocked and why, CI, drift — and the standing rules every project follows.',
    screen: (
      <>
        <Quiet>›</Quiet> foreman_brief APP{'\n'}
        <Quiet>phase </Quiet>P-3 Reports · 5/8{'\n'}
        <Quiet>next  </Quiet>APP-T-3.6{'\n'}
        <Quiet>drift </Quiet>2
      </>
    ),
  },
  {
    title: 'Build',
    who: 'Work lands in the repo',
    body: 'Commits arrive from GitHub as they are pushed. Each delivery is queued before it is acknowledged, and a nightly reconcile heals any that went missing.',
    screen: (
      <>
        <span className="text-fg">a1b2c3d</span> T-3.6: export{'\n'}
        reports as CSV, with the{'\n'}
        filters the user chose
      </>
    ),
  },
  {
    title: 'Say what it was for',
    who: 'Declared, then confirmed',
    body: 'Whoever did the work declares which task a commit served. Anything weaker is only a proposal until a person confirms it — a guess never counts as done.',
    screen: (
      <>
        <Quiet>›</Quiet> foreman_attribute{'\n'}
        <Quiet>  </Quiet>a1b2c3d → APP-T-3.6{'\n'}
        <Quiet>source </Quiet>declared · 1.0{'\n'}
        <Quiet>state  </Quiet>confirmed
      </>
    ),
  },
  {
    title: 'See where it drifted',
    who: 'Foreman, continuously',
    body: 'Plan and reality are compared: uncovered requirements, stale tasks, fired tripwires, gates that would fail today. Each is named, so it can be fixed.',
    screen: (
      <>
        <Quiet>coverage-hole    </Quiet>1{'\n'}
        <Quiet>stale-task       </Quiet>1{'\n'}
        <Quiet>failed-exit-gate </Quiet>0{'\n'}
        <Quiet>orphan-adr       </Quiet>0
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
          Drift is a list of things to plan next, so step five feeds step one. The project and its IDs are illustrative.
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
      lede="The console and the MCP server are equal peers: anything you can see or change in one, an AI agent can in the other. Both sit on the same API, the same shapes and the same database — and nothing in it calls a language model."
    >
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div role="img" aria-label="Architecture: you, an AI agent and GitHub reach Foreman through a Cloudflare Tunnel. One Express server serves the console, the REST API, the MCP endpoint and a webhook receiver. It stores everything in PostgreSQL 16, which also holds the job queue a worker drains." className="flex flex-col">
          <div className="grid gap-3 sm:grid-cols-3" aria-hidden="true">
            <Box kicker="You" title="The console">
              React 19, served by the server itself
            </Box>
            <Box kicker="Your agent" title="MCP">
              A local stdio shim with a scoped token, or the remote /mcp endpoint over OpenID Connect
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
              Its own password with Argon2id and an authenticator, or single sign-on over OpenID Connect — linked by
              issuer and subject, never by email
            </Box>
          </div>
          <FlowDown accent={accent} />
          <div aria-hidden="true" className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,3fr)_auto_minmax(0,2fr)]">
            <Box kicker="State" title="PostgreSQL 16" strong>
              47 models. Every write leaves an audit event and can be undone. The job queue lives here too — no Redis.
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
              The server never calls one. Agents are Foreman’s users, not its dependency — and a test fails if an AI SDK
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
      lede="Two chains decide whether a project is really done, and most teams keep them by hand — in documents, spreadsheets or memory, where a broken link makes no sound. In Foreman each arrow is a row: cite an ID anywhere and the backlink is built for you."
      sunken
    >
      <div className="flex flex-col gap-10">
        <Figure caption="From a requirement to the proof it shipped. Illustrative IDs.">
          <Chain
            label="Requirement to check run"
            accent={accent}
            links={[
              { kind: 'Requirement', id: 'APP-REQ-012' },
              { kind: 'Task', id: 'APP-T-3.6' },
              { kind: 'Commit', id: 'a1b2c3d, attributed' },
              { kind: 'Check run', id: 'CI · success' },
            ]}
          />
        </Figure>
        <Figure caption="And for audits: a finding, where it points, the commit that fixed it, and the decision it led to. A fix counts only once its commit is known.">
          <Chain
            label="Finding to decision"
            accent={accent}
            links={[
              { kind: 'Finding', id: 'APP-SEC-004' },
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
      lede="Linking work to the plan sounds easy until you look at real history: most commits never mention a task, and most tasks never say which files they will touch. So Foreman asks the one party that actually knows — whoever did the work — and treats everything else as a hint."
    >
      <div className="grid gap-16 lg:grid-cols-2">
        <Figure caption="The confidence Foreman gives each signal. The order decides which proposal is offered, not which is true.">
          <div className="flex flex-col gap-6">
            <BarRow label="1 · It is declared" value="1.0" fraction={1} accent={accent} note="A fact: the person or agent doing the work knows what it was for." />
            <BarRow label="2 · The message cites it" value="0.9" fraction={0.9} accent={accent} note="“T-3.6” in the commit subject — the short form too, because nobody types the project code." />
            <BarRow label="3 · Files overlap" value="0.3" fraction={0.3} accent={accent} muted note="A hint, never more. Two tasks can touch the same file." />
          </div>
        </Figure>
        <Figure caption="Why guessing is not enough: measured over two real codebases' full commit history and one real backlog of 363 tasks.">
          <div className="flex flex-col gap-6">
            <BarRow label="Commits citing a task" value="19%" fraction={0.19} accent={accent} muted note="In one codebase: 31 of 160 commits." />
            <BarRow label="…in another" value="55%" fraction={0.55} accent={accent} muted note="59 of 107 commits." />
            <BarRow label="Tasks naming their files" value="17%" fraction={0.17} accent={accent} muted note="60 of 363 tasks." />
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
            coincidence can never mark your work complete.
          </Quiet>
        </p>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- Drift */

const DRIFT = [
  { key: 'coverage-hole', label: 'Coverage hole', what: 'A Must with no task, or a task citing no requirement', n: 5 },
  { key: 'failed-exit-gate', label: 'Failed exit gate', what: 'A phase marked done that would not pass its gate today', n: 1 },
  { key: 'orphan-adr', label: 'Orphan decision', what: 'Accepted but cited by nothing, or a broken supersedes chain', n: 2 },
  { key: 'stale-task', label: 'Stale task', what: 'In progress, with no commits touching its files', n: 1 },
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
        <Figure caption={`An illustrative project's drift: ${total} items, every one named — never just “there is drift”.`}>
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
              exit gate fails</span> — the refusal names exactly what is in the way. Status rolls up on its own: close
              a phase’s last task and the phase completes if its gate passes, or stays open and says why.
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
      label="For AI agents"
      title={
        <>
          Twelve verbs. <Accent>The ceiling is full.</Accent>
        </>
      }
      lede="Foreman is built for AI coding agents as much as for people: an agent reads where a project stands and records what it did, from inside the session. Every tool an agent sees costs context in every session, so the surface is capped at twelve verbs and a token budget — both asserted by contract tests."
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
              <span className="font-mono text-12 text-fg">foreman://APP/architecture</span>
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
          <Figure caption="Guidelines: standing decisions that belong to no single project ride along in every brief, so each session starts with the house rules. Illustrative.">
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5 font-mono text-12">
              <span className="text-fg">
                <Quiet>›</Quiet> foreman_brief APP
              </span>
              <span className="text-fg-faint">guidelines</span>
              {['GL-001 · PostgreSQL for every database', 'GL-002 · Two ways to sign in, always'].map((rule) => (
                <span key={rule} className="flex items-center gap-2 text-fg-muted">
                  <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
                  {rule}
                </span>
              ))}
            </div>
          </Figure>
          <Figure caption="Forward progress just happens. Anything regressive or irreversible asks you first, through the protocol's own round-trip.">
            <ol className="flex flex-col gap-2 text-13">
              <li className="self-start rounded-md border border-border bg-surface px-3 py-2 font-mono text-fg">
                set_status APP-P-3 → done
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

/* ---------------------------------------------------------------- Principles */

const PRINCIPLES = [
  { title: 'A small surface over a large graph', why: 'Twelve verbs reach every kind of record, so an agent spends its context on your project, not on reading tool definitions.' },
  { title: 'Two ways in, always', why: 'Its own password and authenticator, or single sign-on. Anyone who clones it can run it, with or without an identity provider.' },
  { title: 'Declared, not guessed', why: 'A guess that marks work done is worse than no answer. The one doing the work says what it was for; a person confirms.' },
  { title: 'IDs are permanent', why: 'Every ID carries its project’s code and never changes, so a citation written today still resolves in a year.' },
  { title: 'One source of truth', why: 'Registers, matrices and scopes of work are generated views of the records — never second copies that can disagree.' },
  { title: 'No model inside', why: 'The server never calls an LLM. Agents are its users, so nothing about your plan leaves unless you send it.' },
];

function Principles({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="principles"
      code={code(8)}
      label="Principles"
      title={
        <>
          Why it is built <Accent>this way.</Accent>
        </>
      }
      lede="Six ideas shape everything else. Each one trades a little convenience for a plan you can keep believing."
      sunken
    >
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PRINCIPLES.map((principle, index) => (
          <li key={principle.title} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-6">
            <span className="flex items-center gap-2 font-mono text-12 text-fg-muted">
              <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: accent }} />
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="text-16 font-semibold text-fg">{principle.title}</span>
            <span className="text-14 text-fg-muted">{principle.why}</span>
          </li>
        ))}
      </ul>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- Bring */

const IMPORT_STEPS = [
  { label: 'Point it at your plan', detail: 'A folder of Markdown — requirements, phases, decisions, findings.' },
  { label: 'Dry run', detail: 'Nothing is written. Every file is reported as mapped, partial or unmapped, with the reason.' },
  { label: 'Write', detail: 'Records created, citations rewritten to IDs. Run it again and nothing duplicates.' },
];

/** A dry-run report: every file accounted for, none silently dropped. */
function ImportReport({ accent }: { accent: string }) {
  const rows = [
    { name: 'requirements.md', state: 'mapped', note: '42 requirements' },
    { name: 'phases/phase-3.md', state: 'mapped', note: '1 phase, 8 tasks' },
    { name: 'decisions/007.md', state: 'mapped', note: '1 decision' },
    { name: 'notes/ideas.md', state: 'partial', note: 'no requirement pattern found in 2 sections' },
    { name: 'scratch.txt', state: 'unmapped', note: 'not a planning document' },
  ];
  return (
    <div role="img" aria-label="An illustrative dry-run report: five files, three mapped, one partial with its reason, one unmapped with its reason." className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
      {rows.map((row) => (
        <div key={row.name} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
          <span
            aria-hidden="true"
            className={`size-2.5 shrink-0 rounded-full ${row.state === 'mapped' ? '' : row.state === 'partial' ? 'bg-warning' : 'border border-fg-faint'}`}
            style={row.state === 'mapped' ? { backgroundColor: accent } : undefined}
          />
          <span className="min-w-0 flex-1 truncate font-mono text-12 text-fg">{row.name}</span>
          <span className="font-mono text-11 tracking-label text-fg-faint uppercase">{row.state}</span>
          <span className="w-full pl-6 text-13 text-fg-muted sm:w-auto sm:pl-0">{row.note}</span>
        </div>
      ))}
    </div>
  );
}

function Bring({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="bring"
      code={code(9)}
      label="Bring your plan"
      title={
        <>
          Start from what you have, <Accent>lose nothing.</Accent>
        </>
      }
      lede="An existing Markdown plan comes in through the importer. It never drops a file in silence: every one is accounted for, and the dry run is the default."
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <ol className="flex flex-col">
          {IMPORT_STEPS.map((step, index) => (
            <li key={step.label} className="flex flex-col">
              <div className="flex gap-4 rounded-lg border border-border bg-surface p-5">
                <span className="font-mono text-14 text-fg-faint">{index + 1}</span>
                <span className="flex flex-col gap-1">
                  <span className="text-16 font-semibold text-fg">{step.label}</span>
                  <span className="text-14 text-fg-muted">{step.detail}</span>
                </span>
              </div>
              {index < IMPORT_STEPS.length - 1 && <FlowDown accent={accent} className="h-6" />}
            </li>
          ))}
        </ol>
        <Figure caption="What a dry run tells you, illustrated. Silence is the failure it exists to prevent.">
          <ImportReport accent={accent} />
        </Figure>
      </div>
      <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
        <Stat value="12" label="MCP tools, and not one more — a contract test holds the ceiling" />
        <Stat value="146" label="end-to-end tests, run in a real browser on every push to main" />
        <Stat value="26" label="screens checked with axe, in light and dark" />
        <Stat value="<15ms" label="every endpoint at p95, over 210 real requirements" />
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- Not */

const NOT = [
  'Sprints, velocity, story points',
  'Time tracking',
  'Assignees and comment threads',
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
      lede="Foreman is a ledger for a plan, not a team tracker. Each of these is recorded as a requirement asserting its absence, so none can quietly arrive. The one that matters most: no freeform wiki — the guardrail that keeps it a set of records rather than another pile of notes. One exception is opt-in and fenced: a deployment can run as an ideas board, where several people submit, discuss and score ideas, and a test fails if a comment or a score ever points at a requirement, task or finding."
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
      <Principles accent={accent} />
      <Bring accent={accent} />
      <Not />
    </>
  );
}
