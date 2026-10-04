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
  { date: '2026-10-04', slug: 'floorspec-app', text: 'Floorspec Core Draft 0.1 is published, with a reference engine passing all 281 conformance tests' },
  { date: '2026-10-02', slug: 'postroom', text: 'Postroom, a mail server written from scratch, joins the constellation' },
  { date: '2026-09-28', slug: 'postroom', text: 'Postroom starts receiving mail, after passing its own security gate' },
  { date: '2026-09-25', slug: 'shipyard', text: 'Shipyard 0.1.0, its first release — out of the workshop and into the constellation' },
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
  /**
   * Where its page lives, when not at `/<slug>` — D3 Floorspec's is /floorspec/app, because
   * /floorspec is the standard it implements (FLR-ADR-018).
   */
  path?: string;
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
  /** The hero's second button; "Everything on the bench" when absent. */
  secondary?: { label: string; href: string };
  accent: string;
  /** A screenshot of what is live — or, with none to show, a drawing (WORKSHOP_ART). */
  screenshot?: Screenshot;
  /** A dim star on the hero, and the live star its dashed hint line reaches for. */
  star: { x: number; y: number };
  near: string;
}

export const WORKSHOP: WorkshopItem[] = [
  {
    slug: 'floorspec-app',
    // /floorspec is the standard it implements (FLR-ADR-018).
    path: '/floorspec/app',
    name: 'D3 Floorspec',
    role: 'House design',
    stage: 'Being built — Phase 0 and 1',
    stageNote:
      'The standard’s first draft, Floorspec Core 0.1, is published, and the reference engine is being built against it. The app’s foundation — sign-in, projects, export — is being deployed. There is nothing to try yet.',
    line: 'Design a house with Claude — every edit validated, attributed and yours to accept.',
    tagline: 'Design a house with Claude. Every edit checked, and yours to accept.',
    quote:
      'I’m not an architect, but I have an itch to design a home and I want to use the tools that I’m most aware of, like Claude Code, to help me along that process.',
    why: 'Floor plans live in drawings and in files only one program can read, so nothing can check a change before it lands. D3 Floorspec keeps the house in an open, exact document — Floorspec — and treats an edit the way code review treats a commit: Claude proposes it, an exact engine validates it, and you accept or reject it.',
    audience:
      'For people who are not architects and want to design their own home, with the tools they already use — Claude Code first.',
    features: [
      { text: 'Floorspec Core Draft 0.1, published at d3cloud.io/floorspec', built: true },
      { text: 'A reference engine with exact geometry, a validator and a CLI, passing every conformance test', built: true },
      { text: 'Draw walls and rooms in 2D', built: false },
      { text: 'Claude edits over MCP, as reviewable changesets you accept or reject', built: false },
      { text: 'Every edit validated by the exact engine, with coded diagnostics and fixes', built: false },
      { text: 'From a program of rooms to a bubble diagram to layout candidates', built: false },
      { text: 'Building systems — electrical, plumbing, mechanical — as devices on walls', built: false },
      { text: 'Advisory code findings with citations, which never say “compliant”', built: false },
      { text: 'A 3D walkthrough with materials, textures and furniture', built: false },
      { text: 'Export to IFC, glTF, PDF and DXF', built: false },
      { text: 'Its own login and Sign in with D3 Auth, side by side', built: true },
      { text: 'Self-hosted with Docker Compose, with no telemetry', built: true },
    ],
    principles: [
      'The standard comes first: D3 Floorspec implements Floorspec, and does not get to redefine it.',
      'Claude proposes and you decide. No edit lands in the house without your say.',
      'Exact, integer geometry: the engine and the conformance suite agree to the base unit, with no tolerance.',
      'Code findings are advice with citations. They are not a plan review; the authority having jurisdiction decides.',
      'Self-hosted, open source, and no telemetry.',
    ],
    platforms: ['Self-hosted', 'Web', 'Docker Compose', 'MCP', 'Apache-2.0'],
    relations: [
      { to: 'auth', type: 'signs-in-with' },
      { to: 'ui', type: 'built-on' },
      { to: 'foreman', type: 'planned-in' },
    ],
    // Its repository, not the instance: production is invite-only, and the site
    // links only to what a stranger can use today.
    cta: { label: 'View on GitHub', href: 'https://github.com/matdemers1/d3-floorspec' },
    secondary: { label: 'Read the standard', href: '/floorspec' },
    // d3-allow: a project's own identity colour (chartreuse, DI-T-10.1), used only as its decorative mark.
    accent: '#B5D84A',
    star: { x: 62, y: 11 },
    near: 'foreman',
  },
];

export const workshopBySlug = (slug: string) => WORKSHOP.find((item) => item.slug === slug);

/** A workshop page's address. */
export const workshopPath = (item: Pick<WorkshopItem, 'slug' | 'path'>) => item.path ?? `/${item.slug}`;
