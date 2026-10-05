/**
 * Pins a commit of the Floorspec standard and turns it into this site's /floorspec pages
 * (DI-T-10.2, DI-T-10.4, DI-T-10.5, DI-T-10.6, DI-REQ-042, FLR-ADR-018):
 *
 *   npm run sync:floorspec [-- <path to the floorspec checkout>]   (or FLOORSPEC_DIR=…; default ../floorspec)
 *
 * Every specification under spec/ that has chapters is published — Core, Ops and Rules — at its
 * current draft, and every earlier draft stays published as it was:
 *
 * 1. Refuses a checkout with uncommitted changes under spec/, schema/, conformance/, registry/,
 *    library/ or rules/ — what is published has to be a commit someone can look at.
 * 2. Records the commit, and each specification's draft version (from its README), in
 *    src/floorspec/floorspec.lock.json. When a specification's version moves on (Core 0.2 → 0.3),
 *    the commit the lock pinned for the old version is kept under `earlier`, and that draft goes
 *    on being published from that commit — read with `git archive`, never from the working tree —
 *    at /floorspec/<spec>/<version>/<chapter>. Earlier pins are never dropped or moved.
 * 3. Parses each chapter of spec/<spec> with marked's lexer into the compact AST of
 *    src/floorspec/ast.ts — headings with stable ids, statement tags as anchored statements,
 *    cross-references as links (including "Core §5.3" from another specification, resolved within
 *    the same commit, so Ops 0.1 links to Core 0.1) — and writes src/floorspec/generated/.
 *    Everything generated is committed, so CI builds the site without the floorspec checkout.
 * 4. Extracts the normative statements with floorspec's own tools/statements.ts at the same commit
 *    (imported, not copied), refuses if it reports a problem, and checks every statement it found
 *    is anchored. The IDs a draft retired (the "Changes from" table of its chapter 0) are recorded
 *    with what replaced them — followed to the current draft when the replacement was retired in
 *    turn — and where the old statement is still published.
 * 5. Coverage: for the current drafts, the repo's own gate (`pnpm coverage`, when its dependencies
 *    are installed) writes build/coverage.json, which is read; otherwise, and for every earlier
 *    draft, conformance/<spec>/<version>/**\/test.json at that draft's commit is scanned.
 * 6. The extension registry: every registry/<NAME>/extension.json, its specification (spec.md,
 *    parsed like a chapter, statements anchored in its own ID space; or proposal.md), evidence,
 *    recorded exceptions and suite, and registry/README.md, for /floorspec/registry and
 *    /floorspec/registry/<NAME>.
 * 7. Copies every schema byte for byte into public/: each schema/<name>/<version>/*.json — the
 *    specifications' and the registry's — to public/floorspec/schema/<name>/<version>/, and each
 *    extension's registry/<NAME>/*.schema.json to the path its `$id` names
 *    (https://d3cloud.io/floorspec/schema/ext/<NAME>/<version>/<short>.schema.json). A schema URL
 *    never changes once published: src/floorspec/published-schemas.json records each file's
 *    SHA-256, new files are added to it, and the sync refuses if a published file would change, or
 *    if a specification's schema disappears from the checkout. An extension's schema for an earlier
 *    version is no longer in the checkout once the registry moves on; it stays in public/ as
 *    recorded.
 * 8. Libraries: each library/<name>/<version>/ (manifest index.json) and each extension's
 *    registry/<NAME>/library/ (manifest library.json) is copied byte for byte to
 *    public/floorspec/library/<name>/<version>/ — <name> and <version> read from the manifest: the
 *    last segment of its `library` URL, or the extension it belongs to — and every file's SHA-256 is
 *    recorded in src/floorspec/published-libraries.json under the same never-change rule. Every file
 *    a manifest names, and every digest it gives, is checked.
 *
 * Nothing is written until everything has been read and checked.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { marked, type Token, type Tokens } from 'marked';
import type {
  Block,
  CalloutKind,
  Chapter,
  ChapterSection,
  Coverage,
  CoverageRow,
  Evidence,
  ExtensionDetail,
  ExtensionStatus,
  FloorspecIndex,
  Inline,
  Level,
  Libraries,
  LibraryItem,
  LibraryVersion,
  Packs,
  Registry,
  RetiredStatement,
  SpecIndex,
} from '../src/floorspec/ast';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, process.argv[2] ?? process.env.FLOORSPEC_DIR ?? '../floorspec');
const REPO = 'matdemers1/floorspec';
const SITE = 'https://d3cloud.io';
/** The order the site presents them in; any other specification follows, alphabetically. */
const ORDER = ['core', 'ops', 'rules'];
/** Path segments under /floorspec that are not specifications. */
const RESERVED = new Set(['app', 'coverage', 'registry', 'library', 'schema']);

const out = join(root, 'src/floorspec');
const generated = join(out, 'generated');
const publishedPath = join(out, 'published-schemas.json');
const librariesPath = join(out, 'published-libraries.json');
const lockPath = join(out, 'floorspec.lock.json');

function fail(message: string): never {
  console.error(`sync-floorspec: ${message}`);
  process.exit(1);
}

const git = (...args: string[]) => execFileSync('git', ['-C', source, ...args], { encoding: 'utf8' }).trim();
const isDir = (p: string) => existsSync(p) && statSync(p).isDirectory();
const readJson = <T,>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

/** Every file under `dir`, as paths relative to it, sorted. */
function filesUnder(dir: string, prefix = ''): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(join(dir, prefix)).sort()) {
    const rel = prefix ? `${prefix}/${entry}` : entry;
    if (isDir(join(dir, rel))) found.push(...filesUnder(dir, rel));
    else found.push(rel);
  }
  return found;
}

// ---------------------------------------------------------------------------------------------
// 1–2. The checkout, clean, and its commit.

if (!existsSync(join(source, 'spec', 'core'))) fail(`no Floorspec checkout at ${source} (pass a path, or set FLOORSPEC_DIR)`);
const WATCHED = ['spec', 'schema', 'conformance', 'registry', 'library', 'rules'].filter((d) => existsSync(join(source, d)));
const dirty = git('status', '--porcelain', '--untracked-files=all', '--', ...WATCHED);
if (dirty) fail(`${source} has uncommitted changes under ${WATCHED.join('/, ')}/ — commit them first:\n${dirty}`);
const commit = git('rev-parse', 'HEAD');
const committedAt = git('show', '-s', '--format=%cI', 'HEAD');

// ---------------------------------------------------------------------------------------------
// The specifications: every directory of spec/ with at least one chapter, at one commit.

interface Statement {
  id: string;
  level: Level;
  section: string;
  text: string;
  file: string;
  line: number;
}
type Problems = { file: string; line: number; message: string }[];
type Extract = (root: string, spec: string) => { statements: Statement[]; problems: Problems };
interface ExtensionSpecs {
  extensionSpecs?: (root: string) => { specs: { name: string; version: string; code: string; file: string }[]; problems: Problems };
  extractExtension?: (root: string, ext: { name: string; version: string; code: string; file: string; suite: string }) => {
    statements: Statement[];
    problems: Problems;
  };
}

/** `05-walls.md` → `walls`; `annex-ifc.md` → `ifc`. */
const slugOf = (file: string) => basename(file, '.md').replace(/^\d+-/, '').replace(/^annex-/, '');

const CHAPTER = /^#\s+(\d+|[A-Z])\.\s+(.*)$/m;

interface Pin {
  commit: string;
  committedAt: string;
}

/** The standard at one commit: the checkout itself, or an earlier pinned commit read with `git archive`. */
interface Snapshot extends Pin {
  root: string;
  specs: Spec[];
  /** "Core" → Core at this commit: a cross-reference resolves within the commit it was written at. */
  byShort: Map<string, Spec>;
  /** A file or directory of the repo that is published on this site → its address here. Current commit only. */
  published: Map<string, string>;
}

interface Spec {
  code: string;
  /** "Core" — what another specification calls it in a cross-reference ("Core §5.3"). */
  short: string;
  name: string;
  version: string;
  /** Where its chapters are published: /floorspec/core, or /floorspec/core/0.1 for an earlier draft. */
  base: string;
  snap: Snapshot;
  dir: string;
  /** Its directory in the repo, which its relative links are relative to: spec/core, registry/FS_electrical. */
  src: string;
  files: string[];
  summaries: Map<string, string>;
  statements: Statement[];
  statementIds: Set<string>;
  chapterOf: Map<string, string>; // chapter number → slug
  sectionOf: Map<string, string>; // "5.3" → slug
  slugByFile: Map<string, string>;
  /** One page holding several `# n.` chapters — an extension's spec.md: a chapter is an anchor on it. */
  single?: boolean;
}

/**
 * Reads every specification at `root`. `current` is undefined for the checkout itself (whose drafts
 * are the current ones); for an earlier commit it is the current versions and the earlier pins, which
 * decide where each of its specifications is published.
 */
async function loadSnapshot(
  root: string,
  pin: Pin,
  current?: { versions: Record<string, string>; earlier: Record<string, Record<string, Pin>> },
): Promise<Snapshot> {
  const { extract } = (await import(pathToFileURL(join(root, 'tools/statements.ts')).href)) as { extract: Extract };
  const snap: Snapshot = { ...pin, root, specs: [], byShort: new Map(), published: new Map() };
  snap.specs = readdirSync(join(root, 'spec'))
    .filter((code) => statSync(join(root, 'spec', code)).isDirectory())
    .filter((code) => readdirSync(join(root, 'spec', code)).some((f) => f.endsWith('.md') && f !== 'README.md'))
    .sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b))
    .map((code): Spec => {
      const at = pin.commit.slice(0, 7);
      if (RESERVED.has(code) || !/^[a-z]+$/.test(code)) fail(`spec/${code} at ${at}: "${code}" cannot be a specification's path segment under /floorspec`);
      const dir = join(root, 'spec', code);
      const readme = readFileSync(join(dir, 'README.md'), 'utf8');
      const name = /^#\s+(Floorspec \S+)\s*$/m.exec(readme)?.[1];
      const version = /\*\*Draft (\d+\.\d+)\b/.exec(readme)?.[1];
      if (!name || !version) fail(`spec/${code}/README.md at ${at} must have a "# Floorspec <Name>" heading and a "**Draft <n.n>" status`);
      const files = readdirSync(dir)
        .filter((f) => f.endsWith('.md') && f !== 'README.md')
        .sort();

      /** The chapter table in the README: file → what the chapter covers. */
      const summaries = new Map<string, string>();
      for (const line of readme.split('\n')) {
        const m = /^\|\s*\[[^\]]*\]\(([^)]+\.md)\)\s*\|\s*(.*?)\s*\|\s*$/.exec(line);
        if (m) summaries.set(m[1]!, m[2]!);
      }

      const { statements, problems } = extract(root, code);
      if (problems.length)
        fail(
          `floorspec's statement checker reports problems in spec/${code} at ${at}:\n${problems.map((p) => `  ${p.file}:${p.line}: ${p.message}`).join('\n')}`,
        );

      /** First pass: every chapter's number, and every numbered section, so cross-references resolve. */
      const chapterOf = new Map<string, string>();
      const sectionOf = new Map<string, string>();
      for (const file of files) {
        const text = readFileSync(join(dir, file), 'utf8');
        const c = CHAPTER.exec(text);
        if (!c) fail(`spec/${code}/${file} at ${at} has no "# n. Title" heading`);
        chapterOf.set(c[1]!, slugOf(file));
        for (const m of text.matchAll(/^##\s+(\d+\.\d+)\s/gm)) sectionOf.set(m[1]!, slugOf(file));
      }

      // The current draft of a specification, and anything a later commit has not moved past, is at
      // /floorspec/<spec>; an earlier draft that is published is under its version.
      const versioned = current && version !== current.versions[code] && current.earlier[code]?.[version];
      return {
        code,
        short: name.replace(/^Floorspec /, ''),
        name,
        version,
        base: versioned ? `/floorspec/${code}/${version}` : `/floorspec/${code}`,
        snap,
        dir,
        src: `spec/${code}`,
        files,
        summaries,
        statements,
        statementIds: new Set(statements.map((s) => s.id)),
        chapterOf,
        sectionOf,
        slugByFile: new Map(files.map((f) => [f, slugOf(f)])),
      };
    });
  snap.byShort = new Map(snap.specs.map((s) => [s.short, s]));
  return snap;
}

const current = await loadSnapshot(source, { commit, committedAt });
if (!current.specs.some((s) => s.code === 'core')) fail('spec/core has no chapters');
const currentVersions = Object.fromEntries(current.specs.map((s) => [s.code, s.version]));

// The earlier drafts: every pin the lock already holds, and the draft the lock pinned last for any
// specification whose version has since moved on.
interface Lock extends Pin {
  repository: string;
  specifications: Record<string, string>;
  earlier?: Record<string, Record<string, Pin>>;
}
const previous: Lock | undefined = existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, 'utf8')) : undefined;
const earlierPins: Record<string, Record<string, Pin>> = JSON.parse(JSON.stringify(previous?.earlier ?? {}));
if (previous) {
  for (const [code, version] of Object.entries(previous.specifications)) {
    if (!currentVersions[code] || currentVersions[code] === version) continue;
    (earlierPins[code] ??= {})[version] ??= { commit: previous.commit, committedAt: previous.committedAt };
  }
}
for (const [code, versions] of Object.entries(earlierPins)) {
  if (versions[currentVersions[code] ?? '']) fail(`${code} ${currentVersions[code]} is pinned as an earlier draft, and is also the checkout's current draft`);
}

const scratch = mkdtempSync(join(tmpdir(), 'floorspec-sync-'));
process.on('exit', () => rmSync(scratch, { recursive: true, force: true }));

const earlier: Spec[] = [];
const byCommit = new Map<string, { pin: Pin; wanted: [string, string][] }>();
for (const [code, versions] of Object.entries(earlierPins))
  for (const [version, pin] of Object.entries(versions)) {
    const entry = byCommit.get(pin.commit) ?? { pin, wanted: [] };
    entry.wanted.push([code, version]);
    byCommit.set(pin.commit, entry);
  }
for (const { pin, wanted } of [...byCommit.values()].sort((a, b) => a.pin.committedAt.localeCompare(b.pin.committedAt))) {
  try {
    git('cat-file', '-e', `${pin.commit}^{commit}`);
  } catch {
    fail(`${source} does not have commit ${pin.commit}, which an earlier draft is pinned at — fetch it`);
  }
  const dir = join(scratch, pin.commit);
  mkdirSync(dir);
  const tar = execFileSync('git', ['-C', source, 'archive', '--format=tar', pin.commit, 'spec', 'tools', 'conformance'], {
    maxBuffer: 1 << 30,
  });
  execFileSync('tar', ['-x', '-C', dir], { input: tar });
  const snap = await loadSnapshot(dir, pin, { versions: currentVersions, earlier: earlierPins });
  for (const [code, version] of wanted) {
    const spec = snap.specs.find((s) => s.code === code);
    if (!spec || spec.version !== version)
      fail(`${code} ${version} is pinned at ${pin.commit.slice(0, 7)}, but that commit has ${spec ? `${code} ${spec.version}` : `no spec/${code}`}`);
    earlier.push(spec);
  }
}
earlier.sort(
  (a, b) =>
    (ORDER.indexOf(a.code) + 1 || 99) - (ORDER.indexOf(b.code) + 1 || 99) ||
    a.code.localeCompare(b.code) ||
    b.version.localeCompare(a.version, undefined, { numeric: true }),
);

// ---------------------------------------------------------------------------------------------
// 7. Schemas, read and checked (written last): copied byte for byte, and never changed once published.

/** A file to publish under public/: its path under the site root, and where it comes from. */
interface Copy {
  path: string;
  from: string;
}

const publishedSchemas: Record<string, string> = existsSync(publishedPath) ? readJson(publishedPath) : {};
const publishedLibraries: Record<string, string> = existsSync(librariesPath) ? readJson(librariesPath) : {};

/** Every schema/<name>/<version>/ with JSON in it: each specification's drafts, and the registry's. */
const schemaCopies: Copy[] = [];
const schemaCounts = new Map<string, number>();
for (const name of readdirSync(join(source, 'schema')).sort()) {
  if (!isDir(join(source, 'schema', name))) continue;
  if (name === 'ext') fail('schema/ext/ is where the site publishes extension schemas; the repository has a directory of that name');
  for (const version of readdirSync(join(source, 'schema', name)).sort()) {
    const from = join(source, 'schema', name, version);
    if (!isDir(from)) continue;
    const incoming = readdirSync(from)
      .filter((f) => f.endsWith('.json'))
      .sort();
    if (!incoming.length) continue;
    schemaCounts.set(`${name}/${version}`, incoming.length);
    for (const file of incoming) schemaCopies.push({ path: `floorspec/schema/${name}/${version}/${file}`, from: join(from, file) });
  }
}

// ---------------------------------------------------------------------------------------------
// 6. The extension registry (current commit only).

interface ExtensionSource {
  entry: {
    name: string;
    version: string;
    status: ExtensionStatus;
    schema?: string;
    title: string;
    requires?: Record<string, string>;
    kinds?: Record<string, { title: string; fallback?: { asset?: boolean; symbol?: boolean } }>;
    terms?: { roomFunctions?: string[] };
    implementations?: { name: string; url: string }[];
  };
  dir: string;
  /** Its specification, parsed like a chapter, when it has one (spec.md) — or its proposal.md, without statements. */
  spec?: Spec;
  document?: string;
  schemas: { file: string; path: string }[];
}

const STATUSES: ExtensionStatus[] = ['proposal', 'draft', 'releaseCandidate', 'ratified'];
const registryDir = join(source, 'registry');
const tools = (await import(pathToFileURL(join(source, 'tools/statements.ts')).href)) as ExtensionSpecs;
const extensionCodes = new Map<string, string>();
if (isDir(registryDir)) {
  if (!tools.extensionSpecs || !tools.extractExtension) fail('registry/ has extensions, but tools/statements.ts exports no extensionSpecs/extractExtension');
  const { specs, problems } = tools.extensionSpecs(source);
  if (problems.length) fail(`floorspec's statement checker reports problems in registry/:\n${problems.map((p) => `  ${p.file}:${p.line}: ${p.message}`).join('\n')}`);
  for (const s of specs) extensionCodes.set(s.name, s.code);
}

const extensions: ExtensionSource[] = [];
for (const name of isDir(registryDir) ? readdirSync(registryDir).sort() : []) {
  const dir = join(registryDir, name);
  if (!existsSync(join(dir, 'extension.json'))) continue;
  const entry = readJson<ExtensionSource['entry']>(join(dir, 'extension.json'));
  if (entry.name !== name) fail(`registry/${name}/extension.json names ${entry.name}`);
  if (!/^[A-Za-z0-9_]+$/.test(name)) fail(`registry/${name}: an extension's name must be a path segment`);
  if (!STATUSES.includes(entry.status)) fail(`registry/${name}/extension.json has status "${entry.status}"`);

  // Its schema files, each published at the URL its own $id names — read, never constructed.
  const schemas: ExtensionSource['schemas'] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.schema.json')).sort()) {
    const id = readJson<{ $id?: unknown }>(join(dir, file)).$id;
    if (typeof id !== 'string' || !id.startsWith(`${SITE}/floorspec/schema/`))
      fail(`registry/${name}/${file}: its $id (${String(id)}) is not under ${SITE}/floorspec/schema/`);
    const path = id.slice(SITE.length + 1);
    if (!/^floorspec\/schema\/ext\/[^/]+\/[^/]+\/[^/]+\.json$/.test(path) || basename(path) !== file)
      fail(`registry/${name}/${file}: its $id ${id} is not floorspec/schema/ext/<NAME>/<version>/${file}`);
    schemas.push({ file, path });
    schemaCopies.push({ path, from: join(dir, file) });
  }
  if (entry.schema && !schemas.some((s) => `${SITE}/${s.path}` === entry.schema))
    fail(`registry/${name}/extension.json gives schema ${entry.schema}, which no schema file in registry/${name}/ has as its $id`);

  const ext: ExtensionSource = { entry, dir, schemas };
  const code = extensionCodes.get(name);
  if (existsSync(join(dir, 'spec.md'))) {
    if (!code) fail(`registry/${name}/spec.md has no statement code`);
    const { statements, problems } = tools.extractExtension!(source, {
      name,
      version: entry.version,
      code,
      file: join(dir, 'spec.md'),
      suite: join(source, 'conformance', 'ext', name, entry.version),
    });
    if (problems.length) fail(`floorspec's statement checker reports problems in registry/${name}/spec.md:\n${problems.map((p) => `  ${p.file}:${p.line}: ${p.message}`).join('\n')}`);
    const text = readFileSync(join(dir, 'spec.md'), 'utf8');
    const chapterOf = new Map<string, string>();
    const sectionOf = new Map<string, string>();
    for (const m of text.matchAll(/^#\s+(\d+)\.\s/gm)) chapterOf.set(m[1]!, name);
    for (const m of text.matchAll(/^##\s+(\d+\.\d+)\s/gm)) sectionOf.set(m[1]!, name);
    ext.spec = {
      code: code.toLowerCase(),
      short: name,
      name,
      version: entry.version,
      base: '/floorspec/registry',
      snap: current,
      dir,
      src: `registry/${name}`,
      files: ['spec.md'],
      summaries: new Map(),
      statements,
      statementIds: new Set(statements.map((s) => s.id)),
      chapterOf,
      sectionOf,
      slugByFile: new Map([['spec.md', name]]),
      single: true,
    };
    ext.document = `registry/${name}/spec.md`;
  } else if (existsSync(join(dir, 'proposal.md'))) {
    ext.document = `registry/${name}/proposal.md`;
  }
  extensions.push(ext);
}

// The order of the registry's own table of official extensions, then any other, alphabetically.
const registryReadme = existsSync(join(registryDir, 'README.md')) ? readFileSync(join(registryDir, 'README.md'), 'utf8') : '';
/** "What it describes", by extension name, from the registry README's table of extensions. */
const describes = new Map<string, string>();
{
  let column = -1;
  for (const line of registryReadme.split('\n')) {
    if (!line.startsWith('|')) {
      column = -1;
      continue;
    }
    const cells = line.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
    if (/^Extension$/i.test(cells[0] ?? '')) column = cells.findIndex((c) => /describ/i.test(c));
    else if (column >= 0) {
      const name = /`([A-Za-z0-9_]+)`/.exec(cells[0] ?? '')?.[1];
      if (name) describes.set(name, cells[column]!.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/`/g, ''));
    }
  }
}
const tableOrder = [...describes.keys()];
extensions.sort(
  (a, b) => (tableOrder.indexOf(a.entry.name) + 1 || 99) - (tableOrder.indexOf(b.entry.name) + 1 || 99) || a.entry.name.localeCompare(b.entry.name),
);
for (const ext of extensions) current.published.set(`registry/${ext.entry.name}/spec.md`, `/floorspec/registry/${ext.entry.name}`);
if (extensions.length) {
  current.published.set('registry/README.md', '/floorspec/registry');
  current.published.set('registry', '/floorspec/registry');
}

// ---------------------------------------------------------------------------------------------
// 8. Libraries (current commit only, earlier versions carried forward from public/).

interface LibrarySource {
  dir: string;
  version: LibraryVersion;
  manifest: Record<string, unknown>;
}

const libraries: LibrarySource[] = [];
const libraryCopies: Copy[] = [];

function readLibrary(dir: string, manifestFile: string): LibrarySource {
  const where = relative(source, dir);
  const manifest = readJson<Record<string, unknown>>(join(dir, manifestFile));
  const version = manifest.version;
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) fail(`${where}/${manifestFile} has no version`);
  // Its name: the last segment of the URL its manifest names, or the extension it belongs to.
  let name: string | undefined;
  let canonical = false;
  if (typeof manifest.library === 'string' && manifest.library.startsWith(`${SITE}/floorspec/library/`)) {
    name = manifest.library.slice(`${SITE}/floorspec/library/`.length);
    canonical = true;
  } else if (typeof manifest.extension === 'string') name = manifest.extension;
  if (!name || !/^[A-Za-z0-9_-]+$/.test(name)) fail(`${where}/${manifestFile}: no library name — a "library" URL under ${SITE}/floorspec/library/, or an "extension"`);
  const base = `/floorspec/library/${name}/${version}`;
  if (canonical && manifest.uri !== undefined && manifest.uri !== `${SITE}${base}/`)
    fail(`${where}/${manifestFile} says it is published at ${String(manifest.uri)}, not ${SITE}${base}/`);
  if (where.startsWith('library/') && where !== `library/${name}/${version}`)
    fail(`${where}/${manifestFile} names ${name} ${version}, which belongs in library/${name}/${version}/`);

  const files = filesUnder(dir);
  const present = new Set(files);
  const bytes = new Map(files.map((f) => [f, statSync(join(dir, f)).size]));

  // Every file the manifest names exists, with the digest and length it gives.
  const named = (value: unknown, found: Set<string>): void => {
    if (Array.isArray(value)) value.forEach((v) => named(v, found));
    else if (value && typeof value === 'object') {
      const o = value as Record<string, unknown>;
      if (typeof o.path === 'string') {
        if (!present.has(o.path)) fail(`${where}/${manifestFile} names ${o.path}, which is not in ${where}/`);
        if (typeof o.sha256 === 'string' && sha256(join(dir, o.path)) !== o.sha256) fail(`${where}/${o.path} does not have the SHA-256 ${manifestFile} gives`);
        if (typeof o.byteLength === 'number' && bytes.get(o.path) !== o.byteLength) fail(`${where}/${o.path} is not the byteLength ${manifestFile} gives`);
        found.add(o.path);
      }
      for (const v of Object.values(o)) named(v, found);
    } else if (typeof value === 'string' && value.startsWith(`${SITE}${base}/`) && value !== `${SITE}${base}/`) {
      const path = value.slice(`${SITE}${base}/`.length);
      if (!present.has(path)) fail(`${where}/${manifestFile} names ${value}, which is not in ${where}/`);
      found.add(path);
    }
  };
  // A SHA256SUMS beside it is checked too.
  if (present.has('SHA256SUMS'))
    for (const line of readFileSync(join(dir, 'SHA256SUMS'), 'utf8').split('\n').filter(Boolean)) {
      const m = /^([0-9a-f]{64})\s+\*?(.+)$/.exec(line);
      if (!m) fail(`${where}/SHA256SUMS: cannot read "${line}"`);
      if (!present.has(m[2]!) || sha256(join(dir, m[2]!)) !== m[1]) fail(`${where}/SHA256SUMS: ${m[2]} does not match`);
    }

  const items: LibraryItem[] = [];
  const list = manifest.items;
  if (list && typeof list === 'object')
    for (const [id, item] of Object.entries(list as Record<string, Record<string, unknown>>)) {
      const found = new Set<string>();
      named(item, found);
      const element = item.element as { name?: unknown } | undefined;
      items.push({
        id,
        kind: String(item.kind ?? ''),
        name: String(item.name ?? element?.name ?? id),
        files: [...found].sort(),
      });
    }
  named(manifest, new Set());

  const title = String(manifest.name ?? manifest.library ?? name);
  return {
    dir,
    manifest,
    version: {
      name,
      version,
      title,
      description: String(manifest.description ?? ''),
      ...(typeof manifest.license === 'string' ? { license: manifest.license } : {}),
      ...(typeof manifest.licenseUrl === 'string' ? { licenseUrl: manifest.licenseUrl } : {}),
      ...(typeof manifest.extension === 'string' ? { extension: manifest.extension } : {}),
      ...(typeof manifest.floorspec === 'string' ? { floorspec: manifest.floorspec } : {}),
      source: where,
      commit,
      base,
      manifest: manifestFile,
      canonical,
      files: files.map((path) => ({ path, bytes: bytes.get(path)! })),
      bytes: [...bytes.values()].reduce((a, b) => a + b, 0),
      items,
    },
  };
}

const MANIFESTS = ['index.json', 'library.json'];
const manifestIn = (dir: string) => MANIFESTS.find((m) => existsSync(join(dir, m)));
for (const name of isDir(join(source, 'library')) ? readdirSync(join(source, 'library')).sort() : []) {
  for (const version of isDir(join(source, 'library', name)) ? readdirSync(join(source, 'library', name)).sort() : []) {
    const dir = join(source, 'library', name, version);
    const manifest = isDir(dir) && manifestIn(dir);
    if (manifest) libraries.push(readLibrary(dir, manifest));
  }
}
for (const ext of extensions) {
  const dir = join(ext.dir, 'library');
  const manifest = isDir(dir) && manifestIn(dir);
  if (manifest) libraries.push(readLibrary(dir, manifest));
}
for (const lib of libraries) {
  const { name, version, base, source: where } = lib.version;
  if (libraries.filter((l) => l.version.name === name && l.version.version === version).length > 1) fail(`two libraries are ${name} ${version}`);
  for (const file of lib.version.files) libraryCopies.push({ path: `${base.slice(1)}/${file.path}`, from: join(lib.dir, file.path) });
  current.published.set(where, `/floorspec/library/${name}/${version}`);
  for (const file of lib.version.files) current.published.set(`${where}/${file.path}`, `${base}/${file.path}`);
  if (where.startsWith('library/')) current.published.set(dirname(where), `/floorspec/library/${name}`);
}

// The never-change rule, for schemas and libraries alike: a file published once keeps its bytes.
function checkPublished(record: Record<string, string>, copies: Copy[], what: string, mustStay: (path: string) => boolean): string[] {
  const breaks: string[] = [];
  const incoming = new Map(copies.map((c) => [c.path, c.from]));
  for (const [path, hash] of Object.entries(record)) {
    const from = incoming.get(path);
    if (from) {
      if (sha256(from) !== hash) breaks.push(`${path} is published and its content would change (${relative(source, from)})`);
      continue;
    }
    // Not in the checkout any more: a specification's schema must be; an extension's earlier
    // version and a library's are kept in public/ exactly as they were published.
    if (mustStay(path)) breaks.push(`${path} is published but the checkout no longer has it`);
    else if (!existsSync(join(root, 'public', path)) || sha256(join(root, 'public', path)) !== hash)
      breaks.push(`${path} is published, is no longer in the checkout, and public/ no longer holds it as published`);
  }
  for (const c of copies) if (copies.filter((o) => o.path === c.path).length > 1) breaks.push(`${c.path} would be published from two files`);
  if (breaks.length)
    fail(
      `a published ${what} URL must never change (FLR-ADR-018, DI-REQ-042):\n  ${[...new Set(breaks)].join('\n  ')}\n` +
        `Publish the change under a new version instead.`,
    );
  return copies.filter((c) => !record[c.path]).map((c) => c.path);
}
const addedSchemas = checkPublished(publishedSchemas, schemaCopies, 'schema', (path) => !path.startsWith('floorspec/schema/ext/'));
const addedLibraries = checkPublished(publishedLibraries, libraryCopies, 'library', () => false);
for (const c of schemaCopies) current.published.set(relative(source, c.from), `/${c.path}`);

// ---------------------------------------------------------------------------------------------
// 3. Chapters.

const TAG = /\{#(FS-[A-Z]+-\d+\.\d+\.\d+) (MUST NOT|MUST|SHOULD NOT|SHOULD|MAY)\}/g;
/**
 * A cross-reference in prose: "chapter 6", "Annex A", or a section or statement number such as
 * "5.3" or "9.1.1". A number becomes a link only when it names something that exists, and not
 * when it is a version ("Core 0.1", "IFC 4.3", "Semantic Versioning 2.0.0").
 */
const REF = /\b[Cc]hapter (\d+)\b|\bAnnex A\b|(?<![\d.,])(\d+)\.(\d+)(?:\.(\d+))?(?![\d]|\.\d)/g;
const NOT_A_REF = /([Cc]ore|Ops|Rules|IFC4?|[Dd]raft|[Vv]ersion|Versioning|Floorspec|RFC|ISO|BCP|ADD2|TC1|§|FS_[a-z]+)\s*$/;
/** Chapter 0's sections share their numbers with the draft itself ("a 0.1 document"): linked only as "(0.5)" or "see 0.5". */
const CHAPTER_ZERO_REF = /(\(|see )$/;
/** A number named as another specification's: "Core §5.3", "Core 5.2.1". */
const OTHER_SPEC = /\b([A-Z][a-z]+)\s*(§)?\s*$/;
/** What joins a list or range of numbers to the one before it: "Core 5.2.1, 5.2.2", "Core §5.1–5.3". */
const CONTINUES = /^\s*(?:,|–|—|-|and|or|to|, and|, or)\s*$/;

const page = (spec: Spec, slug: string, hash?: string) => `${spec.base}/${slug}${hash ? `#${hash}` : ''}`;

/** A section or statement number in `spec`, as a link, if it names something that exists. */
function numberTarget(spec: Spec, chapter: string, section: string, statement: string | undefined): string | undefined {
  const full = `${chapter}.${section}`;
  const slug = spec.sectionOf.get(full);
  if (!slug) return undefined;
  if (statement === undefined) return page(spec, slug, full);
  const id = `FS-${spec.code.toUpperCase()}-${full}.${statement}`;
  return spec.statementIds.has(id) ? page(spec, slug, id) : undefined;
}

function crossRefs(text: string, spec: Spec, here: string): Inline[] {
  const parts: Inline[] = [];
  let last = 0;
  /** The last number that named another specification, and where it ended — a list may continue it. */
  let other: { spec: Spec; end: number } | undefined;
  for (const m of text.matchAll(REF)) {
    const before = text.slice(0, m.index);
    let href: string | undefined;
    if (m[1] !== undefined) {
      const slug = spec.chapterOf.get(m[1]);
      if (slug) href = spec.single ? page(spec, slug, `chapter-${m[1]}`) : page(spec, slug);
    } else if (m[0] === 'Annex A') {
      const slug = spec.chapterOf.get('A');
      if (slug) href = page(spec, slug);
    } else {
      const named = OTHER_SPEC.exec(before);
      const target = named ? spec.snap.byShort.get(named[1]!) : undefined;
      if (target && target !== spec) {
        // "Core §0.1" is a section; "Core 0.1" is a version.
        if (m[2] !== '0' || named![2]) href = numberTarget(target, m[2]!, m[3]!, m[4]);
        other = { spec: target, end: m.index + m[0].length };
      } else if (other && CONTINUES.test(text.slice(other.end, m.index))) {
        href = numberTarget(other.spec, m[2]!, m[3]!, m[4]);
        other.end = m.index + m[0].length;
      } else if (!NOT_A_REF.test(before) && (m[2] !== '0' || CHAPTER_ZERO_REF.test(before))) {
        href = numberTarget(spec, m[2]!, m[3]!, m[4]);
      }
    }
    if (!href) continue;
    if (m.index > last) parts.push(text.slice(last, m.index));
    // A link to the page you are on is just its anchor.
    const self = page(spec, here);
    parts.push({ t: 'a', href: href.startsWith(`${self}#`) ? href.slice(self.length) : href, c: [m[0]] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/**
 * A Markdown link target: a chapter of any specification becomes its page; an extension's
 * specification, the registry, a published schema or library file its address here; anything else
 * in the repo, GitHub at the commit the text comes from.
 */
function linkTarget(href: string, spec: Spec): string {
  if (/^[a-z]+:/i.test(href) || href.startsWith('#')) return href;
  const [file, hash] = href.split('#');
  const path = posix.normalize(posix.join(spec.src, file!)).replace(/\/$/, '');
  const m = /^spec\/([^/]+)\/([^/]+\.md)$/.exec(path);
  const target = m ? spec.snap.specs.find((s) => s.code === m[1]) : undefined;
  const slug = target?.slugByFile.get(m![2]!);
  if (target && slug) return page(target, slug, hash);
  const here = spec.snap.published.get(path);
  if (here) return `${here}${hash ? `#${hash}` : ''}`;
  return `https://github.com/${REPO}/tree/${spec.snap.commit}/${path}${hash ? `#${hash}` : ''}`;
}

/** Text with statement tags and cross-references found in it. Tags become markers, grouped later. */
type Marker = { t: 'tag'; id: string; level: Level };
type Piece = Inline | Marker;

function inlines(tokens: Token[] | undefined, spec: Spec, here: string, refs = true): Piece[] {
  const outList: Piece[] = [];
  for (const token of tokens ?? []) {
    switch (token.type) {
      case 'text':
      case 'escape': {
        const t = token as Tokens.Text;
        if (t.tokens && t.tokens.length) {
          outList.push(...inlines(t.tokens, spec, here, refs));
          break;
        }
        const text = t.text.replace(/\n/g, ' ');
        let last = 0;
        for (const m of text.matchAll(TAG)) {
          const before = text.slice(last, m.index);
          if (before) outList.push(...(refs ? crossRefs(before, spec, here) : [before]));
          outList.push({ t: 'tag', id: m[1]!, level: m[2] as Level });
          last = m.index + m[0].length;
        }
        const rest = text.slice(last);
        if (rest) outList.push(...(refs ? crossRefs(rest, spec, here) : [rest]));
        break;
      }
      case 'codespan':
        outList.push({ t: 'code', v: (token as Tokens.Codespan).text });
        break;
      case 'em':
        outList.push({ t: 'em', c: group(inlines((token as Tokens.Em).tokens, spec, here, refs)) });
        break;
      case 'strong':
        outList.push({ t: 'strong', c: group(inlines((token as Tokens.Strong).tokens, spec, here, refs)) });
        break;
      case 'link': {
        const l = token as Tokens.Link;
        outList.push({ t: 'a', href: linkTarget(l.href, spec), c: group(inlines(l.tokens, spec, here, false)) });
        break;
      }
      case 'br':
        outList.push({ t: 'br' });
        break;
      case 'html':
        // Not used by the specification; shown as text rather than interpreted.
        outList.push((token as Tokens.HTML).text);
        break;
      default:
        fail(`unsupported inline Markdown "${token.type}" in ${spec.code}/${here}`);
    }
  }
  return outList;
}

/** Merges adjacent strings, and wraps each sentence that ends in a tag into a statement. */
function group(pieces: Piece[]): Inline[] {
  const result: Inline[] = [];
  let sentence: Inline[] = [];
  const push = (list: Inline[], item: Inline) => {
    const prev = list[list.length - 1];
    if (typeof item === 'string' && typeof prev === 'string') list[list.length - 1] = prev + item;
    else list.push(item);
  };
  for (const piece of pieces) {
    if (typeof piece !== 'string' && piece.t === 'tag') {
      const last = sentence[sentence.length - 1];
      if (typeof last === 'string') sentence[sentence.length - 1] = last.replace(/\s+$/, '');
      const first = sentence[0];
      if (typeof first === 'string') sentence[0] = first.replace(/^\s+/, '');
      if (result.length && sentence.length) push(result, ' ');
      result.push({ t: 'stmt', id: piece.id, level: piece.level, c: sentence.filter((s) => s !== '') });
      sentence = [];
      continue;
    }
    push(sentence, piece as Inline);
  }
  for (const item of sentence) push(result, item);
  // Text after a statement starts a new sentence; drop the space the tag left behind.
  return result.filter((item, i) => !(typeof item === 'string' && item.trim() === '' && i === result.length - 1));
}

const plain = (c: Inline[]): string =>
  c.map((i) => (typeof i === 'string' ? i : i.t === 'code' ? i.v : 'c' in i ? plain(i.c) : '')).join('');

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const CALLOUT = /^\[!(note|example|warning)\][ \t]*([^\n]*)\n?/i;

function blocks(tokens: Token[], spec: Spec, here: string, sections: ChapterSection[]): Block[] {
  const list: Block[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case 'space':
        break;
      case 'heading': {
        const h = token as Tokens.Heading;
        if (h.depth === 1) {
          // The chapter title, rendered by the page — except on a page of several chapters (an
          // extension's spec.md), where each `# n. Title` is a chapter of it, with an anchor.
          const c = spec.single ? /^(\d+)\.\s+(.*)$/.exec(h.text) : null;
          if (!c) break;
          const title = group(inlines(marked.Lexer.lexInline(c[2]!), spec, here, false));
          sections.push({ id: `chapter-${c[1]}`, number: c[1], title: plain(title) });
          list.push({ t: 'h', depth: 1, id: `chapter-${c[1]}`, number: c[1], c: title });
          break;
        }
        const m = /^(\d+\.\d+)\s+(.*)$/.exec(h.text);
        const c = group(inlines(m ? marked.Lexer.lexInline(m[2]!) : h.tokens, spec, here, false));
        const id = m ? m[1]! : slugify(h.text);
        if (h.depth === 2 && !spec.single) sections.push({ id, number: m?.[1], title: plain(c) });
        list.push({ t: 'h', depth: h.depth, id, number: m?.[1], c });
        break;
      }
      case 'paragraph':
        list.push({ t: 'p', c: group(inlines((token as Tokens.Paragraph).tokens, spec, here)) });
        break;
      case 'text': {
        // A tight list item's body.
        const t = token as Tokens.Text;
        list.push({ t: 'p', c: group(inlines(t.tokens ?? [t as Token], spec, here)) });
        break;
      }
      case 'list': {
        const l = token as Tokens.List;
        list.push({
          t: 'list',
          ordered: l.ordered,
          start: l.ordered && l.start !== 1 && l.start !== '' ? Number(l.start) : undefined,
          items: l.items.map((item) => blocks(item.tokens, spec, here, sections)),
        });
        break;
      }
      case 'table': {
        const t = token as Tokens.Table;
        list.push({
          t: 'table',
          align: t.align,
          head: t.header.map((cell) => group(inlines(cell.tokens, spec, here))),
          rows: t.rows.map((row) => row.map((cell) => group(inlines(cell.tokens, spec, here)))),
        });
        break;
      }
      case 'code': {
        const c = token as Tokens.Code;
        list.push({ t: 'code', lang: c.lang || undefined, v: c.text });
        break;
      }
      case 'blockquote': {
        const q = token as Tokens.Blockquote;
        const m = CALLOUT.exec(q.text);
        if (!m) {
          list.push({ t: 'quote', c: blocks(q.tokens, spec, here, sections) });
          break;
        }
        // Re-lex without the marker line, so the callout's body is ordinary blocks.
        const body = q.text.slice(m[0].length);
        list.push({
          t: 'callout',
          kind: m[1]!.toLowerCase() as CalloutKind,
          title: group(inlines(marked.Lexer.lexInline(m[2]!.trim()), spec, here)),
          c: blocks(marked.lexer(body), spec, here, []),
        });
        break;
      }
      case 'hr':
        list.push({ t: 'hr' });
        break;
      default:
        fail(`unsupported Markdown block "${token.type}" in ${spec.code}/${here}`);
    }
  }
  return list;
}

/** Every statement ID a chapter anchors, to check nothing the extractor found is missing. */
function anchored(items: (Block | Inline)[], into: string[]): string[] {
  for (const item of items) {
    if (typeof item === 'string') continue;
    if (item.t === 'stmt') into.push(item.id);
    if (item.t === 'table') for (const cell of [...item.head, ...item.rows.flat()]) anchored(cell, into);
    else if (item.t === 'list') for (const entry of item.items) anchored(entry, into);
    else if (item.t === 'callout') anchored([...item.title, ...item.c], into);
    else if ('c' in item) anchored(item.c as (Block | Inline)[], into);
  }
  return into;
}

function checkAnchors(spec: Spec, chapters: Chapter[], where: string) {
  const seen = chapters.flatMap((ch) => anchored(ch.blocks, []));
  const missing = spec.statements.filter((s) => !seen.includes(s.id));
  const extra = seen.filter((id) => !spec.statementIds.has(id));
  if (missing.length || extra.length || new Set(seen).size !== seen.length)
    fail(
      `${where}: statement anchors do not match the extractor: missing ${missing.map((s) => s.id).join(', ') || 'none'}, unknown ${extra.join(', ') || 'none'}`,
    );
}

function chaptersOf(spec: Spec): Chapter[] {
  const chapters: Chapter[] = [];
  for (const file of spec.files) {
    const text = readFileSync(join(spec.dir, file), 'utf8');
    const slug = slugOf(file);
    const c = CHAPTER.exec(text)!;
    const sections: ChapterSection[] = [];
    const parsed = blocks(marked.lexer(text), spec, slug, sections);
    chapters.push({ slug, number: c[1]!, title: c[2]!.replace(/^Annex:\s*/, '').trim(), file: `${spec.src}/${file}`, sections, blocks: parsed });
  }
  checkAnchors(spec, chapters, `spec/${spec.code}`);
  return chapters;
}

// ---------------------------------------------------------------------------------------------
// 5. Coverage.

const MANDATORY: Level[] = ['MUST', 'MUST NOT'];

/** Every test.json under a suite: how many, and how many name each statement. */
function scanTests(dir: string, rootDir: string, at: string, known: (id: string) => boolean): { tests: number; coveredBy: Map<string, number> } {
  const coveredBy = new Map<string, number>();
  let tests = 0;
  const walk = (d: string) => {
    if (!existsSync(d)) return;
    for (const entry of readdirSync(d).sort()) {
      const p = join(d, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (entry === 'test.json') {
        const t = JSON.parse(readFileSync(p, 'utf8')) as { covers?: unknown };
        if (!Array.isArray(t.covers)) fail(`${relative(rootDir, p)}: "covers" must be an array of statement IDs`);
        tests += 1;
        for (const id of t.covers as string[]) {
          if (!known(id)) fail(`${at}:${relative(rootDir, p)} covers ${id}, which no statement has`);
          coveredBy.set(id, (coveredBy.get(id) ?? 0) + 1);
        }
      }
    }
  };
  walk(dir);
  return { tests, coveredBy };
}

const scanSuite = (spec: Spec) =>
  scanTests(join(spec.snap.root, 'conformance', spec.code, spec.version), spec.snap.root, spec.snap.commit.slice(0, 7), (id) => spec.statementIds.has(id));

type GateReport = Record<string, { tests: number; statements: { id: string; tests: string[] }[] } | undefined>;

/** Runs the repo's own coverage gate once, for every specification it knows. */
function gate(): GateReport | null {
  // FLOORSPEC_COVERAGE=scan skips the gate, to check the two agree.
  if (process.env.FLOORSPEC_COVERAGE === 'scan' || !existsSync(join(source, 'node_modules'))) return null;
  const report = join(source, 'build', 'coverage.json');
  const started = Date.now();
  // The gate exits non-zero while any MUST is uncovered; the report it writes is what matters.
  spawnSync('pnpm', ['coverage'], { cwd: source, stdio: 'ignore' });
  if (!existsSync(report) || statSync(report).mtimeMs < started - 1000) return null;
  return JSON.parse(readFileSync(report, 'utf8')) as GateReport;
}

const gateReport = gate();

function coverageOf(spec: Spec): Coverage {
  // The gate counts the checkout's current drafts; an earlier draft is counted from its own suite.
  const data = spec.snap === current ? gateReport?.[spec.code] : undefined;
  const counted = data
    ? { tests: data.tests, coveredBy: new Map(data.statements.map((s) => [s.id, s.tests.length])) }
    : scanSuite(spec);
  const rows: CoverageRow[] = spec.statements.map((s) => ({
    id: s.id,
    level: s.level,
    section: s.section,
    chapter: spec.sectionOf.get(s.section)!,
    text: s.text.replace(TAG, '').replace(/`/g, '').trim(),
    tests: counted.coveredBy.get(s.id) ?? 0,
  }));
  const mandatory = rows.filter((r) => MANDATORY.includes(r.level));
  return {
    spec: spec.code,
    version: spec.version,
    source: data ? 'floorspec coverage gate' : `scan of conformance/${spec.code}/${spec.version}`,
    tests: counted.tests,
    mandatory: mandatory.length,
    covered: mandatory.filter((r) => r.tests > 0).length,
    statements: rows,
  };
}

// ---------------------------------------------------------------------------------------------
// 4b. Retired statement IDs: the "Changes from" tables of a draft's chapter 0 — `| \`FS-CORE-1.2.1\` |
// \`FS-CORE-1.2.3\` | why |`. A link to a retired ID still lands somewhere: the page it was on says
// what replaced it, and where the earlier draft that had it is published.

const RETIRED_ROW = /^\|\s*`(FS-[A-Z]+-\d+\.\d+\.\d+)`\s*\|\s*(?:`(FS-[A-Z]+-\d+\.\d+\.\d+)`)?\s*\|\s*(.*?)\s*\|\s*$/;
const sectionOfId = (id: string) => id.replace(/^FS-[A-Z]+-/, '').replace(/\.\d+$/, '');

function retiredOf(spec: Spec): RetiredStatement[] {
  const conventions = spec.files.find((f) => spec.slugByFile.get(f) === 'conventions');
  if (!conventions) return [];
  const rows = new Map<string, { replacedBy?: string; why: string }>();
  for (const line of readFileSync(join(spec.dir, conventions), 'utf8').split('\n')) {
    const m = RETIRED_ROW.exec(line);
    if (!m || !m[1]!.startsWith(`FS-${spec.code.toUpperCase()}-`)) continue;
    if (rows.has(m[1]!)) fail(`spec/${spec.code}: ${m[1]} is listed as retired twice`);
    rows.set(m[1]!, { replacedBy: m[2], why: m[3]! });
  }
  const list: RetiredStatement[] = [];
  for (const [id, { replacedBy: named, why }] of rows) {
    if (spec.statementIds.has(id)) fail(`spec/${spec.code}: ${id} is listed as retired, and is still a statement`);
    // A replacement a later draft retired in turn is followed to the statement that replaces it now.
    let replacedBy = named;
    const via: string[] = [];
    while (replacedBy && !spec.statementIds.has(replacedBy) && rows.has(replacedBy) && !via.includes(replacedBy)) {
      via.push(replacedBy);
      replacedBy = rows.get(replacedBy)!.replacedBy;
    }
    if (named && (!replacedBy || !spec.statementIds.has(replacedBy)))
      fail(`spec/${spec.code}: ${id} is replaced by ${named}, which no statement has${via.length ? ` (followed through ${via.join(', ')})` : ''}`);
    const section = sectionOfId(id);
    const chapter = spec.sectionOf.get(section) ?? spec.chapterOf.get(section.split('.')[0]!);
    if (!chapter) fail(`spec/${spec.code}: retired ${id} belongs to no chapter of ${spec.name} ${spec.version}`);
    const was = earlier.find((e) => e.code === spec.code && e.statementIds.has(id));
    if (!was) fail(`spec/${spec.code}: retired ${id} is in no earlier draft this site publishes`);
    const by = replacedBy && spec.sectionOf.get(sectionOfId(replacedBy));
    list.push({
      id,
      ...(replacedBy && by
        ? { replacedBy: { id: replacedBy, href: by === chapter ? `#${replacedBy}` : page(spec, by, replacedBy), ...(via.length ? { via } : {}) } }
        : {}),
      why: group(inlines(marked.Lexer.lexInline(why), spec, chapter)),
      section,
      chapter,
      was: { version: was.version, href: page(was, was.sectionOf.get(section)!, id) },
    });
  }
  return list;
}

// ---------------------------------------------------------------------------------------------
// Everything, read and checked, in memory.

const report: string[] = [`floorspec @ ${commit.slice(0, 7)} (${committedAt})`];
/** generated/<path> → its content. */
const files = new Map<string, string>();
const json = (value: unknown) => `${JSON.stringify(value, null, 1)}\n`;

/** One draft's chapters and coverage under generated/<spec>/<version>/, and its index entry. */
function publish(spec: Spec): SpecIndex {
  const chapters = chaptersOf(spec);
  const coverage = coverageOf(spec);
  const retired = spec.snap === current ? retiredOf(spec) : [];
  for (const ch of chapters) {
    const notes = retired.filter((r) => r.chapter === ch.slug);
    files.set(`${spec.code}/${spec.version}/chapters/${ch.slug}.json`, JSON.stringify(notes.length ? { ...ch, retired: notes } : ch) + '\n');
  }
  files.set(`${spec.code}/${spec.version}/coverage.json`, json(coverage));

  const schemas = schemaCounts.get(`${spec.code}/${spec.version}`) ?? 0;
  report.push(
    `${spec.name} ${spec.version} @ ${spec.snap.commit.slice(0, 7)} → ${spec.base}: ${chapters.length} chapters, ${spec.statements.length} statements (${coverage.mandatory} MUST / MUST NOT); ` +
      `coverage (${coverage.source}): ${coverage.covered} of ${coverage.mandatory}, ${coverage.tests} tests; ` +
      `${schemas} schemas${retired.length ? `; retired ${retired.map((r) => r.id).join(', ')}` : ''}`,
  );
  return {
    spec: spec.code,
    name: spec.name,
    short: spec.short,
    version: spec.version,
    base: spec.base,
    commit: spec.snap.commit,
    chapters: chapters.map((ch) => ({
      slug: ch.slug,
      number: ch.number,
      title: ch.title,
      summary: spec.summaries.get(basename(ch.file)) ?? '',
      statements: spec.statements.filter((s) => spec.sectionOf.get(s.section) === ch.slug).length,
    })),
    statements: spec.statements.length,
    mandatory: coverage.mandatory,
    covered: coverage.covered,
    tests: coverage.tests,
    ...(retired.length ? { retired: retired.length } : {}),
  };
}

const specifications = current.specs.map(publish);
const earlierIndex = earlier.map(publish);
for (const [key, count] of schemaCounts) if (!current.specs.some((s) => `${s.code}/${s.version}` === key)) report.push(`schema/${key}: ${count} schemas`);

// The registry: its README, every entry, and each extension's specification.
const exceptionsFile = join(registryDir, 'exceptions.json');
const exceptions = existsSync(exceptionsFile)
  ? readJson<{ exceptions?: { extension: string; version: string; waives: string; decision: string; until: string }[] }>(exceptionsFile).exceptions ?? []
  : [];
for (const e of exceptions)
  if (!extensions.some((x) => x.entry.name === e.extension && x.entry.version === e.version))
    fail(`registry/exceptions.json names ${e.extension} ${e.version}, which the registry does not have`);

const readmeSpec: Spec = {
  code: 'registry',
  short: 'registry',
  name: 'registry',
  version: '',
  base: '/floorspec',
  snap: current,
  dir: registryDir,
  src: 'registry',
  files: [],
  summaries: new Map(),
  statements: [],
  statementIds: new Set(),
  chapterOf: new Map(),
  sectionOf: new Map(),
  slugByFile: new Map(),
};

const details: ExtensionDetail[] = extensions.map((ext): ExtensionDetail => {
  const { entry } = ext;
  const name = entry.name;
  if (ext.spec) {
    const sections: ChapterSection[] = [];
    const text = readFileSync(join(ext.dir, 'spec.md'), 'utf8');
    const parsed = blocks(marked.lexer(text), ext.spec, name, sections);
    const chapter: Chapter = { slug: name, number: '', title: entry.title, file: ext.document!, sections, blocks: parsed };
    checkAnchors(ext.spec, [chapter], `registry/${name}/spec.md`);
    files.set(`registry/${name}.json`, JSON.stringify(chapter) + '\n');
  } else if (ext.document) {
    const sections: ChapterSection[] = [];
    const parsed = blocks(marked.lexer(readFileSync(join(source, ext.document), 'utf8')), { ...readmeSpec, src: `registry/${name}` }, name, sections);
    files.set(`registry/${name}.json`, JSON.stringify({ slug: name, number: '', title: entry.title, file: ext.document, sections, blocks: parsed } satisfies Chapter) + '\n');
  }
  const suite = `conformance/ext/${name}/${entry.version}`;
  const own = ext.spec?.statementIds ?? new Set<string>();
  // An extension's test may also cover Core or Ops statements; only its own are counted here.
  const counted = scanTests(join(source, suite), source, commit.slice(0, 7), () => true);
  const mandatory = (ext.spec?.statements ?? []).filter((s) => MANDATORY.includes(s.level));
  const evidenceDir = join(ext.dir, 'evidence');
  const evidence: Evidence[] = isDir(evidenceDir)
    ? readdirSync(evidenceDir)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .map((f) => {
          const e = readJson<Omit<Evidence, 'file'> & { extension?: string }>(join(evidenceDir, f));
          if (e.extension !== undefined && e.extension !== name) fail(`registry/${name}/evidence/${f} is evidence for ${e.extension}`);
          return {
            file: `registry/${name}/evidence/${f}`,
            implementation: e.implementation,
            maintainer: e.maintainer,
            sharesCodeWith: e.sharesCodeWith ?? [],
            extensionVersion: e.extensionVersion,
            suite: e.suite,
            result: e.result,
            ran: e.ran,
            run: e.run,
          };
        })
    : [];
  const library = libraries.find((l) => l.dir === join(ext.dir, 'library'))?.version;
  const earlierSchemas = Object.keys(publishedSchemas)
    .filter((p) => p.startsWith(`floorspec/schema/ext/${name}/`) && !ext.schemas.some((s) => s.path === p))
    .sort();
  report.push(
    `${name} ${entry.version} (${entry.status}) → /floorspec/registry/${name}: ${ext.spec?.statements.length ?? 0} statements, ` +
      `${mandatory.filter((s) => counted.coveredBy.has(s.id)).length} of ${mandatory.length} MUST covered by ${counted.tests} tests; ` +
      `${ext.schemas.length} schemas, ${evidence.length} evidence`,
  );
  return {
    name,
    version: entry.version,
    status: entry.status,
    title: entry.title,
    ...(ext.spec ? { code: ext.spec.code.toUpperCase() } : {}),
    summary: describes.get(name) ?? '',
    ...(entry.schema ? { schema: entry.schema } : {}),
    requires: entry.requires ?? {},
    kinds: Object.entries(entry.kinds ?? {}).map(([collection, kind]) => ({
      collection,
      title: kind.title,
      asset: kind.fallback?.asset === true,
      symbol: kind.fallback?.symbol === true,
    })),
    terms: entry.terms?.roomFunctions ?? [],
    implementations: entry.implementations ?? [],
    evidence,
    exceptions: exceptions.filter((e) => e.extension === name && e.version === entry.version).map(({ waives, decision, until }) => ({ waives, decision, until })),
    schemas: ext.schemas,
    earlierSchemas,
    ...(ext.document ? { document: ext.document } : {}),
    statements: ext.spec?.statements.length ?? 0,
    mandatory: mandatory.length,
    covered: mandatory.filter((s) => own.has(s.id) && counted.coveredBy.has(s.id)).length,
    tests: counted.tests,
    suite,
    ...(library ? { library: { name: library.name, version: library.version } } : {}),
  };
});
if (extensions.length) {
  const registry: Registry = {
    commit,
    readme: blocks(marked.lexer(registryReadme), readmeSpec, 'registry', []),
    extensions: details,
  };
  files.set('registry/index.json', json(registry));
}

// Libraries: every version in the checkout, and every earlier version still published.
const previousLibraries: Libraries = existsSync(join(generated, 'libraries.json')) ? readJson(join(generated, 'libraries.json')) : { libraries: [] };
const libraryVersions: LibraryVersion[] = libraries.map((l) => l.version);
for (const lib of previousLibraries.libraries)
  for (const v of lib.versions)
    if (!libraryVersions.some((x) => x.name === v.name && x.version === v.version)) {
      // Carried forward only when public/ still holds every file of it as recorded.
      for (const f of v.files) if (!publishedLibraries[`${v.base.slice(1)}/${f.path}`]) fail(`${v.name} ${v.version} was published, but ${f.path} is not recorded`);
      libraryVersions.push(v);
    }
const versionOrder = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });
const libraryNames = [...new Set(libraryVersions.map((v) => v.name))].sort((a, b) => {
  // A standalone library before an extension's.
  const ext = (n: string) => (libraryVersions.find((v) => v.name === n)?.extension ? 1 : 0);
  return ext(a) - ext(b) || a.localeCompare(b);
});
const librariesData: Libraries = {
  libraries: libraryNames.map((name) => {
    const versions = libraryVersions.filter((v) => v.name === name).sort((a, b) => versionOrder(a.version, b.version));
    return { name, title: versions[versions.length - 1]!.title, versions };
  }),
};
if (libraryVersions.length) files.set('libraries.json', json(librariesData));
for (const lib of libraries)
  report.push(
    `library ${lib.version.name} ${lib.version.version} (${lib.version.source}) → ${lib.version.base}/: ${lib.version.files.length} files, ${lib.version.bytes} bytes, ${lib.version.items.length} items${lib.version.canonical ? '' : ' — its manifest names no URL; the site chose this one'}`,
  );

// The rule packs: what rules/ holds, for the landing page.
const rulesDir = join(source, 'rules');
if (isDir(rulesDir)) {
  const packs: Packs = { packs: [], viewers: [], covered: 0 };
  for (const name of readdirSync(rulesDir).sort()) {
    const manifest = join(rulesDir, name, 'pack.json');
    if (!existsSync(manifest)) continue;
    const p = readJson<{ name: string; version: string; title: string; description?: string; synthetic?: boolean; license?: string }>(manifest);
    const rules = isDir(join(rulesDir, name, 'rules')) ? readdirSync(join(rulesDir, name, 'rules')).filter((r) => isDir(join(rulesDir, name, 'rules', r))).length : 0;
    packs.packs.push({ name: p.name, version: p.version, title: p.title, description: p.description ?? '', synthetic: p.synthetic === true, rules, license: p.license ?? '' });
  }
  if (existsSync(join(rulesDir, 'viewers.json')))
    packs.viewers = readJson<{ viewers: { host: string; publisher: string }[] }>(join(rulesDir, 'viewers.json')).viewers.map(({ host, publisher }) => ({ host, publisher }));
  if (existsSync(join(rulesDir, 'coverage.json'))) packs.covered = (readJson<{ packs?: unknown[] }>(join(rulesDir, 'coverage.json')).packs ?? []).length;
  files.set('packs.json', json(packs));
}

const index: FloorspecIndex = {
  specifications,
  earlier: earlierIndex,
  extensions: details.map(({ name, version, status, title }) => ({ name, version, status, title })),
  libraries: librariesData.libraries.map(({ name, title, versions }) => ({ name, title, versions: versions.map((v) => v.version) })),
};
files.set('index.json', json(index));

// ---------------------------------------------------------------------------------------------
// Write.

rmSync(generated, { recursive: true, force: true });
for (const [path, content] of files) {
  mkdirSync(dirname(join(generated, path)), { recursive: true });
  writeFileSync(join(generated, path), content);
}

const record = (copies: Copy[], published: Record<string, string>) => {
  for (const c of copies) {
    mkdirSync(dirname(join(root, 'public', c.path)), { recursive: true });
    copyFileSync(c.from, join(root, 'public', c.path));
    published[c.path] ??= sha256(c.from);
  }
  return Object.fromEntries(Object.entries(published).sort(([a], [b]) => a.localeCompare(b)));
};
writeFileSync(publishedPath, json(record(schemaCopies, publishedSchemas)));
writeFileSync(librariesPath, json(record(libraryCopies, publishedLibraries)));

const sortedPins = Object.fromEntries(
  Object.entries(earlierPins)
    .sort(([a], [b]) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b))
    .map(([code, versions]) => [code, Object.fromEntries(Object.entries(versions).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })))]),
);
writeFileSync(lockPath, json({ repository: REPO, commit, committedAt, specifications: currentVersions, earlier: sortedPins }));

if (addedSchemas.length) report.push(`newly published schemas: ${addedSchemas.join(', ')}`);
if (addedLibraries.length) report.push(`newly published library files: ${addedLibraries.length}`);
console.log(report.join('\n'));
