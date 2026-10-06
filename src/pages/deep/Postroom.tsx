import type { ReactNode } from 'react';
import type { Project } from '../../content/projects';
import { BarRow, DeepIndex, DeepSection, Figure, FlowDown, Stat, type DeepEntry } from '../../components/Deep';
import { Accent, Quiet } from '../../components/Marketing';

/**
 * Postroom, explained (DI-T-9.1, DI-REQ-039, DI-REQ-041). Laid out like the thing it describes: a
 * message's journey, top to bottom — why the server exists, the path a message takes, how it is
 * sorted and how it shows its working, the gate it passed before anything listened, the decisions
 * it rests on, and how it was built.
 *
 * Every number is a product fact from the d3-postroom repository or its plan of record:
 *   - the RFCs: each one is cited in the repository's code or docs (mail/rfc-links.ts and the
 *     protocol packages);
 *   - the ports, the 100 MB limit, the seven inbound stages (web/src/api.ts INBOUND_STAGES) and the
 *     250-after-fsync rule: the README, CLAUDE.md and the durability decision;
 *   - the sorting order and its sentences: web/src/mail/sorting/sorting.ts (whySentence);
 *   - the holdout floors and their 142 messages: fixtures/golden/thresholds.json and holdout/;
 *   - the nine Inspect sections: web/src/mail/InspectDrawer.tsx;
 *   - the gate: 82 adversarial tests in nine files (security/adversarial/test/integration), 14 active
 *     fuzz targets (fuzz/targets.json), the ASVS 5.0 L2 breakdown (docs/security/asvs-l2.md);
 *   - 21 phases, 204 requirements, 231 tasks and 16 decisions: the plan of record, read 2026-10-06;
 *   - the ports the edge opens: docs/dns.md (25, 465, 587 and 993; 4190 stays closed until a
 *     ManageSieve daemon runs in production);
 *   - code counts, computed at commit 7827a55 (origin/main, 2026-10-06 audit; production runs the
 *     same revision per mail.d3cloud.io/health) — see the captions for how. The unit-test figure is
 *     3,945 at f133de6 plus the 61 it()/test() calls added since; every counting variant gives the
 *     same +61. The browser count (171) is unchanged since f133de6.
 * Sessions, addresses and timelines drawn as "screens" are illustrations, and are captioned so.
 */

const ENTRIES: DeepEntry[] = [
  { id: 'why', label: 'Why it exists' },
  { id: 'path', label: 'A message arrives' },
  { id: 'sorting', label: 'Sorting itself' },
  { id: 'showing', label: 'Showing its working' },
  { id: 'gate', label: 'The gate' },
  { id: 'decisions', label: 'Decisions' },
  { id: 'build', label: 'The build' },
];

const code = (n: number) => `MAIL · ${String(n).padStart(2, '0')}`;

/* ---------------------------------------------------------------- Shared marks */

/** A small dot in the product's colour; hollow for "not yet". */
function Mark({ accent, hollow = false, className = '' }: { accent: string; hollow?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-2.5 shrink-0 rounded-full ${hollow ? 'border-2' : ''} ${className}`}
      style={hollow ? { borderColor: accent } : { backgroundColor: accent }}
    />
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

/** A monospace pane, the way the webmail shows a session or a header. */
function Screen({ children, label }: { children: ReactNode; label: string }) {
  return (
    <pre
      role="img"
      aria-label={label}
      className="overflow-x-auto rounded-md border border-border bg-surface p-4 font-mono text-12 leading-relaxed text-fg-muted"
    >
      {children}
    </pre>
  );
}

/* ---------------------------------------------------------------- Why */

interface Protocol {
  name: string;
  rfc: string;
}

const STACK: { group: string; items: Protocol[] }[] = [
  {
    group: 'Moving mail',
    items: [
      { name: 'SMTP', rfc: 'RFC 5321' },
      { name: 'Submission', rfc: 'RFC 6409' },
      { name: 'MIME', rfc: 'RFC 2045' },
    ],
  },
  {
    group: 'Reading it',
    items: [
      { name: 'IMAP4rev1', rfc: 'RFC 3501' },
      { name: 'IMAP4rev2', rfc: 'RFC 9051' },
      { name: 'CONDSTORE · QRESYNC', rfc: 'RFC 7162' },
    ],
  },
  {
    group: 'Trusting it',
    items: [
      { name: 'SPF', rfc: 'RFC 7208' },
      { name: 'DKIM', rfc: 'RFC 6376' },
      { name: 'DMARC', rfc: 'RFC 7489' },
      { name: 'ARC', rfc: 'RFC 8617' },
    ],
  },
  {
    group: 'Living with it',
    items: [
      { name: 'CalDAV', rfc: 'RFC 4791' },
      { name: 'CardDAV', rfc: 'RFC 6352' },
      { name: 'iCalendar', rfc: 'RFC 5545' },
      { name: 'vCard', rfc: 'RFC 6350' },
      { name: 'Sieve', rfc: 'RFC 5228' },
      { name: 'ManageSieve', rfc: 'RFC 5804' },
    ],
  },
];

/** The usual stack: four programs, four configurations, and the seams between them. */
function UsualStack() {
  const parts = ['A transfer agent', 'An IMAP server', 'A spam filter', 'A webmail'];
  return (
    <div role="img" aria-label="The usual self-hosted mail stack: four separate programs, each with its own configuration, with question marks at the seams between them." className="flex flex-col">
      {parts.map((part, index) => (
        <div key={part} className="flex flex-col">
          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3">
            <span className="text-14 text-fg">{part}</span>
            <span className="font-mono text-11 text-fg-faint">its own config</span>
          </div>
          {index < parts.length - 1 && (
            <span aria-hidden="true" className="self-center py-1 font-mono text-14 text-fg-faint">
              ?
            </span>
          )}
        </div>
      ))}
    </div>
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
          Mail you can read, <Accent>all the way down.</Accent>
        </>
      }
      lede="Most self-hosted mail is a stack of mature parts that nobody on the machine fully understands, each configured in a different file. When a message goes missing or lands in spam, the answer is somewhere between them. Postroom is one codebase, written protocol by protocol, so every step a message takes is code you can open — and the webmail shows you that step."
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,5fr)] lg:items-start">
        <Figure caption="The usual way: four programs, and seams nobody owns.">
          <UsualStack />
        </Figure>
        <Figure caption="Postroom: every protocol below written in its own repository, in TypeScript, from the RFC — nothing wrapped. Each RFC is cited in the code that implements it.">
          <div className="grid gap-6 sm:grid-cols-2">
            {STACK.map((group) => (
              <div key={group.group} className="flex flex-col gap-3">
                <Tag>{group.group}</Tag>
                <ul className="flex flex-col gap-2">
                  {group.items.map((item) => (
                    <li
                      key={item.name}
                      className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2.5"
                    >
                      <Mark accent={accent} className="size-2" />
                      <span className="min-w-0 flex-1 text-14 text-fg">{item.name}</span>
                      <span className="font-mono text-11 text-fg-faint">{item.rfc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Figure>
      </div>
      <Figure caption="Counted at commit 7827a55 over the TypeScript files git tracks under apps/ and packages/: source excludes *.test.*, test/ folders and type declarations; tests are it() and test() calls in the test files. The browser and adversarial suites are counted the same way, further down.">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          <Stat value="10" label="apps — the daemons, the webmail and the edge forwarder" />
          <Stat value="34" label="packages — parsers, checks and shared libraries" />
          <Stat value="150k" label="lines of TypeScript, tests not included" />
          <Stat value="4,006" label="unit and integration tests beside them" />
        </div>
      </Figure>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- Path */

const STAGES = ['verify', 'parse', 'classify', 'sieve', 'file', 'notify', 'feedback'];

function Path({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="path"
      code={code(2)}
      label="A message arrives"
      title={
        <>
          It answers 250 <Accent>only once it is safe.</Accent>
        </>
      }
      lede="Follow one message in. It crosses a small server that holds nothing, reaches home over an encrypted tunnel, is written to disk before anyone is told it arrived, and is filed by a queue that can replay any step it took."
      sunken
    >
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div
          role="img"
          aria-label="A message's path: a sending server connects to port 25 on the edge, a stateless VPS that forwards it home over WireGuard with PROXY v2. At home, smtp-in reads it strictly and streams it into an encrypted spool, fsyncs and commits, and only then replies 250. A PostgreSQL queue runs seven replayable stages — verify, parse, classify, sieve, file, notify, feedback — and the message lands in a real IMAP folder with its reasons stored."
          className="flex flex-col"
        >
          <div aria-hidden="true" className="flex flex-col">
            <Box kicker="The internet" title="A sending server">
              Looks up your MX and connects to port 25.
            </Box>
            <FlowDown accent={accent} />
            <Box kicker="The edge · a $5 VPS" title="Forwards, and keeps nothing">
              Ports 25, 465, 587 and 993 — and 4190 for ManageSieve, once you open it — sent home over WireGuard
              with PROXY v2 so home sees the real client address. No mail, no keys — TLS ends at home.
            </Box>
            <FlowDown accent={accent} />
            <div className="flex flex-col gap-3 rounded-lg border border-border-field bg-bg p-4">
              <span className="px-1">
                <Tag>Home · one image, a daemon per protocol</Tag>
              </span>
              <div className="grid gap-3 md:grid-cols-2">
                <Box title="smtp-in" accent={accent}>
                  Strict about line endings — only CRLF.CRLF ends a message, so SMTP smuggling has nowhere to hide.
                  Streams up to 100 MB without holding a message in memory.
                </Box>
                <Box title="The spool" accent={accent}>
                  Encrypted, written to disk, fsynced, and its row committed in PostgreSQL. Never before.
                </Box>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-border bg-surface px-5 py-4">
                <span className="font-mono text-20 text-fg">250 2.0.0 Ok</span>
                <span className="text-13 text-fg-muted">
                  The sender is told only now. Kill the server the instant after, and the message is still there — a
                  test does exactly that.
                </span>
              </div>
            </div>
            <FlowDown accent={accent} />
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
              <Tag>The queue · PostgreSQL · every stage replayable</Tag>
              <ol className="flex flex-wrap items-center gap-2">
                {STAGES.map((stage, index) => (
                  <li key={stage} className="flex items-center gap-2">
                    <span className="rounded-full border border-border-field px-3 py-1 font-mono text-12 text-fg">{stage}</span>
                    {index < STAGES.length - 1 && <span className="font-mono text-12 text-fg-faint">→</span>}
                  </li>
                ))}
              </ol>
              <span className="text-13 text-fg-muted">
                Each stage is idempotent, so a failed message is replayed from the stage that failed — from the admin
                console, not a shell.
              </span>
            </div>
            <FlowDown accent={accent} />
            <Box title="A real IMAP folder, and the reasons" strong>
              Filed where your phone's mail app sees it too, with why it was filed there stored beside it.
            </Box>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
            <Tag>Why the edge</Tag>
            <span className="text-16 font-semibold text-fg">Home networks block port 25</span>
            <span className="text-13 text-fg-muted">
              Most home connections refuse outbound port 25 and have no fixed address. The edge is a small rented
              server that only forwards. It is rebuilt from a script, never patched, and nothing on it is worth
              stealing.
            </span>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
            <Tag>And going out</Tag>
            <span className="text-16 font-semibold text-fg">Straight to their server</span>
            <span className="text-13 text-fg-muted">
              Outgoing mail is DKIM-signed and delivered directly to the recipient's MX from the edge's address, with
              retries and bounce reports — or through Amazon SES, switched on per destination or for everything.
            </span>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border-field p-5">
            <Tag>Never</Tag>
            <span className="text-16 font-semibold text-fg line-through decoration-danger decoration-2">An open relay</span>
            <span className="text-13 text-fg-muted">
              No source, inside or out, can send through it without signing in — and mail apps sign in with app
              passwords only, never the account password.
            </span>
          </div>
        </aside>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- Sorting */

const FOLDERS = [
  { name: 'Newsletters', what: 'Mailing lists, out of your Inbox' },
  { name: 'Updates', what: 'Account notices from companies' },
  { name: 'Receipts', what: 'Orders, invoices, payments' },
  { name: 'Notifications', what: 'Automated alerts from apps and sites' },
  { name: 'Junk', what: 'What failed its checks, or you blocked' },
];

const DECIDES = [
  { who: 'Your correction', example: 'You moved one to Receipts; mail from that sender goes there now.' },
  { who: 'Your pin', example: 'You always put mail from this sender in one place.' },
  { who: 'Your rule, or a +address', example: 'A Sieve rule you wrote, or mail sent to you+receipts@.' },
  { who: 'The bucket’s own rule', example: 'A List-Id header means a mailing list; a known notification system, a notification.' },
  { who: 'Naive Bayes', example: 'It looks like mail you have kept in that folder before — trained by your moves.' },
];

/** The pigeonhole rack: the Inbox holds Priority and People; every other bucket is a real folder. */
function Rack({ accent }: { accent: string }) {
  return (
    <div
      role="img"
      aria-label="The folders Postroom sorts into: the Inbox, split into Priority and People, then Newsletters, Updates, Receipts, Notifications and Junk — each a real IMAP folder."
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      <div aria-hidden="true" className="col-span-2 flex flex-col gap-3 rounded-lg border border-border-field bg-surface p-4 sm:col-span-1 sm:row-span-2">
        <span className="font-mono text-12 text-fg">INBOX</span>
        <span className="flex items-center gap-2 rounded-md border border-border-field bg-bg px-3 py-2 text-14 text-fg">
          <Mark accent={accent} className="size-2" />
          Priority
        </span>
        <span className="text-12 text-fg-muted">People you write to, writing to you directly.</span>
        <span className="flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-14 text-fg">
          <Mark accent={accent} hollow className="size-2" />
          People
        </span>
        <span className="text-12 text-fg-muted">A person you do not know yet — or one who only copied you.</span>
      </div>
      {FOLDERS.map((folder) => (
        <div key={folder.name} aria-hidden="true" className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4">
          <span className="text-14 font-semibold text-fg">{folder.name}</span>
          <span className="text-12 text-fg-muted">{folder.what}</span>
        </div>
      ))}
    </div>
  );
}

/** What the "Why it's here" popover says: one sentence, built from the stored reasons. */
function WhyPopover({ accent }: { accent: string }) {
  const lines = [
    'Filed in your Inbox as Priority because someone you know wrote to you directly.',
    'Filed in Newsletters because it came through a mailing list.',
    'Filed in Receipts because you corrected it, and mail from orders@example.com goes there now.',
  ];
  return (
    <ul className="flex flex-col gap-3">
      {lines.map((line) => (
        <li key={line} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
          <span className="flex items-center gap-2">
            <Mark accent={accent} className="size-2" />
            <span className="font-mono text-11 tracking-label text-fg-faint uppercase">Why it’s here</span>
          </span>
          <span className="text-14 text-fg">{line}</span>
        </li>
      ))}
    </ul>
  );
}

const HOLDOUT = [
  { bucket: 'Priority', n: 22, floor: 1 },
  { bucket: 'People', n: 25, floor: 1 },
  { bucket: 'Newsletters', n: 13, floor: 1 },
  { bucket: 'Updates', n: 24, floor: 0.9583 },
  { bucket: 'Receipts', n: 24, floor: 1 },
  { bucket: 'Notifications', n: 24, floor: 0.9583 },
  { bucket: 'Junk', n: 10, floor: 1 },
];

function Sorting({ accent }: { accent: string }) {
  const total = HOLDOUT.reduce((sum, row) => sum + row.n, 0);
  return (
    <DeepSection
      id="sorting"
      code={code(3)}
      label="Sorting itself"
      title={
        <>
          It sorts your mail, <Accent>and says why.</Accent>
        </>
      }
      lede="Every message is filed into a real folder, so the mail app on your phone sees the same sorting as the webmail, and the reasons it was filed there are kept. There is no language model: the decision comes from who you write to, what the message says about itself, your own rules, and a small naive Bayes model that learns from the mail you move."
    >
      <div className="grid gap-12 lg:grid-cols-2">
        <Figure caption="Where mail goes. A message lives in exactly one folder; the Inbox's split is a pair of keywords, so Priority and People stay one Inbox to every other app.">
          <Rack accent={accent} />
        </Figure>
        <Figure caption="What decides, strongest first. The first reason that applies wins, and a correction outranks everything — including the model.">
          <ol className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
            {DECIDES.map((step, index) => (
              <li key={step.who} className="flex gap-4 px-4 py-3">
                <span className="font-mono text-14 text-fg-faint">{index + 1}</span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-14 font-semibold text-fg">{step.who}</span>
                  <span className="text-13 text-fg-muted">{step.example}</span>
                </span>
              </li>
            ))}
          </ol>
        </Figure>
      </div>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Figure caption="The sentence a reader sees, built from the stored reasons — nothing is recomputed and nothing is guessed. The sender is illustrative.">
          <WhyPopover accent={accent} />
        </Figure>
        <Figure
          caption={`Held to account by a holdout set: ${total} synthetic messages the rules were never tuned against. CI fails if any folder's precision or recall drops below its floor — the same floor for both.`}
        >
          <div className="flex flex-col gap-4">
            {HOLDOUT.map((row) => (
              <BarRow
                key={row.bucket}
                label={row.bucket}
                value={row.floor === 1 ? '1.00' : row.floor.toFixed(2)}
                fraction={row.floor}
                accent={accent}
              />
            ))}
          </div>
        </Figure>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border-field p-6 sm:flex-row sm:items-center sm:gap-6">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-fg">
          <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3.5 6 L12 12.5 L20.5 6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="12" cy="12.5" r="1.8" style={{ fill: accent }} />
        </svg>
        <p className="text-16 text-fg">
          No message is ever sent to an AI model.{' '}
          <Quiet>
            Sorting runs on your server, from rules you can read and a model trained only on what you move — and every
            decision keeps the list of reasons that made it.
          </Quiet>
        </p>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- Showing */

const INSPECT = [
  'Authentication — SPF, DKIM, DMARC, ARC, blocklists',
  'Signature and encryption',
  'Received path, hop by hop',
  'Why this bucket',
  'Spam score breakdown',
  'Trackers removed',
  'Read-receipt request',
  'Every header, in order',
  'Raw source',
];

const SESSION: { dir: 'C' | 'S'; line: string }[] = [
  { dir: 'S', line: '220 mx.example.org ESMTP' },
  { dir: 'C', line: 'EHLO mail.example.net' },
  { dir: 'S', line: '250-STARTTLS' },
  { dir: 'C', line: 'STARTTLS' },
  { dir: 'S', line: '220 2.0.0 Ready to start TLS' },
  { dir: 'C', line: 'MAIL FROM:<ana@example.net>' },
  { dir: 'S', line: '250 2.1.0 Ok' },
  { dir: 'C', line: 'RCPT TO:<you@example.org>' },
  { dir: 'S', line: '250 2.1.5 Ok' },
  { dir: 'C', line: 'DATA' },
  { dir: 'S', line: '354 End data with <CR><LF>.<CR><LF>' },
  { dir: 'S', line: '250 2.0.0 Ok: queued' },
];

const TIMELINE = [
  { title: 'Accepted and queued', detail: 'DKIM-signed, 18214 bytes', tone: 'plain' },
  { title: 'Attempt via direct to mx.example.net: deferred', detail: 'TLSv1.3 · 451 4.7.1 Try again later', tone: 'wait' },
  { title: 'Attempt via direct to mx.example.net: delivered', detail: 'TLSv1.3 · 250 2.0.0 OK', tone: 'plain' },
  { title: 'Delivered to ana@example.net', detail: null, tone: 'done' },
] as const;

function Showing({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="showing"
      code={code(4)}
      label="Showing its working"
      title={
        <>
          Every decision, <Accent>one click from its evidence.</Accent>
        </>
      }
      lede="Mail servers usually keep their reasoning in a log you have to go looking for. Postroom puts it beside the message: what was checked and what passed, the path it took, the conversation it arrived in, and — for what you send — every attempt to deliver it."
      sunken
    >
      <div className="grid gap-10 lg:grid-cols-3">
        <Figure caption="Inspect: nine sections for any message. Learn mode links each header, reply code and verdict to the RFC that defines it.">
          <div className="flex flex-col rounded-lg border border-border-field bg-surface">
            <span className="border-b border-border px-4 py-3 text-14 font-semibold text-fg">Inspect message</span>
            <ol className="flex flex-col divide-y divide-border">
              {INSPECT.map((row, index) => (
                <li key={row} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="font-mono text-11 text-fg-faint">{String(index + 1).padStart(2, '0')}</span>
                  <span className="text-13 text-fg">{row}</span>
                  {index === 3 && <Mark accent={accent} className="ml-auto size-2" />}
                </li>
              ))}
            </ol>
          </div>
        </Figure>
        <Figure caption="The live SMTP viewer: sessions as they happen, and kept compressed afterwards. An illustrative session.">
          <Screen label="An illustrative SMTP session: the server greets, the client says EHLO, upgrades to TLS, names the sender and recipient, sends the data, and the server answers 250 Ok: queued.">
            {SESSION.map((row, index) => (
              <span key={index} className="block">
                <span className={row.dir === 'S' ? 'text-fg-faint' : 'text-fg'}>{row.dir} </span>
                <span className={row.dir === 'S' ? '' : 'text-fg'}>{row.line}</span>
              </span>
            ))}
          </Screen>
        </Figure>
        <Figure caption="A delivery timeline for something you sent: every attempt, its TLS, and the remote server's own words. Illustrative.">
          <ol className="flex flex-col border-l border-border-field pl-5">
            {TIMELINE.map((event) => (
              <li key={event.title} className="relative flex flex-col gap-1 pb-5 last:pb-0">
                <span
                  aria-hidden="true"
                  className={`absolute top-1 -left-6.5 size-3 rounded-full border-2 ${event.tone === 'wait' ? 'border-warning bg-bg-sunken' : 'border-bg-sunken'}`}
                  style={event.tone === 'wait' ? undefined : { backgroundColor: accent }}
                />
                <span className="text-13 font-semibold text-fg">{event.title}</span>
                {event.detail && <span className="font-mono text-12 text-fg-muted">{event.detail}</span>}
              </li>
            ))}
          </ol>
        </Figure>
      </div>
      <ul className="grid gap-4 sm:grid-cols-3">
        {[
          { title: 'Trackers removed', body: 'Known tracking pixels are stripped before a message renders, remote images wait until you ask, and links lose their tracking parameters.' },
          { title: 'A separate origin for HTML', body: 'Mail’s HTML renders on its own sandboxed origin, never on the webmail’s, so a hostile message cannot reach your session.' },
          { title: 'Phishing, named', body: 'A lookalike domain, a spoofed display name or a link that says one address and goes to another is called out above the message.' },
        ].map((item) => (
          <li key={item.title} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5">
            <span className="text-14 font-semibold text-fg">{item.title}</span>
            <span className="text-13 text-fg-muted">{item.body}</span>
          </li>
        ))}
      </ul>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- Gate */

const ATTACKS = [
  'Open relay',
  'SMTP smuggling',
  'STARTTLS injection',
  'PROXY header spoofing',
  'Own-domain spoofing',
  'Header injection',
  'IMAP literal abuse',
  'Blob path traversal',
  'Authentication bypass',
];

const ASVS = [
  { label: 'Pass', n: 148, opacity: 1 },
  { label: 'Pass after a fix made in the assessment', n: 26, opacity: 0.75 },
  { label: 'Pass on a documented decision', n: 22, opacity: 0.5 },
  { label: 'Accepted deviation, with its rationale', n: 9, opacity: 0.3 },
];
const ASVS_NA = 48;

function Gate({ accent }: { accent: string }) {
  const total = ASVS.reduce((sum, row) => sum + row.n, 0) + ASVS_NA;
  return (
    <DeepSection
      id="gate"
      code={code(5)}
      label="The gate"
      title={
        <>
          Nothing listened <Accent>until the gate passed.</Accent>
        </>
      }
      lede="A mail server is probed as soon as its address appears in DNS. So the rule was decided at the start: no public listener, and no MX record, until a security gate is green. Sending, which opens no port, was allowed to go first."
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-8">
          <Figure caption="The adversarial suite: 82 tests in nine attack classes, run against the real daemons over real sockets on every push.">
            <ul className="flex flex-wrap gap-2">
              {ATTACKS.map((attack) => (
                <li key={attack} className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-13 text-fg">
                  <Mark accent={accent} className="size-2" />
                  {attack}
                </li>
              ))}
            </ul>
          </Figure>
          <Figure caption={`OWASP ASVS 5.0, Level 2, for the webmail and its API: all ${total} requirements read, none left failing. ${ASVS_NA} do not apply to a single-domain webmail.`}>
            <div className="flex h-6 overflow-hidden rounded-full bg-surface-raised" aria-hidden="true">
              {ASVS.map((row) => (
                <span
                  key={row.label}
                  className="bar h-full border-r-2 border-bg"
                  style={{ width: `${(row.n / total) * 100}%`, backgroundColor: accent, opacity: row.opacity }}
                />
              ))}
            </div>
            <dl className="flex flex-col divide-y divide-border">
              {ASVS.map((row) => (
                <div key={row.label} className="flex items-center gap-4 py-2.5">
                  <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: accent, opacity: row.opacity }} />
                  <dt className="flex-1 text-14 text-fg">{row.label}</dt>
                  <dd className="font-mono text-14 text-fg">{row.n}</dd>
                </div>
              ))}
              <div className="flex items-center gap-4 py-2.5">
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-surface-raised" />
                <dt className="flex-1 text-14 text-fg-muted">Not applicable</dt>
                <dd className="font-mono text-14 text-fg-muted">{ASVS_NA}</dd>
              </div>
            </dl>
          </Figure>
        </div>

        <Figure caption="Every check runs in CI or nightly, and the MX record came after them.">
          <ol className="flex flex-col">
            {[
              { title: 'Adversarial suite', detail: '82 tests · every push' },
              { title: 'Parser fuzzing', detail: '14 parsers · Jazzer.js, nightly; a crash becomes a fixture before it is fixed' },
              { title: 'Semgrep at zero', detail: 'Custom rules for every rule a machine can check' },
              { title: 'gitleaks', detail: 'The full history, every push' },
              { title: 'ZAP', detail: 'An authenticated scan, nightly' },
              { title: 'ASVS Level 2', detail: '253 requirements, no open fail' },
            ].map((step, index, all) => (
              <li key={step.title} className="flex flex-col">
                <div className="flex items-start gap-3 rounded-md border border-border bg-surface px-4 py-3">
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 shrink-0">
                    <path d="M3 8.5 L6.5 12 L13 4.5" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: accent }} />
                  </svg>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-14 font-semibold text-fg">{step.title}</span>
                    <span className="text-13 text-fg-muted">{step.detail}</span>
                  </span>
                </div>
                {index < all.length - 1 && <span aria-hidden="true" className="ml-6 h-3 w-px bg-border-field" />}
              </li>
            ))}
            <FlowDown accent={accent} className="h-8" />
            <li className="rounded-md border border-border-field bg-bg px-4 py-3 text-center font-mono text-13 text-fg">
              MX published
            </li>
          </ol>
        </Figure>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- Decisions */

const DECISIONS = [
  {
    title: 'Write every protocol; wrap none',
    why: 'The point is to understand every part. Every daemon, parser and authentication check is written in the repository, in TypeScript.',
  },
  {
    title: 'A stateless edge, everything else at home',
    why: 'A $5 VPS forwards the mail ports home over WireGuard and sends outbound port 25 for it. All state and every key stay at home.',
  },
  {
    title: 'Deliver directly, with a fallback switch',
    why: 'Mail goes straight to the recipient’s server from the edge’s address. Amazon SES can be switched on for one destination, or for everything.',
  },
  {
    title: 'Buckets are real folders',
    why: 'Newsletters, Updates, Receipts, Notifications and Junk are mailboxes, and a message lives in exactly one — so any mail app sees the sorting.',
  },
  {
    title: '250 means it is safe',
    why: 'Acceptance is durable before the reply, and everything after it runs as idempotent stages on a PostgreSQL queue, replayable one by one.',
  },
  {
    title: 'Deleting means forgetting the key',
    why: 'Each stored message is encrypted on its own and named by the hash of its content. Deleting one destroys its key; the master key is escrowed under a passphrase.',
  },
];

function Decisions({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="decisions"
      code={code(6)}
      label="Decisions"
      title={
        <>
          Why it is built <Accent>this way.</Accent>
        </>
      }
      lede="Sixteen decisions are recorded in its plan. These six shape everything else — each trades some convenience for a server you can reason about."
      sunken
    >
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DECISIONS.map((decision, index) => (
          <li key={decision.title} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-6">
            <span className="flex items-center gap-2 font-mono text-12 text-fg-muted">
              <Mark accent={accent} className="size-2" />
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="text-16 font-semibold text-fg">{decision.title}</span>
            <span className="text-14 text-fg-muted">{decision.why}</span>
          </li>
        ))}
      </ul>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- Build */

/** The plan's phases in order, with the day each closed; null while a task in it is still open. */
const PHASES: { name: string; closed: string | null }[] = [
  { name: 'Foundation', closed: null },
  { name: 'The north star: outbound', closed: null },
  { name: 'Inbound core', closed: '26 Sep' },
  { name: 'IMAP and basic webmail', closed: null },
  { name: 'Security gate and go-live', closed: null },
  { name: 'The self-sorting inbox', closed: '29 Sep' },
  { name: 'Transparency', closed: '29 Sep' },
  { name: 'Deliverability and operations', closed: null },
  { name: 'Calendars and contacts', closed: null },
  { name: 'Composer and rules', closed: '29 Sep' },
  { name: 'Data and accounts', closed: '29 Sep' },
  { name: 'Hardening', closed: null },
  { name: 'PGP and S/MIME', closed: '29 Sep' },
  { name: 'Ship', closed: null },
  { name: 'Calm webmail', closed: '29 Sep' },
  { name: 'The finished webmail', closed: '30 Sep' },
  { name: 'Design audit close-out', closed: null },
  { name: 'Phone admin and polish', closed: '2 Oct' },
  { name: 'Its own mark', closed: '2 Oct' },
  { name: 'Native app contract', closed: null },
  { name: 'Accounts, links and push', closed: null },
];

function Build({ accent }: { accent: string }) {
  const closed = PHASES.filter((p) => p.closed !== null).length;
  return (
    <DeepSection
      id="build"
      code={code(7)}
      label="The build"
      title={
        <>
          Planned first, <Accent>then built in phases.</Accent>
        </>
      }
      lede="Postroom was planned before it was written — requirements, tasks and decisions as records — and built phase by phase against them, in the open, under Apache-2.0."
    >
      <Figure
        caption={`The ${PHASES.length} phases. ${closed} are closed; each of the other ${PHASES.length - closed} still holds an open task, most of them steps only an operator can take on real hardware — a device check, a restore drill on a clean machine.`}
      >
        <ol className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-7">
          {PHASES.map((phase, index) => (
            <li key={phase.name} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
              <span className="flex items-center justify-between gap-2">
                <span className="font-mono text-11 text-fg-faint">{String(index).padStart(2, '0')}</span>
                <Mark accent={accent} hollow={phase.closed === null} className="size-2" />
              </span>
              <span className="text-13 text-fg">{phase.name}</span>
              <span className="mt-auto font-mono text-11 text-fg-muted">{phase.closed ? `closed ${phase.closed}` : 'open'}</span>
            </li>
          ))}
        </ol>
      </Figure>
      <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
        <Stat value="204" label="requirements in its plan" />
        <Stat value="231" label="tasks, each with its own test of done" />
        <Stat value="171" label="browser tests against the composed stack" />
        <Stat value="787" label="commits on main, as of 4 October 2026" />
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- Page */

export function PostroomDeepDive({ project }: { project: Project }) {
  const accent = project.accent;
  return (
    <>
      <DeepIndex entries={ENTRIES} accent={accent} />
      <Why accent={accent} />
      <Path accent={accent} />
      <Sorting accent={accent} />
      <Showing accent={accent} />
      <Gate accent={accent} />
      <Decisions accent={accent} />
      <Build accent={accent} />
    </>
  );
}
