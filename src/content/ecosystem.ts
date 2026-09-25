import { PROJECTS, projectBySlug, type Project, type RelationType, type Screenshot } from './projects';

/**
 * The ecosystem, read off what each project declares (DI-ADR-006).
 *
 * Plain data and functions — the map, the hero, the product pages and the
 * tests all ask the same questions of the same declarations.
 */

export interface Edge {
  from: Project;
  to: Project;
  type: RelationType;
}

/** Every declared relation, resolved. An unknown slug throws: a typo is a bug, not a missing line. */
export function edges(): Edge[] {
  return PROJECTS.flatMap((from) =>
    from.relations.map((relation) => {
      const to = projectBySlug(relation.to);
      if (!to) throw new Error(`${from.slug} declares a relation to unknown project "${relation.to}"`);
      return { from, to, type: relation.type };
    }),
  );
}

export interface Connection {
  other: Project;
  type: RelationType;
  /** A sentence about `other`, told from the point of view of the project asked about. */
  text: string;
}

const OUTGOING: Record<RelationType, (other: string) => string> = {
  'signs-in-with': (other) => `Offers Sign in with ${other}`,
  'built-on': (other) => `Built on ${other}`,
  'planned-in': (other) => `Planned and tracked in ${other}`,
};

const INCOMING: Record<RelationType, (other: string) => string> = {
  'signs-in-with': (other) => `Signs people into ${other}`,
  'built-on': (other) => `${other} is built on it`,
  'planned-in': (other) => `Tracks the plan for ${other}`,
};

/** Everything touching one project, both directions, in words. */
export function connectionsOf(slug: string): Connection[] {
  const list: Connection[] = [];
  for (const edge of edges()) {
    if (edge.from.slug === slug) {
      list.push({ other: edge.to, type: edge.type, text: OUTGOING[edge.type](edge.to.name) });
    } else if (edge.to.slug === slug) {
      list.push({ other: edge.from, type: edge.type, text: INCOMING[edge.type](edge.from.name) });
    }
  }
  return list;
}

export const RELATION_LABEL: Record<RelationType, string> = {
  'signs-in-with': 'signs in with D3 Auth',
  'built-on': 'built on D3 UI',
  'planned-in': 'planned in Foreman',
};

export const ecosystemProjects = () => PROJECTS.filter((p) => p.kind === 'ecosystem');
export const fixProjects = () => PROJECTS.filter((p) => p.kind === 'fix');

/** What shipped, newest first. Each entry is a product's star colour on the timeline. */
export interface LogEntry {
  date: string;
  slug: string;
  text: string;
}

export const BUILD_LOG: LogEntry[] = [
  { date: '2026-09-20', slug: 'bindery', text: 'Bindery and Foreman go public under Apache-2.0' },
  { date: '2026-09-20', slug: 'foreman', text: 'The cutover: nine projects move into Foreman as their plan of record' },
  { date: '2026-09-18', slug: 'ui', text: 'D3 UI 1.2 adds Table — and a keyboard fix found by running axe over Foreman' },
  { date: '2026-09-17', slug: 'auth', text: 'D3 Auth 0.1.0, its first public release, after its own security gate' },
  { date: '2026-09-15', slug: 'ui', text: 'D3 UI 1.0 — the public API is frozen' },
  { date: '2026-08-09', slug: 'clearwhen', text: 'Clearwhen 1.1 pairs your calendar with the forecast' },
  { date: '2026-08-01', slug: 'clearwhen', text: 'Clearwhen 1.0 lands on the App Store' },
];

/**
 * On the bench: projects further along than an idea and not yet finished
 * products. They are not stars on the map and not in either of the two kinds —
 * each gets its own page instead (DI-REQ-037), which says what stage it is at
 * and marks every feature it lists as built or planned (DI-REQ-038). Content
 * comes from each project's own plan; nothing is claimed that the plan does not.
 */
export interface WorkshopFeature {
  text: string;
  built: boolean;
}

export interface WorkshopItem {
  slug: string;
  name: string;
  /** One or two words: Messages, Council game. */
  role: string;
  /** Where it is, in two or three words, shown as its badge. */
  stage: string;
  /** What that stage means, honestly. */
  stageNote: string;
  /** The one line on the home page's bench. */
  line: string;
  tagline: string;
  /** The maker's own words, quoted from the plan. */
  quote?: string;
  /** Why it exists. */
  why: string;
  audience: string;
  features: WorkshopFeature[];
  principles: string[];
  platforms: string[];
  cta: { label: string; href: string };
  // d3-allow: a project's own identity colour, used only as its decorative mark.
  accent: string;
  screenshot: Screenshot;
  /** A dim star on the hero, and the live star its dashed hint line reaches for. */
  star: { x: number; y: number };
  near: string;
}

export const WORKSHOP: WorkshopItem[] = [
  {
    slug: 'someday-vault',
    name: 'Someday Vault',
    role: 'Messages',
    stage: 'Pre-launch',
    stageNote:
      'somedayvault.com is up and the product is built. Launch hardening — a private beta, monitoring and a security pass — is under way, and payments and email delivery are not switched on yet.',
    line: 'Letters, video and voice, delivered to the people you love on the days that matter — for decades.',
    tagline: 'Be at every birthday. Every someday.',
    quote: 'Say everything, for every someday.',
    why: 'The funeral gets flowers; the eighth birthday two years later gets silence. People who do dangerous work want to be ready for the worst, and have had little better than an “open when” letter written before a deployment.',
    audience:
      'Built first for people who plan ahead for a living — military, police, fire and EMS — and for grandparents with stories worth keeping.',
    features: [
      { text: 'Letters, plus video and voice recorded right in the browser', built: true },
      { text: 'Deliveries on a date, on every birthday until an age you choose, or after you are gone', built: true },
      { text: 'People you trust report a death; a waiting period follows, and any sign-in by you cancels it', built: true },
      { text: 'Recipients open their message from a link — no account, no password', built: true },
      { text: 'Go-Bag: thirty days to write everything, then an encrypted archive you keep, and the copy on the server is deleted', built: true },
      { text: 'Deployment Mode, guided prompts and a yearly check-up of what you have left', built: true },
      { text: 'A Sealed Vault tier, encrypted on your own device', built: false },
      { text: 'Plans for departments and unions, and gift subscriptions', built: false },
    ],
    principles: [
      'Never deliver to the living. Never fail the dead.',
      'Preserve, never simulate: no AI ever writes, speaks or imitates the person who left the message.',
      'Once a death is confirmed, every delivery goes out — whatever happens to payment.',
      'Message text is encrypted with a key of its own for each person.',
      'It is not a will, and it does not pretend to be.',
    ],
    platforms: ['Web, on any device', 'Nothing to install'],
    cta: { label: 'Visit somedayvault.com', href: 'https://somedayvault.com' },
    // d3-allow: a project's own identity colour, used only as its decorative mark.
    accent: '#F4A7B9',
    screenshot: {
      src: '/screenshots/someday-vault/landing.webp',
      alt: 'The Someday Vault home page: “Be at every birthday. Every someday.”, with a sunrise and a sealed letter, and three steps — say it today, pick their somedays, we keep the light on.',
      width: 1440,
      height: 900,
    },
    star: { x: 92, y: 42 },
    near: 'foreman',
  },
  {
    slug: 'sceptrefall',
    name: 'Sceptrefall',
    role: 'Council game',
    stage: 'Playable',
    stageNote:
      'Playable now for private groups at sceptrefall.d3cloud.io, with the full original campaign.',
    line: 'A live multiplayer council game, where every vote leaves a legacy.',
    tagline: 'The king is dead. The council remains.',
    why: 'Council-style legacy board games live on a table — tracks, stickers, sealed envelopes, hidden agendas. Played remotely they fall apart, and a generic tabletop simulator loses the pacing and the secrets. Sceptrefall keeps the books so the table can argue.',
    audience: 'Private groups of three to six, playing together from anywhere, on any device.',
    features: [
      { text: 'Secret votes weighted by power, revealed together and synced live to every seat', built: true },
      { text: 'Kingdom tracks, secret agendas, sealed envelopes that unlock, and five possible endings', built: true },
      { text: 'An original campaign, The Vacant Throne: 122 cards across three eras', built: true },
      { text: 'AI councilors to fill empty seats, and a Herald who writes up each session', built: true },
      { text: 'Whisper channels, a chronicle of every decision, and a printable history of your kingdom', built: true },
      { text: 'A studio for writing campaign packs of your own, and voiced cards', built: true },
    ],
    principles: [
      'Inspired by the mechanics of council-style legacy board games. Every card, name and image is original.',
      'Campaign packs you load yourself stay private to your account.',
      'Every change to a game is recorded, so the chronicle is the game.',
    ],
    platforms: ['Web', 'Installable as an app'],
    cta: { label: 'Enter the council', href: 'https://sceptrefall.d3cloud.io' },
    // d3-allow: a project's own identity colour, used only as its decorative mark.
    accent: '#D4AF37',
    screenshot: {
      src: '/screenshots/sceptrefall/sign-in.webp',
      alt: 'Sceptrefall’s entrance: a crown, “The king is dead. The council remains.”, and a form to take your seat.',
      width: 1440,
      height: 900,
    },
    star: { x: 66, y: 92 },
    near: 'ui',
  },
  {
    slug: 'kardashev',
    name: 'Kardashev',
    role: 'Idle game',
    stage: 'Early access',
    stageNote:
      'The first phase is playable in your browser: the climb to a Type 0 civilisation. Types I to III, audio and a phone layout are still to come.',
    line: 'A grounded idle game about climbing the energy scale.',
    tagline: 'A grounded, hard-sci-fi industrial idle game.',
    quote:
      'You are an autonomous corporate AI on the frontier — optimize a Materials ▲ Energy ▲ Capital production triangle, find the bottleneck, reinvest, and climb the Kardashev energy scale.',
    why: 'A game about optimisation, where the machine is the toy — and an experiment in how well AI can help design and build a complete idle game.',
    audience: 'For solo players who like a few relaxed check-ins a day.',
    features: [
      { text: 'An operations dashboard: materials, energy and capital, and the bottleneck between them', built: true },
      { text: 'Research, a market, automation subroutines and a codex of lore', built: true },
      { text: 'Restructure resets, and an Ascension when you climb a type', built: true },
      { text: 'Progress while you are away, and a report when you come back', built: true },
      { text: 'Autosave, with save export and import', built: true },
      { text: 'A high-contrast theme and keyboard shortcuts', built: true },
      { text: 'Type I, II and III', built: false },
      { text: 'Audio, achievements and a phone layout', built: false },
    ],
    principles: [
      'No FOMO, no monetization, no twitch, no forced micromanagement.',
      'Runs entirely in your browser: no backend, no account, and your save stays on your device.',
      'No third-party analytics.',
      'MIT licensed.',
    ],
    platforms: ['Web', 'Desktop browser'],
    cta: { label: 'Play in your browser', href: 'https://kardashev.d3cloud.io' },
    // d3-allow: a project's own identity colour, used only as its decorative mark.
    accent: '#E5484D',
    screenshot: {
      src: '/screenshots/kardashev/operations.webp',
      alt: 'Kardashev’s operations dashboard: power, civilisation type and capital along the top, a “Trade hub starved — needs ore” warning, and panels for materials, energy and capital above the mining rigs, trade hubs and labs.',
      width: 1440,
      height: 900,
    },
    star: { x: 10, y: 42 },
    near: 'bindery',
  },
];

export const workshopBySlug = (slug: string) => WORKSHOP.find((item) => item.slug === slug);
