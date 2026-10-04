import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderHead } from '../head';
import { allRoutes, resolveRoute } from '../routes';
import worker, { SCHEMA_HEADERS, SECURITY_HEADERS, type Env } from '../worker';
import { sitemap } from '../../scripts/generate-static';
import type { Block, Chapter, Coverage, Inline } from './ast';
import { FLOORSPEC_LOCK, SPEC } from './spec';
import PUBLISHED_SCHEMAS from './published-schemas.json';

const PUBLIC = new URL('../../public/', import.meta.url);
const chapter = (slug: string): Chapter =>
  JSON.parse(readFileSync(new URL(`./generated/chapters/${slug}.json`, import.meta.url), 'utf8'));
const coverage: Coverage = JSON.parse(readFileSync(new URL('./generated/coverage.json', import.meta.url), 'utf8'));

/** Every statement anchor in a chapter's AST. */
function anchors(items: (Block | Inline)[], into: string[] = []): string[] {
  for (const item of items) {
    if (typeof item === 'string') continue;
    if (item.t === 'stmt') into.push(item.id);
    if (item.t === 'table') for (const cell of [...item.head, ...item.rows.flat()]) anchors(cell, into);
    else if (item.t === 'list') for (const entry of item.items) anchors(entry, into);
    else if (item.t === 'callout') anchors([...item.title, ...item.c], into);
    else if ('c' in item) anchors(item.c as (Block | Inline)[], into);
  }
  return into;
}

describe('published schemas never change (DI-REQ-042, FLR-ADR-018)', () => {
  it('serves every published schema from public/ with exactly its recorded SHA-256', () => {
    for (const [path, hash] of Object.entries(PUBLISHED_SCHEMAS)) {
      const file = new URL(path, PUBLIC);
      expect(existsSync(file), `${path} was published and must not disappear`).toBe(true);
      expect(createHash('sha256').update(readFileSync(file)).digest('hex'), `${path} was published and must not change`).toBe(hash);
    }
  });

  it('records every schema file it serves', () => {
    const dir = new URL(`floorspec/schema/core/${SPEC.version}/`, PUBLIC);
    if (!existsSync(dir)) return;
    for (const file of readdirSync(dir)) {
      expect((PUBLISHED_SCHEMAS as Record<string, string>)[`floorspec/schema/core/${SPEC.version}/${file}`], file).toBeDefined();
    }
  });
});

describe('the Floorspec pages (DI-T-10.2)', () => {
  it('has the landing page, a page per chapter and the coverage page, each in the sitemap with its own head', () => {
    const paths = [
      '/floorspec',
      '/floorspec/coverage',
      ...SPEC.chapters.map((c) => `/floorspec/core/${c.slug}`),
    ];
    for (const path of paths) {
      const route = resolveRoute(path);
      expect(route?.meta.path, path).toBe(path);
      expect(route?.redirect).toBe(false);
      expect(allRoutes().some((r) => r.path === path)).toBe(true);
      expect(sitemap()).toContain(`<loc>https://d3cloud.io${path}</loc>`);
      expect(renderHead(route!.meta)).toContain(`<link rel="canonical" href="https://d3cloud.io${path}" />`);
    }
    const titles = paths.map((p) => resolveRoute(p)!.meta.title);
    expect(new Set(titles).size).toBe(titles.length);
    expect(resolveRoute('/floorspec/core/walls')!.meta.title).toBe('5. Walls — Floorspec Core 0.1 — D3 Cloud');
  });

  it('uses the chapter slugs from the file names', () => {
    expect(SPEC.chapters.map((c) => c.slug)).toEqual([
      'conventions', 'model', 'units', 'identity', 'taxonomy', 'walls', 'rooms', 'openings', 'types',
      'serialization', 'diagnostics', 'ifc',
    ]);
  });

  it('refuses what is not a page under /floorspec', () => {
    for (const path of ['/floorspec/core', '/floorspec/core/nope', '/floorspec/ops', '/floorspec/walls', '/floorspec/core/walls/x']) {
      expect(resolveRoute(path), path).toBeNull();
    }
    expect(resolveRoute('/floorspec/core/walls/')).toMatchObject({ meta: { path: '/floorspec/core/walls' }, redirect: true });
  });

  it('anchors every statement, once, and the coverage table lists each of them', () => {
    const ids = SPEC.chapters.flatMap((c) => anchors(chapter(c.slug).blocks));
    expect(ids.length).toBe(SPEC.statements);
    expect(new Set(ids).size).toBe(ids.length);
    expect(coverage.statements.map((s) => s.id).sort()).toEqual([...ids].sort());
    expect(ids).toContain('FS-CORE-5.3.1');
    expect(anchors(chapter('walls').blocks)).toContain('FS-CORE-5.3.1');
    const mandatory = coverage.statements.filter((s) => s.level === 'MUST' || s.level === 'MUST NOT');
    expect(coverage.mandatory).toBe(mandatory.length);
    expect(coverage.covered).toBe(mandatory.filter((s) => s.tests > 0).length);
    expect(SPEC).toMatchObject({ mandatory: coverage.mandatory, covered: coverage.covered, tests: coverage.tests });
  });

  it('gives every section of a chapter a heading id from its number', () => {
    const walls = chapter('walls');
    expect(walls.sections.map((s) => s.id)).toContain('5.3');
    const headings = walls.blocks.filter((b) => b.t === 'h').map((b) => (b as { id: string }).id);
    for (const section of walls.sections) expect(headings).toContain(section.id);
  });

  it('pins a commit', () => {
    expect(FLOORSPEC_LOCK.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(FLOORSPEC_LOCK.repository).toBe('matdemers1/floorspec');
  });
});

describe('the Worker and the schemas', () => {
  const env: Env = {
    ASSETS: {
      fetch: async (input: RequestInfo | URL) => {
        const url = new URL(input instanceof Request ? input.url : input.toString());
        if (url.pathname === '/') return new Response('<html><head><!-- route-meta:start --><!-- route-meta:end --></head></html>');
        if (url.pathname.endsWith('.json') && !url.pathname.includes('missing')) {
          return new Response('{}', { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=0, must-revalidate' } });
        }
        return new Response('Not Found', { status: 404 });
      },
    } as unknown as Fetcher,
  };
  const get = (path: string) => worker.fetch(new Request(`https://d3cloud.io${path}`), env);

  it('serves a schema to any origin, cached as immutable, with every security header', async () => {
    const res = await get('/floorspec/schema/core/0.1/floorspec.schema.json');
    expect(res.status).toBe(200);
    for (const [key, value] of Object.entries(SCHEMA_HEADERS)) expect(res.headers.get(key)).toBe(value);
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) expect(res.headers.get(key)).toBe(value);
    expect(res.headers.get('Content-Type')).toBe('application/json');
  });

  it('adds nothing to a missing schema, or to any other file', async () => {
    const missing = await get('/floorspec/schema/core/0.1/missing.json');
    expect(missing.status).toBe(404);
    expect(missing.headers.get('Access-Control-Allow-Origin')).toBeNull();
    const other = await get('/data.json');
    expect(other.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(other.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate');
  });

  it('exports nothing from the Worker module that the runtime would refuse', async () => {
    // workerd treats every export as an entrypoint and will not start on a string export.
    for (const [name, value] of Object.entries(await import('../worker'))) {
      expect(['object', 'function'], name).toContain(typeof value);
    }
  });

  it('serves a chapter page with its own head, and a 404 for a chapter that does not exist', async () => {
    const page = await get('/floorspec/core/walls');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('<title>5. Walls — Floorspec Core 0.1 — D3 Cloud</title>');
    expect((await get('/floorspec/core/nope')).status).toBe(404);
  });
});
