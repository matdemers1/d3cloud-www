import { Suspense, use, type ReactNode } from 'react';
import { Link as UiLink } from '@d3cloud/ui';
import { Link } from '../router';
import { WRAP } from '../components/Marketing';
import type { ExtensionDetail, ExtensionStatus, LibraryVersion } from './ast';
import { loadExtensionDoc, loadLibraries, loadRegistry } from './load';
import { Blocks, LINK } from './Prose';
import { CopyContext, HeadingShift } from './copy';
import { CopiedNote, Crumb, DocLayout, Loading, Pinned } from './pages';
import { listOf, shortSha, useCopiedNote, useLateFragment } from './util';
import { FLOORSPEC_LOCK, FLOORSPEC_REPO, STATUS_LABEL, extensionByName, libraryByName, pinnedTree } from './spec';

/**
 * The extension registry and the libraries (DI-T-10.6, FLR-ADR-007, FLR-ADR-018):
 * /floorspec/registry, /floorspec/registry/<NAME> (its spec.md through the same AST and Prose as a
 * chapter), and /floorspec/library/<name>[/<version>]. Generated from the pinned commit by
 * `npm run sync:floorspec`; the data is fetched as its own chunks.
 */

const STATUS_STYLE: Record<ExtensionStatus, string> = {
  proposal: 'border border-dashed border-border-field text-fg-muted',
  draft: 'bg-warning-muted text-warning',
  releaseCandidate: 'bg-info-muted text-info',
  ratified: 'bg-success-muted text-success',
};

function StatusBadge({ status }: { status: ExtensionStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 font-mono text-11 tracking-label whitespace-nowrap uppercase ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const bytes = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`);

/** A row of facts: a term and what it is. */
function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t border-border py-3 sm:flex-row sm:gap-6">
      <dt className="shrink-0 text-13 font-semibold text-fg-muted sm:w-44">{term}</dt>
      <dd className="min-w-0 flex-1 text-14 text-fg">{children}</dd>
    </div>
  );
}

/** Each implementation's evidence: what ran, against which suite, and the public run. */
function EvidenceList({ ext }: { ext: ExtensionDetail }) {
  if (!ext.evidence.length)
    return <span className="text-fg-muted">None recorded{ext.status === 'proposal' || ext.status === 'draft' ? ' — not required before Release Candidate.' : '.'}</span>;
  return (
    <ul className="flex flex-col gap-2">
      {ext.evidence.map((e) => (
        <li key={e.file}>
          <UiLink href={e.implementation.url}>{e.implementation.name}</UiLink> at{' '}
          <span className="font-mono text-13">{shortSha(e.implementation.version)}</span> passed{' '}
          <span className="font-semibold">
            {e.result.passed} of {e.suite.tests}
          </span>{' '}
          tests of the suite at <span className="font-mono text-13">{shortSha(e.suite.commit)}</span>
          {e.result.failed > 0 ? `, and failed ${e.result.failed}` : ''}, on {e.ran} ·{' '}
          <UiLink href={e.run}>the CI run</UiLink> ·{' '}
          <UiLink href={pinnedTree(e.file)}>evidence</UiLink>
          {e.suite.tests !== ext.tests && (
            <span className="block text-13 text-fg-muted">
              The suite has {ext.tests} tests at the commit this site publishes, so this evidence is from an earlier suite.
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function ExtensionFacts({ ext }: { ext: ExtensionDetail }) {
  const requires = Object.entries(ext.requires);
  return (
    <dl className="flex flex-col border-b border-border">
      <Fact term="Status">
        <span className="flex flex-wrap items-center gap-3">
          <StatusBadge status={ext.status} /> version <span className="font-mono">{ext.version}</span>
        </span>
      </Fact>
      {ext.code && (
        <Fact term="Statement IDs">
          <span className="font-mono">FS-{ext.code}-</span> · {plural(ext.statements, 'statement')}
        </Fact>
      )}
      {ext.schemas.length > 0 && (
        <Fact term="Schema">
          <ul className="flex flex-col gap-1">
            {ext.schemas.map((schema) => (
              <li key={schema.path} className="font-mono text-13 break-all">
                <a href={`/${schema.path}`} className={LINK}>
                  https://d3cloud.io/{schema.path}
                </a>
              </li>
            ))}
            {ext.earlierSchemas.map((path) => (
              <li key={path} className="font-mono text-13 break-all text-fg-muted">
                <a href={`/${path}`} className={LINK}>
                  https://d3cloud.io/{path}
                </a>{' '}
                (an earlier version)
              </li>
            ))}
          </ul>
        </Fact>
      )}
      <Fact term="Requires">
        {requires.length ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {requires.map(([name, range]) => (
              <li key={name} className="font-mono text-13">
                {extensionByName(name) ? <Link to={`/floorspec/registry/${name}`}>{name}</Link> : name} {range}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-fg-muted">No other extension.</span>
        )}
      </Fact>
      <Fact term="Kinds">
        {ext.kinds.length ? (
          <ul className="flex flex-col gap-1">
            {ext.kinds.map((kind) => (
              <li key={kind.collection}>
                <code className="font-mono text-13">{kind.collection}</code> — {kind.title}
                {(kind.asset || kind.symbol) && (
                  <span className="text-fg-muted">
                    {' '}
                    · every one carries a {listOf([kind.asset ? 'glTF model' : '', kind.symbol ? 'plan symbol' : ''].filter(Boolean))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-fg-muted">None: it records data on core elements.</span>
        )}
      </Fact>
      {ext.terms.length > 0 && (
        <Fact term="Room functions">
          <span className="font-mono text-13">{ext.terms.join(', ')}</span>
        </Fact>
      )}
      <Fact term="Implementations">
        {ext.implementations.length ? (
          <ul className="flex flex-col gap-1">
            {ext.implementations.map((impl) => (
              <li key={impl.url}>
                <UiLink href={impl.url}>{impl.name}</UiLink>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-fg-muted">None listed.</span>
        )}
      </Fact>
      <Fact term="Evidence">
        <EvidenceList ext={ext} />
      </Fact>
      {ext.exceptions.map((e) => (
        <Fact key={e.waives} term="Recorded exception">
          <span className="flex flex-col gap-1">
            <span>
              Waives <code className="font-mono text-13">{e.waives}</code>. {e.decision}
            </span>
            <span className="text-fg-muted">Until: {e.until}</span>
          </span>
        </Fact>
      ))}
      {ext.code && (
        <Fact term="Conformance">
          {ext.covered} of {ext.mandatory} MUST and MUST NOT statements have a test, from {plural(ext.tests, 'test')} in{' '}
          <UiLink href={pinnedTree(ext.suite)}>{ext.suite}</UiLink>.
        </Fact>
      )}
      {ext.library && (
        <Fact term="Library">
          <Link to={`/floorspec/library/${ext.library.name}/${ext.library.version}`}>
            /floorspec/library/{ext.library.name}/{ext.library.version}/
          </Link>
        </Fact>
      )}
    </dl>
  );
}

// ---------------------------------------------------------------------------------------------
// /floorspec/registry

function RegistryBody() {
  const registry = use(loadRegistry());
  useLateFragment(registry);
  return (
    <div className="flex flex-col gap-16">
      <ul className="flex flex-col gap-6">
        {registry.extensions.map((ext) => (
          <li key={ext.name} id={ext.name} className="flex scroll-mt-24 flex-col gap-4 rounded-lg border border-border bg-surface p-5 sm:p-6">
            <div className="flex flex-col gap-2">
              <p className="flex flex-wrap items-center gap-3">
                <Link to={`/floorspec/registry/${ext.name}`} className="font-mono text-20 font-semibold">
                  {ext.name}
                </Link>
                <span className="font-mono text-14 text-fg-muted">{ext.version}</span>
                <StatusBadge status={ext.status} />
              </p>
              <p className="text-16 font-semibold text-fg">{ext.title}</p>
              {ext.summary && <p className="max-w-3xl text-14 text-fg-muted">{ext.summary.charAt(0).toUpperCase() + ext.summary.slice(1)}.</p>}
            </div>
            <ExtensionFacts ext={ext} />
            {ext.document && (
              <p className="text-14">
                <Link to={`/floorspec/registry/${ext.name}`}>
                  Read {ext.name} {ext.version} →
                </Link>
              </p>
            )}
          </li>
        ))}
      </ul>
      <section aria-labelledby="registry-readme" className="flex max-w-4xl flex-col gap-6">
        <h2 id="registry-readme" className="font-display text-display-md text-fg">
          How the registry works
        </h2>
        <p className="text-14 text-fg-muted">
          The registry’s README, as it is at{' '}
          <UiLink href={pinnedTree('registry/README.md', registry.commit)}>
            {FLOORSPEC_LOCK.repository}@{shortSha(registry.commit)}
          </UiLink>
          .
        </p>
        <Blocks blocks={registry.readme} />
      </section>
    </div>
  );
}

export function RegistryPage() {
  return (
    <div className={`${WRAP} flex flex-col gap-10 pt-12 pb-20 lg:pt-16`}>
      <header className="flex flex-col gap-5">
        <Crumb>
          <span>Registry</span>
        </Crumb>
        <h1 className="font-display text-display-lg tracking-display text-fg">Extension registry</h1>
        <p className="max-w-3xl text-16 text-fg-muted sm:text-20">
          Everything beyond Core — building systems, furniture — arrives as an extension (Core chapter
          12). Each one has a registry entry, a specification whose statements have IDs of their own, a
          JSON Schema at a URL that never changes, and a conformance suite; it becomes a Release
          Candidate when an implementation passes that suite, and Ratified only when two independent
          ones do.
        </p>
        <Pinned path="registry" />
      </header>
      <Suspense fallback={<Loading what="the registry" />}>
        <RegistryBody />
      </Suspense>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// /floorspec/registry/<NAME>

function ExtensionBody({ name }: { name: string }) {
  const registry = use(loadRegistry());
  const ext = registry.extensions.find((x) => x.name === name)!;
  return (
    <div className="flex flex-col gap-12">
      <section aria-label="Registry entry" className="max-w-4xl">
        <ExtensionFacts ext={ext} />
      </section>
      {ext.document ? (
        <Suspense fallback={<Loading what="the specification" />}>
          <ExtensionDocument ext={ext} />
        </Suspense>
      ) : (
        <p className="text-16 text-fg-muted">This extension has no specification yet.</p>
      )}
    </div>
  );
}

function ExtensionDocument({ ext }: { ext: ExtensionDetail }) {
  const doc = use(loadExtensionDoc(ext.name));
  useLateFragment(doc);
  return (
    <HeadingShift.Provider value={1}>
      <DocLayout sections={doc.sections} label={ext.code ? 'Chapters' : 'Contents'} unit="chapters">
        <Blocks blocks={doc.blocks} />
      </DocLayout>
    </HeadingShift.Provider>
  );
}

export function ExtensionPage({ name }: { name: string }) {
  const ext = extensionByName(name)!;
  const [note, copy] = useCopiedNote();
  return (
    <CopyContext.Provider value={copy}>
      <div className={`${WRAP} flex flex-col gap-10 pt-12 pb-20 lg:pt-16`}>
        <header className="flex flex-col gap-5">
          <Crumb>
            <Link to="/floorspec/registry" variant="muted" className="no-underline hover:underline">
              Registry
            </Link>
            <span aria-hidden="true">/</span>
            <span>{ext.name}</span>
          </Crumb>
          <h1 className="font-display text-display-lg tracking-display break-words text-fg">
            {ext.name} <span className="text-fg-faint">{ext.version}</span>
          </h1>
          <p className="flex flex-wrap items-center gap-3 text-16 text-fg-muted sm:text-20">
            <span>{ext.title}</span>
            <StatusBadge status={ext.status} />
          </p>
          <Pinned path={`registry/${ext.name}`} />
        </header>
        <Suspense fallback={<Loading what="the registry entry" />}>
          <ExtensionBody name={name} />
        </Suspense>
      </div>
      <CopiedNote note={note} />
    </CopyContext.Provider>
  );
}

// ---------------------------------------------------------------------------------------------
// /floorspec/library/<name>[/<version>]

function VersionDetail({ v }: { v: LibraryVersion }) {
  const url = `https://d3cloud.io${v.base}/`;
  return (
    <div className="flex flex-col gap-8">
      <dl className="flex max-w-4xl flex-col border-b border-border">
        <Fact term="Published at">
          <span className="font-mono text-13 break-all">{url}</span>
          <span className="block text-13 text-fg-muted">
            {v.canonical
              ? 'The address its manifest gives. Published once, byte for byte, and never changed: a change is a new version.'
              : 'Its manifest names no address; this is where this site publishes it. Published once, byte for byte, and never changed: a change is a new version.'}
          </span>
        </Fact>
        <Fact term="Manifest">
          <a href={`${v.base}/${v.manifest}`} className={`font-mono text-13 ${LINK}`}>
            {v.manifest}
          </a>
          {v.files.some((f) => f.path === 'SHA256SUMS') && (
            <>
              {' '}
              ·{' '}
              <a href={`${v.base}/SHA256SUMS`} className={`font-mono text-13 ${LINK}`}>
                SHA256SUMS
              </a>
            </>
          )}
          {v.files.some((f) => f.path === 'README.md') && (
            <>
              {' '}
              ·{' '}
              <a href={`${v.base}/README.md`} className={`font-mono text-13 ${LINK}`}>
                README.md
              </a>
            </>
          )}
        </Fact>
        {v.extension && (
          <Fact term="Extension">
            {extensionByName(v.extension) ? <Link to={`/floorspec/registry/${v.extension}`}>{v.extension}</Link> : v.extension}
          </Fact>
        )}
        {v.floorspec && <Fact term="Written for">Floorspec Core {v.floorspec}</Fact>}
        {v.license && (
          <Fact term="Licence">{v.licenseUrl ? <UiLink href={v.licenseUrl}>{v.license}</UiLink> : v.license}</Fact>
        )}
        <Fact term="Files">
          {plural(v.files.length, 'file')}, {bytes(v.bytes)} · from{' '}
          <UiLink href={pinnedTree(v.source, v.commit)}>
            {v.source}@{shortSha(v.commit)}
          </UiLink>
        </Fact>
      </dl>
      {v.items.length > 0 && (
        <section aria-labelledby={`items-${v.version}`} className="flex flex-col gap-4">
          <h2 id={`items-${v.version}`} className="text-24 font-semibold text-fg">
            {plural(v.items.length, 'item')}
          </h2>
          <div
            className="overflow-x-auto rounded-md border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            tabIndex={0}
            role="region"
            aria-label="Items, scrolls sideways"
          >
            <table className="w-full border-collapse text-14">
              <thead className="bg-surface text-left">
                <tr>
                  {['Item', 'Kind', 'Name', 'Files'].map((h) => (
                    <th key={h} scope="col" className="border-b border-border px-3 py-2 font-semibold text-fg">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {v.items.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2 align-top font-mono text-13 whitespace-nowrap text-fg">{item.id}</td>
                    <td className="px-3 py-2 align-top text-fg-muted">{item.kind}</td>
                    <td className="px-3 py-2 align-top text-fg">{item.name}</td>
                    <td className="px-3 py-2 align-top">
                      <span className="flex flex-wrap gap-x-3 gap-y-1">
                        {item.files.map((file) => (
                          <a key={file} href={`${v.base}/${file}`} className={`font-mono text-13 whitespace-nowrap ${LINK}`}>
                            {file.split('/').pop()}
                          </a>
                        ))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <details className="rounded-lg border border-border bg-surface">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 text-14 font-semibold text-fg">
          Every file · {v.files.length}
        </summary>
        <ul className="grid gap-x-6 gap-y-1 px-4 pb-4 sm:grid-cols-2">
          {v.files.map((file) => (
            <li key={file.path} className="flex justify-between gap-3 font-mono text-13">
              <a href={`${v.base}/${file.path}`} className={`truncate ${LINK}`}>
                {file.path}
              </a>
              <span className="shrink-0 text-fg-faint">{bytes(file.bytes)}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function LibraryBody({ name, version }: { name: string; version?: string }) {
  const lib = use(loadLibraries()).libraries.find((l) => l.name === name)!;
  const latest = lib.versions[lib.versions.length - 1]!;
  const shown = version ? lib.versions.find((v) => v.version === version)! : latest;
  return (
    <div className="flex flex-col gap-10">
      {shown.description && <p className="max-w-3xl text-16 text-fg-muted">{shown.description}</p>}
      {lib.versions.length > 1 || version ? (
        <nav aria-label="Versions" className="flex flex-wrap items-center gap-3 text-14">
          <span className="text-fg-muted">Versions</span>
          {lib.versions.map((v) =>
            v === shown && version ? (
              <span key={v.version} className="rounded-full border border-border px-3 py-1 font-mono text-13 text-fg">
                {v.version}
              </span>
            ) : (
              <Link key={v.version} to={`/floorspec/library/${lib.name}/${v.version}`} className="font-mono text-13">
                {v.version}
              </Link>
            ),
          )}
        </nav>
      ) : null}
      {!version && (
        <h2 className="font-display text-display-sm text-fg">
          <Link to={`/floorspec/library/${lib.name}/${latest.version}`} variant="muted" className="no-underline hover:underline">
            {latest.version}
          </Link>
          <span className="text-fg-faint">{lib.versions.length > 1 ? ', the latest' : ''}</span>
        </h2>
      )}
      <VersionDetail v={shown} />
    </div>
  );
}

export function LibraryPage({ name, version }: { name: string; version?: string }) {
  const lib = libraryByName(name)!;
  return (
    <div className={`${WRAP} flex flex-col gap-10 pt-12 pb-20 lg:pt-16`}>
      <header className="flex flex-col gap-5">
        <Crumb>
          <span>Library</span>
          <span aria-hidden="true">/</span>
          {version ? (
            <Link to={`/floorspec/library/${lib.name}`} variant="muted" className="no-underline hover:underline">
              {lib.name}
            </Link>
          ) : (
            <span>{lib.name}</span>
          )}
          {version && (
            <>
              <span aria-hidden="true">/</span>
              <span>{version}</span>
            </>
          )}
        </Crumb>
        <h1 className="font-display text-display-lg tracking-display text-fg">
          {lib.title}
          {version && <span className="text-fg-faint"> {version}</span>}
        </h1>
        <p className="max-w-3xl text-14 text-fg-muted">
          Not part of the standard: a library of ready-made items a document copies into itself. Its
          files are served to any origin, cached as immutable. <UiLink href={FLOORSPEC_REPO}>The repository ↗</UiLink>
        </p>
      </header>
      <Suspense fallback={<Loading what="the library" />}>
        <LibraryBody name={name} version={version} />
      </Suspense>
    </div>
  );
}
