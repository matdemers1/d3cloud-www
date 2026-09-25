import { PROJECTS, projectBySlug, type Project, type Relation, type RelationType, type Screenshot } from './projects';

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

/** One of a project's own declared relations, as a sentence. */
export const describeRelation = (type: RelationType, other: string) => OUTGOING[type](other);

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
  { date: '2026-09-25', slug: 'shipyard', text: 'Shipyard starts deploying the D3 Cloud apps on the home server — itself included' },
  { date: '2026-09-24', slug: 'shipyard', text: 'Shipyard is planned, built to its first phase and published under Apache-2.0 in a day' },
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
  /** What it already connects to, declared the same way a product's are. */
  relations: Relation[];
  cta: { label: string; href: string };
  accent: string;
  /** A screenshot of what is live — or, with none to show, a drawing (WORKSHOP_ART). */
  screenshot?: Screenshot;
  /** A dim star on the hero, and the live star its dashed hint line reaches for. */
  star: { x: number; y: number };
  near: string;
}

export const WORKSHOP: WorkshopItem[] = [
  {
    slug: 'shipyard',
    name: 'Shipyard',
    role: 'Deploys',
    stage: 'Pre-release',
    stageNote:
      'Built, open source, and already deploying the D3 Cloud apps on the home server. The console on a phone, deploys requested by Claude Code, and approvals are being proven end to end before it is called released.',
    line: 'One deploy button for the home server — for a phone, and for Claude Code.',
    tagline: 'One deploy button, for you and for Claude.',
    quote:
      'One deploy button for a Docker Compose host — for you, from your phone, and for Claude Code sessions, over MCP.',
    why: 'Every deploy was hand-typed over SSH, and two coding sessions once deployed conflicting commits of the same app. Shipyard replaces the ritual with one button that checks everything a careful person would, every time — and refuses when it cannot.',
    audience:
      'For one person running a handful of self-hosted apps on a Docker host, and for the coding sessions that ship them.',
    features: [
      { text: 'Name an app and a commit; the agent checks for itself that CI passed, the commit is on main, it is newer than what is live, and its images are published', built: true },
      { text: 'Backs up, migrates, and swaps to the exact image digests it verified', built: true },
      { text: 'Proves the deploy: the running digest, the revision label and the database schema must all agree, then it soaks', built: true },
      { text: 'Rolls the images back on its own if anything fails; restoring data is always a person’s decision', built: true },
      { text: 'Per-app locks that name who holds them, so two sessions can never overwrite each other', built: true },
      { text: 'MCP tools so a Claude Code session can check, dry-run, deploy and roll back', built: true },
      { text: 'Every deploy recorded in Foreman, against the tasks it ships', built: true },
      { text: 'A phone-first console, with Sign in with D3 Auth beside its own login', built: true },
      { text: 'A whole week of deploys with no SSH at all — every app, and Shipyard itself', built: false },
    ],
    principles: [
      'The agent opens no port. It holds the Docker socket and faces nothing; the internet-facing server never touches Docker.',
      'Nothing is taken on trust: the agent re-checks every request with GitHub and the registry itself, and fails closed when it cannot.',
      'No command string is accepted anywhere — only an app name and a 40-character commit.',
      'Nothing in it is tied to one kind of server: a Docker host is all it needs.',
      'No telemetry, and no app secrets stored.',
    ],
    platforms: ['Self-hosted', 'Docker', 'PostgreSQL', 'MCP', 'Apache-2.0'],
    relations: [
      { to: 'auth', type: 'signs-in-with' },
      { to: 'ui', type: 'built-on' },
      { to: 'foreman', type: 'planned-in' },
    ],
    // Its repository, not the live instance: the site links only to what a
    // stranger can use today.
    cta: { label: 'View on GitHub', href: 'https://github.com/matdemers1/shipyard' },
    // d3-allow: a project's own identity colour, used only as its decorative mark.
    accent: '#5EEAD4',
    star: { x: 92, y: 42 },
    near: 'foreman',
  },
];

export const workshopBySlug = (slug: string) => WORKSHOP.find((item) => item.slug === slug);
