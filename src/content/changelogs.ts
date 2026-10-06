/**
 * Release notes, newest first, keyed by product slug — rendered on the product
 * page as "What's new". Kept out of projects.ts so they load with that section,
 * not in the entry bundle (150 kB budget): every product's history grows, and
 * only its own page reads it.
 */
export interface Release {
  version: string;
  date: string;
  /** The release's own page, when it has one. */
  href?: string;
  summary: string;
  notes: string[];
}

export const CHANGELOGS: Partial<Record<string, Release[]>> = {
  clearwhen: [
    {
      version: "1.1",
      date: "2026-08-09",
      summary: "Calendar events, and the whole day.",
      notes: [
        "Optional calendar access pairs each of the day's events with the forecast for exactly its hours — the same worst-case-wins verdict a window gets. Off by default, read on-device, never uploaded.",
        'Days now cover all of their hours. Forecast providers only look forward, so "today" used to empty out behind you as the day passed.',
        "Your current location shows its real city name, and the name stays pinned at the top while you scroll.",
        "The week view repeats itself less: the condition and its timing share one line, and days ahead show their windows as compact chips without dropping any.",
        "Voice Control: every control has a name of its own, and windows and cities can be deleted by voice.",
      ],
    },
    {
      version: "1.0",
      date: "2026-08-01",
      summary: "Initial release.",
      notes: [
        "Up to five custom time windows with per-weekday scheduling.",
        "Worst-case-wins verdicts and plain-language precipitation timing.",
        "Apple Watch app, Home Screen widgets, and Lock Screen widgets.",
        "Optional morning briefing covering only the weather that hits your windows.",
      ],
    },
  ],
  auth: [
    {
      version: "Unreleased",
      date: "2026-10-05",
      href: "https://github.com/matdemers1/d3-auth/commits/main",
      summary: "Running in production from main since 0.1.0; no new tag yet.",
      notes: [
        "Invites can carry access: groups and app grants chosen when inviting are applied as the account is created, each audited.",
        "Sign-in screens rebuilt in a split layout that renders the same with JavaScript off, carrying the Keyhole mark.",
        "The TypeScript client is on npm as @d3cloudio/auth-client.",
        "Rotating a client secret, disabling sign-in and applying a manifest now ask for fresh proof instead of failing silently.",
        "The nightly ZAP scan now really runs signed in; its first signed-in pass found audit-log filters that answered 500, now refused cleanly.",
        "GET /health reports the newest applied migration, for automated deploys.",
      ],
    },
    {
      version: "0.1.0",
      date: "2026-09-17",
      summary: "First public release, under Apache-2.0.",
      notes: [
        "Running in production with Immich and a reference Express app signing in through it.",
        "Passed its own security gate first: four conformance plans, 74 adversarial tests, an ASVS Level 2 self-assessment, Semgrep at zero and a nightly ZAP scan \u2014 nineteen defects found and fixed, four of them High.",
        "Console rebuilt: sidebar shell, System/Light/Dark, and a strict content security policy with nothing inline.",
      ],
    },
  ],
  bindery: [
    {
      version: "Unreleased",
      date: "2026-10-05",
      href: "https://github.com/matdemers1/bindery/commits/main",
      summary: "No tagged release yet: main is what runs, under Apache-2.0.",
      notes: [
        "The vault never removes a file another library holds: sealing, and a restore that fails verification, both ask again — under the lock every upload takes — whether anything outside the vault still has the same bytes.",
        "Deleting an account waits a week, and an administrator can cancel it; the purge takes only what nobody else could see, and documents in shared libraries stay.",
        "/api/health reports the running commit and database schema, and a database dump can run before any migration.",
        "A new mark — a dog-eared page — in the app, its favicon and its empty states.",
        "Dependencies moved past new advisories: PyJWT, urllib3 and pypdf, and brace-expansion in the web build.",
      ],
    },
  ],
  foreman: [
    {
      version: "Unreleased",
      date: "2026-10-04",
      href: "https://github.com/matdemers1/foreman/commits/main",
      summary: "No tagged release yet: main is what runs, under Apache-2.0.",
      notes: [
        "Tasks can depend on tasks; a cycle is refused with its path, and the brief offers only tasks whose dependencies are done.",
        "Status rolls up: a task drives its phase and a phase its project, and a phase completes only when its exit gate passes.",
        "Guidelines — cross-project standing decisions — carried in every brief and the portfolio, readable in full over MCP.",
        "Project ideas with a canvas, lists and a thoughts log, creatable whole in one MCP call.",
        "An opt-in ideas-board mode for a group: roles, invitations, scoring and discussion, fenced off from the ledger by a test.",
        "A recorded deployment cites the tasks it shipped, and images carry their migration and schema labels.",
        "A new sign-in screen and the True north mark.",
      ],
    },
  ],
  shipyard: [
    {
      version: "Unreleased",
      date: "2026-10-06",
      href: "https://github.com/matdemers1/shipyard/compare/v0.1.0...main",
      summary:
        "80 commits on main since 0.1.0, all running in production; not yet tagged.",
      notes: [
        "Roll all: every app with something waiting ships in one go, each at its own commit, one at a time, with Shipyard’s own server last and a stop at the first failure.",
        "Optional builds: Shipyard can fetch, test, build and push an app itself, with rootless BuildKit on a firewalled network, triggered by a signed GitHub webhook, and auto-deploy each green build through every gate.",
        "Two more MCP tools, build and build status, and a Connect Claude Code page that makes a scoped token and the exact command to connect.",
        "Home and app detail explain every app’s state in plain words, and the server’s GitHub token is set in Settings with its rate limit shown.",
        "Sign-in, first-run setup and invites in a new split front door.",
      ],
    },
    {
      version: "0.1.0",
      date: "2026-09-25",
      href: "https://github.com/matdemers1/shipyard/releases/tag/v0.1.0",
      summary: "First public release, under Apache-2.0.",
      notes: [
        "Proven in production across six stacks: one that needs a person’s approval for every deploy, a two-app canary group that soaks the canary first, and Shipyard’s own server.",
        "First-run account setup in the browser, and single sign-on configured in Settings, its secret encrypted at rest.",
        "Every console screen’s empty, loading, error and denied states tested, and axe-clean in both themes.",
        "CI checks a clean-machine install on an internal-only network, scans for secrets, and allows no third-party origin in the console bundle.",
      ],
    },
  ],
  postroom: [
    {
      version: "Unreleased",
      date: "2026-10-04",
      href: "https://github.com/matdemers1/d3-postroom/blob/main/CHANGELOG.md",
      summary: "No tagged release yet: main is what runs, under Apache-2.0.",
      notes: [
        "Serving its first domain since 28 September: MX published and the edge open on ports 25, 465, 587 and 993. Outbound mail goes through Amazon SES for now, while the edge’s new address earns a sending reputation; direct delivery is switched on per destination.",
        "Passed its own security gate before anything listened: an adversarial suite, fuzzing for every parser, Semgrep, gitleaks, an authenticated ZAP scan and an OWASP ASVS 5.0 Level 2 self-assessment — 253 requirements, no open fail.",
        "The webmail rebuilt as a finished product: Mail, Settings and Admin as three separate places, compose attachments streamed into the encrypted store, and every screen, Admin included, laid out for a 390-pixel phone.",
        "Ten single-use recovery codes for a lost authenticator, a one-time QR code that connects an iPhone, and a sign-in page that says what Postroom is.",
        "Single sign-on links to an account that already exists, and never creates one.",
      ],
    },
  ],
  ui: [
    {
      version: "1.5.0",
      date: "2026-10-01",
      href: "https://github.com/matdemers1/d3-design-system/releases/tag/v1.5.0",
      summary: "Cards that read on a recessed sheet.",
      notes: [
        "Inside a recessed app frame a card painted the sheet’s own colour, so every section on it was invisible — and everything placed inside was tuned to a card nobody could see.",
        "Cards there get their own surface and a one-pixel edge, and a new quiet fill keeps badges, tab tracks and counts visible on them.",
        "The field edge is retuned to just clear 3:1 against both a filled field and a white card, so it stops reading as a heavy ring; in dark, a selected tab is no longer a near-black hole.",
        "A warning tone for StatusDot and Badge — degraded, delayed, retrying: worth a look, not action now.",
        "Table column widths that never worked on a real table (fr, minmax) are now a type error instead of being silently dropped, alongside a set of phone layout fixes.",
      ],
    },
    {
      version: "1.4.2",
      date: "2026-10-01",
      href: "https://github.com/matdemers1/d3-design-system/releases/tag/v1.4.2",
      summary: "Four fixes found by auditing a real app’s design.",
      notes: [
        "The current page in a sidebar was marked by a tint alone, 1.08:1 against its background; it now carries an accent bar at 4.71:1 or better.",
        "A segmented control’s thumb gets an edge and a semibold label, and a secondary button a border — each was close to invisible against what it sat on (WCAG 1.4.11).",
        "The command palette opens on the menus’ quick motion rather than a dialog’s spring, because it opens dozens of times an hour.",
        "No export, prop, default or token changed.",
      ],
    },
    {
      version: "1.4.1",
      date: "2026-09-30",
      href: "https://github.com/matdemers1/d3-design-system/releases/tag/v1.4.1",
      summary: "A recessed frame gives a phone its full width.",
      notes: [
        "Below 768 pixels the content sheet now runs edge to edge: with no ground beside it, the inset only took 16 pixels from every screen.",
        "A Stat value breaks only between words, so a narrow tile no longer stacks “11:32 PM” one character to a line.",
      ],
    },
    {
      version: "1.4.0",
      date: "2026-09-29",
      href: "https://github.com/matdemers1/d3-design-system/releases/tag/v1.4.0",
      summary: "Two shadows, and nine building blocks for finished products.",
      notes: [
        "Tone alone left two things looking unfinished: a content sheet barely a step off its ground, and menus outlined as if drawn with a pen. Two named shadows replace that — one for the sheet, one for anything that floats — and the gate still rejects every other.",
        "Under forced colours or a request for more contrast, the shadow gives way to the one-pixel edge again.",
        "New: Switch, SplitButton, CommandPalette, SettingsRow, StatusDot, Stat, PasswordStrength, ActionBar, and name-derived avatar tints measured at 5.4:1 or better.",
        "No export, prop or default was removed or renamed.",
      ],
    },
    {
      version: "1.3.0",
      date: "2026-09-29",
      href: "https://github.com/matdemers1/d3-design-system/releases/tag/v1.3.0",
      summary: "Foundations for calm apps.",
      notes: [
        "Toast: one at a time, never takes focus, pauses while you read it, with at most one action and its key hint.",
        "A recessed AppShell that puts the content on its own surface beside a quieter sidebar, plus filled fields and a SearchField.",
        "RecipientField: email recipients as chips, with suggestions from a loader the app supplies, built as an accessible combobox.",
        "Motion retuned for things that happen many times an hour — toasts, row exits and tab glides are faster and no longer overshoot.",
        "Additive and opt-in, apart from the motion retune.",
      ],
    },
    {
      version: "1.2.2",
      date: "2026-09-18",
      summary: "Finishing the keyboard fix 1.2.1 started.",
      notes: [
        "A table with no height limit still scrolls sideways when its columns are wider than the page — the usual case on a dense screen — and 1.2.1 had decided the tab stop from the prop, which left exactly those tables unreachable.",
        "Whether the scroll region takes focus is now measured against the box it sits in, and re-measured on resize. A table that fits adds no tab stop.",
      ],
    },
    {
      version: "1.2.1",
      date: "2026-09-18",
      summary: "A bounded Table could only be scrolled with a mouse.",
      notes: [
        "Found by running axe over a real app rather than by reading the spec: a height limit makes the table a scroll container, and rows below the fold have to be reachable by keyboard (WCAG 2.1.1).",
        "The scroll region now takes focus and is named by the table’s own caption.",
      ],
    },
    {
      version: "1.2.0",
      date: "2026-09-18",
      summary: "Table — the component DataList deliberately is not.",
      notes: [
        "A list of like things is rows, not a table — which left nothing for the case a table is actually for: columns that line up, so a value can be compared down one or ordered by it.",
        "Sorting cycles ascending, descending, then back to the order the caller passed \u2014 the given order is often the meaningful one, and a control that cannot return to it quietly destroys information.",
        "Virtualization uses spacer rows rather than a transform, so it stays a real table: the browser\u2019s own column sizing and cell semantics still apply, and the row count reported to a screen reader is the whole set rather than the handful in the DOM.",
        "Measured at 439 rows \u2014 fewer than forty in the DOM across a full scroll, and the 90th-percentile frame under 50ms.",
      ],
    },
    {
      version: "1.1.0",
      date: "2026-09-17",
      summary: "The frame and the page patterns.",
      notes: [
        "v1.0 gave apps good parts and no guidance on putting them together, so each app improvised its own shell, lists and forms.",
        "AppShell, SideNav, Menu and AccountMenu, with System/Light/Dark theming; Page, Stack, Grid, Section and AuthLayout; DescriptionList, DataList, FormActions and FilterBar.",
        "Nine full-screen patterns with written rules, and strict-CSP support so dialogs work without unsafe-inline.",
      ],
    },
    {
      version: "1.0.0",
      date: "2026-09-15",
      summary: "The first stable release; the public API is frozen.",
      notes: [
        "From here a rename or a removal is a major version.",
        "Verified rendered in two production apps, in both themes and with keyboard focus.",
        "CodeInput arrived with it: one-time codes and recovery codes, one character per box, with a single labelled input underneath so paste, autofill and screen readers see one field.",
      ],
    },
    {
      version: "0.1.1",
      date: "2026-09-04",
      summary: "The usage gate ships inside the package.",
      notes: [
        "Run it from any app with npx d3-check-usage src — it no longer depends on the design-system repository being checked out alongside.",
        "No component or token changes.",
      ],
    },
    {
      version: "0.1.0",
      date: "2026-09-04",
      summary: "First tag.",
      notes: [
        "21 components, 361 tests, and an accessibility sweep over every story.",
        "Colour, type, spacing and motion tokens, with a light theme alongside the dark default.",
      ],
    },
  ],
};
