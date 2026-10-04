/**
 * Pins a commit of the Floorspec standard and turns it into this site's /floorspec pages
 * (DI-T-10.2, DI-REQ-042, FLR-ADR-018):
 *
 *   npm run sync:floorspec [-- <path to the floorspec checkout>]   (or FLOORSPEC_DIR=…; default ../floorspec)
 *
 * 1. Refuses a checkout with uncommitted changes under spec/, schema/ or conformance/ — what is
 *    published has to be a commit someone can look at.
 * 2. Records the commit in src/floorspec/floorspec.lock.json.
 * 3. Parses each chapter of spec/core with marked's lexer into the compact AST of
 *    src/floorspec/ast.ts — headings with stable ids, statement tags as anchored statements,
 *    cross-references as links — and writes src/floorspec/generated/. Everything generated is
 *    committed, so CI builds the site without the floorspec checkout.
 * 4. Extracts the normative statements with floorspec's own tools/statements.ts (imported, not
 *    copied), refuses if it reports a problem, and checks every statement it found is anchored.
 * 5. Coverage: the repo's own gate (`pnpm coverage`, when its dependencies are installed) writes
 *    build/coverage.json, which is read; otherwise conformance/core/0.1/**\/test.json is scanned.
 * 6. Copies schema/core/0.1/*.json byte for byte into public/floorspec/schema/core/0.1/. A schema
 *    URL never changes once published: src/floorspec/published-schemas.json records each file's
 *    SHA-256, new files are added to it, and the sync refuses if a published file would change or
 *    disappear. src/floorspec/schemas.test.ts holds public/ to the same record.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { marked, type Token, type Tokens } from 'marked';
import type { Block, CalloutKind, Chapter, ChapterSection, Coverage, CoverageRow, Inline, Level, SpecIndex } from '../src/floorspec/ast';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, process.argv[2] ?? process.env.FLOORSPEC_DIR ?? '../floorspec');
const SPEC = 'core';
const VERSION = '0.1';
const REPO = 'matdemers1/floorspec';

const out = join(root, 'src/floorspec');
const generated = join(out, 'generated');
const schemaFrom = join(source, 'schema', SPEC, VERSION);
const schemaTo = join(root, 'public/floorspec/schema', SPEC, VERSION);
const publishedPath = join(out, 'published-schemas.json');

function fail(message: string): never {
  console.error(`sync-floorspec: ${message}`);
  process.exit(1);
}

const git = (...args: string[]) => execFileSync('git', ['-C', source, ...args], { encoding: 'utf8' }).trim();

// ---------------------------------------------------------------------------------------------
// 1–2. The checkout, clean, and its commit.

if (!existsSync(join(source, 'spec', SPEC))) fail(`no Floorspec checkout at ${source} (pass a path, or set FLOORSPEC_DIR)`);
const dirty = git('status', '--porcelain', '--untracked-files=all', '--', 'spec', 'schema', 'conformance');
if (dirty) fail(`${source} has uncommitted changes under spec/, schema/ or conformance/ — commit them first:\n${dirty}`);
const commit = git('rev-parse', 'HEAD');
const committedAt = git('show', '-s', '--format=%cI', 'HEAD');

// ---------------------------------------------------------------------------------------------
// 3. Chapters.

interface Statement {
  id: string;
  level: Level;
  section: string;
  text: string;
  file: string;
  line: number;
}
type Extract = (root: string, spec: 'core') => { statements: Statement[]; problems: { file: string; line: number; message: string }[] };
const { extract } = (await import(pathToFileURL(join(source, 'tools/statements.ts')).href)) as { extract: Extract };
const { statements, problems } = extract(source, SPEC);
if (problems.length) fail(`floorspec's statement checker reports problems:\n${problems.map((p) => `  ${p.file}:${p.line}: ${p.message}`).join('\n')}`);
const statementIds = new Set(statements.map((s) => s.id));

const specDir = join(source, 'spec', SPEC);
const files = readdirSync(specDir)
  .filter((f) => f.endsWith('.md') && f !== 'README.md')
  .sort();

/** `05-walls.md` → `walls`; `annex-ifc.md` → `ifc`. */
const slugOf = (file: string) => basename(file, '.md').replace(/^\d+-/, '').replace(/^annex-/, '');

/** The chapter table in spec/core/README.md: file → what the chapter covers. */
const summaries = new Map<string, string>();
for (const line of readFileSync(join(specDir, 'README.md'), 'utf8').split('\n')) {
  const m = /^\|\s*\[[^\]]*\]\(([^)]+\.md)\)\s*\|\s*(.*?)\s*\|\s*$/.exec(line);
  if (m) summaries.set(m[1]!, m[2]!);
}

/** First pass: every chapter's number, and every numbered section, so cross-references resolve. */
const CHAPTER = /^#\s+(\d+|[A-Z])\.\s+(.*)$/m;
const chapterOf = new Map<string, string>(); // chapter number → slug
const sectionOf = new Map<string, string>(); // "5.3" → slug
for (const file of files) {
  const text = readFileSync(join(specDir, file), 'utf8');
  const c = CHAPTER.exec(text);
  if (!c) fail(`${file} has no "# n. Title" heading`);
  chapterOf.set(c[1]!, slugOf(file));
  for (const m of text.matchAll(/^##\s+(\d+\.\d+)\s/gm)) sectionOf.set(m[1]!, slugOf(file));
}
const slugByFile = new Map(files.map((f) => [f, slugOf(f)]));

const TAG = /\{#(FS-[A-Z]+-\d+\.\d+\.\d+) (MUST NOT|MUST|SHOULD NOT|SHOULD|MAY)\}/g;
/**
 * A cross-reference in prose: "chapter 6", "Annex A", or a section or statement number such as
 * "5.3" or "9.1.1". A number becomes a link only when it names something that exists, and not
 * when it is a version ("Core 0.1", "IFC 4.3", "Semantic Versioning 2.0.0").
 */
const REF = /\b[Cc]hapter (\d+)\b|\bAnnex A\b|(?<![\d.,])(\d+)\.(\d+)(?:\.(\d+))?(?![\d]|\.\d)/g;
const NOT_A_REF = /([Cc]ore|IFC4?|[Dd]raft|[Vv]ersion|Versioning|Floorspec|RFC|ISO|BCP|ADD2|TC1|§)\s*$/;
/** Chapter 0's sections share their numbers with the draft itself ("a 0.1 document"): linked only as "(0.5)" or "see 0.5". */
const CHAPTER_ZERO_REF = /(\(|see )$/;

const page = (slug: string, hash?: string) => `/floorspec/core/${slug}${hash ? `#${hash}` : ''}`;

function crossRefs(text: string, here: string): Inline[] {
  const parts: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(REF)) {
    let href: string | undefined;
    if (m[1] !== undefined) {
      const slug = chapterOf.get(m[1]);
      if (slug) href = page(slug);
    } else if (m[0] === 'Annex A') {
      const slug = chapterOf.get('A');
      if (slug) href = page(slug);
    } else if (!NOT_A_REF.test(text.slice(0, m.index)) && (m[2] !== '0' || CHAPTER_ZERO_REF.test(text.slice(0, m.index)))) {
      const section = `${m[2]}.${m[3]}`;
      const slug = sectionOf.get(section);
      if (slug && m[4] !== undefined) {
        const id = `FS-CORE-${section}.${m[4]}`;
        if (statementIds.has(id)) href = page(slug, id);
      } else if (slug) {
        href = page(slug, section);
      }
    }
    if (!href) continue;
    if (m.index > last) parts.push(text.slice(last, m.index));
    // A link to the page you are on is just its anchor.
    parts.push({ t: 'a', href: href.startsWith(`${page(here)}#`) ? href.slice(page(here).length) : href, c: [m[0]] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** A Markdown link target: a sibling chapter becomes its page; anything else in the repo, GitHub. */
function linkTarget(href: string): string {
  if (/^[a-z]+:/i.test(href) || href.startsWith('#')) return href;
  const [file, hash] = href.split('#');
  const slug = slugByFile.get(basename(file!));
  if (slug && !file!.includes('/')) return page(slug, hash);
  return `https://github.com/${REPO}/tree/${commit}/${join('spec', SPEC, href).replace(/\\/g, '/')}`;
}

/** Text with statement tags and cross-references found in it. Tags become markers, grouped later. */
type Marker = { t: 'tag'; id: string; level: Level };
type Piece = Inline | Marker;

function inlines(tokens: Token[] | undefined, here: string, refs = true): Piece[] {
  const outList: Piece[] = [];
  for (const token of tokens ?? []) {
    switch (token.type) {
      case 'text':
      case 'escape': {
        const t = token as Tokens.Text;
        if (t.tokens && t.tokens.length) {
          outList.push(...inlines(t.tokens, here, refs));
          break;
        }
        const text = t.text.replace(/\n/g, ' ');
        let last = 0;
        for (const m of text.matchAll(TAG)) {
          const before = text.slice(last, m.index);
          if (before) outList.push(...(refs ? crossRefs(before, here) : [before]));
          outList.push({ t: 'tag', id: m[1]!, level: m[2] as Level });
          last = m.index + m[0].length;
        }
        const rest = text.slice(last);
        if (rest) outList.push(...(refs ? crossRefs(rest, here) : [rest]));
        break;
      }
      case 'codespan':
        outList.push({ t: 'code', v: (token as Tokens.Codespan).text });
        break;
      case 'em':
        outList.push({ t: 'em', c: group(inlines((token as Tokens.Em).tokens, here, refs)) });
        break;
      case 'strong':
        outList.push({ t: 'strong', c: group(inlines((token as Tokens.Strong).tokens, here, refs)) });
        break;
      case 'link': {
        const l = token as Tokens.Link;
        outList.push({ t: 'a', href: linkTarget(l.href), c: group(inlines(l.tokens, here, false)) });
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
        fail(`unsupported inline Markdown "${token.type}" in ${here}`);
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

function blocks(tokens: Token[], here: string, sections: ChapterSection[]): Block[] {
  const list: Block[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case 'space':
        break;
      case 'heading': {
        const h = token as Tokens.Heading;
        if (h.depth === 1) break; // the chapter title, rendered by the page
        const m = /^(\d+\.\d+)\s+(.*)$/.exec(h.text);
        const c = group(inlines(m ? marked.Lexer.lexInline(m[2]!) : h.tokens, here, false));
        const id = m ? m[1]! : slugify(h.text);
        if (h.depth === 2) sections.push({ id, number: m?.[1], title: plain(c) });
        list.push({ t: 'h', depth: h.depth, id, number: m?.[1], c });
        break;
      }
      case 'paragraph':
        list.push({ t: 'p', c: group(inlines((token as Tokens.Paragraph).tokens, here)) });
        break;
      case 'text': {
        // A tight list item's body.
        const t = token as Tokens.Text;
        list.push({ t: 'p', c: group(inlines(t.tokens ?? [t as Token], here)) });
        break;
      }
      case 'list': {
        const l = token as Tokens.List;
        list.push({
          t: 'list',
          ordered: l.ordered,
          start: l.ordered && l.start !== 1 && l.start !== '' ? Number(l.start) : undefined,
          items: l.items.map((item) => blocks(item.tokens, here, sections)),
        });
        break;
      }
      case 'table': {
        const t = token as Tokens.Table;
        list.push({
          t: 'table',
          align: t.align,
          head: t.header.map((cell) => group(inlines(cell.tokens, here))),
          rows: t.rows.map((row) => row.map((cell) => group(inlines(cell.tokens, here)))),
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
          list.push({ t: 'quote', c: blocks(q.tokens, here, sections) });
          break;
        }
        // Re-lex without the marker line, so the callout's body is ordinary blocks.
        const body = q.text.slice(m[0].length);
        list.push({
          t: 'callout',
          kind: m[1]!.toLowerCase() as CalloutKind,
          title: group(inlines(marked.Lexer.lexInline(m[2]!.trim()), here)),
          c: blocks(marked.lexer(body), here, []),
        });
        break;
      }
      case 'hr':
        list.push({ t: 'hr' });
        break;
      default:
        fail(`unsupported Markdown block "${token.type}" in ${here}`);
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

const chapters: Chapter[] = [];
for (const file of files) {
  const text = readFileSync(join(specDir, file), 'utf8');
  const slug = slugOf(file);
  const c = CHAPTER.exec(text)!;
  const sections: ChapterSection[] = [];
  const parsed = blocks(marked.lexer(text), slug, sections);
  chapters.push({ slug, number: c[1]!, title: c[2]!.replace(/^Annex:\s*/, '').trim(), sections, blocks: parsed });
}

const seen = chapters.flatMap((ch) => anchored(ch.blocks, []));
const missing = statements.filter((s) => !seen.includes(s.id));
const extra = seen.filter((id) => !statementIds.has(id));
if (missing.length || extra.length || new Set(seen).size !== seen.length)
  fail(`statement anchors do not match the extractor: missing ${missing.map((s) => s.id).join(', ') || 'none'}, unknown ${extra.join(', ') || 'none'}`);

// ---------------------------------------------------------------------------------------------
// 5. Coverage.

const MANDATORY: Level[] = ['MUST', 'MUST NOT'];
const chapterOfStatement = (s: Statement) => sectionOf.get(s.section)!;

function scanSuite(): { tests: number; coveredBy: Map<string, number> } {
  const dir = join(source, 'conformance', SPEC, VERSION);
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
          if (!statementIds.has(id)) fail(`${relative(source, p)} covers ${id}, which no statement has`);
          coveredBy.set(id, (coveredBy.get(id) ?? 0) + 1);
        }
      }
    }
  };
  walk(dir);
  return { tests, coveredBy };
}

function gate(): { tests: number; coveredBy: Map<string, number> } | null {
  // FLOORSPEC_COVERAGE=scan skips the gate, to check the two agree.
  if (process.env.FLOORSPEC_COVERAGE === 'scan' || !existsSync(join(source, 'node_modules'))) return null;
  const report = join(source, 'build', 'coverage.json');
  const started = Date.now();
  // The gate exits non-zero while any MUST is uncovered; the report it writes is what matters.
  spawnSync('pnpm', ['coverage'], { cwd: source, stdio: 'ignore' });
  if (!existsSync(report) || statSync(report).mtimeMs < started - 1000) return null;
  const data = JSON.parse(readFileSync(report, 'utf8'))[SPEC] as
    | { tests: number; statements: { id: string; tests: string[] }[] }
    | undefined;
  if (!data) return null;
  return { tests: data.tests, coveredBy: new Map(data.statements.map((s) => [s.id, s.tests.length])) };
}

const fromGate = gate();
const counted = fromGate ?? scanSuite();
const rows: CoverageRow[] = statements.map((s) => ({
  id: s.id,
  level: s.level,
  section: s.section,
  chapter: chapterOfStatement(s),
  text: s.text.replace(TAG, '').replace(/`/g, '').trim(),
  tests: counted.coveredBy.get(s.id) ?? 0,
}));
const mandatory = rows.filter((r) => MANDATORY.includes(r.level));
const coverage: Coverage = {
  source: fromGate ? 'floorspec coverage gate' : 'scan of conformance/core/0.1',
  tests: counted.tests,
  mandatory: mandatory.length,
  covered: mandatory.filter((r) => r.tests > 0).length,
  statements: rows,
};

// ---------------------------------------------------------------------------------------------
// 6. Schemas: copied byte for byte, and never changed once published.

const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const published: Record<string, string> = existsSync(publishedPath) ? JSON.parse(readFileSync(publishedPath, 'utf8')) : {};
const incoming = existsSync(schemaFrom) ? readdirSync(schemaFrom).filter((f) => f.endsWith('.json')).sort() : [];
const prefix = `floorspec/schema/${SPEC}/${VERSION}/`;

const breaks: string[] = [];
for (const [path, hash] of Object.entries(published)) {
  if (!path.startsWith(prefix)) continue;
  const file = path.slice(prefix.length);
  if (!incoming.includes(file)) breaks.push(`${path} is published but ${relative(root, join(schemaFrom, file))} no longer exists`);
  else if (sha256(join(schemaFrom, file)) !== hash) breaks.push(`${path} is published and its content would change`);
}
if (breaks.length)
  fail(
    `a published schema URL must never change (FLR-ADR-018, DI-REQ-042):\n  ${breaks.join('\n  ')}\n` +
      `Publish the change under a new version instead.`,
  );

mkdirSync(schemaTo, { recursive: true });
const added: string[] = [];
for (const file of incoming) {
  const path = `${prefix}${file}`;
  copyFileSync(join(schemaFrom, file), join(schemaTo, file));
  if (!published[path]) {
    published[path] = sha256(join(schemaFrom, file));
    added.push(path);
  }
}
const sortedPublished = Object.fromEntries(Object.entries(published).sort(([a], [b]) => a.localeCompare(b)));

// ---------------------------------------------------------------------------------------------
// Write.

const index: SpecIndex = {
  spec: SPEC,
  version: VERSION,
  chapters: chapters.map((ch) => ({
    slug: ch.slug,
    file: `spec/${SPEC}/${files.find((f) => slugOf(f) === ch.slug)!}`,
    number: ch.number,
    title: ch.title,
    summary: summaries.get(files.find((f) => slugOf(f) === ch.slug)!) ?? '',
    statements: statements.filter((s) => chapterOfStatement(s) === ch.slug).length,
  })),
  statements: statements.length,
  mandatory: mandatory.length,
  covered: coverage.covered,
  tests: coverage.tests,
};

const json = (value: unknown) => `${JSON.stringify(value, null, 1)}\n`;
rmSync(generated, { recursive: true, force: true });
mkdirSync(join(generated, 'chapters'), { recursive: true });
for (const ch of chapters) writeFileSync(join(generated, 'chapters', `${ch.slug}.json`), JSON.stringify(ch) + '\n');
writeFileSync(join(generated, 'index.json'), json(index));
writeFileSync(join(generated, 'coverage.json'), json(coverage));
writeFileSync(publishedPath, json(sortedPublished));
writeFileSync(
  join(out, 'floorspec.lock.json'),
  json({ repository: REPO, commit, committedAt, spec: SPEC, version: VERSION }),
);

console.log(
  [
    `floorspec @ ${commit.slice(0, 7)} (${committedAt})`,
    `${chapters.length} chapters, ${statements.length} statements (${mandatory.length} MUST / MUST NOT)`,
    `coverage (${coverage.source}): ${coverage.covered} of ${coverage.mandatory} mandatory statements, ${coverage.tests} tests`,
    `schemas: ${incoming.length} in ${relative(root, schemaTo)}${added.length ? `, newly published: ${added.join(', ')}` : ''}`,
  ].join('\n'),
);
