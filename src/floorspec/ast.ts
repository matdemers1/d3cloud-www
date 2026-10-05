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
  /** Its source, relative to the floorspec repo: spec/core/05-walls.md, registry/FS_electrical/spec.md. */
  file: string;
  sections: ChapterSection[];
  blocks: Block[];
  /**
   * The statement IDs the draft retired that were in this chapter's sections (current drafts only):
   * each gets a note here. Kept with the chapter's text, not in the index the routes load.
   */
  retired?: RetiredStatement[];
}

/** What the routes, the landing page and the chapter navigation need — no chapter content. */
export interface ChapterSummary {
  slug: string;
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
  /**
   * The statement that takes its place in this draft, and its address (`#…` when on the same page).
   * When the table names a statement a later draft retired in turn, `via` lists the IDs followed to
   * reach it: Ops 0.2 replaced FS-OPS-1.1.1 with FS-OPS-1.1.2, which Ops 0.3 replaced with 1.1.3.
   */
  replacedBy?: { id: string; href: string; via?: string[] };
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
  /** How many statement IDs this draft retired (current drafts only); the notes are in each chapter's JSON. */
  retired?: number;
}

export interface FloorspecIndex {
  /** The current draft of every specification the pinned commit has chapters for, in the order the site shows them. */
  specifications: SpecIndex[];
  /** Every earlier draft still published, from the commit that pinned it — newest version first within a specification. */
  earlier: SpecIndex[];
  /** Every extension in the registry at the pinned commit (registry/<NAME>/extension.json), by name. */
  extensions: ExtensionIndex[];
  /** Every library published at /floorspec/library/<name>/<version>/, by name. */
  libraries: LibraryIndex[];
}

/** A registry entry's status (registry/README.md, Lifecycle). */
export type ExtensionStatus = 'proposal' | 'draft' | 'releaseCandidate' | 'ratified';

/** What the routes need of an extension: /floorspec/registry/<name>. */
export interface ExtensionIndex {
  name: string;
  version: string;
  status: ExtensionStatus;
  title: string;
}

/** What the routes need of a library: /floorspec/library/<name> and /floorspec/library/<name>/<version>. */
export interface LibraryIndex {
  name: string;
  title: string;
  /** Oldest first. */
  versions: string[];
}

/** An implementation's evidence that it passed an extension's suite: registry/<NAME>/evidence/<slug>.json. */
export interface Evidence {
  /** Its path in the floorspec repo. */
  file: string;
  implementation: { name: string; url: string; version: string };
  maintainer: string;
  sharesCodeWith: string[];
  extensionVersion: string;
  /** The floorspec commit whose suite it ran, and how many tests that suite held then. */
  suite: { commit: string; tests: number };
  result: { passed: number; failed: number };
  ran: string;
  /** A public run: a CI job. */
  run: string;
}

/** One extension as /floorspec/registry and its own page show it — generated/registry/index.json, a lazy chunk. */
export interface ExtensionDetail extends ExtensionIndex {
  /** Its statement code: `ELEC` for FS-ELEC-3.1.1. Absent for a Proposal, which has no specification. */
  code?: string;
  /** What it describes, from the official extensions table of registry/README.md. */
  summary: string;
  /** The entry's `schema`: where its JSON Schema for this version is published. */
  schema?: string;
  requires: Record<string, string>;
  kinds: { collection: string; title: string; asset: boolean; symbol: boolean }[];
  /** The room-function terms it adds. */
  terms: string[];
  implementations: { name: string; url: string }[];
  evidence: Evidence[];
  /** Recorded exceptions to the lifecycle gates for this version (registry/exceptions.json). */
  exceptions: { waives: string; decision: string; until: string }[];
  /** Its published schema files, at the path each one's `$id` names. */
  schemas: { file: string; path: string }[];
  /** Earlier versions' schemas, still published at their own URLs. */
  earlierSchemas: string[];
  /** Its specification (spec.md) or, for a Proposal, its rationale (proposal.md), relative to the repo; absent when it has neither. */
  document?: string;
  statements: number;
  mandatory: number;
  /** Mandatory statements with a test in conformance/ext/<NAME>/<version>/, and how many tests that suite holds. */
  covered: number;
  tests: number;
  suite: string;
  /** The library it ships, published at /floorspec/library/<name>/<version>. */
  library?: { name: string; version: string };
}

export interface Registry {
  commit: string;
  /** registry/README.md, rendered on /floorspec/registry. */
  readme: Block[];
  extensions: ExtensionDetail[];
}

export interface LibraryItem {
  id: string;
  kind: string;
  name: string;
  /** Its files, relative to the version's directory. */
  files: string[];
}

/** One version of one library, published byte for byte at /floorspec/library/<name>/<version>/. */
export interface LibraryVersion {
  name: string;
  version: string;
  title: string;
  description: string;
  license?: string;
  licenseUrl?: string;
  /** The extension it belongs to, for an extension's library. */
  extension?: string;
  /** The Core draft its items are written for, when it says. */
  floorspec?: string;
  /** Where it is in the floorspec repo, and the commit it was published from. */
  source: string;
  commit: string;
  /** /floorspec/library/us-starter/0.1.0 */
  base: string;
  /** Its manifest: index.json, library.json. */
  manifest: string;
  /** Whether the manifest itself names the URL it is published at (`uri`), or the site chose it. */
  canonical: boolean;
  files: { path: string; bytes: number }[];
  bytes: number;
  items: LibraryItem[];
}

export interface Libraries {
  libraries: { name: string; title: string; versions: LibraryVersion[] }[];
}

/** The rule packs in rules/ at the pinned commit — data, not a specification. */
export interface Packs {
  packs: { name: string; version: string; title: string; description: string; synthetic: boolean; rules: number; license: string }[];
  /** The publishers' free public viewers a citation may link to (rules/viewers.json). */
  viewers: { host: string; publisher: string }[];
  /** Non-synthetic packs in the coverage matrix (rules/coverage.json). */
  covered: number;
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
