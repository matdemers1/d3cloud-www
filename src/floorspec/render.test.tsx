/** @jsxRuntime automatic */
import { prerender } from 'react-dom/static';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { ChapterPage, CoveragePage, StandardPage } from './pages';
import { ExtensionPage, LibraryPage, RegistryPage } from './registry';
import { CORE, EXTENSIONS, LIBRARIES, SPECS } from './spec';
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

  it('a Rules chapter, with its statements anchored and the Draft banner', async () => {
    const out = await html(<ChapterPage spec="rules" version="0.1" slug="rules" />);
    expect(out).toContain('id="FS-RULES-3.9.1"');
    expect(out).toContain('Draft 0.1 — no compatibility promise');
    expect(out).toContain('href="/floorspec/core/');
  });

  it('a Core 0.2 chapter as an earlier draft, and a 0.3 chapter with its retired-statement note', async () => {
    const old = await html(<ChapterPage spec="core" version="0.2" slug="walls" />);
    expect(old).toContain('Draft 0.2 — superseded by Draft 0.3');
    expect(old).toContain('href="/floorspec/core/0.2/');
    const now = await html(<ChapterPage spec="core" version="0.3" slug="model" />);
    expect(now).toContain('id="FS-CORE-1.2.3"');
    expect(now).toContain('retired in Core 0.3');
    expect(now).toContain('/floorspec/core/0.2/model');
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
