import type { CSSProperties, ReactNode } from 'react';
import type { Project } from '../../content/projects';
import { BarRow, DeepIndex, DeepSection, Figure, FlowDown, Stat, type DeepEntry } from '../../components/Deep';
import { Accent, Quiet } from '../../components/Marketing';

/**
 * D3 Auth, explained for somebody deciding whether they want one. It reads
 * like the protocol it speaks: the problem, a sign-in end to end, who may
 * open what, then the machinery underneath — and why it is shaped this way.
 *
 * Every number is a property of the product, traceable to the d3-auth repo:
 * token and session lifetimes (apps/server/src/oidc/provider.ts,
 * session-lifetime.ts, security/trusted-device.ts), the login states and
 * what the screens offer (interaction/machine.ts, console/src/login/), throttling
 * (security/throttle.ts), the secret envelope (security/kek.ts), key rotation
 * (oidc/keys.ts), back-channel delivery (oidc/backchannel.ts), and the
 * security gate (README, test/adversarial/). People, apps and roles drawn
 * here are illustrations, and the captions say so.
 */

const ENTRIES: DeepEntry[] = [
  { id: 'problem', label: 'The problem' },
  { id: 'walkthrough', label: 'Walkthrough' },
  { id: 'signin', label: 'A sign-in' },
  { id: 'access', label: 'Access & roles' },
  { id: 'guard', label: 'The front door' },
  { id: 'revoke', label: 'Taking it back' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'keys', label: 'Keys' },
  { id: 'gate', label: 'Security gate' },
  { id: 'why', label: 'Why this shape' },
];

const code = (n: number) => `OIDC · ${String(n).padStart(2, '0')}`;

/** A small mono label, the site's kicker at drawing size. */
function Tag({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`font-mono text-11 tracking-label text-fg-faint uppercase ${className}`}>{children}</span>;
}

function Dot({ accent, hollow = false, className = 'size-2' }: { accent: string; hollow?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full ${hollow ? 'border-2' : ''} ${className}`}
      style={hollow ? { borderColor: accent } : { backgroundColor: accent }}
    />
  );
}

/* ---------------------------------------------------------------- 01 The problem */

const PEOPLE_Y = [30, 76, 122, 168];
const APPS_Y = [18, 55, 99, 143, 180];

/** Four people, five apps, a password on every line between them. */
function Tangle() {
  return (
    <svg
      viewBox="0 0 300 200"
      className="h-auto w-full"
      role="img"
      aria-label="Four people on the left, five apps on the right, and a separate line from every person to every app: twenty passwords, and five places to take access away."
    >
      {PEOPLE_Y.flatMap((py) =>
        APPS_Y.map((ay) => (
          <g key={`${py}-${ay}`}>
            <line x1="30" y1={py} x2="262" y2={ay} strokeWidth="1" className="stroke-border-field" />
            <circle cx={30 + (262 - 30) * 0.72} cy={py + (ay - py) * 0.72} r="3" strokeWidth="1.2" className="fill-bg stroke-fg-faint" />
          </g>
        )),
      )}
      {PEOPLE_Y.map((y) => (
        <circle key={y} cx="22" cy={y} r="9" className="fill-surface-raised stroke-fg-muted" strokeWidth="1.5" />
      ))}
      {APPS_Y.map((y) => (
        <rect key={y} x="262" y={y - 11} width="22" height="22" rx="5" className="fill-surface stroke-fg-muted" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

/** The same four people and five apps, with one door in between. */
function Hub({ accent }: { accent: string }) {
  return (
    <svg
      viewBox="0 0 300 200"
      className="h-auto w-full"
      role="img"
      aria-label="The same four people and five apps. Every person has one line to a single sign-in in the middle, and it has one line to each app: four sign-ins, one place to take access away."
    >
      {PEOPLE_Y.map((y) => (
        <line key={`p${y}`} x1="30" y1={y} x2="136" y2="99" strokeWidth="1.5" className="stroke-border-field" />
      ))}
      {APPS_Y.map((y) => (
        <line key={`a${y}`} x1="164" y1="99" x2="262" y2={y} strokeWidth="1.5" style={{ stroke: accent }} />
      ))}
      {PEOPLE_Y.map((y) => (
        <circle key={y} cx="22" cy={y} r="9" className="fill-surface-raised stroke-fg-muted" strokeWidth="1.5" />
      ))}
      {APPS_Y.map((y) => (
        <rect key={y} x="262" y={y - 11} width="22" height="22" rx="5" className="fill-surface stroke-fg-muted" strokeWidth="1.5" />
      ))}
      <circle cx="150" cy="99" r="22" className="fill-bg" strokeWidth="2.5" style={{ stroke: accent }} />
      {/* The keyhole, the product's own mark. */}
      <circle cx="150" cy="94" r="5" className="fill-fg" />
      <path d="M147 97 L145 108 H155 L153 97 Z" className="fill-fg" />
    </svg>
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
          Every app you host has its own front door. <Accent>None of them talk.</Accent>
        </>
      }
      lede="Photos, documents, notes, a recipe box: each self-hosted app ships its own accounts. Everyone in your household ends up with a password per app, and when somebody should lose access, you go app by app hoping you remembered them all. D3 Auth puts one sign-in in front of all of them, and one place to say who gets in."
    >
      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        <Figure caption="Without it: every person has an account in every app. Each small ring is a password somebody has to keep.">
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
            <div className="flex justify-between">
              <Tag>4 people</Tag>
              <Tag>5 apps</Tag>
            </div>
            <Tangle />
            <div className="grid grid-cols-2 gap-6 border-t border-border pt-5">
              <Stat value="20" label="passwords to keep" />
              <Stat value="5" label="places to take somebody’s access away" />
            </div>
          </div>
        </Figure>
        <Figure caption="With it: each person signs in once, and every app asks the same place. An illustration — four people and five apps, not a limit.">
          <div className="flex flex-col gap-4 rounded-lg border border-border-field bg-surface p-5">
            <div className="flex justify-between">
              <Tag>4 people</Tag>
              <Tag>one sign-in</Tag>
              <Tag>5 apps</Tag>
            </div>
            <Hub accent={accent} />
            <div className="grid grid-cols-2 gap-6 border-t border-border pt-5">
              <Stat value="4" label="sign-ins, with passkeys if you like" />
              <Stat value="1" label="place to grant, change or revoke access" />
            </div>
          </div>
        </Figure>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 02 Walkthrough */

function MiniScreen({ children }: { children: ReactNode }) {
  return (
    <div aria-hidden="true" className="mt-auto flex flex-col gap-2 rounded-md border border-border bg-bg p-4 text-12">
      <span className="flex gap-1 pb-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1.5 rounded-full bg-border-field" />
        ))}
      </span>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="text-11 text-fg-faint">{label}</span>
      <span className="rounded-sm border border-border-field px-2 py-1.5 font-mono text-fg">{value}</span>
    </span>
  );
}

function Button({ children, accent, quiet = false }: { children: ReactNode; accent?: string; quiet?: boolean }) {
  return (
    <span
      className={`flex items-center justify-center gap-2 rounded-full px-3 py-1.5 font-semibold ${quiet ? 'border border-border-field text-fg' : 'bg-fg text-bg'}`}
    >
      {accent && <Dot accent={accent} className="size-1.5" />}
      {children}
    </span>
  );
}

function Walkthrough({ accent }: { accent: string }) {
  const steps: { title: string; who: string; body: string; screen: ReactNode }[] = [
    {
      title: 'Claim it',
      who: 'You, once',
      body: 'Start the container. The log prints a one-time setup code; enter it and the owner account is yours. Nobody else can sign themselves up — ever.',
      screen: (
        <>
          <Field label="Setup code" value="•••• ••••" />
          <Field label="Your email" value="you@home.example" />
          <Button>Claim this server</Button>
        </>
      ),
    },
    {
      title: 'Add an app',
      who: 'You, per app',
      body: 'Pick an app it already knows, like Immich, and give its address — or paste a short manifest that names your app’s roles. It then shows exactly what to paste into the app.',
      screen: (
        <>
          <span className="flex items-center justify-between rounded-sm bg-surface-raised px-2 py-1.5 text-fg">
            Immich <Quiet>preset</Quiet>
          </span>
          <span className="flex items-center justify-between rounded-sm px-2 py-1.5 text-fg">
            Your own app <Quiet>manifest</Quiet>
          </span>
          <span className="flex items-center justify-between border-t border-border pt-2 font-mono text-11 text-fg-muted">
            id_token_signed_response_alg <span className="text-fg">ES256</span>
          </span>
        </>
      ),
    },
    {
      title: 'Give access',
      who: 'You, per person',
      body: 'Choose a person, an app and their roles in it. Or give a group access, and everyone in it has it — or put it in the invite, so they arrive already holding it. Until you do, that person cannot sign in to that app at all.',
      screen: (
        <>
          <span className="text-fg">Sam → Photos</span>
          <span className="flex gap-2">
            <span className="rounded-full border border-border-field px-2 py-0.5 text-fg-muted">admin</span>
            <span className="flex items-center gap-1.5 rounded-full bg-surface-raised px-2 py-0.5 text-fg">
              <Dot accent={accent} className="size-1.5" />
              member
            </span>
          </span>
          <Button>Give access</Button>
        </>
      ),
    },
    {
      title: 'Sign in',
      who: 'Them, anywhere',
      body: 'In the app, a second button sits beside its own login. One tap, a password — then a passkey or a code, if they have one — and they are back in the app — with the roles you picked.',
      screen: (
        <>
          <Field label="Password" value="••••••••" />
          <span className="text-center text-11 text-fg-faint">or</span>
          <Button quiet accent={accent}>
            Sign in with D3 Auth
          </Button>
        </>
      ),
    },
  ];
  return (
    <DeepSection
      id="walkthrough"
      code={code(2)}
      label="A walkthrough"
      title={
        <>
          From an empty server to a signed-in app, <Accent>in four moves.</Accent>
        </>
      }
      lede="Three are yours and happen once. The fourth is everyone else’s, and happens every day without you."
      sunken
    >
      <div className="relative">
        <span aria-hidden="true" className="absolute top-5 right-10 left-10 hidden h-px bg-border-field lg:block">
          <span className="flow-x absolute -top-0.75 size-2 rounded-full" style={{ backgroundColor: accent }} />
        </span>
        <ol className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {steps.map((step, index) => (
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
                <Tag>{step.who}</Tag>
              </div>
              <p className="text-14 text-fg-muted">{step.body}</p>
              <MiniScreen>{step.screen}</MiniScreen>
            </li>
          ))}
        </ol>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 03 A sign-in */

type Lane = 0 | 1 | 2;
const LANES = ['You', 'Your app', 'D3 Auth'];
const laneX = (lane: Lane) => (lane * 2 + 1) * (100 / 6);

interface Message {
  from: Lane;
  to: Lane;
  label: ReactNode;
  detail?: string;
}

const MESSAGES: Message[] = [
  { from: 0, to: 1, label: 'You tap Sign in with D3 Auth' },
  {
    from: 1,
    to: 2,
    label: 'The app sends you over, with a sealed challenge',
    detail: 'PKCE (S256), plus state and nonce. The app keeps the secret half.',
  },
  {
    from: 2,
    to: 0,
    label: 'Who are you?',
    detail: 'A password, then a passkey or an authenticator code on any account that has one — every admin must. A browser you said to trust skips that second step.',
  },
  {
    from: 2,
    to: 2,
    label: 'May you open this app?',
    detail: 'No grant, no sign-in: refused here, before any consent screen, and written to the audit trail.',
  },
  { from: 2, to: 1, label: 'You come back with a one-time code', detail: 'Short-lived, single-use, useless without the secret half.' },
  {
    from: 1,
    to: 2,
    label: 'The app trades the code, server to server',
    detail: 'With the PKCE verifier and its own client secret. A stolen code alone buys nothing.',
  },
  {
    from: 2,
    to: 1,
    label: 'Tokens: who you are, and your roles here',
    detail: 'An ID token signed ES256, and a short access token.',
  },
  { from: 1, to: 0, label: 'You are in', detail: 'The app starts its own session. From here on it is the app’s to keep.' },
];

function Arrowhead({ accent, left }: { accent: string; left: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className={`absolute -top-1 ${left ? '-left-px' : '-right-px'}`}>
      <path
        d={left ? 'M8 1 L2 5 L8 9' : 'M2 1 L8 5 L2 9'}
        fill="none"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ stroke: accent }}
      />
    </svg>
  );
}

function Sequence({ accent }: { accent: string }) {
  return (
    <div className="relative">
      {/* Lane lines behind everything. */}
      {LANES.map((lane, i) => (
        <span
          key={lane}
          aria-hidden="true"
          className="absolute top-12 bottom-0 w-px bg-border"
          style={{ left: `${laneX(i as Lane)}%` }}
        />
      ))}
      <div aria-hidden="true" className="relative grid grid-cols-3 gap-2 pb-4">
        {LANES.map((lane, i) => (
          <span
            key={lane}
            className={`flex min-h-9 items-center justify-center rounded-full border px-2 text-center text-13 font-semibold text-fg ${i === 2 ? 'border-border-field bg-surface-raised' : 'border-border bg-surface'}`}
          >
            {lane}
          </span>
        ))}
      </div>
      <ol className="relative flex flex-col gap-3">
        {MESSAGES.map((m, index) => {
          const self = m.from === m.to;
          const a = laneX(m.from);
          const b = laneX(m.to);
          const style: CSSProperties = { left: `${Math.min(a, b)}%`, width: `${Math.abs(b - a)}%` };
          return (
            <li key={index} className="flex flex-col gap-2">
              <div aria-hidden="true" className="relative h-5">
                {self ? (
                  <span
                    className="absolute top-0 flex h-5 -translate-x-1/2 items-center gap-1.5 rounded-full border bg-bg px-2 font-mono text-11 text-fg"
                    style={{ left: `${a}%`, borderColor: accent }}
                  >
                    <Dot accent={accent} className="size-1.5" />
                    check
                  </span>
                ) : (
                  <span className="absolute top-2.5 h-0.5 rounded-full" style={{ ...style, backgroundColor: accent }}>
                    <Arrowhead accent={accent} left={b < a} />
                  </span>
                )}
              </div>
              <div className="relative flex gap-3 rounded-md border border-border bg-surface px-4 py-3">
                <span className="font-mono text-12 text-fg-faint">{String(index + 1).padStart(2, '0')}</span>
                <span className="flex flex-col gap-1">
                  <span className="text-14 text-fg">
                    <span className="sr-only">
                      {LANES[m.from]} to {LANES[m.to]}:{' '}
                    </span>
                    {m.label}
                  </span>
                  {m.detail && <span className="text-13 text-fg-muted">{m.detail}</span>}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function SignIn({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="signin"
      code={code(3)}
      label="One sign-in, end to end"
      title={
        <>
          The standard dance, <Accent>with no shortcuts allowed.</Accent>
        </>
      }
      lede="Under the button is plain OpenID Connect — the authorization code flow with PKCE, the only flow it offers. That is why apps you did not write can use it: anything that speaks OIDC already knows these steps."
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Figure caption="Eight messages between three parties. Your password or passkey only ever reaches D3 Auth — the app never sees it.">
          <Sequence accent={accent} />
        </Figure>
        <div className="flex flex-col gap-8 lg:pt-16">
          <Stat value="1" label="flow: authorization code with PKCE. No implicit flow, no password grant." />
          <Stat value="S256" label="the only PKCE method; plain challenges do not exist here" />
          <Stat value="ES256" label="ID tokens are signed with it, and alg=none is never accepted" />
          <p className="text-14 text-fg-muted">
            Redirect addresses are matched exactly — no wildcards — so a sign-in can only ever return to an address you
            registered.
          </p>
        </div>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 04 Access & roles */

const APPS = ['Photos', 'Docs', 'Recipes', 'Budget'];

type Grant = { roles: string[]; via: 'direct' | 'group' | 'both' } | null;

const GRID: { person: string; note: string; grants: Grant[] }[] = [
  {
    person: 'Alex',
    note: 'owner',
    grants: [
      { roles: ['admin'], via: 'direct' },
      { roles: ['admin'], via: 'direct' },
      { roles: ['member'], via: 'group' },
      { roles: ['admin'], via: 'direct' },
    ],
  },
  {
    person: 'Sam',
    note: 'family',
    grants: [
      { roles: ['member'], via: 'group' },
      null,
      { roles: ['admin', 'member'], via: 'both' },
      { roles: ['member'], via: 'direct' },
    ],
  },
  {
    person: 'Jordan',
    note: 'family',
    grants: [{ roles: ['member'], via: 'group' }, null, { roles: ['member'], via: 'group' }, null],
  },
  {
    person: 'Riley',
    note: 'guest',
    grants: [{ roles: ['viewer'], via: 'direct' }, null, null, null],
  },
];

function GrantCell({ grant, accent }: { grant: Grant; accent: string }) {
  if (!grant) {
    return (
      <span className="flex h-full min-h-14 items-center justify-center rounded-sm border border-dashed border-border font-mono text-11 text-fg-faint">
        <span aria-hidden="true">✕</span>
        <span className="sr-only">refused</span>
      </span>
    );
  }
  return (
    <span className="flex h-full min-h-14 flex-col items-center justify-center gap-1 rounded-sm border border-border-field bg-surface px-1 py-2">
      <Dot accent={accent} hollow={grant.via === 'group'} />
      {grant.roles.map((role) => (
        <span key={role} className="font-mono text-11 text-fg">
          {role}
        </span>
      ))}
      <span className="sr-only">{grant.via === 'direct' ? ', given directly' : grant.via === 'group' ? ', through a group' : ', directly and through a group'}</span>
    </span>
  );
}

function GrantGrid({ accent }: { accent: string }) {
  return (
    <table className="w-full table-fixed border-separate border-spacing-1">
      <caption className="sr-only">Who can sign in to which app, and with which roles. An illustration.</caption>
      <thead>
        <tr>
          <th scope="col" className="w-16 sm:w-24">
            <span className="sr-only">Person</span>
          </th>
          {APPS.map((app) => (
            <th key={app} scope="col" className="pb-2 text-center text-12 font-semibold text-fg sm:text-13">
              {app}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {GRID.map((row) => (
          <tr key={row.person}>
            <th scope="row" className="pr-1 text-left align-middle">
              <span className="flex flex-col">
                <span className="text-13 font-semibold text-fg">{row.person}</span>
                <span className="font-mono text-11 text-fg-faint">{row.note}</span>
              </span>
            </th>
            {row.grants.map((grant, i) => (
              <td key={APPS[i]} className="h-full p-0 align-middle">
                <GrantCell grant={grant} accent={accent} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TokenLine({ k, v, lit, accent }: { k: string; v: string; lit?: boolean; accent: string }) {
  return (
    <span className={`flex gap-2 rounded-xs px-2 py-0.5 ${lit ? 'bg-surface-raised text-fg' : 'text-fg-muted'}`}>
      <span aria-hidden="true" className="w-0.5 shrink-0 rounded-full" style={lit ? { backgroundColor: accent } : undefined} />
      <span className="min-w-0 break-all">
        <span className="text-fg-faint">&quot;{k}&quot;: </span>
        {v}
      </span>
    </span>
  );
}

function Token({ app, roles, accent }: { app: string; roles: string; accent: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <Tag>ID token · to {app}</Tag>
      <code className="flex flex-col font-mono text-12">
        <TokenLine k="iss" v='"https://auth.example.home"' accent={accent} />
        <TokenLine k="sub" v='"u_7Hq2…"' accent={accent} />
        <TokenLine k="aud" v={`"${app.toLowerCase()}"`} accent={accent} />
        <TokenLine k="amr" v='["pwd", "hwk"]' accent={accent} />
        <TokenLine k="roles" v={roles} lit accent={accent} />
      </code>
    </div>
  );
}

function Access({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="access"
      code={code(4)}
      label="Who may open what"
      title={
        <>
          Nobody gets in by default. <Accent>Each app learns only its own roles.</Accent>
        </>
      }
      lede="Access is a grant: one person, one app, and that app’s roles. Grants can come directly or through a group, and they add up. An empty cell is not a missing setting — it is a refusal, before the person ever sees the app."
      sunken
    >
      <div className="grid gap-14 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Figure
          caption={
            <>
              Four people, four apps — an illustration. A filled dot is a grant given directly, a ring is one that comes
              through a group, and ✕ is refused. Sam holds <span className="text-fg">admin</span> directly and{' '}
              <span className="text-fg">member</span> through the family group, so Sam has both.
            </>
          }
        >
          <GrantGrid accent={accent} />
        </Figure>
        <Figure caption="The same person signing in to two apps. The subject is the same; the roles are each app’s own. Neither token says Sam has anything in Docs, Budget or the other app — and groups never appear in a token at all.">
          <div className="flex flex-col gap-4">
            <Token app="Photos" roles='["member"]' accent={accent} />
            <Token app="Recipes" roles='["admin", "member"]' accent={accent} />
          </div>
        </Figure>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 05 The front door */

const STATES: { name: string; detail: string }[] = [
  { name: 'Email', detail: 'An unknown address and a suspended one get the same answer, in the same time.' },
  { name: 'Password', detail: 'Argon2id, with a secret pepper, checked against a list of breached passwords when set.' },
  { name: 'Second factor', detail: 'An authenticator code — a used code is refused if replayed — or a passkey.' },
  { name: 'Trust this browser?', detail: 'Say yes and this browser skips the factor step for 30 days.' },
  { name: 'Signed in', detail: 'The only state that can finish a sign-in. There is no half-signed-in flag to flip.' },
];

function StateMachine({ accent }: { accent: string }) {
  return (
    <div className="flex flex-col gap-4">
      <ol className="grid gap-2 lg:grid-cols-5">
        {STATES.map((state, i) => {
          const last = i === STATES.length - 1;
          return (
            <li key={state.name} className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-2">
              <div
                className={`flex flex-1 flex-col gap-1.5 rounded-lg border p-4 ${last ? 'border-border-field bg-surface-raised' : 'border-border bg-surface'}`}
                style={last ? { borderTopColor: accent, borderTopWidth: 3 } : undefined}
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-11 text-fg-faint">{i + 1}</span>
                  <span className="text-14 font-semibold text-fg">{state.name}</span>
                </span>
                <span className="text-13 text-fg-muted">{state.detail}</span>
              </div>
              {!last && (
                <span aria-hidden="true" className="flex items-center justify-center font-mono text-14 text-fg-faint">
                  <span className="lg:hidden">↓</span>
                  <span className="hidden lg:inline">→</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="flex items-start gap-3 rounded-lg border border-dashed border-border-field px-4 py-3 text-13 text-fg-muted">
        <Dot accent={accent} className="mt-1 size-2" />
        <span>
          <span className="text-fg">Next:</span> a passkey on the first screen, straight from 1 to 5 — nothing to type,
          nothing to phish. The state machine already has that path; the sign-in screen does not offer it yet.
        </span>
      </p>
    </div>
  );
}

/** Account throttle: 4 free attempts, then 2s doubling, capped at 10 minutes. */
const THROTTLE = Array.from({ length: 14 }, (_, i) => {
  const failures = i + 1;
  const over = failures - 4;
  return { failures, seconds: over <= 0 ? 0 : Math.min(2 * 2 ** (over - 1), 600) };
});

const fmtDelay = (s: number) => (s === 0 ? '0' : s < 60 ? `${s}s` : `${Math.round(s / 60)}m`);

function ThrottleChart({ accent }: { accent: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div
        role="img"
        aria-label="Wait after each failed sign-in: none for the first four, then 2, 4, 8, 16, 32 seconds, doubling, until it stops at 10 minutes from the fourteenth."
        className="relative flex h-40 items-end gap-1"
      >
        <span aria-hidden="true" className="absolute top-0 right-0 left-0 border-t border-dashed border-fg-faint" />
        <span aria-hidden="true" className="absolute -top-5 right-0 font-mono text-11 text-fg-faint">
          10 min cap
        </span>
        {THROTTLE.map((t) => (
          <span key={t.failures} aria-hidden="true" className="flex h-full flex-1 flex-col justify-end">
            {t.seconds === 0 ? (
              <span className="block h-1 rounded-xs bg-border-field" />
            ) : (
              <span className="bar block rounded-t-xs" style={{ height: `${(t.seconds / 600) * 100}%`, minHeight: 4, backgroundColor: accent }} />
            )}
          </span>
        ))}
      </div>
      <div aria-hidden="true" className="flex gap-1">
        {THROTTLE.map((t) => (
          <span key={t.failures} className="flex flex-1 flex-col items-center gap-0.5 font-mono text-11">
            <span className="text-fg-muted">{t.failures}</span>
            <span className="hidden text-fg-faint sm:block">{fmtDelay(t.seconds)}</span>
          </span>
        ))}
      </div>
      <p className="font-mono text-11 text-fg-faint">failed attempts in a row →</p>
    </div>
  );
}

const LAYERS = [
  'Invite-only: an account exists because you made it',
  'Passkeys and authenticator codes, on any account',
  'Recent proof — within five minutes — before adding a passkey, removing a factor or signing other devices out',
  'Throttled before any hashing work: per account, and per address (20 free)',
  'A host-only recovery command for the day the only admin loses their phone',
];

function Guard({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="guard"
      code={code(5)}
      label="The front door"
      title={
        <>
          One door, so it can afford <Accent>a very good lock.</Accent>
        </>
      }
      lede="When every app shares one sign-in, that sign-in is worth hardening properly — and it only has to be done once. The login itself is a strict sequence of states: nobody reaches the end by posting to the right address in the wrong order."
    >
      <StateMachine accent={accent} />
      <div className="grid gap-14 lg:grid-cols-2">
        <Figure caption="How long an account waits after each failed sign-in in a row: four free tries, then a delay that doubles from two seconds and stops at ten minutes. Slow, never locked out — so a stranger cannot lock you out by guessing.">
          <div className="pt-6">
            <ThrottleChart accent={accent} />
          </div>
        </Figure>
        <Figure caption="The other layers around the same door.">
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
            {LAYERS.map((layer) => (
              <li key={layer} className="flex items-start gap-3 px-4 py-3 text-14 text-fg">
                <Dot accent={accent} className="mt-1.5 size-2" />
                {layer}
              </li>
            ))}
          </ul>
        </Figure>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 06 Taking it back */

const TRIGGERS = ['You sign out', 'An account is suspended', 'A password is reset', 'Access is changed or removed'];

function FanOut({ accent }: { accent: string }) {
  const apps = [
    { name: 'Photos', state: 'Session ended', ok: true },
    { name: 'Recipes', state: 'Session ended', ok: true },
    { name: 'Budget', state: 'Down — 3 tries, then marked slow', ok: false },
  ];
  return (
    <div
      role="img"
      aria-label="Any of four events — signing out, a suspension, a password reset, or access being changed — makes D3 Auth post a signed logout message to every app involved. Two apps end the session at once. A third is down: it is tried three times, then recorded as a slow revoke."
      className="flex flex-col"
    >
      <div aria-hidden="true" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TRIGGERS.map((t) => (
          <span key={t} className="rounded-md border border-border bg-surface px-3 py-2 text-center text-13 text-fg">
            {t}
          </span>
        ))}
      </div>
      <FlowDown accent={accent} />
      <div
        aria-hidden="true"
        className="mx-auto flex flex-col items-center gap-1 rounded-lg border border-border-field bg-surface-raised px-6 py-3 text-center"
      >
        <span className="text-14 font-semibold text-fg">D3 Auth</span>
        <span className="text-13 text-fg-muted">revokes the tokens, then tells each app</span>
      </div>
      <svg viewBox="0 0 300 40" preserveAspectRatio="none" className="h-10 w-full" aria-hidden="true">
        {[50, 150, 250].map((x, i) => (
          <path
            key={x}
            d={`M150 0 C150 22 ${x} 18 ${x} 40`}
            fill="none"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            strokeDasharray={i === 2 ? '3 4' : undefined}
            className={i === 2 ? 'stroke-fg-faint' : undefined}
            style={i === 2 ? undefined : { stroke: accent }}
          />
        ))}
      </svg>
      <div aria-hidden="true" className="grid grid-cols-3 gap-2">
        {apps.map((app) => (
          <span
            key={app.name}
            className={`flex flex-col items-center gap-1.5 rounded-md border px-2 py-3 text-center ${app.ok ? 'border-border bg-surface' : 'border-dashed border-border-field'}`}
          >
            <span className="text-13 font-semibold text-fg">{app.name}</span>
            {app.ok ? (
              <Dot accent={accent} />
            ) : (
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="size-2 rounded-full border border-fg-faint" />
                ))}
              </span>
            )}
            <span className="text-11 text-fg-muted">{app.state}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

const MIN = 60;
const DAY = 24 * 60 * 60;
const LIFETIMES = [
  { label: 'Access token', seconds: 10 * MIN, value: '10 min', note: 'The shortest-lived thing an app holds.' },
  { label: 'ID token', seconds: 60 * MIN, value: '1 h', note: 'Who you are, at the moment you signed in.' },
  { label: 'Trusted browser', seconds: 30 * DAY, value: '30 d', note: 'Skips the second factor on that browser only. Adjustable.' },
  { label: 'Idle session', seconds: 30 * DAY, value: '30 d', note: 'A browser unused this long is signed out. Adjustable.' },
  { label: 'Refresh token', seconds: 30 * DAY, value: '30 d', note: 'Absolute: a renewed token inherits what is left, never a fresh 30.' },
  { label: 'Any session', seconds: 90 * DAY, value: '90 d', note: 'After this, you prove who you are again, however active you have been.' },
];

function Revoke({ accent }: { accent: string }) {
  const max = Math.log(90 * DAY);
  return (
    <DeepSection
      id="revoke"
      code={code(6)}
      label="Taking it back"
      title={
        <>
          Revoke once, <Accent>and every app hears it.</Accent>
        </>
      }
      lede="Removing access in one console is worthless if an app keeps the person signed in until some token happens to expire. So the tokens that carried the access are revoked, and each app involved is sent a signed logout message to end its own session."
      sunken
    >
      <div className="grid gap-14 lg:grid-cols-2">
        <Figure caption="Back-channel logout. Delivery is tried three times over about a second; an app that does not answer is recorded as a slow revoke — the person is still signed out of D3 Auth, and the app finds out when it next asks for a token.">
          <FanOut accent={accent} />
        </Figure>
        <Figure caption="How long each thing lasts, on a log scale — the built-in defaults. Short-lived tokens are why a revoke bites quickly even in an app that ignores the logout message.">
          <div className="flex flex-col gap-5">
            {LIFETIMES.map((l) => (
              <BarRow
                key={l.label}
                label={l.label}
                value={l.value}
                fraction={Math.log(l.seconds) / max}
                accent={accent}
                muted={l.seconds > DAY}
                note={l.note}
              />
            ))}
          </div>
        </Figure>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 07 Architecture */

function Box({
  title,
  kicker,
  children,
  accent,
  strong = false,
  dashed = false,
}: {
  title: string;
  kicker?: string;
  children?: ReactNode;
  accent?: string;
  strong?: boolean;
  dashed?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1.5 rounded-lg border p-4 ${dashed ? 'border-dashed border-border-field' : 'bg-surface'} ${strong ? 'border-border-field' : dashed ? '' : 'border-border'}`}
      style={accent ? { borderTopColor: accent, borderTopWidth: 3 } : undefined}
    >
      {kicker && <Tag>{kicker}</Tag>}
      <span className="text-14 font-semibold text-fg">{title}</span>
      {children && <span className="text-13 text-fg-muted">{children}</span>}
    </div>
  );
}

const DRILL = [
  { title: 'Bundle', body: 'Every night: the database, its state and the public keys, each file hashed in a manifest.' },
  { title: 'Offsite', body: 'Sent to an S3 bucket, encrypted there too — or to a disk you can carry.' },
  { title: 'Restore', body: 'The drill pulls last night’s bundle into a throwaway database.' },
  { title: 'Unseal', body: 'Opens the sealed keys with your KEK, which never travels with a backup.' },
  { title: 'Boot', body: 'Starts a second copy of the service against it, and checks it answers.' },
];

function Architecture({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="architecture"
      code={code(7)}
      label="Architecture"
      title={
        <>
          One small service, <Accent>one database.</Accent>
        </>
      }
      lede="A single Node container and PostgreSQL, on a machine you already run. It opens no ports of its own: it answers only through the tunnel or reverse proxy you put in front of it."
    >
      <div
        role="img"
        aria-label="Architecture. You in a browser or on a phone, and your apps, reach D3 Auth over HTTPS through a tunnel or reverse proxy. One Node 22 service holds the OpenID Connect provider, the sign-in screens, the console and account pages, and the jobs that send logout messages, alerts and backups. It keeps everything in PostgreSQL 16. Outside it: an email relay for invites and alerts, an offsite bucket for backups, and a probe elsewhere that emails you if the service stops answering."
        className="flex flex-col"
      >
        <div aria-hidden="true" className="grid gap-3 sm:grid-cols-2">
          <Box kicker="You" title="A browser or a phone">
            Sign-in screens built phone-first; the console works on both
          </Box>
          <Box kicker="Your apps" title="Anything that speaks OIDC">
            Immich from a preset, or your own app — with TypeScript (on npm) and Python client libraries
          </Box>
        </div>
        <FlowDown accent={accent} />
        <div
          aria-hidden="true"
          className="rounded-full border border-dashed border-border-field px-5 py-2.5 text-center text-13 text-fg-muted"
        >
          HTTPS · a tunnel or reverse proxy · <span className="text-fg">no ports on the host</span>
        </div>
        <FlowDown accent={accent} />
        <div aria-hidden="true" className="flex flex-col gap-3 rounded-lg border border-border-field bg-bg-sunken p-4">
          <Tag className="px-1">D3 Auth · Node 22 · one container</Tag>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Box title="OpenID provider" accent={accent}>
              Discovery, authorize, token and keys, on the widely used oidc-provider library
            </Box>
            <Box title="Sign-in" accent={accent}>
              The state machine, passkeys, codes, throttling
            </Box>
            <Box title="Console" accent={accent}>
              People, groups, apps, sessions, the audit trail, keys, settings
            </Box>
            <Box title="Jobs" accent={accent}>
              Logout messages, alert rules, the nightly backup
            </Box>
          </div>
        </div>
        <FlowDown accent={accent} />
        <div aria-hidden="true" className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Box kicker="State" title="PostgreSQL 16" strong>
            People, grants, sessions and tokens, and an audit row for every change and every sign-in. Secrets inside are
            sealed.
          </Box>
          <div className="grid gap-3 sm:grid-cols-3">
            <Box dashed kicker="Out" title="Email">
              Invites, resets and alerts, over SMTP or a relay
            </Box>
            <Box dashed kicker="Out" title="Offsite">
              The encrypted nightly bundle
            </Box>
            <Box dashed kicker="In" title="A watcher">
              Checks /readyz from elsewhere, so a dead host still gets you an email
            </Box>
          </div>
        </div>
      </div>

      <Figure caption="The restore drill. A backup nobody has restored is a hope, so a job restores one and boots it. Alert rules read the audit trail and email you if a backup fails or is more than a day and a half old.">
        <ol className="grid gap-2 sm:grid-cols-5">
          {DRILL.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="flex size-6 items-center justify-center rounded-full border-2 bg-bg font-mono text-11 text-fg"
                  style={{ borderColor: accent }}
                >
                  {i + 1}
                </span>
                <span className="text-14 font-semibold text-fg">{step.title}</span>
              </span>
              <span className="text-13 text-fg-muted">{step.body}</span>
            </li>
          ))}
        </ol>
      </Figure>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 08 Keys */

/** The sealed-secret envelope, in bytes; the ciphertext's length is illustrative. */
const ENVELOPE = [
  { label: 'version', bytes: 1 },
  { label: 'key id', bytes: 4 },
  { label: 'IV', bytes: 12 },
  { label: 'tag', bytes: 16 },
  { label: 'ciphertext', bytes: 32, open: true },
];

function Envelope({ accent }: { accent: string }) {
  const total = ENVELOPE.reduce((sum, p) => sum + p.bytes, 0);
  return (
    <div className="flex flex-col gap-3">
      <div
        role="img"
        aria-label="A sealed secret as stored: 1 byte of version, 4 bytes naming which KEK sealed it, a 12-byte IV, a 16-byte authentication tag, then the ciphertext."
        className="flex h-12 overflow-hidden rounded-md border border-border-field"
      >
        {ENVELOPE.map((part, i) => (
          <span
            key={part.label}
            aria-hidden="true"
            className={`h-full ${i > 0 ? 'border-l-2 border-bg' : ''} ${part.open ? 'bg-surface-raised' : ''}`}
            style={{
              width: `${(part.bytes / total) * 100}%`,
              ...(part.open ? {} : { backgroundColor: accent, opacity: 0.45 + i * 0.15 }),
            }}
          />
        ))}
      </div>
      <dl aria-hidden="true" className="grid grid-cols-3 gap-x-4 gap-y-2 sm:grid-cols-5">
        {ENVELOPE.map((part) => (
          <div key={part.label} className="flex flex-col">
            <dt className="text-13 text-fg">{part.label}</dt>
            <dd className="font-mono text-11 text-fg-faint">{part.open ? 'the secret' : `${part.bytes} B`}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const KEY_STATES = [
  { name: 'next', body: 'Published, signs nothing. Apps fetch it before they ever see it.' },
  { name: 'current', body: 'Signs every new token.' },
  { name: 'retiring', body: 'Signs nothing, still verifies tokens already out there.' },
  { name: 'retired', body: 'Gone from the published key set.' },
];

function Keys({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="keys"
      code={code(8)}
      label="Keys and secrets"
      title={
        <>
          One key you keep. <Accent>Everything else sealed under it.</Accent>
        </>
      }
      lede="You generate a key-encryption key once and put it in your password manager. It seals the secrets that matter at rest — the private signing keys and every authenticator secret — and no backup ever contains it. Whoever steals a backup gets ciphertext."
      sunken
    >
      <div className="grid gap-14 lg:grid-cols-2">
        <Figure caption="How a sealed secret is stored: AES-256-GCM, with a key id that says which KEK sealed it without revealing anything about the key. The row it belongs to is bound in too, so a value copied into another row will not open.">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-2">
              <span className="flex items-center gap-3 rounded-full border-2 bg-surface px-5 py-2 text-14 font-semibold text-fg" style={{ borderColor: accent }}>
                KEK
                <Quiet>in your password manager</Quiet>
              </span>
              <span aria-hidden="true" className="h-6 w-px bg-border-field" />
              <div className="grid w-full grid-cols-2 gap-2">
                <Box title="Signing keys" accent={accent}>
                  The private halves
                </Box>
                <Box title="Authenticator secrets" accent={accent}>
                  Every TOTP seed
                </Box>
              </div>
            </div>
            <Envelope accent={accent} />
            <p className="text-13 text-fg-muted">
              Passwords are not sealed but hashed — Argon2id with a pepper. Client secrets are hashed too, and shown once.
            </p>
          </div>
        </Figure>
        <Figure caption="Signing keys rotate through four states and two waits. Each wait is at least two hours: an hour an app may cache the key set, plus the ID token’s hour — so no real token ever meets a key its app cannot find.">
          <ol className="relative flex flex-col gap-0">
            <span aria-hidden="true" className="absolute top-3 bottom-3 left-2 w-px bg-border-field" />
            {KEY_STATES.map((state, i) => (
              <li key={state.name} className="relative flex gap-4 pb-6 last:pb-0">
                <span
                  aria-hidden="true"
                  className={`relative z-10 mt-1 size-4 shrink-0 rounded-full border-2 ${i === 1 ? '' : 'border-fg-faint bg-bg'}`}
                  style={i === 1 ? { backgroundColor: accent, borderColor: accent } : undefined}
                />
                <span className="flex flex-col gap-1">
                  <span className="font-mono text-14 text-fg">{state.name}</span>
                  <span className="text-13 text-fg-muted">{state.body}</span>
                  {(i === 0 || i === 1) && (
                    <span className="font-mono text-11 text-fg-faint">wait ≥ 2 h before the next step</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </Figure>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 09 Security gate */

const CONFORMANCE = ['Basic', 'Config', 'RP-Initiated Logout', 'Back-Channel Logout'];
const CLASSES = [
  { name: 'Bending the protocol', body: 'Stolen codes, PKCE downgrades, mutated redirects, stolen refresh tokens.' },
  { name: 'Skipping the sign-in', body: 'Steps out of order, replayed codes, timing an account that exists.' },
  { name: 'Reaching what you were not given', body: 'Every console and account route, hit without a session, as a guest, from another site.' },
  { name: 'Becoming more powerful', body: 'Every door that could turn an account into an admin.' },
  { name: 'A session left open', body: 'Planting your own passkey on somebody else’s signed-in browser.' },
];
const DEFECTS = 19;
const HIGH = 4;

function Gate({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="gate"
      code={code(9)}
      label="The security gate"
      title={
        <>
          Attacked on purpose <Accent>before anyone relied on it.</Accent>
        </>
      }
      lede="An identity provider is the one piece where a bug opens every app at once. So it had to pass a gate before it was published, and most of that gate runs again on every change."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
          <Stat value="4" label="OpenID conformance plans, run in CI on every push" />
          <ul className="flex flex-col gap-1.5">
            {CONFORMANCE.map((plan) => (
              <li key={plan} className="flex items-center gap-2 text-13 text-fg">
                <Dot accent={accent} className="size-1.5" />
                {plan}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
          <Stat value="74" label="attacks in an adversarial suite, in five classes, when it was published" />
          <span className="text-13 text-fg-muted">
            Plus cases against the client libraries and login forgery. Routes added since are walked too, with unsigned,
            self-signed and borrowed tokens.
          </span>
        </div>
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
          <Stat value="L2" label="OWASP ASVS 5.0 self-assessment, with no open failure" />
          <span className="text-13 text-fg-muted">Four chapters: authentication, sessions, tokens, and OAuth and OIDC.</span>
        </div>
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
          <Stat value="0" label="Semgrep findings, custom rules included" />
          <span className="text-13 text-fg-muted">And a nightly authenticated ZAP scan with no High.</span>
        </div>
      </div>

      <div className="grid gap-14 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Figure caption="The five classes of attack the suite throws at a running instance. A route added later without a guard fails the suite without anybody remembering to test it.">
          <ol className="flex flex-col divide-y divide-border">
            {CLASSES.map((c, i) => (
              <li key={c.name} className="flex gap-4 py-3">
                <span className="font-mono text-12 text-fg-faint">{i + 1}</span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-14 font-semibold text-fg">{c.name}</span>
                  <span className="text-13 text-fg-muted">{c.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </Figure>
        <Figure caption="What the gate caught: nineteen defects found and fixed before release, four of them High. Conformance plans are run, not certified — no certification is claimed.">
          <div className="flex flex-col gap-4">
            <div role="img" aria-label="Nineteen squares, one per defect the gate found; four are filled, the High ones." className="grid grid-cols-10 gap-1.5">
              {Array.from({ length: DEFECTS }, (_, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className={`aspect-square rounded-xs ${i < HIGH ? '' : 'border border-border-field bg-surface'}`}
                  style={i < HIGH ? { backgroundColor: accent } : undefined}
                />
              ))}
            </div>
            <div className="flex gap-6 text-13 text-fg-muted">
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="size-3 rounded-xs" style={{ backgroundColor: accent }} />
                High · {HIGH}
              </span>
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="size-3 rounded-xs border border-border-field bg-surface" />
                Lower · {DEFECTS - HIGH}
              </span>
            </div>
          </div>
        </Figure>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 10 Why this shape */

function AppLogin({ accent, down }: { accent: string; down: boolean }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 text-12">
      <Tag>{down ? 'D3 Auth is down' : 'A normal day'}</Tag>
      <span className="rounded-sm border border-border-field px-2 py-1.5 text-fg-muted">email</span>
      <span className="rounded-sm border border-border-field px-2 py-1.5 text-fg-muted">password</span>
      <span className="rounded-full bg-fg px-3 py-1.5 text-center font-semibold text-bg">Sign in</span>
      <span
        className={`flex items-center justify-center gap-2 rounded-full border px-3 py-1.5 font-semibold ${down ? 'border-dashed border-border-field text-fg-faint' : 'border-border-field text-fg'}`}
      >
        {!down && <Dot accent={accent} className="size-1.5" />}
        {down ? 'Sign-in unavailable' : 'Sign in with D3 Auth'}
      </span>
    </div>
  );
}

const BENEFITS = [
  {
    title: 'People are matched by who vouched for them',
    body: 'Apps link an account to the issuer and a permanent subject id — never to an email address, which can change hands.',
  },
  {
    title: 'Standard protocol, so it fits apps you did not write',
    body: 'Plain OpenID Connect. Presets turn known apps into a form to copy from; anything else registers from a manifest.',
  },
  {
    title: 'Nothing arrives uninvited',
    body: 'No public signup, no apps registering themselves, no wildcard redirects. People and apps exist because you added them.',
  },
  {
    title: 'It tells nobody it exists',
    body: 'No telemetry, no update check, no phone-home. What it knows stays in your database.',
  },
  {
    title: 'Sized for the people you know',
    body: 'One instance, one owner, one set of people — a household, a workshop, a small team. No tenants to reason about.',
  },
  {
    title: 'It holds identities, not other people’s',
    body: 'No social login. Your accounts are yours, not a mirror of somebody else’s.',
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
          Adopting it is <Accent>never all-or-nothing.</Accent>
        </>
      }
      lede="Every app keeps its own login. D3 Auth is the optional second button: add it to one app, see how it feels, then the next. And if it is ever down, nobody is locked out of everything — sessions already open carry on, and each app’s own login still works."
      sunken
    >
      <div className="grid gap-14 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Figure caption="The same app’s login page, twice. The second button is additive: when the provider is unreachable it says so plainly, and the app’s own login carries on.">
          <div className="grid grid-cols-2 gap-3">
            <AppLogin accent={accent} down={false} />
            <AppLogin accent={accent} down />
          </div>
        </Figure>
        <ul className="grid gap-4 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <li key={b.title} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5">
              <span className="flex items-start gap-2 text-14 font-semibold text-fg">
                <Dot accent={accent} className="mt-1.5 size-2" />
                {b.title}
              </span>
              <span className="text-13 text-fg-muted">{b.body}</span>
            </li>
          ))}
        </ul>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- Page */

export function AuthDeepDive({ project }: { project: Project }) {
  const accent = project.accent;
  return (
    <>
      <DeepIndex entries={ENTRIES} accent={accent} />
      <Problem accent={accent} />
      <Walkthrough accent={accent} />
      <SignIn accent={accent} />
      <Access accent={accent} />
      <Guard accent={accent} />
      <Revoke accent={accent} />
      <Architecture accent={accent} />
      <Keys accent={accent} />
      <Gate accent={accent} />
      <Why accent={accent} />
    </>
  );
}
