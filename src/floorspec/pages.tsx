import { Suspense, use, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link as UiLink } from '@d3cloud/ui';
import { Link } from '../router';
import { Band, Kicker, PrimaryButton, SecondaryButton, WRAP } from '../components/Marketing';
import { ProductMark } from '../components/ProductMark';
import { workshopBySlug, workshopPath } from '../content/ecosystem';
import type { ChapterSummary, Coverage, CoverageRow } from './ast';
import { loadChapter, loadCoverage } from './load';
// Every published schema file, by its path under the site root (and its SHA-256, which only the
// tests read). Imported here, in the lazy chunk, rather than beside the routes.
import PUBLISHED_SCHEMAS from './published-schemas.json';
import { Blocks, LevelBadge } from './Prose';
import { CopyContext } from './copy';
import {
  FLOORSPEC,
  FLOORSPEC_LOCK,
  FLOORSPEC_REPO,
  SHORT_SHA,
  SPEC,
  SPEC_NAME,
  chapterBySlug,
  chapterLabel,
  pinnedTree,
} from './spec';

/**
 * The Floorspec standard's pages (DI-T-10.2, FLR-ADR-018): the landing page, a page per chapter
 * of the current draft, and the conformance coverage. All of it is one lazily loaded chunk, and
 * each chapter's text is another, so none of it weighs on the rest of the site.
 */

const APP_PATH = (() => {
  const app = workshopBySlug('floorspec-app');
  return app ? workshopPath(app) : '/floorspec/app';
})();

const FIRST_CHAPTER = SPEC.chapters[0]!;

/** The banner every Floorspec page carries until 1.0 (FLR-ADR-017). */
function DraftBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div
      role="note"
      aria-label="Draft status"
      className={`flex flex-col gap-1.5 rounded-lg border border-warning bg-warning-muted ${compact ? 'px-4 py-3' : 'p-5 sm:p-6'}`}
    >
      <p className="font-mono text-12 font-semibold tracking-label text-warning uppercase">
        Draft {SPEC.version} — no compatibility promise
      </p>
      <p className={`${compact ? 'text-14' : 'text-16'} text-fg`}>
        This is a working draft. Any later 0.x draft may change any part of it, and Floorspec stays
        0.x until a real house is fully modelled in it and every MUST has a conformance test.
      </p>
    </div>
  );
}

/** "From matdemers1/floorspec@2c7b253", linking to that commit's tree — or to a file in it. */
function Pinned({ path, className = '' }: { path?: string; className?: string }) {
  return (
    <p className={`text-13 text-fg-muted ${className}`}>
      From{' '}
      <UiLink href={pinnedTree(path)}>
        {FLOORSPEC_LOCK.repository}@{SHORT_SHA}
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

const SPECIFICATIONS: { name: string; status: string; text: string; href?: string }[] = [
  {
    name: 'Floorspec Core',
    status: `Draft ${SPEC.version}`,
    text: 'The document: levels, walls on a junction graph, rooms, openings, types and materials — what makes it valid, the exact geometry derived from it, and its canonical form.',
    href: `/floorspec/core/${FIRST_CHAPTER.slug}`,
  },
  {
    name: 'Floorspec Ops',
    status: 'Not yet drafted',
    text: 'The normative edit operations: a relative reference grammar, atomic batches and locks — how a person or an agent changes a document.',
  },
  {
    name: 'Floorspec Rules',
    status: 'Not yet drafted',
    text: 'Advisory building-code rules with citations, as data, with jurisdiction profiles. Findings are advice: they never say “compliant”.',
  },
];

export function StandardPage() {
  const schemas = Object.keys(PUBLISHED_SCHEMAS)
    .filter((path) => path.startsWith(`floorspec/schema/core/${SPEC.version}/`))
    .sort();
  const pct = SPEC.mandatory ? Math.floor((100 * SPEC.covered) / SPEC.mandatory) : 0;

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
            <span>An open standard · Houses as code · Draft {SPEC.version}</span>
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
            <PrimaryButton href={`/floorspec/core/${FIRST_CHAPTER.slug}`}>Read {SPEC_NAME}</PrimaryButton>
            <SecondaryButton href={FLOORSPEC_REPO}>The repository ↗</SecondaryButton>
          </div>
        </div>
        <div className={`${WRAP} pb-16`}>
          <DraftBanner />
        </div>
      </section>

      <Band label="Why" title="Houses as code." sunken>
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

      <Band label="The specifications" title="Three of them.">
        <ul className="flex flex-col gap-4">
          {SPECIFICATIONS.map((spec) => {
            const body = (
              <>
                <span className="flex flex-wrap items-center gap-3">
                  <span className="text-16 font-semibold text-fg">{spec.name}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-mono text-11 tracking-label uppercase ${spec.href ? 'bg-warning-muted text-warning' : 'border border-dashed border-border-field text-fg-muted'}`}
                  >
                    {spec.status}
                  </span>
                </span>
                <span className="max-w-2xl text-14 text-fg-muted">{spec.text}</span>
                {spec.href && <span className="text-14 font-semibold text-fg">Read it →</span>}
              </>
            );
            const frame = 'flex h-full flex-col gap-2 rounded-lg border p-5 sm:p-6';
            return (
              <li key={spec.name}>
                {spec.href ? (
                  <Link to={spec.href} variant="muted" className={`${frame} border-border bg-surface no-underline hover:bg-surface-hover`}>
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

      <Band label={SPEC_NAME} title="The chapters." sunken>
        <div className="flex flex-col gap-6">
          <ol className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
            {SPEC.chapters.map((chapter) => (
              <li key={chapter.slug}>
                <Link
                  to={`/floorspec/core/${chapter.slug}`}
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
                      {chapter.summary.charAt(0).toUpperCase() + chapter.summary.slice(1)}.
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <Pinned path={`spec/${SPEC.spec}`} />
        </div>
      </Band>

      <Band label="Schemas" title="URLs that never change.">
        <div className="flex max-w-3xl flex-col gap-6">
          <p className="text-16 text-fg-muted">
            JSON Schema 2020-12, published at versioned addresses. Once a file is published here it is
            never changed or removed — a new draft gets a new directory — so a validator can pin it
            forever. They are served to any origin.
          </p>
          {schemas.length > 0 ? (
            <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {schemas.map((path) => (
                <li key={path} className="truncate font-mono text-13">
                  <UiLink href={`/${path}`}>{path.split('/').pop()}</UiLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-border-field p-4 text-14 text-fg-muted">
              The schemas for Core {SPEC.version} are being written; they will appear at
              /floorspec/schema/core/{SPEC.version}/.
            </p>
          )}
          {schemas.length > 0 && (
            <p className="font-mono text-12 break-all text-fg-muted">
              https://d3cloud.io/floorspec/schema/core/{SPEC.version}/
            </p>
          )}
        </div>
      </Band>

      <Band label="Conformance" title="Every MUST, tested." sunken>
        <div className="flex max-w-3xl flex-col gap-6">
          <p className="text-16 text-fg">
            <span className="font-display text-display-md">
              {SPEC.covered} of {SPEC.mandatory}
            </span>{' '}
            <span className="text-fg-muted">
              mandatory statements in {SPEC_NAME} have a conformance test ({pct}%)
              {SPEC.tests === 0 ? ' — the suite is being written.' : `, from ${SPEC.tests} tests.`}
            </span>
          </p>
          <div>
            <SecondaryButton href="/floorspec/coverage">See every statement</SecondaryButton>
          </div>
        </div>
      </Band>

      <Band label="Reference implementation" title="D3 Floorspec.">
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

      <Band label="Licence" title="Yours to use." sunken>
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
// /floorspec/core/<chapter>

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

function ChapterBody({ summary }: { summary: ChapterSummary }) {
  const chapter = use(loadChapter(summary.slug));

  // A deep link — /floorspec/core/walls#FS-CORE-5.3.1 — arrives before the text does, so the
  // browser had nothing to scroll to or to mark as the :target. Now there is: navigating to the
  // same fragment again (replacing, not adding, a history entry) does both.
  useEffect(() => {
    const { hash } = window.location;
    if (hash && document.getElementById(decodeURIComponent(hash.slice(1)))) window.location.replace(hash);
  }, [chapter]);

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
        <Blocks blocks={chapter.blocks} />
      </article>
    </div>
  );
}

function ChapterNav({ summary }: { summary: ChapterSummary }) {
  const at = SPEC.chapters.indexOf(summary);
  const prev = SPEC.chapters[at - 1];
  const next = SPEC.chapters[at + 1];
  const card = 'flex flex-col gap-1 rounded-lg border border-border p-5 no-underline hover:bg-surface-hover';
  return (
    <nav aria-label="Chapters" className="grid gap-4 border-t border-border pt-10 sm:grid-cols-2">
      {prev ? (
        <Link to={`/floorspec/core/${prev.slug}`} variant="muted" className={card}>
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
        <Link to={`/floorspec/core/${next.slug}`} variant="muted" className={`${card} sm:text-right`}>
          <span className="text-13 text-fg-muted">Next →</span>
          <span className="text-16 font-semibold text-fg">{chapterLabel(next)}</span>
        </Link>
      ) : (
        <Link to="/floorspec/coverage" variant="muted" className={`${card} sm:text-right`}>
          <span className="text-13 text-fg-muted">Next →</span>
          <span className="text-16 font-semibold text-fg">Conformance coverage</span>
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

export function ChapterPage({ slug }: { slug: string }) {
  const summary = chapterBySlug(slug)!;
  const [note, copy] = useCopiedNote();
  const numbered = /^\d+$/.test(summary.number);

  return (
    <CopyContext.Provider value={copy}>
      <div className={`${WRAP} flex flex-col gap-10 pt-12 pb-20 lg:pt-16`}>
        <header className="flex flex-col gap-5">
          <Crumb>
            <span>Core {SPEC.version}</span>
            <span aria-hidden="true">/</span>
            <span>{numbered ? `Chapter ${summary.number}` : `Annex ${summary.number}`}</span>
          </Crumb>
          <h1 className="font-display text-display-lg tracking-display text-fg">
            <span className="text-fg-faint">{summary.number}.</span> {summary.title}
          </h1>
          {summary.summary && (
            <p className="max-w-3xl text-16 text-fg-muted sm:text-20">
              {summary.summary.charAt(0).toUpperCase() + summary.summary.slice(1)}.
            </p>
          )}
          <Pinned path={summary.file} />
          <DraftBanner compact />
        </header>

        <Suspense fallback={<Loading what="the chapter" />}>
          <ChapterBody key={slug} summary={summary} />
        </Suspense>

        <ChapterNav summary={summary} />
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

function CoverageTable({ rows }: { rows: CoverageRow[] }) {
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
                  <Link to={`/floorspec/core/${row.chapter}#${row.id}`} className="font-mono text-13 whitespace-nowrap">
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

function CoverageBody() {
  const coverage: Coverage = use(loadCoverage());
  const fraction = coverage.mandatory ? coverage.covered / coverage.mandatory : 0;
  return (
    <div className="flex flex-col gap-14">
      <section aria-label="Summary" className="flex flex-col gap-5">
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
          Counted by the {coverage.source} at {FLOORSPEC_LOCK.repository}@{SHORT_SHA}. SHOULD and MAY
          statements are listed too; the suite is not required to test them.
        </p>
      </section>

      {SPEC.chapters
        .filter((chapter) => chapter.statements > 0)
        .map((chapter) => {
          const rows = coverage.statements.filter((row) => row.chapter === chapter.slug);
          const must = rows.filter((row) => row.level === 'MUST' || row.level === 'MUST NOT');
          return (
            <section key={chapter.slug} aria-labelledby={`cov-${chapter.slug}`} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id={`cov-${chapter.slug}`} className="text-20 font-semibold text-fg">
                  <Link to={`/floorspec/core/${chapter.slug}`} variant="muted" className="no-underline hover:underline">
                    {chapterLabel(chapter)}
                  </Link>
                </h2>
                <span className="font-mono text-12 text-fg-muted">
                  {must.filter((row) => row.tests > 0).length} of {must.length} covered
                </span>
              </div>
              <CoverageTable rows={rows} />
            </section>
          );
        })}
    </div>
  );
}

export function CoveragePage() {
  return (
    <div className={`${WRAP} flex flex-col gap-10 pt-12 pb-20 lg:pt-16`}>
      <header className="flex flex-col gap-5">
        <Crumb>
          <span>Core {SPEC.version}</span>
          <span aria-hidden="true">/</span>
          <span>Coverage</span>
        </Crumb>
        <h1 className="font-display text-display-lg tracking-display text-fg">Conformance coverage</h1>
        <p className="max-w-3xl text-16 text-fg-muted sm:text-20">
          Every MUST and MUST NOT in {SPEC_NAME} needs at least one test in the conformance suite,
          and the standard’s coverage gate fails until each one has it. This is where that stands,
          statement by statement, at the commit this site publishes.
        </p>
        <DraftBanner compact />
      </header>
      <Suspense fallback={<Loading what="coverage" />}>
        <CoverageBody />
      </Suspense>
    </div>
  );
}
