/** @jsxRuntime automatic */
import { prerender } from 'react-dom/static';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { ChapterPage, CoveragePage, StandardPage } from './pages';
import { ExtensionPage, LibraryPage, RegistryPage } from './registry';
import { CORE, EXTENSIONS, LIBRARIES, SPECS, specByCode } from './spec';
import { PlaygroundPage } from './playground/Playground';

/**
 * The Floorspec pages render, once their lazy data has loaded (DI-T-10.6): each is prerendered to
 * HTML — Suspense waits for the chunks — and checked for what it must say. The routes, the Worker
 * and the data are tested in floorspec.test.ts; this catches a page that would throw.
 */
async function html(page: ReactNode): Promise<string> {
  const { prelude } = await prerender(page);
  // React separates adjacent text with comments; the text is what is checked.
  return (await new Response(prelude).text()).replace(/<!-- -->/g, '');
}

describe('the Floorspec pages render', () => {
  it('the landing page lists every specification, the registry and the libraries', async () => {
    const out = await html(<StandardPage />);
    for (const spec of SPECS) expect(out).toContain(`Read ${spec.name} ${spec.version}`);
    expect(out).toContain(`What ${CORE.version} adds.`);
    for (const ext of EXTENSIONS) expect(out).toContain(`href="/floorspec/registry/${ext.name}"`);
    for (const lib of LIBRARIES) expect(out).toContain(`href="/floorspec/library/${lib.name}"`);
    expect(out).toContain('Rule packs');
  });

  it('a Rules chapter, with its statements anchored and the Draft banner, and Rules 0.1 as an earlier draft', async () => {
    const rules = specByCode('rules')!;
    const out = await html(<ChapterPage spec="rules" version={rules.version} slug="rules" />);
    expect(out).toContain('id="FS-RULES-3.9.1"');
    expect(out).toContain(`Draft ${rules.version} — no compatibility promise`);
    expect(out).toContain('href="/floorspec/core/');
    const old = await html(<ChapterPage spec="rules" version="0.1" slug="rules" />);
    expect(old).toContain(`Draft 0.1 — superseded by Draft ${rules.version}`);
    // Rules 0.1 was written against Core 0.3, and links there.
    expect(old).toContain('href="/floorspec/core/0.3/');
  });

  it('earlier Core drafts as earlier drafts, and the current one with its retired-statement notes', async () => {
    for (const version of ['0.2', '0.3']) {
      const old = await html(<ChapterPage spec="core" version={version} slug="walls" />);
      expect(old).toContain(`Draft ${version} — superseded by Draft ${CORE.version}`);
      expect(old).toContain(`href="/floorspec/core/${version}/`);
    }
    const model = await html(<ChapterPage spec="core" version={CORE.version} slug="model" />);
    // Each note names the draft that retired its ID, and the earlier draft that has it.
    expect(model).toContain('id="FS-CORE-1.2.3"');
    expect(model).toContain('FS-CORE-1.2.3 · retired in Core 0.3');
    expect(model).toContain('href="/floorspec/core/0.2/model#FS-CORE-1.2.3"');
    expect(model).toContain('id="FS-CORE-1.2.5"');
    expect(model).toContain('FS-CORE-1.2.5 · retired in Core 0.4');
    expect(model).toContain('href="/floorspec/core/0.3/model#FS-CORE-1.2.5"');
    expect(model).toContain('FS-CORE-1.2.1 · retired in Core 0.2');
    // A statement retired with nothing in its place says so without a "Replaced by".
    const stairs = await html(<ChapterPage spec="core" version={CORE.version} slug="stairs" />);
    expect(stairs).toMatch(/id="FS-CORE-17\.7\.2"[^>]*>(?:(?!<\/aside>).)*retired in Core 0\.4(?:(?!<\/aside>).)*FS-LINT-016/s);
    expect(stairs).not.toMatch(/id="FS-CORE-17\.7\.2"[^>]*>(?:(?!<\/aside>).)*Replaced by/s);
    expect(stairs).toContain('id="FS-CORE-17.7.1"');
  });

  it('chapter 21, arc edges, with its statements anchored (DI-T-10.7)', async () => {
    const out = await html(<ChapterPage spec="core" version={CORE.version} slug="arcs" />);
    expect(out).toContain('Arc edges');
    expect(out).toMatch(/id="FS-CORE-21\.\d+\.\d+"/);
    expect(out).toContain('id="21.2"');
  });

  it('the coverage page has Rules beside Core and Ops', async () => {
    const out = await html(<CoveragePage />);
    for (const spec of SPECS) expect(out).toContain(`id="${spec.spec}"`);
    expect(out).toContain('id="core-0.2"');
  });

  it('the registry, every extension with its status and evidence', async () => {
    const out = await html(<RegistryPage />);
    for (const ext of EXTENSIONS) expect(out).toContain(`id="${ext.name}"`);
    expect(out).toContain('Release Candidate');
    expect(out).toContain('https://github.com/matdemers1/d3-floorspec/actions/runs/');
    expect(out).toContain('How the registry works');
  });

  it("an extension's page renders its specification, statements anchored, chapters as h2", async () => {
    const out = await html(<ExtensionPage name="FS_electrical" />);
    expect(out).toContain('id="FS-ELEC-');
    expect(out).toMatch(/<h2 id="chapter-1"/);
    expect(out).toContain('href="/floorspec/schema/ext/FS_electrical/0.1.0/electrical.schema.json"');
  });

  it('a library and one version, every item linking to its file', async () => {
    const lib = await html(<LibraryPage name="us-starter" />);
    expect(lib).toContain('https://d3cloud.io/floorspec/library/us-starter/0.1.0/');
    expect(lib).toContain('href="/floorspec/library/us-starter/0.1.0/items/gypsum-board.json"');
    const furniture = await html(<LibraryPage name="FS_furniture" version="0.1.0" />);
    expect(furniture).toContain('href="/floorspec/library/FS_furniture/0.1.0/models/refrigerator-900.glb"');
    expect(furniture).toContain('names no address');
  });

  it('the playground, before a file: the heading, the drop zone and the three samples, with the current draft', async () => {
    const out = await html(<PlaygroundPage />);
    expect(out).toContain('Drop a Floorspec file.');
    expect(out).toContain('Validated in your browser by the reference engine — nothing is uploaded. No account needed.');
    expect(out).toContain(`Draft ${CORE.version}`);
    for (const name of ['Ranch', 'Two-storey', 'Cabin']) expect(out).toContain(`>${name}<span class="sr-only">`);
    expect(out).toContain('accept=".json,.floorspec,application/json,application/zip"');
    expect(out).toContain('https://github.com/matdemers1/d3-floorspec/tree/');
    expect(out).not.toMatch(/complian/i);
  });
});
