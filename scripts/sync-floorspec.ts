/**
 * Pins a commit of the Floorspec standard and turns it into this site's /floorspec pages
 * (DI-T-10.2, DI-T-10.4, DI-REQ-042, FLR-ADR-018):
 *
 *   npm run sync:floorspec [-- <path to the floorspec checkout>]   (or FLOORSPEC_DIR=…; default ../floorspec)
 *
 * Every specification under spec/ that has chapters is published — Core and Ops today, Rules when
 * it has some. For each one:
 *
 * 1. Refuses a checkout with uncommitted changes under spec/, schema/ or conformance/ — what is
 *    published has to be a commit someone can look at.
 * 2. Records the commit, and each specification's draft version, in src/floorspec/floorspec.lock.json.
 * 3. Parses each chapter of spec/<spec> with marked's lexer into the compact AST of
 *    src/floorspec/ast.ts — headings with stable ids, statement tags as anchored statements,
 *    cross-references as links (including "Core §5.3" from another specification) — and writes
 *    src/floorspec/generated/. Everything generated is committed, so CI builds the site without
 *    the floorspec checkout.
 * 4. Extracts the normative statements with floorspec's own tools/statements.ts (imported, not
 *    copied), refuses if it reports a problem, and checks every statement it found is anchored.
 * 5. Coverage: the repo's own gate (`pnpm coverage`, when its dependencies are installed) writes
 *    build/coverage.json, which is read; otherwise conformance/<spec>/<version>/**\/test.json is
 *    scanned.
 * 6. Copies schema/<spec>/<version>/*.json byte for byte into public/floorspec/schema/<spec>/<version>/.
 *    A schema URL never changes once published: src/floorspec/published-schemas.json records each
 *    file's SHA-256, new files are added to it, and the sync refuses if a published file would
 *    change or disappear. src/floorspec/floorspec.test.ts holds public/ to the same record.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
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
  FloorspecIndex,
  Inline,
  Level,
  SpecIndex,
} from '../src/floorspec/ast';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, process.argv[2] ?? process.env.FLOORSPEC_DIR ?? '../floorspec');
const REPO = 'matdemers1/floorspec';
/** The order the site presents them in; any other specification follows, alphabetically. */
const ORDER = ['core', 'ops', 'rules'];

const out = join(root, 'src/floorspec');
const generated = join(out, 'generated');
const publishedPath = join(out, 'published-schemas.json');

function fail(message: string): never {
  console.error(`sync-floorspec: ${message}`);
  process.exit(1);
}

const git = (...args: string[]) => execFileSync('git', ['-C', source, ...args], { encoding: 'utf8' }).trim();

// ---------------------------------------------------------------------------------------------
// 1–2. The checkout, clean, and its commit.

if (!existsSync(join(source, 'spec', 'core'))) fail(`no Floorspec checkout at ${source} (pass a path, or set FLOORSPEC_DIR)`);
const dirty = git('status', '--porcelain', '--untracked-files=all', '--', 'spec', 'schema', 'conformance');
if (dirty) fail(`${source} has uncommitted changes under spec/, schema/ or conformance/ — commit them first:\n${dirty}`);
const commit = git('rev-parse', 'HEAD');
const committedAt = git('show', '-s', '--format=%cI', 'HEAD');

// ---------------------------------------------------------------------------------------------
// The specifications: every directory of spec/ with at least one chapter.

interface Statement {
  id: string;
  level: Level;
  section: string;
  text: string;
  file: string;
  line: number;
}
type Extract = (root: string, spec: string) => { statements: Statement[]; problems: { file: string; line: number; message: string }[] };
const { extract } = (await import(pathToFileURL(join(source, 'tools/statements.ts')).href)) as { extract: Extract };

/** `05-walls.md` → `walls`; `annex-ifc.md` → `ifc`. */
const slugOf = (file: string) => basename(file, '.md').replace(/^\d+-/, '').replace(/^annex-/, '');

const CHAPTER = /^#\s+(\d+|[A-Z])\.\s+(.*)$/m;

interface Spec {
  code: string;
  /** "Core" — what another specification calls it in a cross-reference ("Core §5.3"). */
  short: string;
  name: string;
  version: string;
  dir: string;
  files: string[];
  summaries: Map<string, string>;
  statements: Statement[];
  statementIds: Set<string>;
  chapterOf: Map<string, string>; // chapter number → slug
  sectionOf: Map<string, string>; // "5.3" → slug
  slugByFile: Map<string, string>;
}

const specs: Spec[] = readdirSync(join(source, 'spec'))
  .filter((code) => statSync(join(source, 'spec', code)).isDirectory())
  .filter((code) => readdirSync(join(source, 'spec', code)).some((f) => f.endsWith('.md') && f !== 'README.md'))
  .sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b))
  .map((code): Spec => {
    const dir = join(source, 'spec', code);
    const readme = readFileSync(join(dir, 'README.md'), 'utf8');
    const name = /^#\s+(Floorspec \S+)\s*$/m.exec(readme)?.[1];
    const version = /\*\*Draft (\d+\.\d+)\b/.exec(readme)?.[1];
    if (!name || !version) fail(`spec/${code}/README.md must have a "# Floorspec <Name>" heading and a "**Draft <n.n>" status`);
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.md') && f !== 'README.md')
      .sort();

    /** The chapter table in the README: file → what the chapter covers. */
    const summaries = new Map<string, string>();
    for (const line of readme.split('\n')) {
      const m = /^\|\s*\[[^\]]*\]\(([^)]+\.md)\)\s*\|\s*(.*?)\s*\|\s*$/.exec(line);
      if (m) summaries.set(m[1]!, m[2]!);
    }

    const { statements, problems } = extract(source, code);
    if (problems.length)
      fail(`floorspec's statement checker reports problems in spec/${code}:\n${problems.map((p) => `  ${p.file}:${p.line}: ${p.message}`).join('\n')}`);

    /** First pass: every chapter's number, and every numbered section, so cross-references resolve. */
    const chapterOf = new Map<string, string>();
    const sectionOf = new Map<string, string>();
    for (const file of files) {
      const text = readFileSync(join(dir, file), 'utf8');
      const c = CHAPTER.exec(text);
      if (!c) fail(`spec/${code}/${file} has no "# n. Title" heading`);
      chapterOf.set(c[1]!, slugOf(file));
      for (const m of text.matchAll(/^##\s+(\d+\.\d+)\s/gm)) sectionOf.set(m[1]!, slugOf(file));
    }

    return {
      code,
      short: name.replace(/^Floorspec /, ''),
      name,
      version,
      dir,
      files,
      summaries,
      statements,
      statementIds: new Set(statements.map((s) => s.id)),
      chapterOf,
      sectionOf,
      slugByFile: new Map(files.map((f) => [f, slugOf(f)])),
    };
  });
if (!specs.some((s) => s.code === 'core')) fail('spec/core has no chapters');
const specByShort = new Map(specs.map((s) => [s.short, s]));

// ---------------------------------------------------------------------------------------------
// 3. Chapters.

const TAG = /\{#(FS-[A-Z]+-\d+\.\d+\.\d+) (MUST NOT|MUST|SHOULD NOT|SHOULD|MAY)\}/g;
/**
 * A cross-reference in prose: "chapter 6", "Annex A", or a section or statement number such as
 * "5.3" or "9.1.1". A number becomes a link only when it names something that exists, and not
 * when it is a version ("Core 0.1", "IFC 4.3", "Semantic Versioning 2.0.0").
 */
const REF = /\b[Cc]hapter (\d+)\b|\bAnnex A\b|(?<![\d.,])(\d+)\.(\d+)(?:\.(\d+))?(?![\d]|\.\d)/g;
const NOT_A_REF = /([Cc]ore|Ops|Rules|IFC4?|[Dd]raft|[Vv]ersion|Versioning|Floorspec|RFC|ISO|BCP|ADD2|TC1|§)\s*$/;
/** Chapter 0's sections share their numbers with the draft itself ("a 0.1 document"): linked only as "(0.5)" or "see 0.5". */
const CHAPTER_ZERO_REF = /(\(|see )$/;
/** A number named as another specification's: "Core §5.3", "Core 5.2.1". */
const OTHER_SPEC = /\b([A-Z][a-z]+)\s*(§)?\s*$/;
/** What joins a list or range of numbers to the one before it: "Core 5.2.1, 5.2.2", "Core §5.1–5.3". */
const CONTINUES = /^\s*(?:,|–|—|-|and|or|to|, and|, or)\s*$/;

const page = (spec: Spec, slug: string, hash?: string) => `/floorspec/${spec.code}/${slug}${hash ? `#${hash}` : ''}`;

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
      if (slug) href = page(spec, slug);
    } else if (m[0] === 'Annex A') {
      const slug = spec.chapterOf.get('A');
      if (slug) href = page(spec, slug);
    } else {
      const named = OTHER_SPEC.exec(before);
      const target = named ? specByShort.get(named[1]!) : undefined;
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

/** A Markdown link target: a chapter of any specification becomes its page; anything else in the repo, GitHub. */
function linkTarget(href: string, spec: Spec): string {
  if (/^[a-z]+:/i.test(href) || href.startsWith('#')) return href;
  const [file, hash] = href.split('#');
  const path = posix.join('spec', spec.code, file!);
  const m = /^spec\/([^/]+)\/([^/]+\.md)$/.exec(path);
  const target = m ? specs.find((s) => s.code === m[1]) : undefined;
  const slug = target?.slugByFile.get(m![2]!);
  if (target && slug) return page(target, slug, hash);
  return `https://github.com/${REPO}/tree/${commit}/${posix.join('spec', spec.code, href)}`;
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
        if (h.depth === 1) break; // the chapter title, rendered by the page
        const m = /^(\d+\.\d+)\s+(.*)$/.exec(h.text);
        const c = group(inlines(m ? marked.Lexer.lexInline(m[2]!) : h.tokens, spec, here, false));
        const id = m ? m[1]! : slugify(h.text);
        if (h.depth === 2) sections.push({ id, number: m?.[1], title: plain(c) });
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

function chaptersOf(spec: Spec): Chapter[] {
  const chapters: Chapter[] = [];
  for (const file of spec.files) {
    const text = readFileSync(join(spec.dir, file), 'utf8');
    const slug = slugOf(file);
    const c = CHAPTER.exec(text)!;
    const sections: ChapterSection[] = [];
    const parsed = blocks(marked.lexer(text), spec, slug, sections);
    chapters.push({ slug, number: c[1]!, title: c[2]!.replace(/^Annex:\s*/, '').trim(), sections, blocks: parsed });
  }
  const seen = chapters.flatMap((ch) => anchored(ch.blocks, []));
  const missing = spec.statements.filter((s) => !seen.includes(s.id));
  const extra = seen.filter((id) => !spec.statementIds.has(id));
  if (missing.length || extra.length || new Set(seen).size !== seen.length)
    fail(
      `spec/${spec.code}: statement anchors do not match the extractor: missing ${missing.map((s) => s.id).join(', ') || 'none'}, unknown ${extra.join(', ') || 'none'}`,
    );
  return chapters;
}

// ---------------------------------------------------------------------------------------------
// 5. Coverage.

const MANDATORY: Level[] = ['MUST', 'MUST NOT'];

function scanSuite(spec: Spec): { tests: number; coveredBy: Map<string, number> } {
  const dir = join(source, 'conformance', spec.code, spec.version);
  const coveredBy = new Map<string, number>();
  let tests = 0;
  const walk = (d: string) => {
    if (!existsSync(d)) return;
    for (const entry of readdirSync(d).sort()) {
      const p = join(d, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (entry === 'test.json') {
        const t = JSON.parse(readFileSync(p, 'utf8')) as { covers?: unknown };
        if (!Array.isArray(t.covers)) fail(`${relative(source, p)}: "covers" must be an array of statement IDs`);
        tests += 1;
        for (const id of t.covers as string[]) {
          if (!spec.statementIds.has(id)) fail(`${relative(source, p)} covers ${id}, which no statement has`);
          coveredBy.set(id, (coveredBy.get(id) ?? 0) + 1);
        }
      }
    }
  };
  walk(dir);
  return { tests, coveredBy };
}

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
  const data = gateReport?.[spec.code];
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
// 6. Schemas: copied byte for byte, and never changed once published.

const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const published: Record<string, string> = existsSync(publishedPath) ? JSON.parse(readFileSync(publishedPath, 'utf8')) : {};

const breaks: string[] = [];
for (const [path, hash] of Object.entries(published)) {
  const from = join(source, path.replace(/^floorspec\//, ''));
  if (!existsSync(from)) breaks.push(`${path} is published but ${relative(root, from)} no longer exists`);
  else if (sha256(from) !== hash) breaks.push(`${path} is published and its content would change`);
}
if (breaks.length)
  fail(
    `a published schema URL must never change (FLR-ADR-018, DI-REQ-042):\n  ${breaks.join('\n  ')}\n` +
      `Publish the change under a new version instead.`,
  );

const added: string[] = [];
const schemaCounts = new Map<string, number>();
for (const spec of specs) {
  const from = join(source, 'schema', spec.code, spec.version);
  const incoming = existsSync(from) ? readdirSync(from).filter((f) => f.endsWith('.json')).sort() : [];
  schemaCounts.set(spec.code, incoming.length);
  if (!incoming.length) continue;
  const to = join(root, 'public/floorspec/schema', spec.code, spec.version);
  mkdirSync(to, { recursive: true });
  for (const file of incoming) {
    const path = `floorspec/schema/${spec.code}/${spec.version}/${file}`;
    copyFileSync(join(from, file), join(to, file));
    if (!published[path]) {
      published[path] = sha256(join(from, file));
      added.push(path);
    }
  }
}
const sortedPublished = Object.fromEntries(Object.entries(published).sort(([a], [b]) => a.localeCompare(b)));

// ---------------------------------------------------------------------------------------------
// Write.

const json = (value: unknown) => `${JSON.stringify(value, null, 1)}\n`;
rmSync(generated, { recursive: true, force: true });

const index: FloorspecIndex = { specifications: [] };
const report: string[] = [`floorspec @ ${commit.slice(0, 7)} (${committedAt})`];
for (const spec of specs) {
  const chapters = chaptersOf(spec);
  const coverage = coverageOf(spec);
  const dir = join(generated, spec.code);
  mkdirSync(join(dir, 'chapters'), { recursive: true });
  for (const ch of chapters) writeFileSync(join(dir, 'chapters', `${ch.slug}.json`), JSON.stringify(ch) + '\n');
  writeFileSync(join(dir, 'coverage.json'), json(coverage));

  const entry: SpecIndex = {
    spec: spec.code,
    name: spec.name,
    short: spec.short,
    version: spec.version,
    chapters: chapters.map((ch) => {
      const file = spec.files.find((f) => slugOf(f) === ch.slug)!;
      return {
        slug: ch.slug,
        file: `spec/${spec.code}/${file}`,
        number: ch.number,
        title: ch.title,
        summary: spec.summaries.get(file) ?? '',
        statements: spec.statements.filter((s) => spec.sectionOf.get(s.section) === ch.slug).length,
      };
    }),
    statements: spec.statements.length,
    mandatory: coverage.mandatory,
    covered: coverage.covered,
    tests: coverage.tests,
  };
  index.specifications.push(entry);
  report.push(
    `${spec.name} ${spec.version}: ${chapters.length} chapters, ${spec.statements.length} statements (${coverage.mandatory} MUST / MUST NOT); ` +
      `coverage (${coverage.source}): ${coverage.covered} of ${coverage.mandatory}, ${coverage.tests} tests; ` +
      `${schemaCounts.get(spec.code)} schemas`,
  );
}

writeFileSync(join(generated, 'index.json'), json(index));
writeFileSync(publishedPath, json(sortedPublished));
writeFileSync(
  join(out, 'floorspec.lock.json'),
  json({ repository: REPO, commit, committedAt, specifications: Object.fromEntries(specs.map((s) => [s.code, s.version])) }),
);

if (added.length) report.push(`newly published: ${added.join(', ')}`);
console.log(report.join('\n'));
