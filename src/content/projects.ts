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
  accent: string;
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
    highlights: [
      'Bulk generation from a pasted list',
      'Print-ready PDF and image export',
      'Fully client-side — your data never leaves the page',
      'No account, no sign-up, no limits',
    ],
    privacyLine: 'Collects nothing. There is no backend.',
    accent: '#A8E6CF',
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
    highlights: [
      '21 components — primitives, forms, layers and patterns — covered by 361 tests',
      'Every story swept by axe, so a component with stories is a component with an accessibility check',
      'Dark-first OKLCH colour on a single violet accent, with a light theme that can be applied per subtree',
      'A 7-step type scale on self-hosted Inter, with JetBrains Mono for metadata',
      'No shadow token: elevation is tone, detachment is a boundary',
      'Ships the d3-check-usage gate, which bans raw hex, off-scale values and shadows in any app',
    ],
    privacyLine: 'A component library — no telemetry, nothing phones home.',
    accent: '#B9A6FF',
    changelog: [
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
