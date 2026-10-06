import { Suspense, use, type ReactNode } from 'react';
import { Link as UiLink } from '@d3cloud/ui';
import { Link } from '../router';
import { Band, Kicker, PrimaryButton, SecondaryButton, WRAP } from '../components/Marketing';
import { ProductMark } from '../components/ProductMark';
import { workshopBySlug, workshopPath } from '../content/ecosystem';
import type { Block, ChapterSection, ChapterSummary, Coverage, CoverageRow, Packs, RetiredStatement, SpecIndex } from './ast';
import { loadChapter, loadCoverage } from './load';
// Every published schema file, by its path under the site root (and its SHA-256, which only the
// tests read). Imported here, in the lazy chunk, rather than beside the routes.
import PUBLISHED_SCHEMAS from './published-schemas.json';
import { Blocks, Inlines, LINK, LevelBadge } from './Prose';
// The crumb above a page's title, in a module of its own so the playground shares it without this chunk.
import { Crumb } from './Crumb';
export { Crumb };
import { CopyContext } from './copy';
import { asSentence, listOf, shortSha, useCopiedNote, useLateFragment } from './util';
import {
  CORE,
  EARLIER,
  EXTENSIONS,
  FLOORSPEC,
  FLOORSPEC_LOCK,
  FLOORSPEC_REPO,
  LIBRARIES,
  SPECS,
  STATUS_LABEL,
  chapterBySlug,
  chapterLabel,
  chapterPath,
  earlierOf,
  isCurrent,
  pinnedTree,
  specAt,
  specByCode,
  specName,
} from './spec';

/**
 * The Floorspec standard's pages (DI-T-10.2, DI-T-10.4, DI-T-10.5, DI-T-10.6, FLR-ADR-018): the
 * landing page, a page per chapter of each specification's current draft (Core, Ops and Rules) and
 * of every earlier draft still published (Core and Ops 0.2 and 0.1), and the conformance coverage
 * of all of them. The registry and library pages are in ./registry.tsx. All of it is lazily loaded,
 * and each chapter's text is a chunk of its own, so none of it weighs on the rest of the site.
 */

/** The rule packs in rules/ (DI-T-10.6), when the pinned commit has any. */
const PACKS: Packs | undefined = Object.values(import.meta.glob<Packs>('./generated/packs.json', { eager: true, import: 'default' }))[0];

const APP_PATH = (() => {
  const app = workshopBySlug('floorspec-app');
  return app ? workshopPath(app) : '/floorspec/app';
})();

const firstChapter = (spec: SpecIndex) => chapterPath(spec, spec.chapters[0]!.slug);

/** The same chapter in another draft, or that draft's first chapter when it has no such chapter. */
const sameChapter = (spec: SpecIndex, slug: string) =>
  chapterBySlug(spec, slug) ? chapterPath(spec, slug) : firstChapter(spec);

/** A draft's section on the coverage page: `#core` for the current one, `#core-0.1` for an earlier one. */
const coverageAnchor = (spec: SpecIndex) => (isCurrent(spec) ? spec.spec : `${spec.spec}-${spec.version}`);

/** Every published schema of one draft of one specification, by its path under the site root. */
const schemasOf = (spec: SpecIndex) =>
  Object.keys(PUBLISHED_SCHEMAS)
    .filter((path) => path.startsWith(`floorspec/schema/${spec.spec}/${spec.version}/`))
    .sort();

/** The extension registry's schemas (Core 0.2, 12.2): not a specification's, so listed on their own. */
const REGISTRY_SCHEMAS = Object.keys(PUBLISHED_SCHEMAS)
  .filter((path) => path.startsWith('floorspec/schema/registry/'))
  .sort();

const percent = (spec: SpecIndex) => (spec.mandatory ? Math.floor((100 * spec.covered) / spec.mandatory) : 0);

/** The banner every Floorspec page carries until 1.0 (FLR-ADR-017). */
export function DraftBanner({ compact = false, version = CORE.version }: { compact?: boolean; version?: string }) {
  return (
    <div
      role="note"
      aria-label="Draft status"
      className={`flex flex-col gap-1.5 rounded-lg border border-warning bg-warning-muted ${compact ? 'px-4 py-3' : 'p-5 sm:p-6'}`}
    >
      <p className="font-mono text-12 font-semibold tracking-label text-warning uppercase">
        Draft {version} — no compatibility promise
      </p>
      <p className={`${compact ? 'text-14' : 'text-16'} text-fg`}>
        This is a working draft. Any later 0.x draft may change any part of it, and Floorspec stays
        0.x until a real house has been fully modelled in it.
      </p>
    </div>
  );
}

/**
 * An earlier draft's banner in place of the draft banner: it is kept exactly as published so links
 * and implementations that target it keep working, and it says where the current draft is.
 */
function SupersededBanner({ spec, slug }: { spec: SpecIndex; slug?: string }) {
  const now = specByCode(spec.spec)!;
  return (
    <div role="note" aria-label="Earlier draft" className="flex flex-col gap-1.5 rounded-lg border border-border-field bg-surface px-4 py-3">
      <p className="font-mono text-12 font-semibold tracking-label text-fg-muted uppercase">
        Draft {spec.version} — superseded by Draft {now.version}
      </p>
      <p className="text-14 text-fg">
        This is {specName(spec)}, an earlier draft, kept exactly as it was published. The current draft
        is{' '}
        <Link to={slug ? sameChapter(now, slug) : firstChapter(now)}>
          {specName(now)}
          {slug && chapterBySlug(now, slug) ? ` — this chapter` : ''}
        </Link>
        .
      </p>
    </div>
  );
}

/** On a current draft's chapter: which draft it is, and where each earlier one is (DI-T-10.5). */
function VersionNote({ spec, slug }: { spec: SpecIndex; slug: string }) {
  const older = earlierOf(spec.spec);
  if (!older.length) return null;
  const isNew = older.every((old) => !chapterBySlug(old, slug));
  return (
    <p className="text-14 text-fg-muted">
      <span className="font-semibold text-fg">
        {spec.short} {spec.version} Draft
      </span>
      {isNew && ` · new in ${spec.version}`}
      {older.map((old) => (
        <span key={old.version}>
          {' · '}
          {spec.short} {old.version} is published, unchanged, at{' '}
          <Link to={sameChapter(old, slug)} className="font-mono text-13 break-all">
            {chapterBySlug(old, slug) ? chapterPath(old, slug) : `${old.base}/…`}
          </Link>
        </span>
      ))}
    </p>
  );
}

/** "From matdemers1/floorspec@2c7b253", linking to that commit's tree — or to a file in it. */
export function Pinned({ path, commit = FLOORSPEC_LOCK.commit, className = '' }: { path?: string; commit?: string; className?: string }) {
  return (
    <p className={`text-13 text-fg-muted ${className}`}>
      From{' '}
      <UiLink href={pinnedTree(path, commit)}>
        {FLOORSPEC_LOCK.repository}@{shortSha(commit)}
      </UiLink>
      {path ? ` · ${path}` : ''}
    </p>
  );
}

// ---------------------------------------------------------------------------------------------
// /floorspec

const IDEAS: { title: string; text: ReactNode }[] = [
  {
    title: 'Exact, integer geometry',
    text: (
      <>
        Every length is a whole number of base units, and one base unit is 1/1280 mm — so millimetres
        and imperial lengths to 1/256 inch are both exact. Derived values are computed exactly and
        rounded once, so every implementation lands on the same corner.
      </>
    ),
  },
  {
    title: 'Walls on a junction graph',
    text: (
      <>
        Walls are edges between junctions. A wall never stores its corners: they are computed from
        the graph, joins included. Move a junction and every wall that meets there follows.
      </>
    ),
  },
  {
    title: 'Rooms derived, and anchored',
    text: (
      <>
        A room is a face of the wall graph, named by an anchor point inside it. Its outline and net
        area are derived, never drawn — and the anchor keeps its identity when the walls move.
      </>
    ),
  },
  {
    title: 'One canonical form, one hash',
    text: (
      <>
        Every document has exactly one canonical byte sequence, and a SHA-256 content hash over it:
        equal houses, equal hashes. Diffs, caches and reviews all rest on that.
      </>
    ),
  },
  {
    title: 'Every MUST has a test',
    text: (
      <>
        Each normative sentence carries a stable ID you can link to, and every MUST and MUST NOT
        needs at least one test in the conformance suite — the standard’s own coverage gate fails
        until each one has it.
      </>
    ),
  },
  {
    title: 'Extensions for everything else',
    text: (
      <>
        Building systems, furniture and appliances arrive as extensions — official ones prefixed{' '}
        <code className="font-mono">FS_</code> — so Core stays small, and a reader without an extension
        still sees that something is there.
      </>
    ),
  },
];

/**
 * The three specifications, as the landing page introduces them. One that is drafted links to its
 * chapters; one that is not yet is shown as such.
 */
const SPECIFICATIONS: { code: string; name: string; text: string; title: string; intro: ReactNode }[] = [
  {
    code: 'core',
    name: 'Floorspec Core',
    text: 'The document: levels, straight and arc walls on a junction graph, rooms, openings, types and materials, the program, extensions, hosted elements, circulation, floors and ceilings, roofs at any pitches, straight, winder and spiral stairs, finishes and design options — what makes it valid, the exact geometry derived from it, and its canonical form.',
    title: 'The document.',
    intro: (
      <>
        What a house <em>is</em>: the document, its units and identity, walls — straight or along an
        arc — and the rooms they enclose, openings and how their doors and windows operate, types,
        materials and finishes, the program it is designed against, extensions, the elements hosted on
        walls and floors with the clearances they need, how you get from room to room, floors,
        ceilings and slabs, roofs at one pitch or several, straight, winder and spiral stairs, and
        design options side by side — what makes a document valid, the exact geometry every reader
        derives from it, its one canonical form, and a mapping to IFC.
      </>
    ),
  },
  {
    code: 'ops',
    name: 'Floorspec Ops',
    text: 'The normative edit operations: a relative reference grammar, atomic batches and locks — how a person or an agent changes a document, its program and the devices on its walls.',
    title: 'The edits.',
    intro: (
      <>
        How a house <em>changes</em>: a batch of operations applied as one transaction that either
        commits or changes nothing, five primitives and the composites people actually ask for, a
        reference grammar that turns “two foot six” and “the north wall of the kitchen” into exact
        values, normalization, and locks — and edits to the program, to hosted elements, and within
        a design option. It operates on Core documents and is versioned on its own.
      </>
    ),
  },
  {
    code: 'rules',
    name: 'Floorspec Rules',
    text: 'Advisory building-code rules with citations, as data, with jurisdiction profiles. Findings are advice: they never say “compliant”.',
    title: 'The advice.',
    intro: (
      <>
        What a building code <em>says</em> about a house, as advice: rule records that each cite one
        section of one edition of a code in the contributor’s own words, a library of named measures,
        findings and the report that carries them, and jurisdiction profiles. It evaluates Core
        documents with the official extensions, and is versioned on its own. A finding never makes a
        document invalid, never stops an edit, and never says that a design meets a code.
      </>
    ),
  },
];

/** A drafted specification on the landing page: its chapters, then its schemas. */
function SpecBand({ spec, sunken }: { spec: SpecIndex; sunken: boolean }) {
  const copy = SPECIFICATIONS.find((s) => s.code === spec.spec);
  const schemas = schemasOf(spec);
  const base = `https://d3cloud.io/floorspec/schema/${spec.spec}/${spec.version}/`;
  return (
    <Band label={specName(spec)} title={copy?.title || 'The chapters.'} sunken={sunken}>
      <div className="flex flex-col gap-8">
        {copy?.intro && <p className="max-w-3xl text-16 text-fg sm:text-20">{copy.intro}</p>}
        <ol
          aria-label={`${specName(spec)} chapters`}
          className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface"
        >
          {spec.chapters.map((chapter) => (
            <li key={chapter.slug}>
              <Link
                to={chapterPath(spec, chapter.slug)}
                variant="muted"
                className="flex gap-4 px-5 py-4 no-underline hover:bg-surface-hover"
              >
                <span className="w-6 shrink-0 font-mono text-14 leading-6 text-fg-faint">{chapter.number}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <span className="text-16 font-semibold text-fg">{chapter.title}</span>
                    {chapter.statements > 0 && (
                      <span className="font-mono text-12 whitespace-nowrap text-fg-faint">
                        {chapter.statements} {chapter.statements === 1 ? 'statement' : 'statements'}
                      </span>
                    )}
                  </span>
                  <span className="text-14 text-fg-muted">
                    {asSentence(chapter.summary)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <div className="flex max-w-3xl flex-col gap-3">
          <h3 className="text-16 font-semibold text-fg">Schemas</h3>
          {schemas.length > 0 ? (
            <>
              <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {schemas.map((path) => (
                  <li key={path} className="truncate font-mono text-13">
                    <UiLink href={`/${path}`}>{path.split('/').pop()}</UiLink>
                  </li>
                ))}
              </ul>
              <p className="font-mono text-12 break-all text-fg-muted">{base}</p>
            </>
          ) : (
            <p className="rounded-lg border border-dashed border-border-field p-4 text-14 text-fg-muted">
              The schemas for {specName(spec)} are being written; they will appear at {base}.
            </p>
          )}
        </div>
        {(spec.spec === 'core' && REGISTRY_SCHEMAS.length > 0) || earlierOf(spec.spec).length > 0 ? (
          <div className="flex max-w-3xl flex-col gap-2 text-14 text-fg-muted">
            {spec.spec === 'core' &&
              REGISTRY_SCHEMAS.map((path) => (
                <p key={path}>
                  The extension registry’s entry schema (chapter 12):{' '}
                  <UiLink href={`/${path}`}>{path.replace('floorspec/schema/', '')}</UiLink>
                </p>
              ))}
            {earlierOf(spec.spec).map((old) => (
              <p key={old.version}>
                {specName(old)} stays published exactly as it was:{' '}
                <Link to={firstChapter(old)}>its chapters</Link>
                {schemasOf(old).length > 0 && (
                  <>
                    , and its schemas at{' '}
                    <span className="font-mono text-13 whitespace-nowrap">
                      /floorspec/schema/{old.spec}/{old.version}/
                    </span>
                  </>
                )}
                .
              </p>
            ))}
          </div>
        ) : null}
        {spec.spec === 'rules' && PACKS && <RulePacks packs={PACKS} />}
        <Pinned path={`spec/${spec.spec}`} />
      </div>
    </Band>
  );
}

/** The rule packs the repository holds — data a Rules evaluator reads, not part of the specification. */
function RulePacks({ packs }: { packs: Packs }) {
  return (
    <div className="flex max-w-3xl flex-col gap-3">
      <h3 className="text-16 font-semibold text-fg">Rule packs</h3>
      <p className="text-14 text-fg-muted">
        A rule pack is versioned data under CC BY 4.0, kept in the repository’s{' '}
        <UiLink href={pinnedTree('rules')}>rules/</UiLink>: each rule cites a section of an edition of a
        code, in its contributor’s own words, and links to its publisher’s free public viewer — never
        to a copy of its text.
        {packs.covered === 0 && ' No pack of a real code is published yet.'}
      </p>
      <ul className="flex flex-col gap-2">
        {packs.packs.map((pack) => (
          <li key={pack.name} className="text-14 text-fg">
            <UiLink href={pinnedTree(`rules/${pack.name}`)}>
              {pack.title} {pack.version}
            </UiLink>{' '}
            <span className="text-fg-muted">
              · {pack.rules} {pack.rules === 1 ? 'rule' : 'rules'}
              {pack.synthetic ? ' · the codes it cites stand for no real code' : ''}
            </span>
          </li>
        ))}
      </ul>
      {packs.viewers.length > 0 && (
        <p className="text-13 text-fg-muted">
          Citations may link to the free viewers of {listOf(packs.viewers.map((v) => v.publisher))}.
        </p>
      )}
    </div>
  );
}

/**
 * What a draft changed inside chapters an earlier draft already had, which the index cannot see:
 * written by hand from the draft's own "Changes from" section, and keyed by `<spec>@<version>` so a
 * note shows only while its draft is current — the next draft drops it rather than misstating it.
 */
const CHANGED: Record<string, { slug: string; hash?: string; title: string; text: string }[]> = {
  'core@0.4': [
    {
      slug: 'stairs',
      hash: '17.7',
      title: 'Winder and spiral stairs',
      text: 'Tapered treads derived exactly, on rays from the pivot of a turn or a spiral’s centre — with the walkline, the goings at the walkline and at the narrow end, a winder’s newel, and the headroom and floor opening a stair needs.',
    },
    {
      slug: 'roofs',
      hash: '16.4',
      title: 'Mixed-pitch roofs',
      text: 'Saltboxes, hips and wings at mixed pitches, gables side by side and oblique edges, derived exactly from a weighted straight skeleton — with a break line where a roof changes pitch.',
    },
  ],
  'ops@0.4': [
    {
      slug: 'conventions',
      hash: '0.4',
      title: 'Arc walls and Core 0.4 documents',
      text: 'Arc walls and separators are added, bent, flipped and straightened with the operations Ops already has, and planarization never routes or splits one; a stair’s headroom and a winder’s newel are members like any other. No new operation: requests keep the Ops 0.3 schema.',
    },
  ],
  'rules@0.2': [
    {
      slug: 'wall-lines',
      hash: '8.5',
      title: 'Winder and spiral stair measures',
      text: 'Documents are read as Core 0.4 reads them, so a winder or spiral stair has a headroom; three new measures — its form, its going at the walkline and its going at the narrow end — are what a code’s rules for tapered treads compare.',
    },
  ],
};

/**
 * What the current drafts add: each chapter that no earlier draft of its specification had and a
 * specification published for the first time, read from the index — then what CHANGED says the
 * draft changed in chapters it kept.
 */
type ChangeNote = (typeof CHANGED)[string][number];

function whatsNew(): { spec: SpecIndex; chapter: ChapterSummary; first: boolean; note?: ChangeNote }[] {
  return SPECS.flatMap((spec) => {
    const older = earlierOf(spec.spec)[0];
    if (!older) return [{ spec, chapter: spec.chapters[0]!, first: true }];
    const added = spec.chapters.filter((chapter) => !chapterBySlug(older, chapter.slug)).map((chapter) => ({ spec, chapter, first: false }));
    const changed = (CHANGED[`${spec.spec}@${spec.version}`] ?? []).flatMap((note) => {
      const chapter = chapterBySlug(spec, note.slug);
      return chapter ? [{ spec, chapter, first: false, note }] : [];
    });
    return [...added, ...changed];
  });
}

function WhatsNew({ sunken }: { sunken: boolean }) {
  const items = whatsNew();
  return (
    <Band label={`Draft ${CORE.version}`} title={`What ${CORE.version} adds.`} sunken={sunken}>
      <div className="flex flex-col gap-8">
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map(({ spec, chapter, first, note }) => (
            <li key={`${spec.spec}/${chapter.slug}`}>
              <Link
                to={chapterPath(spec, chapter.slug, note?.hash)}
                variant="muted"
                className="flex h-full flex-col gap-1.5 rounded-lg border border-border bg-surface p-5 no-underline hover:bg-surface-hover"
              >
                <span className="font-mono text-12 text-fg-faint">
                  {first ? `${specName(spec)} · its first draft` : `${spec.short} ${spec.version} · ${chapterLabel(chapter)}`}
                </span>
                <span className="text-16 font-semibold text-fg">{first ? spec.name : (note?.title ?? chapter.title)}</span>
                <span className="text-14 text-fg-muted">
                  {first
                    ? `${spec.chapters.length} chapters and ${spec.statements} statements. ${SPECIFICATIONS.find((s) => s.code === spec.spec)?.text ?? ''}`
                    : (note?.text ?? asSentence(chapter.summary))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {EARLIER.length > 0 && (
          <p className="max-w-3xl text-14 text-fg-muted">
            {EARLIER.map((old, i) => (
              <span key={`${old.spec}/${old.version}`}>
                {i > 0 && (i === EARLIER.length - 1 ? ' and ' : ', ')}
                <Link to={firstChapter(old)}>{specName(old)}</Link>
              </span>
            ))}{' '}
            stay published exactly as they were, at their own addresses, and every schema already
            published keeps its URL.
          </p>
        )}
      </div>
    </Band>
  );
}

/** The registry's extensions, on the landing page (DI-T-10.6). */
function RegistryBand({ sunken }: { sunken: boolean }) {
  return (
    <Band label="Extensions" title="The registry." sunken={sunken}>
      <div className="flex flex-col gap-8">
        <p className="max-w-3xl text-16 text-fg-muted">
          Building systems and furniture arrive as extensions, so Core stays small. Each has its own
          specification with statements in an ID space of its own, a JSON Schema at a URL that never
          changes, a conformance suite, and a status that moves from Proposal to Ratified only as
          implementations prove it.
        </p>
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {EXTENSIONS.map((ext) => (
            <li key={ext.name}>
              <Link
                to={`/floorspec/registry/${ext.name}`}
                variant="muted"
                className="flex h-full flex-col gap-1.5 rounded-lg border border-border bg-surface p-5 no-underline hover:bg-surface-hover"
              >
                <span className="font-mono text-14 font-semibold text-fg">{ext.name}</span>
                <span className="text-14 text-fg-muted">{ext.title}</span>
                <span className="font-mono text-12 text-fg-faint">
                  {ext.version} · {STATUS_LABEL[ext.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div>
          <SecondaryButton href="/floorspec/registry">The registry, its lifecycle and evidence</SecondaryButton>
        </div>
      </div>
    </Band>
  );
}

/** The libraries, on the landing page (DI-T-10.6). */
function LibrariesBand({ sunken }: { sunken: boolean }) {
  return (
    <Band label="Libraries" title="Ready to copy in." sunken={sunken}>
      <div className="flex max-w-3xl flex-col gap-6">
        <p className="text-16 text-fg-muted">
          Ready-made items — types, materials, furniture — that a document copies into itself. They
          are not part of the standard, and nothing requires them. Each version is published here byte
          for byte, at an address that never changes.
        </p>
        <ul className="flex flex-col gap-3">
          {LIBRARIES.map((lib) => (
            <li key={lib.name} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <Link to={`/floorspec/library/${lib.name}`} className="text-16 font-semibold">
                {lib.title}
              </Link>
              <span className="font-mono text-12 text-fg-faint">
                /floorspec/library/{lib.name}/{lib.versions[lib.versions.length - 1]}/
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Band>
  );
}

export function StandardPage() {
  // The bands alternate plain and sunken, whichever of them are shown.
  let band = 0;
  const sunk = () => band++ % 2 === 0;
  const news = whatsNew().length > 0;
  return (
    <>
      <section aria-labelledby="floorspec-title" className="relative overflow-hidden">
        <div className={`${WRAP} relative flex flex-col gap-7 pt-16 pb-14 lg:pt-24`}>
          <ProductMark
            slug={FLOORSPEC.slug}
            accent={FLOORSPEC.accent}
            size={160}
            halo
            className="size-18 animate-rise text-fg lg:absolute lg:top-24 lg:right-16 lg:size-60 xl:right-24"
          />
          <p className="flex animate-rise items-start gap-2.5 font-mono text-12 tracking-label text-fg-muted uppercase">
            <span aria-hidden="true" className="mt-1 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: FLOORSPEC.accent }} />
            <span>An open standard · Houses as code · Draft {CORE.version}</span>
          </p>
          <h1 id="floorspec-title" className="stagger-1 animate-rise font-display text-display-xl tracking-display text-fg">
            Floorspec
          </h1>
          <p className="stagger-2 max-w-3xl animate-rise font-display text-display-sm text-fg">
            An open standard for describing houses as code.
          </p>
          <p className="stagger-2 max-w-2xl animate-rise text-16 text-fg-muted sm:text-20">
            A house as a typed, exact document — levels, walls on a junction graph, the rooms they
            enclose, the openings they host — that people and AI agents can read, edit, validate and
            render, and that two tools always read the same way.
          </p>
          <div className="stagger-3 flex animate-rise flex-wrap items-center gap-3 pt-2">
            <PrimaryButton href={firstChapter(CORE)}>Read {specName(CORE)}</PrimaryButton>
            {SPECS.filter((spec) => spec !== CORE).map((spec) => (
              <SecondaryButton key={spec.spec} href={firstChapter(spec)}>
                Read {specName(spec)}
              </SecondaryButton>
            ))}
            <SecondaryButton href="/floorspec/playground">Try a file in the playground</SecondaryButton>
            <SecondaryButton href={FLOORSPEC_REPO}>The repository ↗</SecondaryButton>
          </div>
        </div>
        <div className={`${WRAP} pb-16`}>
          <DraftBanner />
        </div>
      </section>

      <Band label="Why" title="Houses as code." sunken={sunk()}>
        <div className="flex flex-col gap-10">
          <p className="max-w-3xl text-16 text-fg sm:text-20">
            Floor plans live in drawings and in proprietary files. A drawing cannot be diffed, and a
            file only its own tool can read cannot be checked. Floorspec describes a house the way code
            describes a program: a document with exact meaning, validated by rules anyone can run, so a
            change — yours or an agent’s — can be reviewed before it is accepted.
          </p>
          <ul className="grid gap-x-10 gap-y-8 md:grid-cols-2">
            {IDEAS.map((idea) => (
              <li key={idea.title} className="flex gap-3">
                <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full" style={{ backgroundColor: FLOORSPEC.accent }} />
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-16 font-semibold text-fg">{idea.title}</h3>
                  <p className="text-16 text-fg-muted">{idea.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Band>

      {news && <WhatsNew sunken={sunk()} />}

      <Band label="The specifications" title="Three of them." sunken={sunk()}>
        <ul className="flex flex-col gap-4">
          {SPECIFICATIONS.map((copy) => {
            const spec = specByCode(copy.code);
            const schemas = spec ? schemasOf(spec).length : 0;
            const body = (
              <>
                <span className="flex flex-wrap items-center gap-3">
                  <span className="text-16 font-semibold text-fg">{copy.name}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-mono text-11 tracking-label uppercase ${spec ? 'bg-warning-muted text-warning' : 'border border-dashed border-border-field text-fg-muted'}`}
                  >
                    {spec ? `Draft ${spec.version}` : 'Not yet drafted'}
                  </span>
                </span>
                <span className="max-w-2xl text-14 text-fg-muted">{copy.text}</span>
                {spec && (
                  <span className="font-mono text-12 text-fg-faint">
                    {spec.chapters.length} chapters · {spec.statements} statements · {schemas}{' '}
                    {schemas === 1 ? 'schema' : 'schemas'}
                  </span>
                )}
                {spec && <span className="text-14 font-semibold text-fg">Read it →</span>}
              </>
            );
            const frame = 'flex h-full flex-col gap-2 rounded-lg border p-5 sm:p-6';
            return (
              <li key={copy.code}>
                {spec ? (
                  <Link to={firstChapter(spec)} variant="muted" className={`${frame} border-border bg-surface no-underline hover:bg-surface-hover`}>
                    {body}
                  </Link>
                ) : (
                  <div className={`${frame} border-dashed border-border-field`}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </Band>

      {SPECS.map((spec) => (
        <SpecBand key={spec.spec} spec={spec} sunken={sunk()} />
      ))}

      {EXTENSIONS.length > 0 && <RegistryBand sunken={sunk()} />}
      {LIBRARIES.length > 0 && <LibrariesBand sunken={sunk()} />}

      <Band label="Conformance" title="Every MUST, tested." sunken={sunk()}>
        <div className="flex max-w-3xl flex-col gap-6">
          <p className="text-16 text-fg-muted">
            Every MUST and MUST NOT needs at least one test in its specification’s conformance suite,
            and the standard’s coverage gate fails until each one has it.
          </p>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SPECS.map((spec) => (
              <li key={spec.spec} className="flex flex-col gap-1">
                <span className="font-display text-display-md text-fg">
                  {spec.covered} of {spec.mandatory}
                </span>
                <span className="text-14 text-fg-muted">
                  mandatory statements in {specName(spec)} have a test ({percent(spec)}%)
                  {spec.tests === 0 ? ' — the suite is being written.' : `, from ${spec.tests} tests.`}
                </span>
              </li>
            ))}
          </ul>
          <div>
            <SecondaryButton href="/floorspec/coverage">See every statement</SecondaryButton>
          </div>
        </div>
      </Band>

      <Band label="Reference implementation" title="D3 Floorspec." sunken={sunk()}>
        <div className="flex max-w-3xl flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
          <ProductMark slug="floorspec-app" accent={FLOORSPEC.accent} size={72} className="text-fg" />
          <div className="flex flex-col gap-4">
            <p className="text-16 text-fg">
              A self-hosted web app and MCP server where you design a house with Claude: you draw and
              decide, Claude proposes changes, and every change is validated by an exact Floorspec
              engine, attributed, and yours to accept or reject.
            </p>
            <p className="text-14 text-fg-muted">Being built now, against this draft. Apache-2.0.</p>
            <div>
              <SecondaryButton href={APP_PATH}>Where D3 Floorspec stands →</SecondaryButton>
            </div>
          </div>
        </div>
      </Band>

      <Band label="Licence" title="Yours to use." sunken={sunk()}>
        <div className="flex max-w-3xl flex-col gap-3 text-16 text-fg">
          <p>
            The specification text is{' '}
            <UiLink href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</UiLink>. The schemas,
            the conformance suite and the tooling are{' '}
            <UiLink href={`${FLOORSPEC_REPO}/blob/${FLOORSPEC_LOCK.commit}/LICENSE`}>Apache-2.0</UiLink>.
          </p>
          <p className="text-14 text-fg-muted">
            Floorspec findings are advisory: they are not a plan review, and the authority having
            jurisdiction decides.
          </p>
          <Pinned />
        </div>
      </Band>
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// /floorspec/<spec>/<chapter>

/**
 * Where a statement ID this draft retired used to be (DI-T-10.5): a link to it — from an old
 * citation, or from the earlier draft's own pages — lands here, and says what replaced it and where
 * the statement as it was is still published.
 */
function RetiredNote({ spec, item }: { spec: SpecIndex; item: RetiredStatement }) {
  // The draft that retired it is the first one published after the newest that had it — 0.2 for
  // FS-CORE-1.2.1, though its note now sits in a later draft's chapter.
  const retiredIn =
    [spec, ...earlierOf(spec.spec)]
      .map((s) => s.version)
      .filter((v) => v.localeCompare(item.was.version, 'en', { numeric: true }) > 0)
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))[0] ?? spec.version;
  return (
    <aside
      id={item.id}
      aria-label={`Retired statement ${item.id}`}
      className="flex scroll-mt-28 flex-col gap-1.5 rounded-md border border-dashed border-border-field px-4 py-3 text-14 text-fg-muted target:border-warning target:bg-warning-muted"
    >
      <p className="font-mono text-11 font-semibold tracking-label text-fg-faint uppercase">
        {item.id} · retired in {spec.short} {retiredIn}
      </p>
      <p>
        {item.replacedBy && (
          <>
            Replaced by{' '}
            {item.replacedBy.href.startsWith('/') ? (
              <Link to={item.replacedBy.href} className={`font-mono text-13 ${LINK}`}>
                {item.replacedBy.id}
              </Link>
            ) : (
              <a href={item.replacedBy.href} className={`font-mono text-13 ${LINK}`}>
                {item.replacedBy.id}
              </a>
            )}{' '}
            —{' '}
          </>
        )}
        <Inlines items={item.why} />. The statement as it was is in{' '}
        <Link to={item.was.href} className={LINK}>
          {spec.short} {item.was.version}
        </Link>
        .
      </p>
    </aside>
  );
}

/** A chapter's blocks, with a note for each retired statement placed at the end of the section it was in. */
function ChapterBlocks({ spec, blocks, retired }: { spec: SpecIndex; blocks: Block[]; retired: RetiredStatement[] }) {
  if (!retired.length) return <Blocks blocks={blocks} />;
  const out: ReactNode[] = [];
  const placed = new Set<string>();
  let start = 0;
  let section: string | undefined;
  const close = (end: number) => {
    if (end > start) out.push(<Blocks key={`b${start}`} blocks={blocks.slice(start, end)} />);
    start = end;
    for (const item of retired.filter((r) => r.section === section)) {
      out.push(<RetiredNote key={item.id} spec={spec} item={item} />);
      placed.add(item.id);
    }
  };
  blocks.forEach((block, i) => {
    if (block.t === 'h' && block.depth <= 2) {
      close(i);
      section = block.number;
    }
  });
  close(blocks.length);
  for (const item of retired) if (!placed.has(item.id)) out.push(<RetiredNote key={item.id} spec={spec} item={item} />);
  return <>{out}</>;
}

/**
 * A document's sections in a side index (a disclosure on a narrow screen) beside its text — a
 * chapter's numbered sections, or the chapters of an extension's specification.
 */
export function DocLayout({
  sections,
  label,
  unit,
  children,
}: {
  sections: ChapterSection[];
  label: string;
  /** What the index lists, for its count: "sections", "chapters". */
  unit: string;
  children: ReactNode;
}) {
  const index = (
    <ol className="flex flex-col gap-0.5 text-14">
      {sections.map((section) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            className="flex min-h-9 items-baseline gap-2 rounded-md px-2 py-1.5 text-fg-muted hover:bg-surface-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-focus"
          >
            {section.number && <span className="w-9 shrink-0 font-mono text-12 text-fg-faint">{section.number}</span>}
            <span>{section.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:gap-14">
      {sections.length > 0 && (
        <>
          <details className="rounded-lg border border-border bg-surface lg:hidden">
            <summary className="flex min-h-11 cursor-pointer items-center px-4 text-14 font-semibold text-fg">
              {label} · {sections.length} {unit}
            </summary>
            <nav aria-label={label} className="px-2 pb-3">
              {index}
            </nav>
          </details>
          <nav aria-label={label} className="hidden lg:block lg:w-64 lg:shrink-0">
            <div className="sticky top-24 flex max-h-[calc(100vh-7rem)] flex-col gap-3 overflow-y-auto">
              <Kicker className="px-2">{label}</Kicker>
              {index}
            </div>
          </nav>
        </>
      )}
      <article className="flex max-w-4xl min-w-0 flex-1 flex-col gap-6">{children}</article>
    </div>
  );
}

function ChapterBody({ spec, summary }: { spec: SpecIndex; summary: ChapterSummary }) {
  const chapter = use(loadChapter(spec, summary.slug));
  useLateFragment(chapter);
  return (
    <div className="flex flex-col gap-10">
      <Pinned path={chapter.file} commit={spec.commit} />
      <DocLayout sections={chapter.sections} label="In this chapter" unit="sections">
        <ChapterBlocks spec={spec} blocks={chapter.blocks} retired={chapter.retired ?? []} />
      </DocLayout>
    </div>
  );
}

/** Says, at the bottom of the screen, that a statement's link was copied. */
export function CopiedNote({ note }: { note: string }) {
  return (
    <p
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full border border-border-float bg-surface-raised px-4 py-2 text-14 text-fg ${note ? '' : 'sr-only'}`}
    >
      {note}
    </p>
  );
}

function ChapterNav({ spec, summary }: { spec: SpecIndex; summary: ChapterSummary }) {
  const at = spec.chapters.indexOf(summary);
  const prev = spec.chapters[at - 1];
  const next = spec.chapters[at + 1];
  const card = 'flex flex-col gap-1 rounded-lg border border-border p-5 no-underline hover:bg-surface-hover';
  return (
    <nav aria-label="Chapters" className="grid gap-4 border-t border-border pt-10 sm:grid-cols-2">
      {prev ? (
        <Link to={chapterPath(spec, prev.slug)} variant="muted" className={card}>
          <span className="text-13 text-fg-muted">← Previous</span>
          <span className="text-16 font-semibold text-fg">{chapterLabel(prev)}</span>
        </Link>
      ) : (
        <Link to="/floorspec" variant="muted" className={card}>
          <span className="text-13 text-fg-muted">← Back to</span>
          <span className="text-16 font-semibold text-fg">Floorspec</span>
        </Link>
      )}
      {next ? (
        <Link to={chapterPath(spec, next.slug)} variant="muted" className={`${card} sm:text-right`}>
          <span className="text-13 text-fg-muted">Next →</span>
          <span className="text-16 font-semibold text-fg">{chapterLabel(next)}</span>
        </Link>
      ) : (
        <Link to={`/floorspec/coverage#${coverageAnchor(spec)}`} variant="muted" className={`${card} sm:text-right`}>
          <span className="text-13 text-fg-muted">Next →</span>
          <span className="text-16 font-semibold text-fg">
            Conformance coverage of {spec.short}
            {isCurrent(spec) ? '' : ` ${spec.version}`}
          </span>
        </Link>
      )}
    </nav>
  );
}

export function Loading({ what }: { what: string }) {
  return (
    <p role="status" className="py-20 text-center text-14 text-fg-muted">
      Loading {what}…
    </p>
  );
}

export function ChapterPage({ spec: code, version, slug }: { spec: string; version: string; slug: string }) {
  const spec = specAt(code, version)!;
  const current = isCurrent(spec);
  const summary = chapterBySlug(spec, slug)!;
  const [note, copy] = useCopiedNote();
  const numbered = /^\d+$/.test(summary.number);

  return (
    <CopyContext.Provider value={copy}>
      <div className={`${WRAP} flex flex-col gap-10 pt-12 pb-20 lg:pt-16`}>
        <header className="flex flex-col gap-5">
          <Crumb>
            <span>
              {spec.short} {spec.version}
            </span>
            <span aria-hidden="true">/</span>
            <span>{numbered ? `Chapter ${summary.number}` : `Annex ${summary.number}`}</span>
          </Crumb>
          <h1 className="font-display text-display-lg tracking-display text-fg">
            <span className="text-fg-faint">{summary.number}.</span> {summary.title}
          </h1>
          {summary.summary && (
            <p className="max-w-3xl text-16 text-fg-muted sm:text-20">
              {asSentence(summary.summary)}
            </p>
          )}
          {current && <VersionNote spec={spec} slug={slug} />}
          {current ? <DraftBanner compact version={spec.version} /> : <SupersededBanner spec={spec} slug={slug} />}
        </header>

        <Suspense fallback={<Loading what="the chapter" />}>
          <ChapterBody key={`${spec.spec}/${slug}`} spec={spec} summary={summary} />
        </Suspense>

        <ChapterNav spec={spec} summary={summary} />
      </div>
      <CopiedNote note={note} />
    </CopyContext.Provider>
  );
}

// ---------------------------------------------------------------------------------------------
// /floorspec/coverage

function CoverageTable({ spec, rows }: { spec: SpecIndex; rows: CoverageRow[] }) {
  return (
    <div
      className="overflow-x-auto rounded-md border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      tabIndex={0}
      role="region"
      aria-label="Statements, scrolls sideways"
    >
      <table className="w-full border-collapse text-14">
        <thead className="bg-surface text-left">
          <tr>
            <th scope="col" className="border-b border-border px-3 py-2 font-semibold text-fg">
              Statement
            </th>
            <th scope="col" className="border-b border-border px-3 py-2 font-semibold text-fg">
              Level
            </th>
            <th scope="col" className="border-b border-border px-3 py-2 text-right font-semibold text-fg">
              Tests
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const mandatory = row.level === 'MUST' || row.level === 'MUST NOT';
            return (
              <tr key={row.id} className="border-b border-border last:border-b-0">
                <td className="px-3 py-2.5 align-top">
                  <Link to={chapterPath(spec, row.chapter, row.id)} className="font-mono text-13 whitespace-nowrap">
                    {row.id}
                  </Link>
                  <p className="mt-1 max-w-2xl text-13 text-fg-muted">{row.text}</p>
                </td>
                <td className="px-3 py-2.5 align-top">
                  <LevelBadge level={row.level} />
                </td>
                <td className="px-3 py-2.5 text-right align-top font-mono text-14">
                  {row.tests > 0 ? (
                    <span className="text-success">{row.tests}</span>
                  ) : (
                    <span className={mandatory ? 'text-danger' : 'text-fg-faint'}>
                      0<span className="sr-only">{mandatory ? ', not yet covered' : ''}</span>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Every draft's coverage, current and earlier, fetched together and cached, so `use` sees one promise. */
const ALL = [...SPECS, ...EARLIER];
let allCoverage: Promise<Coverage[]> | undefined;
const loadAllCoverage = () => (allCoverage ??= Promise.all(ALL.map((spec) => loadCoverage(spec))));

function SpecCoverage({ spec, coverage }: { spec: SpecIndex; coverage: Coverage }) {
  const fraction = coverage.mandatory ? coverage.covered / coverage.mandatory : 0;
  const anchor = coverageAnchor(spec);
  return (
    <section aria-labelledby={anchor} className="flex scroll-mt-24 flex-col gap-10">
      <div className="flex flex-col gap-5">
        <h2 id={anchor} className="scroll-mt-24 font-display text-display-md text-fg">
          {specName(spec)}
          {!isCurrent(spec) && <span className="text-fg-faint"> · earlier draft</span>}
        </h2>
        <p className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <span className="font-display text-stat text-fg">
            {coverage.covered} <span className="text-fg-faint">of</span> {coverage.mandatory}
          </span>
          <span className="max-w-md text-16 text-fg-muted">
            mandatory statements (MUST and MUST NOT) have at least one conformance test
            {coverage.tests === 0
              ? ' — the suite is being written.'
              : `, from ${coverage.tests} ${coverage.tests === 1 ? 'test' : 'tests'}.`}
          </span>
        </p>
        <span className="block h-3 max-w-3xl overflow-hidden rounded-full bg-surface-raised" aria-hidden="true">
          <span
            className="block h-full rounded-full"
            style={{ width: `${fraction * 100}%`, backgroundColor: FLOORSPEC.accent }}
          />
        </span>
        <p className="max-w-3xl text-14 text-fg-muted">
          {coverage.source.startsWith('scan of ')
            ? `Counted by a ${coverage.source} at ${FLOORSPEC_LOCK.repository}@${shortSha(spec.commit)}.`
            : `Counted by the ${coverage.source} at ${FLOORSPEC_LOCK.repository}@${shortSha(spec.commit)}, over its conformance suite.`}{' '}
          SHOULD and MAY statements are listed too; the suite is not required to test them.
        </p>
      </div>

      {spec.chapters
        .filter((chapter) => chapter.statements > 0)
        .map((chapter) => {
          const rows = coverage.statements.filter((row) => row.chapter === chapter.slug);
          const must = rows.filter((row) => row.level === 'MUST' || row.level === 'MUST NOT');
          return (
            <section key={chapter.slug} aria-labelledby={`cov-${anchor}-${chapter.slug}`} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 id={`cov-${anchor}-${chapter.slug}`} className="text-20 font-semibold text-fg">
                  <Link to={chapterPath(spec, chapter.slug)} variant="muted" className="no-underline hover:underline">
                    {chapterLabel(chapter)}
                  </Link>
                </h3>
                <span className="font-mono text-12 text-fg-muted">
                  {must.filter((row) => row.tests > 0).length} of {must.length} covered
                </span>
              </div>
              <CoverageTable spec={spec} rows={rows} />
            </section>
          );
        })}
    </section>
  );
}

function CoverageBody() {
  const coverages = use(loadAllCoverage());
  useLateFragment(coverages);
  const coverageOf = (spec: SpecIndex) => coverages[ALL.indexOf(spec)]!;
  const pill = (spec: SpecIndex, muted: boolean) => (
    <a
      key={coverageAnchor(spec)}
      href={`#${coverageAnchor(spec)}`}
      className={`flex min-h-11 items-center gap-3 rounded-lg border px-4 text-14 no-underline hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus ${muted ? 'border-dashed border-border-field text-fg-muted' : 'border-border bg-surface text-fg'}`}
    >
      <span className="font-semibold">{specName(spec)}</span>
      <span className="font-mono text-12 text-fg-muted">
        {spec.covered} of {spec.mandatory}
      </span>
    </a>
  );
  return (
    <div className="flex flex-col gap-20">
      {ALL.length > 1 && (
        <nav aria-label="Specifications" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">{SPECS.map((spec) => pill(spec, false))}</div>
          {EARLIER.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-13 text-fg-muted">Earlier drafts</span>
              {EARLIER.map((spec) => pill(spec, true))}
            </div>
          )}
        </nav>
      )}
      {SPECS.map((spec) => (
        <SpecCoverage key={coverageAnchor(spec)} spec={spec} coverage={coverageOf(spec)} />
      ))}
      {EARLIER.length > 0 && (
        <div className="flex flex-col gap-20 border-t border-border pt-16">
          <div className="flex max-w-3xl flex-col gap-3">
            <Kicker>Earlier drafts</Kicker>
            <p className="text-16 text-fg-muted">
              Each earlier draft is counted against its own suite, at the commit it is published from,
              and stays as it was published.
            </p>
          </div>
          {EARLIER.map((spec) => (
            <SpecCoverage key={coverageAnchor(spec)} spec={spec} coverage={coverageOf(spec)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CoveragePage() {
  return (
    <div className={`${WRAP} flex flex-col gap-10 pt-12 pb-20 lg:pt-16`}>
      <header className="flex flex-col gap-5">
        <Crumb>
          <span>Coverage</span>
        </Crumb>
        <h1 className="font-display text-display-lg tracking-display text-fg">Conformance coverage</h1>
        <p className="max-w-3xl text-16 text-fg-muted sm:text-20">
          Every MUST and MUST NOT in {listOf(SPECS.map((spec) => specName(spec)))} needs at
          least one test in its conformance suite, and the standard’s coverage gate fails until each
          one has it. This is where that stands, statement by statement, at the commit this site
          publishes{EARLIER.length > 0 ? ' — and, below, where each earlier draft stood when it was published' : ''}.
        </p>
        <DraftBanner compact />
      </header>
      <Suspense fallback={<Loading what="coverage" />}>
        <CoverageBody />
      </Suspense>
    </div>
  );
}
