import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderHead } from '../head';
import { allRoutes, hasOwnPolicy, resolveRoute } from '../routes';
import worker, { PLAYGROUND_HEADERS, SCHEMA_HEADERS, SECURITY_HEADERS, type Env } from '../worker';
import { sitemap } from '../../scripts/generate-static';
import type { Block, Chapter, Coverage, Inline, Libraries, Registry, SpecIndex } from './ast';
import { CORE, EARLIER, EXTENSIONS, FLOORSPEC_LOCK, LIBRARIES, SPECS, specAt, specByCode } from './spec';
import PUBLISHED_SCHEMAS from './published-schemas.json';
import PUBLISHED_LIBRARIES from './published-libraries.json';

const PUBLIC = new URL('../../public/', import.meta.url);
const generated = <T,>(path: string): T => JSON.parse(readFileSync(new URL(`./generated/${path}`, import.meta.url), 'utf8'));
/** A chapter of a specification's current draft, or of the draft named. */
const chapter = (spec: string, slug: string, version = specByCode(spec)!.version) =>
  generated<Chapter>(`${spec}/${version}/chapters/${slug}.json`);
const coverageOf = (spec: SpecIndex) => generated<Coverage>(`${spec.spec}/${spec.version}/coverage.json`);
const OPS = specByCode('ops')!;
const RULES = specByCode('rules')!;
const CORE_01 = specAt('core', '0.1')!;
const CORE_02 = specAt('core', '0.2')!;
const OPS_01 = specAt('ops', '0.1')!;
const OPS_02 = specAt('ops', '0.2')!;
/** Every published draft, current and earlier. */
const ALL = [...SPECS, ...EARLIER];
/** The commit Core 0.1 and Ops 0.1 were published from (DI-T-10.2, DI-T-10.4). */
const PINNED_01 = '3bf4f35cd4e22f7c982ba330e027280f368a5388';
/** The commit Core 0.2 and Ops 0.2 were published from (DI-T-10.5). */
const PINNED_02 = '6f9bc07b08dfc229719a9b93e344bd47f33b3ccd';
const REGISTRY = generated<Registry>('registry/index.json');
const LIBS = generated<Libraries>('libraries.json');
/** A file under public/, if it is there. */
const publicFile = (path: string) => new URL(path.replace(/^\//, ''), PUBLIC);

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

/** The Ops 0.1 schemas as published (DI-T-10.4): Ops 0.2 must not have moved or changed them. */
const OPS_01_SCHEMAS: Record<string, string> = {
  'operation.schema.json': '105a4a12a296cf680db4669450478a5eb2ad897d01f62b3c84dc0629789cc7ce',
  'reference.schema.json': '2b0e5c53c28d81b59aeec2d8a120f3d9abd8583200b1690b18c5abd3af02d062',
  'request.schema.json': '7e3fa5806ae18a99e0b43edf3a049d7cd735027a101995c000264806fe82af27',
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

/** Every link in some blocks, with its text. */
function linksIn(blocks: Block[]): { href: string; text: string }[] {
  const found: { href: string; text: string }[] = [];
  const walk = (items: unknown): void => {
    if (Array.isArray(items)) items.forEach(walk);
    else if (items && typeof items === 'object') {
      const item = items as { t?: string; href?: string; c?: unknown[] };
      if (item.t === 'a') found.push({ href: item.href!, text: (item.c ?? []).filter((c) => typeof c === 'string').join('') });
      Object.values(item).forEach(walk);
    }
  };
  walk(blocks);
  return found;
}

/**
 * Every in-site link lands: a published file is in public/; a page resolves without a redirect —
 * a chapter of a draft published from `commit`, on an anchor it has; an extension's page on an
 * anchor its specification has.
 */
function expectLinksLand(links: { href: string }[], here: string, commit: string) {
  for (const { href } of links) {
    if (!href.startsWith('/') && !href.startsWith('#')) continue;
    const [path, hash] = href.startsWith('#') ? [here, href.slice(1)] : href.split('#');
    if (path!.startsWith('/floorspec/schema/') || /\.[a-z0-9]+$/i.test(path!)) {
      expect(existsSync(publicFile(path!)), `${here} → ${href}`).toBe(true);
      continue;
    }
    const route = resolveRoute(path!);
    expect(route?.redirect, `${here} → ${href}`).toBe(false);
    if (route!.meta.kind === 'floorspec-chapter') {
      expect(specAt(route!.meta.spec!, route!.meta.version!)!.commit, `${here} → ${href}`).toBe(commit);
      if (!hash) continue;
      const target = chapter(route!.meta.spec!, route!.meta.doc!, route!.meta.version);
      const ids = [...anchors(target.blocks), ...target.blocks.filter((b) => b.t === 'h').map((b) => (b as { id: string }).id)];
      expect(ids, `${here} → ${href}`).toContain(hash);
    } else if (route!.meta.kind === 'floorspec-extension' && hash) {
      const target = generated<Chapter>(`registry/${route!.meta.doc}.json`);
      const ids = [...anchors(target.blocks), ...target.blocks.filter((b) => b.t === 'h').map((b) => (b as { id: string }).id)];
      expect(ids, `${here} → ${href}`).toContain(hash);
    } else {
      expect(route?.meta.kind, `${here} → ${href}`).toMatch(/^floorspec/);
    }
  }
}

describe('published schemas never change (DI-REQ-042, FLR-ADR-018)', () => {
  it('serves every published schema from public/ with exactly its recorded SHA-256', () => {
    for (const [path, hash] of Object.entries(PUBLISHED_SCHEMAS)) {
      const file = new URL(path, PUBLIC);
      expect(existsSync(file), `${path} was published and must not disappear`).toBe(true);
      expect(createHash('sha256').update(readFileSync(file)).digest('hex'), `${path} was published and must not change`).toBe(hash);
    }
  });

  it('records every schema file it serves, for every specification, extension and version', () => {
    const walk = (dir: string): string[] =>
      readdirSync(new URL(dir, PUBLIC)).flatMap((entry) =>
        statSync(new URL(`${dir}${entry}`, PUBLIC)).isDirectory() ? walk(`${dir}${entry}/`) : [`${dir}${entry}`],
      );
    const served = walk('floorspec/schema/');
    expect(served.some((path) => path.startsWith('floorspec/schema/ext/'))).toBe(true);
    for (const path of served) expect((PUBLISHED_SCHEMAS as Record<string, string>)[path], path).toBeDefined();
  });

  it('kept every Core and Ops 0.2 schema as published when 0.3 arrived (DI-T-10.6)', () => {
    // As recorded by DI-T-10.5.
    const at02: Record<string, string> = {
      'core/0.2/floorspec.schema.json': '87632b0623c12957c4db2d00eb98f8a1ed9d4a314850b14c9fa2f44af809154a',
      'core/0.2/wall.schema.json': 'd093c3e6964eba336938727c688320cf1d45d2399a81c4f6b0adea362c4bda0b',
      'core/0.2/extension.schema.json': '2e6aa53d10851320ad73ac15a710bd4c283c353ee28b515ec71ce4155915ac41',
      'ops/0.2/request.schema.json': '829dc7312ac7e5e17fb93d5c5a27c5da33b387bccf2986bf1c6090f3c8f813ef',
      'registry/0.1/extension.schema.json': '729e3e204768f090444603c4e9b19dd53bed5b4013fd5f5bc69c6b9eca295f1d',
    };
    for (const [file, hash] of Object.entries(at02)) expect((PUBLISHED_SCHEMAS as Record<string, string>)[`floorspec/schema/${file}`], file).toBe(hash);
    expect(Object.keys(PUBLISHED_SCHEMAS).filter((path) => path.startsWith('floorspec/schema/core/0.2/'))).toHaveLength(21);
  });

  it('publishes Core 0.3, Ops 0.3 and Rules 0.1 beside the earlier drafts, each at the URL its $id names (DI-T-10.6)', () => {
    const under = (dir: string) => Object.keys(PUBLISHED_SCHEMAS).filter((path) => path.startsWith(`floorspec/schema/${dir}/`));
    for (const file of ['floorspec', 'roof', 'stair', 'option', 'finish']) expect(under('core/0.3')).toContain(`floorspec/schema/core/0.3/${file}.schema.json`);
    expect(under('ops/0.3').map((path) => path.split('/').pop()).sort()).toEqual(['operation.schema.json', 'reference.schema.json', 'request.schema.json']);
    for (const file of ['request', 'rule', 'pack', 'profile', 'report', 'finding']) expect(under('rules/0.1')).toContain(`floorspec/schema/rules/0.1/${file}.schema.json`);
    for (const path of [...under('core/0.3'), ...under('ops/0.3'), ...under('rules/0.1')]) {
      const schema = JSON.parse(readFileSync(new URL(path, PUBLIC), 'utf8')) as { $id?: string };
      expect(schema.$id, path).toBe(`https://d3cloud.io/${path}`);
    }
  });

  it('publishes each extension schema at the path its own $id names, as its registry entry says (DI-T-10.6)', () => {
    expect(REGISTRY.extensions.length).toBeGreaterThan(0);
    for (const ext of REGISTRY.extensions) {
      expect(ext.schemas.length, ext.name).toBeGreaterThan(0);
      for (const schema of ext.schemas) {
        expect(schema.path).toMatch(new RegExp(`^floorspec/schema/ext/${ext.name}/[^/]+/${schema.file.replace(/\./g, '\\.')}$`));
        expect((PUBLISHED_SCHEMAS as Record<string, string>)[schema.path], schema.path).toBeDefined();
        const json = JSON.parse(readFileSync(new URL(schema.path, PUBLIC), 'utf8')) as { $id?: string };
        expect(json.$id).toBe(`https://d3cloud.io/${schema.path}`);
      }
      expect(ext.schemas.map((schema) => `https://d3cloud.io/${schema.path}`)).toContain(ext.schema);
    }
    expect(PUBLISHED_SCHEMAS).toHaveProperty(['floorspec/schema/ext/FS_electrical/0.1.0/electrical.schema.json']);
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

  it('kept the Ops 0.1 schemas exactly as published when Ops 0.2 arrived (DI-T-10.5)', () => {
    for (const [file, hash] of Object.entries(OPS_01_SCHEMAS)) {
      expect((PUBLISHED_SCHEMAS as Record<string, string>)[`floorspec/schema/ops/0.1/${file}`], file).toBe(hash);
    }
  });

  it('publishes Core 0.2, Ops 0.2 and the registry entry schema beside 0.1, each at the URL its $id names (DI-T-10.5)', () => {
    const under = (dir: string) => Object.keys(PUBLISHED_SCHEMAS).filter((path) => path.startsWith(`floorspec/schema/${dir}/`));
    expect(under('core/0.2')).toHaveLength(21);
    for (const file of ['floorspec', 'program', 'extension', 'fallback', 'host', 'clearance']) {
      expect(under('core/0.2')).toContain(`floorspec/schema/core/0.2/${file}.schema.json`);
    }
    expect(under('ops/0.2').map((path) => path.split('/').pop()).sort()).toEqual(['operation.schema.json', 'reference.schema.json', 'request.schema.json']);
    expect(under('registry/0.1')).toEqual(['floorspec/schema/registry/0.1/extension.schema.json']);
    expect(under('core/0.1')).toHaveLength(16);
    for (const path of [...under('core/0.2'), ...under('ops/0.2'), ...under('registry/0.1')]) {
      const schema = JSON.parse(readFileSync(new URL(path, PUBLIC), 'utf8')) as { $id?: string };
      expect(schema.$id, path).toBe(`https://d3cloud.io/${path}`);
    }
  });
});

describe('published libraries never change (DI-T-10.6)', () => {
  const recorded = PUBLISHED_LIBRARIES as Record<string, string>;

  it('serves every published library file from public/ with exactly its recorded SHA-256', () => {
    expect(Object.keys(recorded).length).toBeGreaterThan(0);
    for (const [path, hash] of Object.entries(recorded)) {
      const file = new URL(path, PUBLIC);
      expect(existsSync(file), `${path} was published and must not disappear`).toBe(true);
      expect(createHash('sha256').update(readFileSync(file)).digest('hex'), `${path} was published and must not change`).toBe(hash);
    }
  });

  it('records every library file it serves, and serves every file of every version it lists', () => {
    const walk = (dir: string): string[] =>
      readdirSync(new URL(dir, PUBLIC)).flatMap((entry) =>
        statSync(new URL(`${dir}${entry}`, PUBLIC)).isDirectory() ? walk(`${dir}${entry}/`) : [`${dir}${entry}`],
      );
    for (const path of walk('floorspec/library/')) expect(recorded[path], path).toBeDefined();
    for (const lib of LIBS.libraries)
      for (const v of lib.versions) {
        expect(v.base).toBe(`/floorspec/library/${lib.name}/${v.version}`);
        for (const file of v.files) expect(recorded[`${v.base.slice(1)}/${file.path}`], file.path).toBeDefined();
        expect(v.files.map((f) => f.path)).toContain(v.manifest);
      }
  });

  it('publishes the US starter library at the URLs its own manifest names', () => {
    const lib = LIBS.libraries.find((l) => l.name === 'us-starter')!;
    const v = lib.versions.find((x) => x.version === '0.1.0')!;
    expect(v).toMatchObject({ canonical: true, manifest: 'index.json', source: 'library/us-starter/0.1.0', floorspec: '0.3' });
    const manifest = JSON.parse(readFileSync(publicFile(`${v.base}/index.json`), 'utf8')) as { library: string; uri: string; items: Record<string, { uri: string }> };
    expect(manifest.library).toBe('https://d3cloud.io/floorspec/library/us-starter');
    expect(manifest.uri).toBe('https://d3cloud.io/floorspec/library/us-starter/0.1.0/');
    for (const item of Object.values(manifest.items)) expect(existsSync(publicFile(item.uri.replace('https://d3cloud.io', ''))), item.uri).toBe(true);
    // Its SHA256SUMS holds for what is served.
    for (const line of readFileSync(publicFile(`${v.base}/SHA256SUMS`), 'utf8').split('\n').filter(Boolean)) {
      const [hash, file] = line.split(/\s+/);
      expect(createHash('sha256').update(readFileSync(publicFile(`${v.base}/${file}`))).digest('hex'), file).toBe(hash);
    }
  });

  it('publishes the FS_furniture library under its extension, every model and symbol with the digest its manifest gives', () => {
    const v = LIBS.libraries.find((l) => l.name === 'FS_furniture')!.versions[0]!;
    expect(v).toMatchObject({ canonical: false, manifest: 'library.json', extension: 'FS_furniture', source: 'registry/FS_furniture/library' });
    const manifest = JSON.parse(readFileSync(publicFile(`${v.base}/library.json`), 'utf8')) as {
      items: Record<string, { model: { path: string; sha256: string }; symbol: { path: string; sha256: string } }>;
    };
    expect(Object.keys(manifest.items).length).toBe(v.items.length);
    for (const item of Object.values(manifest.items))
      for (const file of [item.model, item.symbol]) expect(recorded[`${v.base.slice(1)}/${file.path}`]).toBe(file.sha256);
    expect(REGISTRY.extensions.find((x) => x.name === 'FS_furniture')!.library).toEqual({ name: 'FS_furniture', version: v.version });
  });
});

describe('the Floorspec pages (DI-T-10.2, DI-T-10.4, DI-T-10.5, DI-T-10.6)', () => {
  it('has the landing page, a page per chapter of each specification and the coverage page, each in the sitemap with its own head', () => {
    const paths = [
      '/floorspec',
      '/floorspec/coverage',
      ...SPECS.flatMap((spec) => spec.chapters.map((c) => `/floorspec/${spec.spec}/${c.slug}`)),
      ...EARLIER.flatMap((spec) => spec.chapters.map((c) => `/floorspec/${spec.spec}/${spec.version}/${c.slug}`)),
    ];
    expect(paths).toContain('/floorspec/ops/references');
    expect(paths).toContain('/floorspec/core/stairs');
    expect(paths).toContain('/floorspec/rules/measures');
    expect(paths).toContain('/floorspec/core/0.2/circulation');
    expect(paths).toContain('/floorspec/core/0.1/walls');
    expect(paths).toContain('/floorspec/ops/0.2/references');
    expect(paths).toContain('/floorspec/ops/0.1/references');
    paths.push(
      '/floorspec/registry',
      ...EXTENSIONS.map((ext) => `/floorspec/registry/${ext.name}`),
      ...LIBRARIES.flatMap((lib) => [`/floorspec/library/${lib.name}`, ...lib.versions.map((v) => `/floorspec/library/${lib.name}/${v}`)]),
    );
    expect(paths).toContain('/floorspec/registry/FS_electrical');
    expect(paths).toContain('/floorspec/library/us-starter/0.1.0');
    expect(paths).toContain('/floorspec/library/FS_furniture/0.1.0');
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
    expect(resolveRoute('/floorspec/core/walls')!.meta.title).toBe('5. Walls — Floorspec Core 0.3 — D3 Cloud');
    expect(resolveRoute('/floorspec/core/stairs')!.meta.title).toBe('17. Stairs — Floorspec Core 0.3 — D3 Cloud');
    expect(resolveRoute('/floorspec/core/0.2/walls')!.meta.title).toBe('5. Walls — Floorspec Core 0.2 — D3 Cloud');
    expect(resolveRoute('/floorspec/core/0.1/walls')!.meta.title).toBe('5. Walls — Floorspec Core 0.1 — D3 Cloud');
    expect(resolveRoute('/floorspec/ops/references')!.meta.title).toBe('3. References — Floorspec Ops 0.3 — D3 Cloud');
    expect(resolveRoute('/floorspec/ops/0.2/references')!.meta.title).toBe('3. References — Floorspec Ops 0.2 — D3 Cloud');
    expect(resolveRoute('/floorspec/ops/0.1/references')!.meta.title).toBe('3. References — Floorspec Ops 0.1 — D3 Cloud');
    expect(resolveRoute('/floorspec/rules/measures')!.meta.title).toBe('4. Measures — Floorspec Rules 0.1 — D3 Cloud');
    expect(resolveRoute('/floorspec/ops/references')!.meta).toMatchObject({ kind: 'floorspec-chapter', spec: 'ops', doc: 'references', version: '0.3' });
    expect(resolveRoute('/floorspec/ops/0.1/references')!.meta).toMatchObject({ kind: 'floorspec-chapter', spec: 'ops', doc: 'references', version: '0.1' });
    expect(resolveRoute('/floorspec/rules/findings')!.meta).toMatchObject({ kind: 'floorspec-chapter', spec: 'rules', doc: 'findings', version: '0.1' });
    expect(resolveRoute('/floorspec/core/0.2/walls')!.meta.description).toMatch(/^Floorspec Core 0\.2 \(an earlier Draft, kept as published\), chapter 5: /);
    expect(resolveRoute('/floorspec/registry')!.meta).toMatchObject({ kind: 'floorspec-registry', title: 'Extension registry — Floorspec — D3 Cloud' });
    expect(resolveRoute('/floorspec/registry/FS_electrical')!.meta).toMatchObject({
      kind: 'floorspec-extension',
      doc: 'FS_electrical',
      title: 'FS_electrical 0.1.0 — Floorspec registry — D3 Cloud',
    });
    expect(resolveRoute('/floorspec/library/us-starter')!.meta).toMatchObject({ kind: 'floorspec-library', doc: 'us-starter' });
    expect(resolveRoute('/floorspec/library/us-starter/0.1.0')!.meta).toMatchObject({ kind: 'floorspec-library', doc: 'us-starter', version: '0.1.0' });
  });

  it('publishes Core 0.3, Ops 0.3 and Rules 0.1, in that order, with 0.2 and 0.1 kept from the commits that published them', () => {
    expect(SPECS.map((spec) => [spec.spec, spec.name, spec.version, spec.base])).toEqual([
      ['core', 'Floorspec Core', '0.3', '/floorspec/core'],
      ['ops', 'Floorspec Ops', '0.3', '/floorspec/ops'],
      ['rules', 'Floorspec Rules', '0.1', '/floorspec/rules'],
    ]);
    expect(EARLIER.map((spec) => [spec.spec, spec.version, spec.base, spec.commit])).toEqual([
      ['core', '0.2', '/floorspec/core/0.2', PINNED_02],
      ['core', '0.1', '/floorspec/core/0.1', PINNED_01],
      ['ops', '0.2', '/floorspec/ops/0.2', PINNED_02],
      ['ops', '0.1', '/floorspec/ops/0.1', PINNED_01],
    ]);
    expect(FLOORSPEC_LOCK.specifications).toEqual({ core: '0.3', ops: '0.3', rules: '0.1' });
    expect(FLOORSPEC_LOCK.earlier).toEqual({
      core: { '0.1': expect.objectContaining({ commit: PINNED_01 }), '0.2': expect.objectContaining({ commit: PINNED_02 }) },
      ops: { '0.1': expect.objectContaining({ commit: PINNED_01 }), '0.2': expect.objectContaining({ commit: PINNED_02 }) },
    });
    for (const spec of SPECS) expect(spec.commit).toBe(FLOORSPEC_LOCK.commit);
    expect([PINNED_01, PINNED_02]).not.toContain(FLOORSPEC_LOCK.commit);
  });

  it('uses the chapter slugs from the file names', () => {
    const core01 = [
      'conventions', 'model', 'units', 'identity', 'taxonomy', 'walls', 'rooms', 'openings', 'types',
      'serialization', 'diagnostics', 'ifc',
    ];
    const ops = ['conventions', 'transactions', 'primitives', 'references', 'composites', 'normalization', 'locks', 'diagnostics'];
    const core02 = [...core01.slice(0, -1), 'program', 'extensions', 'hosting', 'circulation', 'ifc'];
    expect(CORE_01.chapters.map((c) => c.slug)).toEqual(core01);
    expect(CORE_02.chapters.map((c) => c.slug)).toEqual(core02);
    // Core 0.3 keeps every 0.2 chapter, in order, adds its own before the annex, and the annex stays last.
    const core03 = CORE.chapters.map((c) => c.slug);
    expect(core03.slice(0, core02.length - 1)).toEqual(core02.slice(0, -1));
    expect(core03).toEqual(expect.arrayContaining(['floors-ceilings-slabs', 'roofs', 'stairs', 'materials', 'options']));
    expect(core03[core03.length - 1]).toBe('ifc');
    expect(CORE.chapters.find((c) => c.slug === 'stairs')!.number).toBe('17');
    expect(OPS_01.chapters.map((c) => c.slug)).toEqual(ops);
    expect(OPS_02.chapters.map((c) => c.slug)).toEqual(ops);
    expect(OPS.chapters.map((c) => c.slug)).toEqual(expect.arrayContaining(ops));
    expect(RULES.chapters.map((c) => c.slug).slice(0, 4)).toEqual(['conventions', 'evaluation', 'packs', 'rules']);
    expect(RULES.chapters.find((c) => c.slug === 'diagnostics')!.number).toBe('11');
  });

  it('breaks no URL: every earlier chapter is still a page at its old address and at its versioned one', () => {
    for (const old of EARLIER) {
      const now = specByCode(old.spec)!;
      for (const c of old.chapters) {
        const unversioned = resolveRoute(`/floorspec/${old.spec}/${c.slug}`);
        if (now.chapters.some((x) => x.slug === c.slug)) expect(unversioned, c.slug).toMatchObject({ redirect: false, meta: { version: now.version } });
        else expect(unversioned, c.slug).toMatchObject({ redirect: true, meta: { kind: 'floorspec-chapter', spec: old.spec } });
        expect(resolveRoute(`/floorspec/${old.spec}/${old.version}/${c.slug}`), c.slug).toMatchObject({ redirect: false, meta: { version: old.version } });
      }
    }
    // Every URL the 0.2 site published resolves (DI-T-10.5): the 0.2 pages now at /floorspec/<spec>/0.2/….
    expect(resolveRoute('/floorspec/core/0.2/walls')).toMatchObject({ meta: { path: '/floorspec/core/0.2/walls' }, redirect: false });
    expect(resolveRoute('/floorspec/ops/0.2/locks')).toMatchObject({ meta: { path: '/floorspec/ops/0.2/locks' }, redirect: false });
    // A versioned link to the current draft works today, and will be the page itself once it is superseded.
    expect(resolveRoute(`/floorspec/core/${CORE.version}/walls`)).toMatchObject({ meta: { path: '/floorspec/core/walls' }, redirect: true });
    expect(resolveRoute(`/floorspec/ops/${OPS.version}/locks`)).toMatchObject({ meta: { path: '/floorspec/ops/locks' }, redirect: true });
    expect(resolveRoute(`/floorspec/rules/${RULES.version}/measures`)).toMatchObject({ meta: { path: '/floorspec/rules/measures' }, redirect: true });
    expect(resolveRoute('/floorspec/core/0.1/walls/')).toMatchObject({ meta: { path: '/floorspec/core/0.1/walls' }, redirect: true });
    expect(resolveRoute('/floorspec/library/us-starter/0.1.0/')).toMatchObject({ meta: { path: '/floorspec/library/us-starter/0.1.0' }, redirect: true });
    expect(resolveRoute('/floorspec/registry/')).toMatchObject({ meta: { path: '/floorspec/registry' }, redirect: true });
  });

  it('keeps every retired statement ID on the draft that had it, and lands a link to one on a note in the current chapter', () => {
    const retiredIn = (spec: SpecIndex) => spec.chapters.flatMap((c) => chapter(spec.spec, c.slug).retired ?? []);
    const expected = {
      core: ['FS-CORE-1.2.1', 'FS-CORE-1.6.5', 'FS-CORE-1.2.3', 'FS-CORE-1.2.4'],
      ops: ['FS-OPS-1.1.1', 'FS-OPS-4.5.1', 'FS-OPS-1.1.2'],
    };
    for (const spec of [CORE, OPS]) {
      const retired = retiredIn(spec);
      expect(retired.map((r) => r.id)).toEqual(expect.arrayContaining(expected[spec.spec as 'core' | 'ops']));
      expect(spec.retired).toBe(retired.length);
      for (const r of retired) {
        const page = (s: SpecIndex) => s.chapters.flatMap((c) => anchors(chapter(s.spec, c.slug, s.version).blocks));
        expect(page(spec), r.id).not.toContain(r.id);
        // The note sits in the chapter of the current draft that has its section, and points at the earlier draft.
        expect(chapter(spec.spec, r.chapter).sections.map((s) => s.id)).toContain(r.section);
        const [path, hash] = r.was.href.split('#');
        expect(resolveRoute(path!)?.meta).toMatchObject({ version: r.was.version, spec: spec.spec, path });
        expect(anchors(chapter(spec.spec, resolveRoute(path!)!.meta.doc!, r.was.version).blocks)).toContain(hash);
        expect(page(specAt(spec.spec, r.was.version)!)).toContain(r.id);
        // And names what replaced it, which is a statement of the current draft.
        const replacedBy = r.replacedBy!;
        const [to, id] = replacedBy.href.startsWith('#') ? [`/floorspec/${spec.spec}/${r.chapter}`, replacedBy.href.slice(1)] : replacedBy.href.split('#');
        expect(id).toBe(replacedBy.id);
        expect(anchors(chapter(spec.spec, resolveRoute(to!)!.meta.doc!).blocks)).toContain(replacedBy.id);
      }
    }
    // Ops 0.2 replaced FS-OPS-1.1.1 with FS-OPS-1.1.2, which Ops 0.3 retired in turn; 0.3's table names 1.1.3.
    expect(retiredIn(OPS).find((r) => r.id === 'FS-OPS-1.1.1')).toMatchObject({
      replacedBy: { id: 'FS-OPS-1.1.3' },
      was: { version: '0.1' },
    });
    expect(retiredIn(OPS).find((r) => r.id === 'FS-OPS-1.1.2')).toMatchObject({ replacedBy: { id: 'FS-OPS-1.1.3' }, was: { version: '0.2' } });
    expect(retiredIn(RULES)).toEqual([]);
  });

  it('refuses what is not a page under /floorspec', () => {
    for (const path of [
      '/floorspec/core', '/floorspec/core/nope', '/floorspec/ops', '/floorspec/ops/nope', '/floorspec/ops/walls',
      '/floorspec/rules', '/floorspec/rules/nope', '/floorspec/walls', '/floorspec/core/walls/x', '/floorspec/schema/ops/0.1',
      '/floorspec/core/0.1', '/floorspec/core/0.1/program', '/floorspec/core/0.9/walls', '/floorspec/ops/0.1/nope', '/floorspec/rules/0.1/x',
      '/floorspec/core/0.1/walls/x', '/floorspec/rules/0.0/conventions', '/floorspec/registry/nope', '/floorspec/registry/FS_electrical/spec',
      '/floorspec/library', '/floorspec/library/nope', '/floorspec/library/us-starter/9.9.9', '/floorspec/library/us-starter/0.1.0/index',
      '/floorspec/schema', '/floorspec/schema/ext/FS_electrical/0.1.0',
    ]) {
      expect(resolveRoute(path), path).toBeNull();
    }
    expect(resolveRoute('/floorspec/core/walls/')).toMatchObject({ meta: { path: '/floorspec/core/walls' }, redirect: true });
    expect(resolveRoute('/floorspec/ops/locks/')).toMatchObject({ meta: { path: '/floorspec/ops/locks' }, redirect: true });
  });

  it('anchors every statement of each specification, once, and its coverage table lists each of them', () => {
    for (const spec of ALL) {
      const coverage = coverageOf(spec);
      const ids = spec.chapters.flatMap((c) => anchors(chapter(spec.spec, c.slug, spec.version).blocks));
      expect(ids.length, spec.spec).toBe(spec.statements);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.every((id) => id.startsWith(`FS-${spec.spec.toUpperCase()}-`))).toBe(true);
      expect(ids.length, `${spec.spec} ${spec.version}`).toBeGreaterThan(0);
      expect(coverage.statements.map((s) => s.id).sort()).toEqual([...ids].sort());
      const mandatory = coverage.statements.filter((s) => s.level === 'MUST' || s.level === 'MUST NOT');
      expect(coverage.mandatory).toBe(mandatory.length);
      expect(coverage.covered).toBe(mandatory.filter((s) => s.tests > 0).length);
      expect(spec).toMatchObject({ mandatory: coverage.mandatory, covered: coverage.covered, tests: coverage.tests });
      expect(coverage).toMatchObject({ spec: spec.spec, version: spec.version });
    }
    expect(anchors(chapter('core', 'walls').blocks)).toContain('FS-CORE-5.3.1');
    expect(anchors(chapter('core', 'walls', '0.1').blocks)).toContain('FS-CORE-5.3.1');
    expect(anchors(chapter('core', 'circulation').blocks).length).toBeGreaterThan(0);
    expect(anchors(chapter('ops', 'composites').blocks)).toContain('FS-OPS-4.4.1');
    expect(anchors(chapter('ops', 'references').blocks)).toContain('FS-OPS-3.4.1');
    expect(anchors(chapter('core', 'stairs').blocks).some((id) => id.startsWith('FS-CORE-17.'))).toBe(true);
    expect(anchors(chapter('rules', 'rules').blocks)).toContain('FS-RULES-3.9.1');
  });

  it('gives every section of a chapter a heading id from its number', () => {
    for (const [spec, slug, section] of [['core', 'walls', '5.3'], ['ops', 'references', '3.4'], ['rules', 'measures', '4.1']] as const) {
      const ch = chapter(spec, slug);
      expect(ch.sections.map((s) => s.id)).toContain(section);
      const headings = ch.blocks.filter((b) => b.t === 'h').map((b) => (b as { id: string }).id);
      for (const s of ch.sections) expect(headings).toContain(s.id);
    }
  });

  it('links "Core §5.3" and "Core 5.2.1, 5.2.2" in Ops and Rules to Core, and a bare "(3.4)" within its own specification', () => {
    const links = (spec: string, slug: string, version?: string) => linksIn(chapter(spec, slug, version).blocks);
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
    expect(links('rules', 'rooms')).toContainEqual({ href: '/floorspec/core/rooms#6.1', text: '6.1' });
    expect(links('rules', 'evaluation')).toContainEqual({ href: '/floorspec/core/extensions#12.2', text: '12.2' });
    expect(links('rules', 'rooms').some(({ href }) => href.startsWith('#') || href.startsWith('/floorspec/rules/'))).toBe(true);
    // Ops 0.2 was written against Core 0.2, and links there.
    expect(links('ops', 'normalization', '0.2')).toContainEqual({ href: '/floorspec/core/0.2/walls#5.3', text: '5.3' });
    // Ops 0.1 was written against Core 0.1, and links there.
    const normalization01 = links('ops', 'normalization', '0.1');
    expect(normalization01).toContainEqual({ href: '/floorspec/core/0.1/walls#5.3', text: '5.3' });
    expect(normalization01).toContainEqual({ href: '/floorspec/core/0.1/walls#FS-CORE-5.2.1', text: '5.2.1' });
    expect(normalization01).toContainEqual({ href: '#5.1', text: '5.1' });
    // Every in-site link, in every draft, lands on a page that exists — a chapter of a draft from the
    // same commit, so of the Core draft an Ops or Rules draft was written against — and on an anchor it has.
    for (const spec of ALL)
      for (const c of spec.chapters) expectLinksLand(links(spec.spec, c.slug, spec.version), `${spec.base}/${c.slug}`, spec.commit);
  });

  it('lists every extension of the registry with its status, kinds, implementations and evidence (DI-T-10.6)', () => {
    expect(EXTENSIONS.map((ext) => ext.name)).toEqual(REGISTRY.extensions.map((ext) => ext.name));
    expect(EXTENSIONS.map((ext) => ext.name)).toEqual(
      expect.arrayContaining(['FS_electrical', 'FS_plumbing', 'FS_mechanical', 'FS_lowvoltage', 'FS_furniture', 'FS_structural']),
    );
    expect(REGISTRY.commit).toBe(FLOORSPEC_LOCK.commit);
    for (const ext of REGISTRY.extensions) {
      expect(['proposal', 'draft', 'releaseCandidate', 'ratified']).toContain(ext.status);
      expect(ext.title.length, ext.name).toBeGreaterThan(0);
      for (const e of ext.evidence) {
        expect(e.file).toMatch(new RegExp(`^registry/${ext.name}/evidence/.+\\.json$`));
        expect(e.suite.commit).toMatch(/^[0-9a-f]{40}$/);
        expect(e.result.passed + e.result.failed).toBe(e.suite.tests);
        expect(e.run).toMatch(/^https:\/\//);
        expect(ext.implementations.map((i) => i.url)).toContain(e.implementation.url);
      }
      if (ext.status === 'releaseCandidate' || ext.status === 'ratified')
        expect(ext.evidence.length + ext.exceptions.length, `${ext.name} is a ${ext.status}`).toBeGreaterThan(0);
    }
    const electrical = REGISTRY.extensions.find((ext) => ext.name === 'FS_electrical')!;
    expect(electrical).toMatchObject({ version: '0.1.0', status: 'releaseCandidate', code: 'ELEC', document: 'registry/FS_electrical/spec.md' });
    expect(electrical.kinds.map((k) => k.collection)).toContain('receptacles');
    expect(electrical.evidence[0]).toMatchObject({ result: { failed: 0 }, implementation: { name: 'D3 Floorspec (@floorspec/engine)' } });
    expect(electrical.covered).toBe(electrical.mandatory);
    // FS_furniture's exception ended when D3 Floorspec's engine passed its suite: every extension has evidence.
    for (const ext of REGISTRY.extensions) expect(ext.exceptions, ext.name).toEqual([]);
    for (const ext of REGISTRY.extensions) expect(ext.evidence.length, ext.name).toBeGreaterThan(0);
    expect(REGISTRY.extensions.find((ext) => ext.name === 'FS_structural')).toMatchObject({ status: 'draft', kinds: [] });
    // The README renders, its links to the extensions land on their pages.
    expect(linksIn(REGISTRY.readme).map((l) => l.href)).toContain('/floorspec/registry/FS_electrical');
    expectLinksLand(linksIn(REGISTRY.readme), '/floorspec/registry', FLOORSPEC_LOCK.commit);
  });

  it('renders each extension\'s specification with every statement anchored in its own ID space, and its chapters as anchors', () => {
    for (const ext of REGISTRY.extensions.filter((x) => x.code)) {
      const doc = generated<Chapter>(`registry/${ext.name}.json`);
      expect(doc.file).toBe(ext.document);
      const ids = anchors(doc.blocks);
      expect(ids.length, ext.name).toBe(ext.statements);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.every((id) => id.startsWith(`FS-${ext.code}-`)), ext.name).toBe(true);
      expect(doc.sections.map((s) => s.id)).toContain('chapter-1');
      const headings = doc.blocks.filter((b) => b.t === 'h').map((b) => (b as { id: string }).id);
      for (const s of doc.sections) expect(headings).toContain(s.id);
      expectLinksLand(linksIn(doc.blocks), `/floorspec/registry/${ext.name}`, FLOORSPEC_LOCK.commit);
    }
    const electrical = linksIn(generated<Chapter>('registry/FS_electrical.json').blocks);
    expect(electrical).toContainEqual({ href: '/floorspec/core/extensions#12.5', text: '12.5' });
    expect(electrical.some(({ href }) => /^#(\d+\.\d+|FS-ELEC-)/.test(href))).toBe(true);
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
        // The assets binding serves whatever public/ holds, as the build copies it into dist/.
        const file = publicFile(url.pathname);
        if (url.pathname.startsWith('/floorspec/library/') && existsSync(file) && statSync(file).isFile()) {
          return new Response(readFileSync(file), { headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'public, max-age=0, must-revalidate' } });
        }
        if (url.pathname.endsWith('.json') && !url.pathname.includes('missing')) {
          return new Response('{}', { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=0, must-revalidate' } });
        }
        return new Response('Not Found', { status: 404 });
      },
    } as unknown as Fetcher,
  };
  const get = (path: string) => worker.fetch(new Request(`https://d3cloud.io${path}`), env);

  it('serves a schema of any specification to any origin, cached as immutable, with every security header', async () => {
    for (const path of [
      '/floorspec/schema/core/0.1/floorspec.schema.json',
      '/floorspec/schema/ops/0.1/request.schema.json',
      '/floorspec/schema/core/0.2/floorspec.schema.json',
      '/floorspec/schema/ops/0.2/request.schema.json',
      '/floorspec/schema/registry/0.1/extension.schema.json',
      '/floorspec/schema/core/0.3/floorspec.schema.json',
      '/floorspec/schema/ops/0.3/request.schema.json',
      '/floorspec/schema/rules/0.1/rule.schema.json',
      '/floorspec/schema/ext/FS_electrical/0.1.0/electrical.schema.json',
      '/floorspec/schema/ext/FS_furniture/0.1.0/furniture.schema.json',
    ]) {
      const res = await get(path);
      expect(res.status, path).toBe(200);
      for (const [key, value] of Object.entries(SCHEMA_HEADERS)) expect(res.headers.get(key), path).toBe(value);
      for (const [key, value] of Object.entries(SECURITY_HEADERS)) expect(res.headers.get(key), path).toBe(value);
      expect(res.headers.get('Content-Type')).toBe('application/json');
    }
  });

  it('serves every library file to any origin, cached as immutable — a SHA256SUMS too, as text (DI-T-10.6)', async () => {
    for (const path of [
      '/floorspec/library/us-starter/0.1.0/index.json',
      '/floorspec/library/us-starter/0.1.0/items/gypsum-board.json',
      '/floorspec/library/us-starter/0.1.0/README.md',
      '/floorspec/library/us-starter/0.1.0/SHA256SUMS',
      '/floorspec/library/FS_furniture/0.1.0/library.json',
      '/floorspec/library/FS_furniture/0.1.0/models/refrigerator-900.glb',
      '/floorspec/library/FS_furniture/0.1.0/symbols/refrigerator-900.svg',
    ]) {
      const res = await get(path);
      expect(res.status, path).toBe(200);
      for (const [key, value] of Object.entries(SCHEMA_HEADERS)) expect(res.headers.get(key), path).toBe(value);
      for (const [key, value] of Object.entries(SECURITY_HEADERS)) expect(res.headers.get(key), path).toBe(value);
      expect(Buffer.from(await res.arrayBuffer()).equals(readFileSync(publicFile(path))), path).toBe(true);
    }
    expect((await get('/floorspec/library/us-starter/0.1.0/SHA256SUMS')).headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    const missing = await get('/floorspec/library/us-starter/0.1.0/items/missing.json');
    expect(missing.status).toBe(404);
    expect(missing.headers.get('Access-Control-Allow-Origin')).toBeNull();
    const nofile = await get('/floorspec/library/us-starter/0.1.0/NOPE');
    expect(nofile.status).toBe(404);
    expect(nofile.headers.get('Access-Control-Allow-Origin')).toBeNull();
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
    expect(await page.text()).toContain('<title>5. Walls — Floorspec Core 0.3 — D3 Cloud</title>');
    const old = await get('/floorspec/core/0.1/walls');
    expect(old.status).toBe(200);
    expect(await old.text()).toContain('<title>5. Walls — Floorspec Core 0.1 — D3 Cloud</title>');
    expect((await get('/floorspec/core/0.2/walls')).status).toBe(200);
    const versioned = await get('/floorspec/core/0.3/walls');
    expect(versioned.status).toBe(301);
    expect(versioned.headers.get('Location')).toBe('https://d3cloud.io/floorspec/core/walls');
    expect((await get('/floorspec/core/nope')).status).toBe(404);
    expect((await get('/floorspec/core/0.1/program')).status).toBe(404);
    const ops = await get('/floorspec/ops/transactions');
    expect(ops.status).toBe(200);
    expect(await ops.text()).toContain('<title>1. Operations, batches and transactions — Floorspec Ops 0.3 — D3 Cloud</title>');
    expect((await get('/floorspec/ops/nope')).status).toBe(404);
    expect((await get('/floorspec/ops')).status).toBe(404);
  });

  it('serves 0.3, the 0.2 and 0.1 pages, Rules, the registry and the libraries, each with its own head (DI-T-10.6)', async () => {
    const pages: [string, string][] = [
      ['/floorspec/core/stairs', '17. Stairs — Floorspec Core 0.3 — D3 Cloud'],
      ['/floorspec/core/0.2/walls', '5. Walls — Floorspec Core 0.2 — D3 Cloud'],
      ['/floorspec/ops/0.2/references', '3. References — Floorspec Ops 0.2 — D3 Cloud'],
      ['/floorspec/rules/conventions', '0. Conventions — Floorspec Rules 0.1 — D3 Cloud'],
      ['/floorspec/registry', 'Extension registry — Floorspec — D3 Cloud'],
      ['/floorspec/registry/FS_electrical', 'FS_electrical 0.1.0 — Floorspec registry — D3 Cloud'],
      ['/floorspec/library/us-starter', 'Floorspec US starter type library — Floorspec — D3 Cloud'],
      ['/floorspec/library/FS_furniture/0.1.0', 'FS_furniture starter library 0.1.0 — Floorspec — D3 Cloud'],
    ];
    for (const [path, title] of pages) {
      const res = await get(path);
      expect(res.status, path).toBe(200);
      expect(await res.text(), path).toContain(`<title>${title}</title>`);
      expect(res.headers.get('Access-Control-Allow-Origin'), path).toBeNull();
    }
    for (const [path, to] of [
      ['/floorspec/core/0.3/walls', '/floorspec/core/walls'],
      ['/floorspec/rules/0.1/measures', '/floorspec/rules/measures'],
      ['/floorspec/library/us-starter/0.1.0/', '/floorspec/library/us-starter/0.1.0'],
    ]) {
      const res = await get(path!);
      expect(res.status, path).toBe(301);
      expect(res.headers.get('Location')).toBe(`https://d3cloud.io${to}`);
    }
    for (const path of ['/floorspec/registry/nope', '/floorspec/library/us-starter/9.9.9', '/floorspec/rules/nope']) expect((await get(path)).status, path).toBe(404);
  });
});

describe('the playground (FLR-T-10.2)', () => {
  const env: Env = {
    ASSETS: {
      fetch: async (input: RequestInfo | URL) => {
        const url = new URL(input instanceof Request ? input.url : input.toString());
        if (url.pathname === '/') return new Response('<html><head><!-- route-meta:start --><!-- route-meta:end --></head></html>');
        if (url.pathname.endsWith('.wasm')) return new Response(new Uint8Array([0, 97, 115, 109]), { headers: { 'Content-Type': 'application/wasm' } });
        return new Response('Not Found', { status: 404 });
      },
    } as unknown as Fetcher,
  };
  const get = (path: string) => worker.fetch(new Request(`https://d3cloud.io${path}`), env);
  const directives = (csp: string) => new Map(csp.split('; ').map((d) => [d.split(' ')[0]!, d.slice(d.indexOf(' ') + 1)]));

  it('is a page at /floorspec/playground, in the sitemap, with its own head', () => {
    const route = resolveRoute('/floorspec/playground');
    expect(route).toMatchObject({ meta: { path: '/floorspec/playground', kind: 'floorspec-playground' }, redirect: false });
    expect(resolveRoute('/floorspec/playground/')).toMatchObject({ meta: { path: '/floorspec/playground' }, redirect: true });
    expect(resolveRoute('/floorspec/playground/extra')).toBeNull();
    expect(allRoutes().filter((r) => r.path === '/floorspec/playground')).toHaveLength(1);
    expect(sitemap()).toContain('<loc>https://d3cloud.io/floorspec/playground</loc>');
    const head = renderHead(route!.meta);
    expect(head).toContain('<title>Playground — Floorspec — D3 Cloud</title>');
    expect(head).toContain('<link rel="canonical" href="https://d3cloud.io/floorspec/playground" />');
    expect(head).toContain('Nothing is uploaded');
    expect(head).not.toMatch(/complian/i);
  });

  it('is the only page with a policy of its own', () => {
    expect(allRoutes().filter(hasOwnPolicy).map((r) => r.path)).toEqual(['/floorspec/playground']);
  });

  it('serves the playground with WebAssembly allowed in script-src, and nothing else loosened', async () => {
    const res = await get('/floorspec/playground');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('<title>Playground — Floorspec — D3 Cloud</title>');
    for (const [key, value] of Object.entries(PLAYGROUND_HEADERS)) expect(res.headers.get(key), key).toBe(value);
    const strict = directives(SECURITY_HEADERS['Content-Security-Policy']!);
    const playground = directives(res.headers.get('Content-Security-Policy')!);
    expect(playground.get('script-src')).toBe("'self' 'wasm-unsafe-eval'");
    expect(playground.get('script-src')).not.toMatch(/'unsafe-eval'|'unsafe-inline'|https?:/);
    // Every other directive is the site's own: connect-src 'self' holds, so the file goes nowhere.
    expect(playground.get('connect-src')).toBe("'self'");
    for (const [name, value] of strict) if (name !== 'script-src') expect(playground.get(name), name).toBe(value);
    expect([...playground.keys()]).toEqual([...strict.keys()]);
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) if (key !== 'Content-Security-Policy') expect(PLAYGROUND_HEADERS[key], key).toBe(value);
  });

  it('keeps every other page, and every file — the WebAssembly itself — on the strict policy', async () => {
    expect(SECURITY_HEADERS['Content-Security-Policy']).not.toContain('wasm-unsafe-eval');
    expect(directives(SECURITY_HEADERS['Content-Security-Policy']!).get('script-src')).toBe("'self'");
    for (const path of ['/', '/floorspec', '/floorspec/core/walls', '/floorspec/app', '/nonexistent', '/floorspec/playground/', '/assets/manifold-x.wasm']) {
      const res = await get(path);
      expect(res.headers.get('Content-Security-Policy'), path).toBe(SECURITY_HEADERS['Content-Security-Policy']);
    }
    expect((await get('/floorspec/playground/')).status).toBe(301);
  });
});

