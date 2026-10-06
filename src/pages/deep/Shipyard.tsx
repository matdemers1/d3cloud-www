import type { ReactNode } from 'react';
import type { Project } from '../../content/projects';
import { DeepIndex, DeepSection, Figure, FlowDown, Stat, type DeepEntry } from '../../components/Deep';
import { Accent, Quiet } from '../../components/Marketing';

/**
 * Shipyard, explained for someone deciding whether it would help them. Laid out
 * like the thing it describes: a deploy is a line of gates and steps, so the
 * page reads as one — the problem, a walk through a deploy, the pipeline, the
 * gates, where each part runs, then the guard rails around it.
 *
 * Every number is a product property from Shipyard's repository: the manifest
 * defaults in packages/schema/src/manifest.ts (soak 60 s, disk floor 5 GB,
 * three images kept), the gate catalogue in packages/schema/src/errors.ts
 * (G1–G11), the agent's 25 s long-poll in apps/agent/src/loop.ts, the soak's
 * 10 s interval in packages/sequence/src/machine.ts, the one-hour approval in
 * apps/server/src/approvals/service.ts and the 90 s status wait in
 * apps/server/src/deploys/service.ts. The seven MCP tools are the ones
 * registered in apps/server/src/mcp/tools.ts. Roll all's order (groups
 * together with the canary first, Shipyard's own server last, stop at the
 * first failure) is apps/server/src/rollouts/service.ts. Builds — the five
 * stages, the firewalled network, sealed build secrets, one build at a time
 * with deploys first, the 30-day log prune and the 20 GB cache cap — are
 * docs/runbooks/build.md, docs/install/build-network.sh and
 * packages/schema/src/build.ts, as of origin/main 7243711. App names, SHAs and
 * messages drawn in the "screens" are illustrations, and are captioned as such.
 */

const ENTRIES: DeepEntry[] = [
  { id: 'problem', label: 'The problem' },
  { id: 'walkthrough', label: 'Walkthrough' },
  { id: 'pipeline', label: 'The deploy' },
  { id: 'gates', label: 'Gates' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'locks', label: 'Locks' },
  { id: 'people', label: 'Approvals & roll all' },
  { id: 'rollback', label: 'Rollback' },
  { id: 'builds', label: 'Builds' },
  { id: 'itself', label: 'Deploys itself' },
  { id: 'why', label: 'Why this way' },
];

const code = (n: number) => `SHIP · ${String(n).padStart(2, '0')}`;

/* ---------------------------------------------------------------- Shared marks */

/** A small filled or hollow dot in the product's colour. */
function Mark({ accent, hollow = false, className = '' }: { accent: string; hollow?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-2.5 shrink-0 rounded-full ${hollow ? 'border-2' : ''} ${className}`}
      style={hollow ? { borderColor: accent } : { backgroundColor: accent }}
    />
  );
}

/** A dot that means "stopped here". Danger is a system token, not the product's colour. */
function StopMark({ className = '' }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`inline-block size-2.5 shrink-0 rounded-full border-2 border-danger ${className}`} />
  );
}

function Tag({ children }: { children: ReactNode }) {
  return <span className="font-mono text-11 tracking-label text-fg-faint uppercase">{children}</span>;
}

function Box({
  title,
  kicker,
  children,
  accent,
  strong = false,
}: {
  title: ReactNode;
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
      {kicker && <Tag>{kicker}</Tag>}
      <span className="text-16 font-semibold text-fg">{title}</span>
      {children && <span className="text-13 text-fg-muted">{children}</span>}
    </div>
  );
}

/** A terminal-ish card for tool calls, refusals and receipts. */
function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <pre
      className={`rounded-md border border-border bg-surface p-4 font-mono text-12 break-words whitespace-pre-wrap text-fg-muted ${className}`}
    >
      {children}
    </pre>
  );
}

/* ---------------------------------------------------------------- 01 The problem */

const RITUAL = [
  { cmd: 'ssh your-server', skipped: false },
  { cmd: 'cd the app’s stack', skipped: false },
  { cmd: 'check CI passed for this commit', skipped: true },
  { cmd: 'back up the database', skipped: true },
  { cmd: 'sed the new image tag into compose', skipped: false },
  { cmd: 'docker compose pull', skipped: false },
  { cmd: 'run the migration', skipped: false },
  { cmd: 'docker compose up -d', skipped: false },
  { cmd: 'check the right version is running', skipped: true },
];

/** Two sessions deploying the same app, the later one with an older commit. */
function Collision({ accent }: { accent: string }) {
  const lanes = [
    { who: 'Session A', what: 'deploys the new commit', from: 8, to: 46, tone: 'accent' as const },
    { who: 'Session B', what: 'deploys an older one, minutes later', from: 34, to: 78, tone: 'muted' as const },
  ];
  return (
    <div
      role="img"
      aria-label="Two sessions deploy the same app at overlapping times. Session A ships the new commit; Session B, started from an older checkout, finishes later and puts the older commit back live. Nobody is told."
      className="flex flex-col gap-5"
    >
      {lanes.map((lane) => (
        <div key={lane.who} className="flex flex-col gap-2" aria-hidden="true">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-14 font-semibold text-fg">{lane.who}</span>
            <span className="text-13 text-fg-muted">{lane.what}</span>
          </div>
          <div className="relative h-3 rounded-full bg-surface-raised">
            <span
              className={`absolute top-0 h-full rounded-full ${lane.tone === 'muted' ? 'bg-fg-faint' : ''}`}
              style={{
                left: `${lane.from}%`,
                width: `${lane.to - lane.from}%`,
                ...(lane.tone === 'accent' ? { backgroundColor: accent } : {}),
              }}
            />
          </div>
        </div>
      ))}
      <div className="flex flex-col gap-2 border-t border-border pt-4" aria-hidden="true">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-14 font-semibold text-fg">What is live</span>
          <span className="text-13 text-fg-muted">new, then silently old again</span>
        </div>
        <div className="relative h-3">
          <span className="absolute top-1/2 right-0 left-0 h-px bg-border-field" />
          <span
            className="absolute top-0 h-full rounded-full"
            style={{ left: '46%', width: '32%', backgroundColor: accent }}
          />
          <span className="absolute top-0 left-[78%] h-full w-[22%] rounded-full bg-fg-faint" />
          <span className="absolute top-1/2 left-[78%] size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-danger bg-bg" />
        </div>
      </div>
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
          A deploy you type by hand <Accent>is a deploy you can get wrong.</Accent>
        </>
      }
      lede="Self-hosting with Docker Compose usually means the same ritual over SSH, every time. It works — until a Friday evening when a step gets skipped, or two people (or two coding agents) deploy the same app at once, or the new version breaks and there is no clean way back."
    >
      <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
        <Figure caption="The usual ritual. The struck-through steps are the ones that get skipped when you are in a hurry — and they are the ones that would have caught the problem.">
          <ol className="flex flex-col rounded-lg border border-border bg-surface p-5 font-mono text-13">
            {RITUAL.map((step, i) => (
              <li key={step.cmd} className="flex items-baseline gap-3 py-1">
                <span aria-hidden="true" className="w-5 shrink-0 text-right text-11 text-fg-faint">
                  {i + 1}
                </span>
                <span
                  className={
                    step.skipped ? 'text-fg-faint line-through decoration-danger decoration-2' : 'text-fg'
                  }
                >
                  {step.skipped && <span className="sr-only">Often skipped: </span>}
                  {step.cmd}
                </span>
              </li>
            ))}
          </ol>
        </Figure>
        <Figure caption="Two deploys of one app, overlapping. Nothing stops the second, nothing warns the first, and the older commit ends up live.">
          <div className="rounded-lg border border-border bg-bg p-5">
            <Collision accent={accent} />
          </div>
        </Figure>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { t: 'Nothing checks the commit', d: 'Did CI pass? Is it on main? Is it newer than what is live? You are trusted to remember.' },
          { t: 'Steps depend on the day', d: 'A backup or a health check is optional when the ritual is typed from memory.' },
          { t: 'Nobody holds the app', d: 'Two sessions can deploy at once, and the last one to finish wins.' },
          { t: 'The way back is improvised', d: 'Rolling back means remembering the old tag — and hoping the data still fits it.' },
        ].map((item) => (
          <li key={item.t} className="flex flex-col gap-2 border-t border-border-field pt-4">
            <span className="text-16 font-semibold text-fg">{item.t}</span>
            <span className="text-14 text-fg-muted">{item.d}</span>
          </li>
        ))}
      </ul>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 02 Walkthrough */

function PhoneScreen({ accent }: { accent: string }) {
  return (
    <div className="mx-auto flex w-full max-w-60 flex-col gap-3 rounded-lg border border-border-field bg-bg p-3">
      <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-border-field" />
      <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3">
        <span className="flex items-center gap-2 text-14 font-semibold text-fg">
          <Mark accent={accent} className="size-2" />
          notes
        </span>
        <span className="font-mono text-11 text-fg-muted">live 3f9c2a1 · 4 waiting</span>
        <span className="mt-1 flex min-h-9 items-center justify-center rounded-full bg-fg text-13 font-semibold text-bg">
          Ship
        </span>
      </div>
      <div className="flex flex-col gap-1 rounded-md border border-border bg-surface p-3 opacity-60">
        <span className="text-14 font-semibold text-fg">wiki</span>
        <span className="font-mono text-11 text-fg-muted">up to date</span>
      </div>
    </div>
  );
}

interface Step {
  title: string;
  who: string;
  body: string;
  screen: ReactNode;
}

function steps(accent: string): Step[] {
  return [
    {
      title: 'Tap Ship',
      who: 'You, on your phone',
      body: 'Every app shows what is live and how many commits are waiting. A dry run shows every check first, and changes nothing.',
      screen: <PhoneScreen accent={accent} />,
    },
    {
      title: 'Or let your agent ask',
      who: 'A coding agent, over MCP',
      body: 'The same deploy is a tool call — the console makes the scoped token and the exact command to connect. The agent names itself, so anyone it locks out can see who it was.',
      screen: (
        <Screen>
          <Quiet>›</Quiet> <span className="text-fg">shipyard_deploy</span>
          {'\n'}
          <Quiet>  app </Quiet>notes{'\n'}
          <Quiet>  sha </Quiet>8e41c07…{'\n'}
          <Quiet>  requester </Quiet>claude: notes{'\n'}
          <Quiet>    fix login redirect</Quiet>
        </Screen>
      ),
    },
    {
      title: 'The host checks it',
      who: 'The agent on your server',
      body: 'CI green, on main, ahead of live, images in the registry, environment present — re-checked on the host, whoever asked.',
      screen: (
        <Screen>
          {['CI green', 'on main', 'ahead of live', 'images found', 'env present'].map((g) => (
            <span key={g} className="flex items-center gap-2">
              <Mark accent={accent} className="size-2" />
              <span className="text-fg">{g}</span>
            </span>
          ))}
        </Screen>
      ),
    },
    {
      title: 'It ships, and proves it',
      who: 'Then it reports',
      body: 'Backup, migrate, swap to the exact digests, check, soak. The receipt names the commit per image and the schema that is running.',
      screen: (
        <Screen>
          <Quiet>state  </Quiet>
          <span className="text-fg">succeeded</span>
          {'\n'}
          <Quiet>web    </Quiet>8e41c07{'\n'}
          <Quiet>worker </Quiet>8e41c07{'\n'}
          <Quiet>schema </Quiet>0042_add_tags
        </Screen>
      ),
    },
  ];
}

function Walkthrough({ accent }: { accent: string }) {
  const list = steps(accent);
  return (
    <DeepSection
      id="walkthrough"
      code={code(2)}
      label="A walkthrough"
      title={
        <>
          Two ways to ask. <Accent>One way it happens.</Accent>
        </>
      }
      lede="You name an app and a commit — from a button on your phone, or from a coding session. Everything after that is the same path, taken the same way every time."
      sunken
    >
      <Figure caption="A deploy from request to receipt. The app names, commits and schema shown are illustrations.">
        <div className="relative">
          <span aria-hidden="true" className="absolute top-5 right-10 left-10 hidden h-px bg-border-field lg:block">
            <span className="flow-x absolute -top-0.75 size-2 rounded-full" style={{ backgroundColor: accent }} />
          </span>
          <ol className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {list.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-4">
                <span
                  aria-hidden="true"
                  className="flex size-10 items-center justify-center rounded-full border border-border-field bg-bg font-mono text-14 text-fg"
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
                <div className="mt-auto">{step.screen}</div>
              </li>
            ))}
          </ol>
        </div>
      </Figure>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 03 The deploy */

const PIPELINE = [
  { name: 'Verify', note: 'Every gate, on the host' },
  { name: 'Back up', note: 'If the app declares a backup' },
  { name: 'Migrate', note: 'One-shot, with the new image' },
  { name: 'Pull', note: 'By digest, not by tag' },
  { name: 'Swap', note: 'Compose now names tag@digest' },
  { name: 'Check', note: 'Digest, revision, schema' },
  { name: 'Soak', note: 'Still healthy, still running' },
  { name: 'Live', note: 'Recorded in the ledger' },
];

function Pipeline({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="pipeline"
      code={code(3)}
      label="The deploy"
      title={
        <>
          Eight steps, <Accent>written down before each one runs.</Accent>
        </>
      }
      lede="Every deploy follows the same line. Each step is journaled on the host before it starts, so after a crash an unfinished deploy is found and returned to its last verified release rather than guessed at. Anything that fails after the swap sends the app back to the images it had."
    >
      <Figure caption="The path of a deploy. Backup and migrate run only when the app's manifest declares them; a failed swap, check or soak turns down the rollback branch.">
        <div
          role="img"
          aria-label="Deploy pipeline: verify, back up, migrate, pull, swap, check, soak, live. A failure at swap, check or soak rolls the images back to the previous release."
          className="flex flex-col gap-8"
        >
          <div className="relative" aria-hidden="true">
            {/* Vertical track on a phone, horizontal from lg. */}
            <span className="absolute top-3 bottom-3 left-3 w-px bg-border-field lg:hidden">
              <span
                className="flow-y absolute left-1/2 size-2 -translate-x-1/2 rounded-full"
                style={{ backgroundColor: accent }}
              />
            </span>
            <span className="absolute top-3 right-6 left-6 hidden h-px bg-border-field lg:block">
              <span className="flow-x absolute -top-0.75 size-2 rounded-full" style={{ backgroundColor: accent }} />
            </span>
            <ol className="relative flex flex-col gap-5 lg:grid lg:grid-cols-8 lg:gap-3">
              {PIPELINE.map((step, i) => {
                const last = i === PIPELINE.length - 1;
                const risky = i >= 4 && i <= 6;
                return (
                  <li key={step.name} className="flex items-start gap-4 lg:flex-col lg:gap-3">
                    <span
                      className={`relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2 bg-bg ${last ? '' : 'border-border-field'}`}
                      style={last ? { backgroundColor: accent, borderColor: accent } : undefined}
                    >
                      {!last && <span className="size-1.5 rounded-full bg-fg-faint" />}
                    </span>
                    <span className="flex flex-col gap-1">
                      <span className="flex items-center gap-2 text-14 font-semibold text-fg">
                        {step.name}
                        {risky && <StopMark className="size-2 lg:hidden" />}
                      </span>
                      <span className="text-13 text-fg-muted">{step.note}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* The failure branch: under swap, check and soak on wide screens. */}
          <div className="grid gap-3 lg:grid-cols-8" aria-hidden="true">
            <div className="flex flex-col gap-3 lg:col-span-3 lg:col-start-5">
              <span className="hidden h-4 rounded-b-md border-x-2 border-b-2 border-dashed border-danger lg:block" />
              <div className="flex flex-col gap-3 rounded-lg border border-border-field bg-surface p-4 sm:flex-row sm:items-center">
                <StopMark />
                <span className="text-14 text-fg">
                  Fails here? <Quiet>The previous compose file and the previous images go back, and the reason is named.</Quiet>
                </span>
              </div>
            </div>
          </div>
        </div>
      </Figure>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <Figure caption="“Running” means all three agree — not just that a container started.">
          <div className="grid gap-3 sm:grid-cols-3">
            <Box kicker="The image" title="Running digest" accent={accent}>
              The digest the container runs is the one that was verified in the registry.
            </Box>
            <Box kicker="The code" title="Revision label" accent={accent}>
              The image’s <span className="font-mono text-12">org.opencontainers.image.revision</span> is the commit you
              asked for.
            </Box>
            <Box kicker="The data" title="/health schema" accent={accent}>
              The app reports the schema revision the release was built for.
            </Box>
          </div>
        </Figure>
        <div className="grid grid-cols-2 gap-8">
          <Stat value="60 s" label="default soak, set per app up to an hour" />
          <Stat value="10 s" label="between health checks while it soaks" />
        </div>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 04 Gates */

type GateState = 'pass' | 'fail' | 'skip';

const GATES: { id: string; what: string; where: 'ask' | 'host'; state: GateState }[] = [
  { id: 'G1', what: 'You, or your token, may deploy this app', where: 'ask', state: 'pass' },
  { id: 'G2', what: 'The app is not frozen', where: 'ask', state: 'pass' },
  { id: 'G3', what: 'No unresolved drift — nobody changed it by hand', where: 'ask', state: 'pass' },
  { id: 'G4', what: 'The app’s lock is free', where: 'ask', state: 'pass' },
  { id: 'G11', what: 'Approval, if the app requires one', where: 'ask', state: 'pass' },
  { id: 'Disk', what: 'Enough free space on the Docker root', where: 'host', state: 'pass' },
  { id: 'G5', what: 'The image build for this commit succeeded', where: 'host', state: 'fail' },
  { id: 'G6', what: 'The commit is on the default branch', where: 'host', state: 'skip' },
  { id: 'G7', what: 'It is ahead of what is live', where: 'host', state: 'skip' },
  { id: 'G8', what: 'Every service has an image digest in the registry', where: 'host', state: 'skip' },
  { id: 'G9', what: 'Every required environment name is present', where: 'host', state: 'skip' },
];

function GateRow({ gate, accent }: { gate: (typeof GATES)[number]; accent: string }) {
  return (
    <li className={`flex items-center gap-3 rounded-md px-3 py-2.5 ${gate.state === 'fail' ? 'bg-surface-raised' : ''}`}>
      {gate.state === 'pass' && <Mark accent={accent} />}
      {gate.state === 'fail' && <StopMark />}
      {gate.state === 'skip' && <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full border border-fg-faint" />}
      <span className="w-10 shrink-0 font-mono text-12 text-fg-muted">{gate.id}</span>
      <span className={`text-14 ${gate.state === 'skip' ? 'text-fg-faint' : 'text-fg'}`}>
        <span className="sr-only">
          {gate.state === 'pass' ? 'Passed: ' : gate.state === 'fail' ? 'Refused here: ' : 'Not reached: '}
        </span>
        {gate.what}
      </span>
    </li>
  );
}

function Gates({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="gates"
      code={code(4)}
      label="Gates"
      title={
        <>
          Every check, every time. <Accent>Fails closed.</Accent>
        </>
      }
      lede="A deploy passes a fixed set of gates, in order, and stops at the first that fails — with a refusal that says which gate, why, and what to do about it. If GitHub or your registry cannot be reached, the answer is no. There is no override."
      sunken
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <Figure caption="An illustrative deploy refused at G5: the build for the commit had not finished. Nothing after it ran, and nothing on the host changed. Gate labels are the ones the dry run and every refusal show.">
          <div className="flex flex-col gap-6 rounded-lg border border-border bg-bg p-4 sm:p-5">
            <div className="flex flex-col gap-2">
              <Tag>Checked when you ask</Tag>
              <ol className="flex flex-col">
                {GATES.filter((g) => g.where === 'ask').map((g) => (
                  <GateRow key={g.id} gate={g} accent={accent} />
                ))}
              </ol>
            </div>
            <div className="flex flex-col gap-2 border-t border-border pt-5">
              <Tag>Re-checked by the agent, on your server</Tag>
              <ol className="flex flex-col">
                {GATES.filter((g) => g.where === 'host').map((g) => (
                  <GateRow key={g.id} gate={g} accent={accent} />
                ))}
              </ol>
            </div>
          </div>
        </Figure>
        <div className="flex flex-col gap-8">
          <Figure caption="Every refusal has the same four parts, whether it reaches your phone or a coding agent. This one is illustrative.">
            <Screen>
              <Quiet>code    </Quiet>
              <span className="text-fg">ci_not_green</span>
              {'\n'}
              <Quiet>gate    </Quiet>
              <span className="text-fg">G5</span>
              {'\n'}
              <Quiet>message </Quiet>ci.yml for 8e41c07 is still in progress{'\n'}
              <Quiet>fix     </Quiet>Wait for the image workflow to succeed for this SHA.
            </Screen>
          </Figure>
          <div className="flex flex-col gap-3 rounded-lg border border-border-field p-5">
            <span className="flex items-center gap-3 text-16 font-semibold text-fg">
              <StopMark />
              Unreachable is not green
            </span>
            <span className="text-14 text-fg-muted">
              A gate that cannot get an answer refuses. An absent CI run is a failed one, a pull-request build is not a
              published image, and a commit that is already live is not a deploy.
            </span>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-border p-5">
            <span className="text-16 font-semibold text-fg">The server asking is not enough</span>
            <span className="text-14 text-fg-muted">
              The agent re-checks the host gates itself, against GitHub and the registry, before it touches anything. A
              compromised or confused server can name a commit; it cannot make the agent ship one that fails.
            </span>
          </div>
        </div>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 05 Architecture */

function Architecture({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="architecture"
      code={code(5)}
      label="Architecture"
      title={
        <>
          The part that touches Docker <Accent>opens no port.</Accent>
        </>
      }
      lede="Shipyard is two processes with a hard line between them. The server faces the internet and never touches Docker. The agent holds the Docker socket and faces nothing — it reaches out to the server for work, so there is nothing on your host for anyone to connect to."
    >
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div
          role="img"
          aria-label="Architecture: you, from a phone or browser, and coding agents over MCP reach the Shipyard server over HTTPS. The server holds the console, the REST API, the MCP endpoint and PostgreSQL, and never touches Docker. The agent on your host opens no port: it long-polls the server with signed requests, re-verifies every request with GitHub and your registry, and runs Docker Compose for your apps."
          className="flex flex-col"
        >
          <div className="grid gap-3 sm:grid-cols-2" aria-hidden="true">
            <Box kicker="You" title="Phone or browser">
              The console, built phone-first
            </Box>
            <Box kicker="Coding agents" title="MCP">
              Status, dry run, deploy, deploy status, rollback, build, build status — with a token scoped to named
              apps
            </Box>
          </div>
          <FlowDown accent={accent} />
          <div aria-hidden="true" className="flex flex-col gap-3 rounded-lg border border-border-field bg-bg-sunken p-4">
            <span className="px-1 font-mono text-11 tracking-label text-fg-faint uppercase">
              Shipyard server · faces the internet
            </span>
            <div className="grid gap-3 sm:grid-cols-3">
              <Box title="Console" accent={accent} />
              <Box title="REST API" accent={accent}>
                Takes an app name and a commit
              </Box>
              <Box title="/mcp" accent={accent}>
                The same deploy path
              </Box>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Box title="PostgreSQL 16">Deploys, builds, locks, approvals, audit</Box>
              <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border-field p-5">
                <span className="text-16 font-semibold text-fg line-through decoration-danger decoration-2">
                  Docker socket
                </span>
                <span className="text-13 text-fg-muted">No socket, no compose, no shell. It cannot deploy on its own.</span>
              </div>
            </div>
          </div>

          {/* The agent reaches up to the server: the dot travels upward. */}
          <div aria-hidden="true" className="flex items-center justify-center gap-3">
            <span className="block rotate-180">
              <FlowDown accent={accent} className="h-14" />
            </span>
            <span className="font-mono text-11 text-fg-muted">signed long-poll, outbound only</span>
          </div>

          <div aria-hidden="true" className="flex flex-col gap-3 rounded-lg border border-border-field bg-surface p-4">
            <span className="flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="font-mono text-11 tracking-label text-fg-faint uppercase">Your server</span>
              <span className="flex items-center gap-2 rounded-full border border-border-field px-3 py-1 font-mono text-11 text-fg">
                <span className="size-2 rounded-full border-2 border-danger" />
                0 listening ports
              </span>
            </span>
            <div className="grid gap-3 sm:grid-cols-2">
              <Box kicker="Agent" title="Holds the Docker socket" accent={accent}>
                Re-verifies each request with GitHub and the registry, journals each step, keeps its own ledger of what
                it deployed.
              </Box>
              <Box kicker="Your apps" title="Compose stacks" strong>
                Each described by a manifest on the host: repo, services, health check, optional backup and migrate.
              </Box>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
            <Tag>What a request names</Tag>
            <div className="flex flex-wrap gap-2">
              {['an app name', 'a 40-character commit SHA'].map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-2 rounded-full border border-border-field px-3 py-1.5 font-mono text-12 text-fg"
                >
                  <Mark accent={accent} className="size-2" />
                  {item}
                </span>
              ))}
            </div>
            <span className="text-13 text-fg-muted">
              The rest is bookkeeping — IDs, who asked, a dry-run flag. What to run is decided by the manifest already on
              the host.
            </span>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border-field p-5">
            <Tag>Accepted nowhere</Tag>
            <span className="text-16 font-semibold text-fg line-through decoration-danger decoration-2">A command string</span>
            <span className="text-13 text-fg-muted">
              No endpoint, tool or manifest field takes one. Backup and migrate are argument lists run in a named
              compose service.
            </span>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
            <Tag>Trust, established once</Tag>
            <span className="text-13 text-fg-muted">
              The agent makes its own signing key on first start, and does nothing until a person on the host confirms
              its fingerprint.
            </span>
          </div>
        </aside>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 06 Locks */

function Locks({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="locks"
      code={code(6)}
      label="Locks"
      title={
        <>
          One deploy per app. <Accent>The second is told who.</Accent>
        </>
      }
      lede="A deploy holds its app from the moment it is accepted. Anyone else who asks — you on your phone, or another coding session — is refused at once, and the refusal names who holds the app, which commit, and which step it is on. Shipyard does not queue: a queued deploy is one nobody is watching."
      sunken
    >
      <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
        <Figure caption="Two sessions, one app. The second request is refused while the first holds the lock, then succeeds when asked again.">
          <div
            role="img"
            aria-label="Timeline: Session A holds the lock on the app from start to finish of its deploy. Session B asks midway and is refused, naming Session A. After A finishes, B asks again and gets the lock."
            className="flex flex-col gap-6 rounded-lg border border-border bg-bg p-5"
          >
            <div className="flex flex-col gap-2" aria-hidden="true">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-14 font-semibold text-fg">Session A</span>
                <span className="text-13 text-fg-muted">holds the app</span>
              </div>
              <div className="relative h-3 rounded-full bg-surface-raised">
                <span className="absolute top-0 left-[5%] h-full w-[55%] rounded-full" style={{ backgroundColor: accent }} />
              </div>
            </div>
            <div className="flex flex-col gap-2" aria-hidden="true">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-14 font-semibold text-fg">Session B</span>
                <span className="text-13 text-fg-muted">refused, then asks again</span>
              </div>
              <div className="relative h-3 rounded-full bg-surface-raised">
                <span className="absolute top-1/2 left-[32%] size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-danger bg-bg" />
                <span className="absolute top-0 left-[64%] h-full w-[32%] rounded-full" style={{ backgroundColor: accent, opacity: 0.55 }} />
              </div>
            </div>
            <div className="flex justify-between font-mono text-11 text-fg-faint" aria-hidden="true">
              <span>asks</span>
              <span>A finishes</span>
              <span>B ships</span>
            </div>
          </div>
        </Figure>
        <div className="flex flex-col gap-6">
          <Figure caption="What Session B sees. Names and commit are illustrative; the shape is exact.">
            <Screen>
              <Quiet>code    </Quiet>
              <span className="text-fg">locked</span>
              <Quiet> · G4</Quiet>
              {'\n'}
              <Quiet>message </Quiet>notes is being deployed by{'\n'}
              <Quiet>        </Quiet>
              <span className="text-fg">claude: notes fix login redirect</span>
              {'\n'}
              <Quiet>        </Quiet>8e41c07 at step soak.{'\n'}
              <Quiet>fix     </Quiet>Wait for that deploy to finish,{'\n'}
              <Quiet>        </Quiet>then request again.
            </Screen>
          </Figure>
          <ul className="flex flex-col gap-3 text-14 text-fg-muted">
            <li className="flex gap-3">
              <Mark accent={accent} className="mt-1.5" />
              <span>
                <span className="text-fg">Enforced by the database,</span> not by convention — two active deploys of one
                app cannot both be written.
              </span>
            </li>
            <li className="flex gap-3">
              <Mark accent={accent} className="mt-1.5" />
              <span>
                <span className="text-fg">A group deploy</span> takes every member’s lock at once, or none of them.
              </span>
            </li>
            <li className="flex gap-3">
              <Mark accent={accent} className="mt-1.5" />
              <span>
                <span className="text-fg">A coding agent can wait properly:</span> the status call holds for up to 90
                seconds until the deploy it is watching ends.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 07 Approvals, canaries & roll all */

function Pill({ children, tone = 'plain', accent }: { children: ReactNode; tone?: 'plain' | 'lit' | 'stop'; accent: string }) {
  return (
    <span className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-13 text-fg">
      {tone === 'lit' && <Mark accent={accent} className="size-2" />}
      {tone === 'stop' && <StopMark className="size-2" />}
      {tone === 'plain' && <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-fg-faint" />}
      {children}
    </span>
  );
}

function Arrow({ accent }: { accent: string }) {
  return (
    <span aria-hidden="true" className="flex items-center justify-center">
      <svg width="24" height="12" viewBox="0 0 24 12" className="rotate-90 sm:rotate-0">
        <path d="M1 6 H21 M16 1 L22 6 L16 11" fill="none" strokeWidth="1.5" strokeLinecap="round" style={{ stroke: accent }} />
      </svg>
    </span>
  );
}

const GROUP_RUNS = [
  {
    label: 'Everything healthy',
    members: [
      { name: 'canary', state: 'ok' },
      { name: 'api', state: 'ok' },
      { name: 'web', state: 'ok' },
      { name: 'worker', state: 'ok' },
    ],
  },
  {
    label: 'The canary fails',
    members: [
      { name: 'canary', state: 'fail' },
      { name: 'api', state: 'held' },
      { name: 'web', state: 'held' },
      { name: 'worker', state: 'held' },
    ],
  },
] as const;

const ROLL_ALL = [
  { app: 'notes', sha: '8e41c07', note: 'Every app is locked when you confirm — nobody deploys one halfway through.', last: false },
  { app: 'wiki', sha: '2b7d9f0', note: 'Starts only once the app before it has passed its soak.', last: false },
  { app: 'Shipyard', sha: 'c4a10e3', note: 'Always last, so its own restart never interrupts another app.', last: true },
];

function People({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="people"
      code={code(7)}
      label="Approvals, canaries & roll all"
      title={
        <>
          Some apps wait for a person. <Accent>Some go first.</Accent>
        </>
      }
      lede="Mark an app as needing approval and its deploys stop before anything runs, until someone with the right to deploy approves them in the console. Put related apps in a group and they ship one at a time — the canary first — stopping at the first that fails. And when several apps have something waiting, Roll all ships them in one go, each at its own commit."
    >
      <div className="grid gap-16 lg:grid-cols-2">
        <Figure caption="An approval-required app. A coding agent asking is told it is waiting, and should say so rather than poll for an hour.">
          <ol
            aria-label="Approval flow: requested, then waiting for approval. A person approves in the console and the deploy runs; or it is denied, or after one hour it expires and is cancelled."
            className="flex flex-col gap-3"
          >
            <li className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Pill accent={accent}>Requested</Pill>
              <Arrow accent={accent} />
              <Pill accent={accent} tone="lit">
                Awaiting approval
              </Pill>
              <Arrow accent={accent} />
              <Pill accent={accent} tone="lit">
                A person approves → it runs
              </Pill>
            </li>
            <li className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center">
              <span className="text-13 text-fg-muted">Otherwise</span>
              <Pill accent={accent} tone="stop">
                Denied
              </Pill>
              <span className="text-13 text-fg-muted">or</span>
              <Pill accent={accent} tone="stop">
                Expires after 1 hour
              </Pill>
            </li>
          </ol>
        </Figure>

        <Figure caption="A group deploy, drawn twice. The canary ships first; the rest follow in name order only if it succeeds. Member names are illustrative.">
          <div className="flex flex-col gap-6">
            {GROUP_RUNS.map((run) => (
              <div key={run.label} className="flex flex-col gap-3">
                <span className="text-14 font-semibold text-fg">{run.label}</span>
                <ol
                  aria-label={`${run.label}: ${run.members.map((m) => `${m.name} ${m.state === 'ok' ? 'shipped' : m.state === 'fail' ? 'failed and rolled back' : 'not started'}`).join(', ')}.`}
                  className="grid grid-cols-4 gap-2"
                >
                  {run.members.map((m, i) => (
                    <li key={m.name} className="flex flex-col items-center gap-2">
                      <span className="relative flex w-full items-center justify-center">
                        {i > 0 && (
                          <span aria-hidden="true" className="absolute top-1/2 right-1/2 w-full border-t border-border-field" />
                        )}
                        <span
                          aria-hidden="true"
                          className={`relative z-10 flex size-8 items-center justify-center rounded-full border-2 bg-bg ${
                            m.state === 'fail' ? 'border-danger' : m.state === 'held' ? 'border-dashed border-fg-faint' : ''
                          }`}
                          style={m.state === 'ok' ? { backgroundColor: accent, borderColor: accent } : undefined}
                        >
                          {m.name === 'canary' && m.state === 'ok' && <span className="size-2 rounded-full bg-bg" />}
                        </span>
                      </span>
                      <span className={`font-mono text-11 ${m.state === 'held' ? 'text-fg-faint' : 'text-fg'}`}>{m.name}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Figure>
      </div>
      <Figure caption="Roll all, drawn once. Each app ships at its own newest commit, one at a time, each through every gate and its own soak. Group-mates sit together with the canary first; Shipyard’s own server always goes last; the first failure leaves the rest untouched. App names and commits are illustrative.">
        <div
          role="img"
          aria-label="Roll all: every app is locked when you confirm. Notes at 8e41c07 ships and soaks, then wiki at 2b7d9f0, each starting only once the one before it has passed its soak, then the Shipyard server at c4a10e3, always last. If any fails, every app after it is cancelled before it is touched."
          className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-stretch"
        >
          {ROLL_ALL.map((item, i) => (
            <div key={item.app} aria-hidden="true" className="contents">
              {i > 0 && <Arrow accent={accent} />}
              <span
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
                style={item.last ? { borderTopColor: accent, borderTopWidth: 3 } : undefined}
              >
                <span className="flex items-center gap-2 text-14 font-semibold text-fg">
                  <Mark accent={accent} className="size-2" />
                  {item.app}
                </span>
                <span className="font-mono text-11 text-fg-muted">{item.sha} · soaked</span>
                <span className="text-13 text-fg-muted">{item.note}</span>
              </span>
            </div>
          ))}
        </div>
      </Figure>
      <ul className="grid gap-4 sm:grid-cols-3">
        {[
          { t: 'Freeze', d: 'Freeze an app and every deploy of it is refused until you unfreeze it.' },
          { t: 'Schedule', d: 'Set a deploy to run later. It passes the same gates when its time comes.' },
          { t: 'Drift', d: 'If someone changes an app by hand, Shipyard notices and refuses the next deploy until it is resolved.' },
        ].map((item) => (
          <li key={item.t} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5">
            <span className="text-16 font-semibold text-fg">{item.t}</span>
            <span className="text-14 text-fg-muted">{item.d}</span>
          </li>
        ))}
      </ul>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 08 Rollback */

function Rollback({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="rollback"
      code={code(8)}
      label="Rollback"
      title={
        <>
          Images roll back on their own. <Accent>Data waits for you.</Accent>
        </>
      }
      lede="Putting old images back is safe to automate. Putting old data back is not — it throws away whatever happened since the backup. So Shipyard does the first by itself, and turns the second into a guided decision that a person makes and types to confirm."
      sunken
    >
      <Figure caption="What happens when a check or soak fails. A release marked as a contract migration — one that removes or reshapes data the old code needs — is never rolled back automatically.">
        <div
          role="img"
          aria-label="Decision: a deploy fails after the swap. If the release is not marked as a contract migration, the previous compose file and images go back automatically and the deploy ends rolled back. If it is, Shipyard stops on the new image, keeps the backup it took, and a person decides whether to restore data from the console."
          className="flex flex-col"
        >
          <div aria-hidden="true" className="mx-auto flex items-center gap-3 rounded-full border border-border-field bg-bg px-5 py-2.5 text-14 text-fg">
            <StopMark />
            Check or soak fails
          </div>
          <FlowDown accent={accent} />
          <div aria-hidden="true" className="mx-auto rounded-md border border-border-field bg-surface px-5 py-2.5 text-center text-14 text-fg">
            Is the release marked <span className="font-mono text-12">contract</span>?
          </div>
          <div aria-hidden="true" className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <Tag>No — most releases</Tag>
              <Box title="Previous images go back" accent={accent}>
                The earlier compose file and the earlier digests, chosen from the agent’s own record of what it deployed —
                never from the request.
              </Box>
              <span className="flex items-center gap-2 font-mono text-12 text-fg">
                <Mark accent={accent} className="size-2" /> rolled_back · reason named
              </span>
            </div>
            <div className="flex flex-col gap-4">
              <Tag>Yes — the data has changed shape</Tag>
              <Box title="Stop on the new image" strong>
                Old code on new data would do more damage. The deploy stops, and the backup it took is kept.
              </Box>
              <Box title="A person decides on a restore">
                Guided in the console, from a backup the app’s own backup step took. You type the app’s name to confirm.
              </Box>
            </div>
          </div>
        </div>
      </Figure>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5">
          <span className="text-16 font-semibold text-fg">Rolling back on purpose</span>
          <span className="text-14 text-fg-muted">
            Choose an earlier successful deploy from your phone, or let a coding agent call rollback. It passes the same
            gates, plus one more: it is refused if a later release changed the data’s shape.
          </span>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5">
          <span className="text-16 font-semibold text-fg">Room for the way back</span>
          <span className="text-14 text-fg-muted">
            The last three images of each service are kept after a successful deploy by default, and older ones pruned —
            so the images a rollback needs are still on the host.
          </span>
        </div>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 09 Builds */

const BUILD_STAGES = [
  { name: 'Fetch', note: 'The exact commit, only if it is on the default branch' },
  { name: 'Test', note: 'The Dockerfile’s test target. Fails? Nothing is pushed' },
  { name: 'Integration', note: 'Optional, in a network of its own' },
  { name: 'Build', note: 'Each release target, with rootless BuildKit' },
  { name: 'Push', note: 'Labelled with the commit; digests recorded' },
];

const BUILD_GUARDS = [
  {
    t: 'A build step cannot reach your house',
    d: 'Builds run on a firewalled network: the public internet for package registries, but not the host, not a private address, not your other stacks.',
  },
  {
    t: 'Secrets by name only',
    d: 'The manifest names a build secret; its value is set on the host, never as an argument, sealed with the agent’s key and redacted from every log.',
  },
  {
    t: 'Deploys come first',
    d: 'One build at a time, and a deploy in flight holds a build’s next stage — a build never delays a deploy.',
  },
  {
    t: 'Auto-deploy is just a request',
    d: 'Opt in and each green build asks for one deploy, which passes every gate, freeze, lock and approval like any other.',
  },
];

function Builds({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="builds"
      code={code(9)}
      label="Builds"
      title={
        <>
          Bring your own CI — <Accent>or let Shipyard build it.</Accent>
        </>
      }
      lede="Most apps keep the CI they have, and Shipyard only checks its result. An app can opt in to Shipyard building it instead: a push to the default branch, through a signed webhook, and the agent fetches that exact commit, runs its tests, builds the images and pushes them to your registry. A reconcile loop catches any push the webhook missed."
    >
      <Figure caption="An opt-in build, stage by stage. Any stage that fails ends the build; a deploy of that commit is then refused at G5, because the gate reads the agent’s own record of the build — and refuses again if the registry’s digest no longer matches it.">
        <div
          role="img"
          aria-label="Build stages: fetch the exact commit on the default branch, run the test target, an optional integration stage in its own network, build each release target with rootless BuildKit, push the images labelled with the commit. Then gate G5 reads the build record, and the deploy follows the usual path."
          className="flex flex-col gap-6"
        >
          <ol aria-hidden="true" className="grid gap-3 sm:grid-cols-5">
            {BUILD_STAGES.map((stage, i) => (
              <li key={stage.name} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
                <span className="flex items-center gap-2">
                  <span className="font-mono text-11 text-fg-faint">{i + 1}</span>
                  <span className="text-14 font-semibold text-fg">{stage.name}</span>
                </span>
                <span className="text-13 text-fg-muted">{stage.note}</span>
              </li>
            ))}
          </ol>
          <FlowDown accent={accent} />
          <div
            aria-hidden="true"
            className="mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-lg border border-border-field bg-bg px-5 py-2.5 text-center text-14 text-fg"
          >
            <Mark accent={accent} />
            <span className="font-mono text-12 text-fg-muted">G5</span>
            reads the build record, then the deploy runs as always
          </div>
        </div>
      </Figure>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {BUILD_GUARDS.map((item) => (
          <li key={item.t} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5">
            <span className="text-16 font-semibold text-fg">{item.t}</span>
            <span className="text-14 text-fg-muted">{item.d}</span>
          </li>
        ))}
      </ul>
      <Figure caption="Build defaults from Shipyard’s runbook. An admin changes the limits in Settings → Builds; the agent applies them on its next poll.">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <Stat value="1" label="build at a time" />
          <Stat value="20 GB" label="build-cache cap, collected after every build" />
          <Stat value="30" label="days a build’s log is kept" />
          <Stat value="7" label="MCP tools, build and build status among them" />
        </div>
      </Figure>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 10 Deploys itself */

function Itself({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="itself"
      code={code(10)}
      label="Deploys itself"
      title={
        <>
          It ships its own updates — <Accent>except the part that rolls back.</Accent>
        </>
      }
      lede="Shipyard’s server is just another app with a manifest: new versions go through the same gates, backup, migration, checks and soak — and in a Roll all it always goes last. The agent is deliberately left out. You upgrade it by hand, so a bad release can never take away the one process able to undo it."
      sunken
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-center">
        <Figure caption="The server deploys through the agent like any app. If the new server fails, the agent rolls it back on its own — with the server unreachable.">
          <div
            role="img"
            aria-label="The agent deploys the Shipyard server through the same pipeline as any app, and rolls it back itself if it fails. The agent itself sits outside that loop and is upgraded by hand."
            className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center"
          >
            <div aria-hidden="true" className="flex flex-col gap-3 rounded-lg border border-border-field bg-surface p-5">
              <Tag>Deployed by Shipyard</Tag>
              <span className="text-16 font-semibold text-fg">Shipyard server</span>
              <span className="text-13 text-fg-muted">Its own manifest, backup, migration, checks and soak.</span>
            </div>
            <svg viewBox="0 0 80 60" className="mx-auto h-14 w-20 rotate-90 sm:rotate-0" aria-hidden="true">
              <path d="M8 22 H66 M60 16 L67 22 L60 28" fill="none" strokeWidth="1.8" strokeLinecap="round" style={{ stroke: accent }} />
              <path d="M72 40 H14 M20 34 L13 40 L20 46" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="4 4" className="stroke-fg-faint" />
            </svg>
            <div aria-hidden="true" className="flex flex-col gap-3 rounded-lg border border-border-field bg-surface p-5" style={{ borderTopColor: accent, borderTopWidth: 3 }}>
              <Tag>Upgraded by hand</Tag>
              <span className="text-16 font-semibold text-fg">The agent</span>
              <span className="text-13 text-fg-muted">Holds the Docker socket, deploys the server, rolls it back.</span>
            </div>
          </div>
        </Figure>
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border-field p-5">
          <Tag>Why not deploy the agent too</Tag>
          <span className="text-14 text-fg-muted">
            A process with root-level access that could swap its own image is exactly the kind of escalation Shipyard
            refuses everywhere else. Keeping it out of the loop is the price of a rollback you can always count on.
          </span>
        </div>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 11 Why this way */

const BENEFITS = [
  { t: 'The careful path is the only path', d: 'Every deploy runs every check, whether it comes from you at midnight or a coding agent at noon.' },
  { t: 'A refusal tells you what to do', d: 'Gate, reason and fix, in the same shape for a person and for an agent — so nobody retries blind.' },
  { t: 'You know exactly what is running', d: 'Images are pinned by digest and proven by revision and schema, not assumed from a tag.' },
  { t: 'Crashes are recoverable', d: 'Each step is journaled before it runs. After a crash, an unfinished deploy goes back to its last verified release — never forward blind.' },
  { t: 'Nothing new is exposed', d: 'The Docker-facing agent opens no port, and no request can carry a command to your host.' },
  { t: 'No lock-in to a platform', d: 'Your apps stay plain Docker Compose stacks on any Linux machine. Stop using Shipyard and they still run.' },
  {
    t: 'Your secrets stay put',
    d: 'It stores no app secrets — a build secret, if you use builds, is sealed on your own host — redacts step output, never stores backup output, and sends no telemetry.',
  },
  { t: 'Every deploy on the record', d: 'Who asked, which commit, each step and its result — in an audit log you can read back later.' },
];

function Why({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="why"
      code={code(11)}
      label="Why it is built this way"
      title={
        <>
          Boring on purpose, <Accent>so deploys stay boring.</Accent>
        </>
      }
      lede="Shipyard does a few things and refuses the rest. It is not a platform for creating servers or editing your compose files — it takes a commit that has been built and tested and makes shipping it safe."
    >
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {BENEFITS.map((b) => (
          <li key={b.t} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-6">
            <Mark accent={accent} />
            <span className="text-16 font-semibold text-fg">{b.t}</span>
            <span className="text-14 text-fg-muted">{b.d}</span>
          </li>
        ))}
      </ul>
      <Figure caption="Product defaults, from Shipyard’s manifest schema and server. Soak, disk floor and images kept can be set per app.">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
          <Stat value="11" label="named gates, G1 to G11" />
          <Stat value="60 s" label="default soak" />
          <Stat value="1 h" label="for an approval before it expires" />
          <Stat value="5 GB" label="default free-disk floor" />
          <Stat value="3" label="images kept per service" />
          <Stat value="0" label="ports the agent listens on" />
        </div>
      </Figure>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- Page */

export function ShipyardDeepDive({ project }: { project: Project }) {
  const accent = project.accent;
  return (
    <>
      <DeepIndex entries={ENTRIES} accent={accent} />
      <Problem accent={accent} />
      <Walkthrough accent={accent} />
      <Pipeline accent={accent} />
      <Gates accent={accent} />
      <Architecture accent={accent} />
      <Locks accent={accent} />
      <People accent={accent} />
      <Rollback accent={accent} />
      <Builds accent={accent} />
      <Itself accent={accent} />
      <Why accent={accent} />
    </>
  );
}
