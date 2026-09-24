import { PROJECTS, projectBySlug, type Project, type RelationType } from './projects';

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

/** On the bench: not live, no page yet. Dim stars on the hero. */
export interface WorkshopItem {
  name: string;
  line: string;
  star: { x: number; y: number };
  /** The live star its dashed hint line reaches for. */
  near: string;
}

export const WORKSHOP: WorkshopItem[] = [
  {
    name: 'Someday Vault',
    line: 'Letters, video and audio delivered on the days that matter, for decades.',
    star: { x: 92, y: 42 },
    near: 'foreman',
  },
  {
    name: 'Sceptrefall',
    line: 'A live multiplayer council game, where every vote leaves a legacy.',
    star: { x: 66, y: 92 },
    near: 'ui',
  },
  {
    name: 'Kardashev',
    line: 'A grounded idle game about climbing the energy scale.',
    star: { x: 10, y: 42 },
    near: 'bindery',
  },
];
