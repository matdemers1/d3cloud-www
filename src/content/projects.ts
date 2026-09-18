export interface Screenshot {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Shown shorter than the rest — a watch face beside phones, at its own scale. */
  compact?: boolean;
}

export interface Project {
  /** URL segment: /daypart, /qr */
  slug: string;
  name: string;
  tagline: string;
  /** Longer pitch for the project page. */
  blurb: string;
  status: 'Coming soon' | 'Live';
  /** Where people actually get it. */
  cta?: { label: string; href: string };
  platforms: string[];
  highlights: string[];
  /** One-line summary of what the app collects, echoed on the home card. */
  privacyLine: string;
  /** The product's own colour, shown as a small decorative mark. */
  accent: string;
  /** Served from public/screenshots/<slug>/. Dimensions are the file's own. */
  screenshots?: Screenshot[];
  /** For a self-hosted project: how somebody runs it themselves. */
  selfHost?: {
    intro: string;
    code: string;
    steps: string[];
    note?: string;
  };
  /** Newest first. Rendered on the project page as "What's new". */
  changelog?: {
    version: string;
    date: string;
    summary: string;
    notes: string[];
  }[];
}

export const PROJECTS: Project[] = [
  {
    slug: 'clearwhen',
    name: 'Clearwhen',
    tagline: 'Weather for the parts of your day that matter.',
    blurb:
      '"Rain today" isn\'t an answer. Clearwhen breaks the forecast into the windows you actually live in — the commute, the workday, the dog walk — and gives you a straight verdict for each one, plus exactly when the weather turns.',
    status: 'Live',
    cta: {
      label: 'Download on the App Store',
      href: 'https://apps.apple.com/us/app/clearwhen/id6794483550',
    },
    platforms: [
      'iPhone',
      'Apple Watch',
      'Widgets',
      'Mac (Apple silicon)',
      'Apple Vision Pro',
    ],
    screenshots: [
      {
        src: '/screenshots/clearwhen/01-week.webp',
        alt: "Clearwhen home: current conditions in Hoschton, GA, alerts for thunderstorms during Workday and Dog Walk, and today's verdict for each window.",
        width: 420,
        height: 912,
      },
      {
        src: '/screenshots/clearwhen/03-day-detail.webp',
        alt: 'A day in detail: calendar events paired with their forecast, the best time outside, and hour-by-hour weather inside the Commute and Workday windows.',
        width: 420,
        height: 912,
      },
      {
        src: '/screenshots/clearwhen/02-week-rows.webp',
        alt: 'The week ahead as day cards, each with a headline like "Storms 2–8 PM · 6 hrs" and compact chips for that day\'s windows.',
        width: 420,
        height: 912,
      },
      {
        src: '/screenshots/clearwhen/04-window-editor.webp',
        alt: 'Editing the Workday window: name, icon, 9 AM to 5 PM, Monday to Friday.',
        width: 420,
        height: 912,
      },
      {
        src: '/screenshots/clearwhen/watch-today.webp',
        alt: 'Apple Watch app: 68° and clear in Boston, with the Commute window marked Now.',
        width: 416,
        height: 496,
        compact: true,
      },
    ],
    highlights: [
      'Up to five custom time windows, with per-weekday scheduling',
      'Worst-case-wins verdicts — if it rains at all in your window, it says rain',
      'Plain-language timing: "Storms 6–10 PM · 4 hrs", not just "storms today"',
      'Optional morning briefing covering only the weather that hits your windows',
      'Apple Watch app, Home Screen widgets, and Lock Screen complications',
      'Severe weather alerts from Apple Weather and the National Weather Service',
      'Optional calendar access — see the forecast during the events you have booked',
    ],
    privacyLine:
      'Location is used only to request a forecast. Calendar access is optional and read on-device. No accounts, no analytics, no tracking.',
    // d3-allow: a product's own brand colour, used only as its decorative mark — identity of the product, not interface colour.
    accent: '#7EB6FF',
    changelog: [
      {
        version: '1.1',
        date: '2026-08-09',
        summary: 'Calendar events, and the whole day.',
        notes: [
          "Optional calendar access pairs each of the day's events with the forecast for exactly its hours — the same worst-case-wins verdict a window gets. Off by default, read on-device, never uploaded.",
          'Days now cover all of their hours. Forecast providers only look forward, so "today" used to empty out behind you as the day passed.',
          'Your current location shows its real city name, and the name stays pinned at the top while you scroll.',
          'The week view repeats itself less: the condition and its timing share one line, and days ahead show their windows as compact chips without dropping any.',
          'Voice Control: every control has a name of its own, and windows and cities can be deleted by voice.',
        ],
      },
      {
        version: '1.0',
        date: '2026-08-01',
        summary: 'Initial release.',
        notes: [
          'Up to five custom time windows with per-weekday scheduling.',
          'Worst-case-wins verdicts and plain-language precipitation timing.',
          'Apple Watch app, Home Screen widgets, and Lock Screen complications.',
          'Optional morning briefing covering only the weather that hits your windows.',
        ],
      },
    ],
  },
  {
    slug: 'qr',
    name: 'D3 QR',
    tagline: 'Bulk QR codes, generated entirely in your browser.',
    blurb:
      'A static QR code generator that runs fully client-side. Paste a list, get a batch of codes, export them as a print-ready PDF or individual images. Nothing is uploaded, because there is no server to upload it to.',
    status: 'Live',
    cta: { label: 'Open D3 QR', href: 'https://qr.d3cloud.io' },
    platforms: ['Web'],
    screenshots: [
      {
        src: '/screenshots/qr/preview.webp',
        alt: 'D3 QR: a URL and label entered on the left, with its QR code previewed live on the right.',
        width: 1280,
        height: 800,
      },
      {
        src: '/screenshots/qr/batch.webp',
        alt: 'A batch of five URLs in a reorderable table.',
        width: 1280,
        height: 800,
      },
      {
        src: '/screenshots/qr/pdf-export.webp',
        alt: 'PDF settings — page size, header, footer, colours, error correction — beside a preview of the first page, with buttons to download the PDF, PNGs or SVGs.',
        width: 1280,
        height: 800,
      },
    ],
    highlights: [
      'Bulk generation from a pasted list',
      'Print-ready PDF and image export',
      'Fully client-side — your data never leaves the page',
      'No account, no sign-up, no limits',
    ],
    privacyLine: 'Collects nothing. There is no backend.',
    // d3-allow: a product's own brand colour, used only as its decorative mark — identity of the product, not interface colour.
    accent: '#A8E6CF',
  },
  {
    slug: 'auth',
    name: 'D3 Auth',
    tagline: 'One sign-in for the apps you host yourself.',
    blurb:
      'Self-hosted apps each come with their own login, so a household ends up with five passwords and no way to take somebody\u2019s access away. D3 Auth is a small OpenID Connect provider with one console for the people who can sign in, the apps they can open, and the roles they hold in each \u2014 and every app keeps its own login, so adopting it is never all-or-nothing.',
    status: 'Live',
    cta: {
      label: 'View on GitHub',
      href: 'https://github.com/matdemers1/d3-auth',
    },
    platforms: ['Self-hosted', 'Docker', 'PostgreSQL', 'OpenID Connect'],
    screenshots: [
      {
        src: '/screenshots/auth/01-people.webp',
        alt: 'The console\u2019s People screen: five accounts with their roles, when they last signed in, and a button to invite somebody.',
        width: 1440,
        height: 900,
      },
      {
        src: '/screenshots/auth/02-apps.webp',
        alt: 'The Apps screen listing Bindery, Immich and Murmur, each with how many people can sign in and how many roles it declares.',
        width: 1440,
        height: 900,
      },
      {
        src: '/screenshots/auth/03-connect.webp',
        alt: 'Connect Immich: every value the app needs \u2014 issuer, discovery URL, client id, auth method, ES256, PKCE \u2014 each with a copy button and a line saying why.',
        width: 1440,
        height: 900,
      },
      {
        src: '/screenshots/auth/04-add-an-app.webp',
        alt: 'Add an app: a card for Immich, which D3 Auth knows how to connect, and one for registering your own app from a manifest.',
        width: 1440,
        height: 900,
      },
      {
        src: '/screenshots/auth/05-signin-phone.webp',
        alt: 'The sign-in screen on a phone: one email field and a Continue button.',
        width: 390,
        height: 844,
        compact: true,
      },
    ],
    highlights: [
      'Authorization code with PKCE only, on node-oidc-provider \u2014 four OpenID conformance plans run in CI on every push',
      'Invite-only accounts with passkeys, authenticator codes and trusted devices; nobody can sign themselves up',
      'Deny by default: no grant, no sign-in \u2014 refused before any consent screen, and written to the audit trail',
      'Per-app roles in the token, so an app learns its own roles and never what else somebody can open',
      'Presets for apps it already knows: give Immich\u2019s address and it shows exactly what to paste into Immich',
      'Nightly offsite backups with a restore drill that boots a second copy of the service to prove the backup works',
      'Alerts that read the audit trail, and a probe outside the house that emails when the server itself is down',
      'No telemetry, no phone-home, no dynamic registration, no social login',
    ],
    selfHost: {
      intro:
        'Docker and a domain that reaches the machine over HTTPS \u2014 a tunnel or a reverse proxy. Three secrets, generated once and kept in a password manager.',
      code: 'git clone https://github.com/matdemers1/d3-auth.git && cd d3-auth\ncp .env.example .env\n\n# KEK, PEPPER, COOKIE_KEYS, POSTGRES_PASSWORD\nopenssl rand -base64 32\n\ndocker compose up -d\ndocker compose logs server | grep setupCode',
      steps: [
        'Open /login/setup, enter the one-time code from the log, and claim the owner account.',
        'Add an app \u2014 from a preset, or from a manifest that declares its roles.',
        'Give somebody access and pick their roles. Until you do, every sign-in to that app is refused.',
      ],
      note: 'Keep the KEK. It wraps every authenticator secret and signing key at rest, and no backup contains it \u2014 lose it and those are gone.',
    },
    privacyLine:
      'Runs on your machine; nothing is sent anywhere. It holds the accounts you create and an audit trail of what happened, and phones nobody \u2014 no telemetry, no update checks.',
    // d3-allow: a product's own brand colour, used only as its decorative mark — identity of the product, not interface colour.
    accent: '#8B7CF6',
    changelog: [
      {
        version: '0.1.0',
        date: '2026-09-17',
        summary: 'First public release, under Apache-2.0.',
        notes: [
          'Running in production with Immich and a reference Express app signing in through it.',
          'Passed its own security gate first: four conformance plans, 74 adversarial tests, an ASVS Level 2 self-assessment, Semgrep at zero and a nightly authenticated ZAP scan \u2014 nineteen defects found and fixed, four of them High.',
          'Console rebuilt on @d3cloud/ui 1.1: sidebar shell, System/Light/Dark, and a strict content security policy with nothing inline.',
        ],
      },
    ],
  },
  {
    slug: 'ui',
    name: 'D3 UI',
    tagline: 'One design system and component library for every D3 app.',
    blurb:
      'An audit of five apps found 176 distinct colour values, 19 type sizes and 170 button recipes — with no Button component anywhere. @d3cloud/ui replaces all of that with one visual language and a React component library whose rules are enforced by gates, not guidance.',
    status: 'Live',
    cta: {
      label: 'Browse the Storybook',
      href: 'https://matdemers1.github.io/d3-design-system',
    },
    platforms: ['React', 'npm', 'Storybook'],
    screenshots: [
      {
        src: '/screenshots/ui/storybook.webp',
        alt: 'The D3 UI Storybook, open on the Alert documentation page.',
        width: 1344,
        height: 840,
      },
      {
        src: '/screenshots/ui/alerts.webp',
        alt: 'Alert in its danger, warning, success and info tones.',
        width: 1048,
        height: 656,
      },
      {
        src: '/screenshots/ui/form-fields.webp',
        alt: 'FormField wrapping every control: a search input, a select, an optional textarea and a checkbox.',
        width: 808,
        height: 760,
      },
      {
        src: '/screenshots/ui/empty-state.webp',
        alt: 'EmptyState for a first run: "Nothing here yet", with a single primary action.',
        width: 968,
        height: 582,
      },
    ],
    highlights: [
      '38 components — primitives, forms, layers, the app frame and page patterns — covered by 909 tests',
      'Every story swept by axe, so a component with stories is a component with an accessibility check',
      'Dark-first OKLCH colour on a single violet accent, with a light theme that can be applied per subtree',
      'A 7-step type scale on self-hosted Inter, with JetBrains Mono for metadata',
      'No shadow token: elevation is tone, detachment is a boundary',
      'Ships the d3-check-usage gate, which bans raw hex, off-scale values and shadows in any app',
    ],
    privacyLine: 'A component library — no telemetry, nothing phones home.',
    // d3-allow: a product's own brand colour, used only as its decorative mark — identity of the product, not interface colour.
    accent: '#B9A6FF',
    changelog: [
      {
        version: '1.2.0',
        date: '2026-09-18',
        summary: 'Table — the component DataList deliberately is not.',
        notes: [
          'D-067 settled that a list of like things is rows and not a table, and left the system with nothing for the case a table is actually for: columns that line up, so a value can be compared down one or ordered by it.',
          'Sorting cycles ascending, descending, then back to the order the caller passed \u2014 the given order is often the meaningful one, and a control that cannot return to it quietly destroys information.',
          'Virtualization uses spacer rows rather than a transform, so it stays a real table: the browser\u2019s own column sizing and cell semantics still apply, and the row count reported to a screen reader is the whole set rather than the handful in the DOM.',
          'Measured at 439 rows \u2014 fewer than forty in the DOM across a full scroll, and the 90th-percentile frame under 50ms.',
        ],
      },
      {
        version: '1.1.0',
        date: '2026-09-17',
        summary: 'The frame and the page patterns.',
        notes: [
          'v1.0 gave apps good parts and no guidance on putting them together, so every internal app improvised its own shell, lists and forms.',
          'AppShell, SideNav, Menu and AccountMenu, with System/Light/Dark theming; Page, Stack, Grid, Section and AuthLayout; DescriptionList, DataList, FormActions and FilterBar.',
          'Nine full-screen patterns with written rules, and strict-CSP support so dialogs work without unsafe-inline.',
        ],
      },
      {
        version: '1.0.0',
        date: '2026-09-15',
        summary: 'The first stable release; the public API is frozen.',
        notes: [
          'From here a rename or a removal is a major version (D-063).',
          'Adopted by Bindery and d3-qr, and verified rendered in both apps, in both themes and with keyboard focus.',
          'CodeInput arrived with it: one-time codes and recovery codes, one character per box, with a single labelled input underneath so paste, autofill and screen readers see one field.',
        ],
      },
      {
        version: '0.1.1',
        date: '2026-09-04',
        summary: 'The usage gate ships inside the package.',
        notes: [
          'Run it from any app with npx d3-check-usage src — it no longer depends on the design-system repository being checked out alongside.',
          'No component or token changes.',
        ],
      },
      {
        version: '0.1.0',
        date: '2026-09-04',
        summary: 'First tag.',
        notes: [
          '21 components, 361 tests, and an accessibility sweep over every story.',
          'Colour, type, spacing and motion tokens, with a light theme alongside the dark default.',
        ],
      },
    ],
  },
];

export function projectBySlug(slug: string): Project | undefined {
  return PROJECTS.find((project) => project.slug === slug);
}

export const CONTACT_EMAIL = 'matthew@demers.dev';
export const STUDIO = 'Demers Design and Development';
