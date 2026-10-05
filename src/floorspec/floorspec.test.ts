import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderHead } from '../head';
import { allRoutes, resolveRoute } from '../routes';
import worker, { SCHEMA_HEADERS, SECURITY_HEADERS, type Env } from '../worker';
import { sitemap } from '../../scripts/generate-static';
import type { Block, Chapter, Coverage, Inline } from './ast';
import { CORE, FLOORSPEC_LOCK, SPECS, specByCode } from './spec';
import PUBLISHED_SCHEMAS from './published-schemas.json';

const PUBLIC = new URL('../../public/', import.meta.url);
const generated = <T,>(path: string): T => JSON.parse(readFileSync(new URL(`./generated/${path}`, import.meta.url), 'utf8'));
const chapter = (spec: string, slug: string) => generated<Chapter>(`${spec}/chapters/${slug}.json`);
const coverageOf = (spec: string) => generated<Coverage>(`${spec}/coverage.json`);
const OPS = specByCode('ops')!;

/**
 * Every Core schema URL published before Ops arrived (DI-T-10.2), with its hash. Generalising the
 * sync to more than one specification (DI-T-10.4) must not have moved or changed any of them.
 */
const CORE_SCHEMAS_AT_LAUNCH: Record<string, string> = {
  'asset.schema.json': '4ed11fac5e67d319a8f2ae001d5ee548d7b8c30f90f64be7e133ce9fd33454ca',
  'building.schema.json': 'c0456f57da7b5ff09614252fb834f088957b3651da05ec94cefe96f9ce13a536',
  'defs.schema.json': '395a66a29f51fee8b1ebae44c00a60e3c8e8ca06bfc52a3a7cc74ad312c573b9',
  'floorspec.schema.json': '3c52a3a447f71d8f247b59f2a85835d38a1d516ab6473ec5a8486ebf2452a000',
  'junction.schema.json': '2bdfff5902c34f984ec661fe0eb5e869c0da84b9c258e3e4a83eb25e070d5422',
  'layer.schema.json': 'd67630f773a5f8043d872a4ddfc4901fadfc86d62fce82baece468939646a75b',
  'level.schema.json': 'fe1f6b4a22bf12a55a24dfd6cd09b698c317a6773f995dea0a186fc8a81641e0',
  'material.schema.json': '655a417b6cc1a625a59fae1736495eee0b011b1c4f0427601106e89b0579244c',
  'opening.schema.json': '1fd2540955567c64bcea103a608632fbbc8a85f2ca0cbc3bd902eca5adc51dd3',
  'project.schema.json': '8a5bc26c4fb103b285b934b377ce4b92d7b9321a48a5cecc6a54c2da09aa3a08',
  'room.schema.json': '12a3dea3f7ae8e90d5ae5eb00a2976430b9b7e3c472d4077f4254a3c820fb097',
  'separator.schema.json': '71aedf8e1b86457254d88ac3c6a9c805f0ad2ea0ff92772725ad9669df2db21e',
  'site.schema.json': '7748812879053a9f50a88d39cf2500b6ba68101dbd77af3abdc348f47262bf10',
  'slab.schema.json': '75acafd31a99d0511fc558dabc89693b942db687f6ac1174238f0c166775f172',
  'type.schema.json': 'e50ae6d714491da8b1dc2b29e9ffeca5a6c7e681de0be398b8dc92bec9f269eb',
  'wall.schema.json': 'ca373bff58d0d48ddf3188150a1a5aebdcc971847803d4f4116744277ba596c8',
};

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

  it('records every schema file it serves, for every specification and version', () => {
    const base = new URL('floorspec/schema/', PUBLIC);
    for (const spec of readdirSync(base)) {
      for (const version of readdirSync(new URL(`${spec}/`, base))) {
        for (const file of readdirSync(new URL(`${spec}/${version}/`, base))) {
          const path = `floorspec/schema/${spec}/${version}/${file}`;
          expect((PUBLISHED_SCHEMAS as Record<string, string>)[path], path).toBeDefined();
        }
      }
    }
  });

  it('kept every Core schema published at launch, at the same URL with the same hash', () => {
    for (const [file, hash] of Object.entries(CORE_SCHEMAS_AT_LAUNCH)) {
      expect((PUBLISHED_SCHEMAS as Record<string, string>)[`floorspec/schema/core/0.1/${file}`], file).toBe(hash);
    }
  });

  it('publishes the Ops 0.1 schemas beside Core, each at the URL its $id names', () => {
    const ops = Object.keys(PUBLISHED_SCHEMAS).filter((path) => path.startsWith('floorspec/schema/ops/0.1/'));
    expect(ops.map((path) => path.split('/').pop()).sort()).toEqual(['operation.schema.json', 'reference.schema.json', 'request.schema.json']);
    for (const path of ops) {
      const schema = JSON.parse(readFileSync(new URL(path, PUBLIC), 'utf8')) as { $id?: string };
      expect(schema.$id, path).toBe(`https://d3cloud.io/${path}`);
    }
  });
});

describe('the Floorspec pages (DI-T-10.2)', () => {
  it('has the landing page, a page per chapter of each specification and the coverage page, each in the sitemap with its own head', () => {
    const paths = [
      '/floorspec',
      '/floorspec/coverage',
      ...SPECS.flatMap((spec) => spec.chapters.map((c) => `/floorspec/${spec.spec}/${c.slug}`)),
    ];
    expect(paths).toContain('/floorspec/ops/references');
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
    expect(resolveRoute('/floorspec/ops/references')!.meta.title).toBe('3. References — Floorspec Ops 0.1 — D3 Cloud');
    expect(resolveRoute('/floorspec/ops/references')!.meta).toMatchObject({ kind: 'floorspec-chapter', spec: 'ops', doc: 'references' });
  });

  it('publishes Core and Ops, in that order — Rules has no chapters yet', () => {
    expect(SPECS.map((spec) => [spec.spec, spec.name, spec.version])).toEqual([
      ['core', 'Floorspec Core', '0.1'],
      ['ops', 'Floorspec Ops', '0.1'],
    ]);
    expect(FLOORSPEC_LOCK.specifications).toEqual({ core: '0.1', ops: '0.1' });
  });

  it('uses the chapter slugs from the file names', () => {
    expect(CORE.chapters.map((c) => c.slug)).toEqual([
      'conventions', 'model', 'units', 'identity', 'taxonomy', 'walls', 'rooms', 'openings', 'types',
      'serialization', 'diagnostics', 'ifc',
    ]);
    expect(OPS.chapters.map((c) => c.slug)).toEqual([
      'conventions', 'transactions', 'primitives', 'references', 'composites', 'normalization', 'locks', 'diagnostics',
    ]);
  });

  it('refuses what is not a page under /floorspec', () => {
    for (const path of [
      '/floorspec/core', '/floorspec/core/nope', '/floorspec/ops', '/floorspec/ops/nope', '/floorspec/ops/walls',
      '/floorspec/rules', '/floorspec/rules/conventions', '/floorspec/walls', '/floorspec/core/walls/x', '/floorspec/schema/ops/0.1',
    ]) {
      expect(resolveRoute(path), path).toBeNull();
    }
    expect(resolveRoute('/floorspec/core/walls/')).toMatchObject({ meta: { path: '/floorspec/core/walls' }, redirect: true });
    expect(resolveRoute('/floorspec/ops/locks/')).toMatchObject({ meta: { path: '/floorspec/ops/locks' }, redirect: true });
  });

  it('anchors every statement of each specification, once, and its coverage table lists each of them', () => {
    for (const spec of SPECS) {
      const coverage = coverageOf(spec.spec);
      const ids = spec.chapters.flatMap((c) => anchors(chapter(spec.spec, c.slug).blocks));
      expect(ids.length, spec.spec).toBe(spec.statements);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.every((id) => id.startsWith(`FS-${spec.spec.toUpperCase()}-`))).toBe(true);
      expect(coverage.statements.map((s) => s.id).sort()).toEqual([...ids].sort());
      const mandatory = coverage.statements.filter((s) => s.level === 'MUST' || s.level === 'MUST NOT');
      expect(coverage.mandatory).toBe(mandatory.length);
      expect(coverage.covered).toBe(mandatory.filter((s) => s.tests > 0).length);
      expect(spec).toMatchObject({ mandatory: coverage.mandatory, covered: coverage.covered, tests: coverage.tests });
      expect(coverage).toMatchObject({ spec: spec.spec, version: spec.version });
    }
    expect(anchors(chapter('core', 'walls').blocks)).toContain('FS-CORE-5.3.1');
    expect(anchors(chapter('ops', 'composites').blocks)).toContain('FS-OPS-4.4.1');
    expect(anchors(chapter('ops', 'references').blocks)).toContain('FS-OPS-3.4.1');
  });

  it('gives every section of a chapter a heading id from its number', () => {
    for (const [spec, slug, section] of [['core', 'walls', '5.3'], ['ops', 'references', '3.4']] as const) {
      const ch = chapter(spec, slug);
      expect(ch.sections.map((s) => s.id)).toContain(section);
      const headings = ch.blocks.filter((b) => b.t === 'h').map((b) => (b as { id: string }).id);
      for (const s of ch.sections) expect(headings).toContain(s.id);
    }
  });

  it('links "Core §5.3" and "Core 5.2.1, 5.2.2" in Ops to Core, and a bare "(3.4)" within Ops', () => {
    const links = (spec: string, slug: string) => {
      const found: { href: string; text: string }[] = [];
      const walk = (items: unknown): void => {
        if (Array.isArray(items)) items.forEach(walk);
        else if (items && typeof items === 'object') {
          const item = items as { t?: string; href?: string; c?: unknown[] };
          if (item.t === 'a') found.push({ href: item.href!, text: (item.c ?? []).filter((c) => typeof c === 'string').join('') });
          Object.values(item).forEach(walk);
        }
      };
      walk(chapter(spec, slug).blocks);
      return found;
    };
    const normalization = links('ops', 'normalization');
    expect(normalization).toContainEqual({ href: '/floorspec/core/walls#5.3', text: '5.3' });
    expect(normalization).toContainEqual({ href: '/floorspec/core/walls#FS-CORE-5.2.1', text: '5.2.1' });
    expect(normalization).toContainEqual({ href: '/floorspec/core/walls#FS-CORE-5.2.2', text: '5.2.2' });
    expect(normalization).toContainEqual({ href: '#5.1', text: '5.1' });
    const references = links('ops', 'references');
    expect(references).toContainEqual({ href: '/floorspec/core/rooms#6.1', text: '6.1' });
    expect(references).toContainEqual({ href: '/floorspec/core/walls#5.1', text: '5.1' });
    expect(references).toContainEqual({ href: '#3.4', text: '3.4' });
    expect(links('ops', 'conventions')).toContainEqual({ href: '/floorspec/core/conventions#0.1', text: '0.1' });
    expect(links('ops', 'transactions')).toContainEqual({ href: '/floorspec/core/serialization#9.2', text: '9.2' });
    // Every in-site link lands on a chapter that exists, and on an anchor that chapter has.
    for (const spec of SPECS) {
      for (const c of spec.chapters) {
        for (const { href } of links(spec.spec, c.slug)) {
          if (!href.startsWith('/') && !href.startsWith('#')) continue;
          const [path, hash] = href.startsWith('#') ? [`/floorspec/${spec.spec}/${c.slug}`, href.slice(1)] : href.split('#');
          const route = resolveRoute(path!);
          expect(route?.meta.kind, href).toBe('floorspec-chapter');
          if (!hash) continue;
          const target = chapter(route!.meta.spec!, route!.meta.doc!);
          const ids = [...anchors(target.blocks), ...target.blocks.filter((b) => b.t === 'h').map((b) => (b as { id: string }).id)];
          expect(ids, `${spec.spec}/${c.slug} → ${href}`).toContain(hash);
        }
      }
    }
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

  it('serves a schema of any specification to any origin, cached as immutable, with every security header', async () => {
    for (const path of ['/floorspec/schema/core/0.1/floorspec.schema.json', '/floorspec/schema/ops/0.1/request.schema.json']) {
      const res = await get(path);
      expect(res.status, path).toBe(200);
      for (const [key, value] of Object.entries(SCHEMA_HEADERS)) expect(res.headers.get(key), path).toBe(value);
      for (const [key, value] of Object.entries(SECURITY_HEADERS)) expect(res.headers.get(key), path).toBe(value);
      expect(res.headers.get('Content-Type')).toBe('application/json');
    }
  });

  it('adds nothing to a missing schema, or to any other file', async () => {
    for (const path of ['/floorspec/schema/core/0.1/missing.json', '/floorspec/schema/ops/0.1/missing.json']) {
      const missing = await get(path);
      expect(missing.status).toBe(404);
      expect(missing.headers.get('Access-Control-Allow-Origin')).toBeNull();
    }
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
    const ops = await get('/floorspec/ops/transactions');
    expect(ops.status).toBe(200);
    expect(await ops.text()).toContain('<title>1. Operations, batches and transactions — Floorspec Ops 0.1 — D3 Cloud</title>');
    expect((await get('/floorspec/ops/nope')).status).toBe(404);
    expect((await get('/floorspec/ops')).status).toBe(404);
  });
});
