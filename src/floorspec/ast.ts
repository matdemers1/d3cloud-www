/**
 * The shape of a Floorspec chapter once scripts/sync-floorspec.ts has parsed it (DI-T-10.2).
 *
 * The Markdown is parsed at sync time, not in the browser, so the site ships no Markdown parser
 * and renders no HTML strings: a chapter is plain data that `src/floorspec/Prose.tsx` turns into
 * React elements. Kept deliberately small — only what the specification actually uses.
 */

export type Level = 'MUST' | 'MUST NOT' | 'SHOULD' | 'SHOULD NOT' | 'MAY';

/** Inline content. A bare string is text. */
export type Inline =
  | string
  | { t: 'code'; v: string }
  | { t: 'em'; c: Inline[] }
  | { t: 'strong'; c: Inline[] }
  /** `href` is in-site (`/floorspec/...`) for cross-references, or absolute. */
  | { t: 'a'; href: string; c: Inline[] }
  | { t: 'br' }
  /**
   * A normative statement: the sentence (`c`) and the tag that ended it. Rendered with
   * `id` = the statement ID, so `/floorspec/core/walls#FS-CORE-5.3.1` (or
   * `/floorspec/ops/references#FS-OPS-3.4.1`) lands on it.
   */
  | { t: 'stmt'; id: string; level: Level; c: Inline[] };

export type CalloutKind = 'note' | 'example' | 'warning';

export type Block =
  /** `id` is the section number for a numbered `## 5.3 Title`, a slug otherwise. */
  | { t: 'h'; depth: number; id: string; number?: string; c: Inline[] }
  | { t: 'p'; c: Inline[] }
  | { t: 'list'; ordered: boolean; start?: number; items: Block[][] }
  | { t: 'table'; align: ('left' | 'center' | 'right' | null)[]; head: Inline[][]; rows: Inline[][][] }
  | { t: 'code'; lang?: string; v: string }
  | { t: 'callout'; kind: CalloutKind; title: Inline[]; c: Block[] }
  | { t: 'quote'; c: Block[] }
  | { t: 'hr' };

export interface ChapterSection {
  id: string;
  number?: string;
  title: string;
}

export interface Chapter {
  slug: string;
  /** "5", or "A" for the annex. */
  number: string;
  title: string;
  sections: ChapterSection[];
  blocks: Block[];
}

/** What the routes, the landing page and the chapter navigation need — no chapter content. */
export interface ChapterSummary {
  slug: string;
  /** Its source, relative to the floorspec repo: spec/core/05-walls.md, spec/ops/03-references.md. */
  file: string;
  number: string;
  title: string;
  /** From the chapter table in its specification's README.md. */
  summary: string;
  statements: number;
}

/**
 * A statement ID a later draft retired (its chapter 0, "Changes from"): never reused, and a link to
 * it still lands on the page it was on, which says what replaced it and where it is still published.
 */
export interface RetiredStatement {
  id: string;
  /** The statement that took its place in the same draft, and its address (`#…` when on the same page). */
  replacedBy?: { id: string; href: string };
  why: Inline[];
  /** "1.2": the section it was in, and the chapter of the current draft that section is in. */
  section: string;
  chapter: string;
  /** The newest earlier draft that has it, and its address there. */
  was: { version: string; href: string };
}

/** One draft of one specification — Core 0.2, Ops 0.1 — as the routes, the landing page and the navigation see it. */
export interface SpecIndex {
  /** Its directory under spec/, and its path segment here: `core` → /floorspec/core/<chapter>. */
  spec: string;
  /** "Floorspec Ops". */
  name: string;
  /** "Ops" — what another specification calls it ("Core §5.3"). */
  short: string;
  /** Its draft version, from its README: "0.2". */
  version: string;
  /** Where its chapters are: `/floorspec/core` for the current draft, `/floorspec/core/0.1` for an earlier one. */
  base: string;
  /** The floorspec commit its text, suite and coverage come from. */
  commit: string;
  chapters: ChapterSummary[];
  statements: number;
  /** MUST and MUST NOT: the statements the suite must cover. */
  mandatory: number;
  /** How many of those have at least one conformance test, and how many tests there are. */
  covered: number;
  tests: number;
  /** The statement IDs this draft retired (current drafts only). */
  retired?: RetiredStatement[];
}

export interface FloorspecIndex {
  /** The current draft of every specification the pinned commit has chapters for, in the order the site shows them. */
  specifications: SpecIndex[];
  /** Every earlier draft still published, from the commit that pinned it — newest version first within a specification. */
  earlier: SpecIndex[];
}

export interface CoverageRow {
  id: string;
  level: Level;
  section: string;
  /** The chapter the statement lives in, for its link. */
  chapter: string;
  text: string;
  tests: number;
}

export interface Coverage {
  spec: string;
  version: string;
  /** Where the numbers came from: the floorspec repo's own gate, or this site's scan of the suite. */
  source: string;
  tests: number;
  mandatory: number;
  covered: number;
  statements: CoverageRow[];
}
