import { Suspense, use, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link as UiLink } from '@d3cloud/ui';
import { Link } from '../router';
import { Band, Kicker, PrimaryButton, SecondaryButton, WRAP } from '../components/Marketing';
import { ProductMark } from '../components/ProductMark';
import { workshopBySlug, workshopPath } from '../content/ecosystem';
import type { Block, ChapterSummary, Coverage, CoverageRow, RetiredStatement, SpecIndex } from './ast';
import { loadChapter, loadCoverage } from './load';
// Every published schema file, by its path under the site root (and its SHA-256, which only the
// tests read). Imported here, in the lazy chunk, rather than beside the routes.
import PUBLISHED_SCHEMAS from './published-schemas.json';
import { Blocks, Inlines, LINK, LevelBadge } from './Prose';
import { CopyContext } from './copy';
import {
  CORE,
  EARLIER,
  FLOORSPEC,
  FLOORSPEC_LOCK,
  FLOORSPEC_REPO,
  SPECS,
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
 * The Floorspec standard's pages (DI-T-10.2, DI-T-10.4, DI-T-10.5, FLR-ADR-018): the landing page,
 * a page per chapter of each specification's current draft (Core and Ops) and of every earlier
 * draft still published (Core 0.1, Ops 0.1), and the conformance coverage of all of them.
 * All of it is one lazily loaded chunk, and each chapter's text is another, so none of it weighs
 * on the rest of the site.
 */

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

const shortSha = (commit: string) => commit.slice(0, 7);

/** Every published schema of one draft of one specification, by its path under the site root. */
const schemasOf = (spec: SpecIndex) =>
  Object.keys(PUBLISHED_SCHEMAS)
    .filter((path) => path.startsWith(`floorspec/schema/${spec.spec}/${spec.version}/`))
    .sort();

/** The extension registry's schemas (Core 0.2, 12.2): not a specification's, so listed on their own. */
const REGISTRY_SCHEMAS = Object.keys(PUBLISHED_SCHEMAS)
  .filter((path) => path.startsWith('floorspec/schema/registry/'))
  .sort();

/**
 * A chapter's summary from its README table, as a sentence: "Merging junctions, …". One that
 * opens with an operation's name keeps it as written — "addElement and its shorthands, …".
 */
const asSentence = (summary: string) =>
  `${/^[a-z]+\b/.test(summary) ? summary.charAt(0).toUpperCase() + summary.slice(1) : summary}.`;

const percent = (spec: SpecIndex) => (spec.mandatory ? Math.floor((100 * spec.covered) / spec.mandatory) : 0);

/** The banner every Floorspec page carries until 1.0 (FLR-ADR-017). */
function DraftBanner({ compact = false, version = CORE.version }: { compact?: boolean; version?: string }) {
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
function Pinned({ path, commit = FLOORSPEC_LOCK.commit, className = '' }: { path?: string; commit?: string; className?: string }) {
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

/** The small crumb above a chapter's or the coverage page's title. */
function Crumb({ children }: { children: ReactNode }) {
  return (
    <p className="flex flex-wrap items-center gap-2 font-mono text-12 tracking-label text-fg-muted uppercase">
      <ProductMark slug={FLOORSPEC.slug} accent={FLOORSPEC.accent} size={18} className="text-fg" />
      <Link to="/floorspec" variant="muted" className="no-underline hover:underline">
        Floorspec
      </Link>
      <span aria-hidden="true">/</span>
      {children}
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
 * The three specifications, as the landing page introduces them. Core and Ops are drafted, so they
 * link to their chapters; Rules is not yet.
 */
const SPECIFICATIONS: { code: string; name: string; text: string; title: string; intro: ReactNode }[] = [
  {
    code: 'core',
    name: 'Floorspec Core',
    text: 'The document: levels, walls on a junction graph, rooms, openings, types and materials, the program, extensions, hosted elements and circulation — what makes it valid, the exact geometry derived from it, and its canonical form.',
    title: 'The document.',
    intro: (
      <>
        What a house <em>is</em>: the document, its units and identity, walls and the rooms they
        enclose, openings, types and materials, the program it is designed against, extensions, the
        elements hosted on walls and floors with the clearances they need, and how you get from room
        to room — what makes a document valid, the exact geometry every reader derives from it, its
        one canonical form, and a mapping to IFC.
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
        values, normalization, and locks — and edits to the program and to hosted elements. It
        operates on Core documents and is versioned on its own.
      </>
    ),
  },
  {
    code: 'rules',
    name: 'Floorspec Rules',
    text: 'Advisory building-code rules with citations, as data, with jurisdiction profiles. Findings are advice: they never say “compliant”.',
    title: '',
    intro: null,
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
        <Pinned path={`spec/${spec.spec}`} />
      </div>
    </Band>
  );
}

/** What Draft 0.2 adds, on the landing page while 0.2 is the current draft (DI-T-10.5). */
const NEW_IN_02: { spec: string; slug: string; hash?: string; title: string; text: ReactNode }[] = [
  {
    spec: 'core',
    slug: 'program',
    title: 'The program',
    text: 'The brief a house is designed against — what spaces, how many and how large, and which should or must not be next to each other — kept in the document, with each room saying which item it fulfils.',
  },
  {
    spec: 'core',
    slug: 'extensions',
    title: 'Extensions, in full',
    text: 'Declarations, registry entries, dependencies, the elements extensions add, and the fallbacks that keep them visible to software that has never heard of them.',
  },
  {
    spec: 'core',
    slug: 'hosting',
    title: 'Hosting and clearances',
    text: 'An outlet on a wall face, a toilet on a floor, a sofa on a level: elements placed relative to a host that move with it, and the space each needs kept clear.',
  },
  {
    spec: 'core',
    slug: 'circulation',
    title: 'Circulation',
    text: 'The door graph of each building, its entries, which rooms can be reached — and a bedroom you can only reach through another.',
  },
  {
    spec: 'ops',
    slug: 'composites',
    hash: '4.9',
    title: 'Edits for the program and hosted devices',
    text: (
      <>
        Ops 0.2 adds <code className="font-mono">addProgramItem</code>,{' '}
        <code className="font-mono">setAdjacency</code> and <code className="font-mono">setRoomBrief</code>{' '}
        for the brief, <code className="font-mono">placeElement</code> and{' '}
        <code className="font-mono">moveElement</code> for devices and fixtures, and hosted elements that
        follow their walls.
      </>
    ),
  },
];

function WhatsNew({ sunken }: { sunken: boolean }) {
  const items = NEW_IN_02.flatMap((item) => {
    const spec = specByCode(item.spec);
    return spec && chapterBySlug(spec, item.slug) ? [{ ...item, spec, chapter: chapterBySlug(spec, item.slug)! }] : [];
  });
  return (
    <Band label="Draft 0.2" title="What 0.2 adds." sunken={sunken}>
      <div className="flex flex-col gap-8">
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <li key={`${item.spec.spec}/${item.slug}`}>
              <Link
                to={chapterPath(item.spec, item.slug, item.hash)}
                variant="muted"
                className="flex h-full flex-col gap-1.5 rounded-lg border border-border bg-surface p-5 no-underline hover:bg-surface-hover"
              >
                <span className="font-mono text-12 text-fg-faint">
                  {item.spec.short} {item.spec.version} · {chapterLabel(item.chapter)}
                </span>
                <span className="text-16 font-semibold text-fg">{item.title}</span>
                <span className="text-14 text-fg-muted">{item.text}</span>
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

export function StandardPage() {
  // The bands alternate plain and sunken, whichever of them are shown.
  let band = 0;
  const sunk = () => band++ % 2 === 0;
  const news = CORE.version === '0.2';
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

      <Band label="Conformance" title="Every MUST, tested." sunken={sunk()}>
        <div className="flex max-w-3xl flex-col gap-6">
          <p className="text-16 text-fg-muted">
            Every MUST and MUST NOT needs at least one test in its specification’s conformance suite,
            and the standard’s coverage gate fails until each one has it.
          </p>
          <ul className="grid gap-6 sm:grid-cols-2">
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

/** Says, briefly, that a statement's link was copied. */
function useCopiedNote(): [string, (id: string) => void] {
  const [note, setNote] = useState('');
  const timer = useRef<number | undefined>(undefined);
  const copy = useCallback((id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        setNote(`Link to ${id} copied`);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setNote(''), 2400);
      })
      .catch(() => {});
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return [note, copy];
}

/**
 * A deep link — /floorspec/core/walls#FS-CORE-5.3.1 — arrives before the text does, so the
 * browser had nothing to scroll to or to mark as the :target. Once the text is there, navigating
 * to the same fragment again (replacing, not adding, a history entry) does both.
 */
function useLateFragment(loaded: unknown) {
  useEffect(() => {
    const { hash } = window.location;
    if (hash && document.getElementById(decodeURIComponent(hash.slice(1)))) window.location.replace(hash);
  }, [loaded]);
}

/**
 * Where a statement ID this draft retired used to be (DI-T-10.5): a link to it — from an old
 * citation, or from the earlier draft's own pages — lands here, and says what replaced it and where
 * the statement as it was is still published.
 */
function RetiredNote({ spec, item }: { spec: SpecIndex; item: RetiredStatement }) {
  return (
    <aside
      id={item.id}
      aria-label={`Retired statement ${item.id}`}
      className="flex scroll-mt-28 flex-col gap-1.5 rounded-md border border-dashed border-border-field px-4 py-3 text-14 text-fg-muted target:border-warning target:bg-warning-muted"
    >
      <p className="font-mono text-11 font-semibold tracking-label text-fg-faint uppercase">
        {item.id} · retired in {spec.short} {spec.version}
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

function ChapterBody({ spec, summary }: { spec: SpecIndex; summary: ChapterSummary }) {
  const chapter = use(loadChapter(spec, summary.slug));
  useLateFragment(chapter);
  const retired = (spec.retired ?? []).filter((item) => item.chapter === summary.slug);

  const index = (
    <ol className="flex flex-col gap-0.5 text-14">
      {chapter.sections.map((section) => (
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
      {chapter.sections.length > 0 && (
        <>
          <details className="rounded-lg border border-border bg-surface lg:hidden">
            <summary className="flex min-h-11 cursor-pointer items-center px-4 text-14 font-semibold text-fg">
              In this chapter · {chapter.sections.length} sections
            </summary>
            <nav aria-label="In this chapter" className="px-2 pb-3">
              {index}
            </nav>
          </details>
          <nav aria-label="In this chapter" className="hidden lg:block lg:w-64 lg:shrink-0">
            <div className="sticky top-24 flex max-h-[calc(100vh-7rem)] flex-col gap-3 overflow-y-auto">
              <Kicker className="px-2">In this chapter</Kicker>
              {index}
            </div>
          </nav>
        </>
      )}
      <article className="flex max-w-4xl min-w-0 flex-1 flex-col gap-6">
        <ChapterBlocks spec={spec} blocks={chapter.blocks} retired={retired} />
      </article>
    </div>
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

function Loading({ what }: { what: string }) {
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
          <Pinned path={summary.file} commit={spec.commit} />
          {current && <VersionNote spec={spec} slug={slug} />}
          {current ? <DraftBanner compact version={spec.version} /> : <SupersededBanner spec={spec} slug={slug} />}
        </header>

        <Suspense fallback={<Loading what="the chapter" />}>
          <ChapterBody key={`${spec.spec}/${slug}`} spec={spec} summary={summary} />
        </Suspense>

        <ChapterNav spec={spec} summary={summary} />
      </div>
      <p
        aria-live="polite"
        className={`fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full border border-border-float bg-surface-raised px-4 py-2 text-14 text-fg ${note ? '' : 'sr-only'}`}
      >
        {note}
      </p>
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
            : `Counted by the ${coverage.source} at ${FLOORSPEC_LOCK.repository}@${shortSha(spec.commit)}, over conformance/${spec.spec}/${spec.version}.`}{' '}
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
          Every MUST and MUST NOT in {SPECS.map((spec) => specName(spec)).join(' and ')} needs at
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
