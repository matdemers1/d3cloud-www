import type { Chapter, Coverage, Libraries, Registry, SpecIndex } from './ast';

/**
 * Chapter content and the coverage tables are their own chunks, fetched when a page needs them —
 * twenty chapters in the main bundle would spend the 150 kB budget on text most visitors never
 * open. Each promise is cached, so React's `use` sees the same one on every render.
 */
const CHAPTERS = import.meta.glob<Chapter>('./generated/*/*/chapters/*.json', { import: 'default' });
const COVERAGE = import.meta.glob<Coverage>('./generated/*/*/coverage.json', { import: 'default' });
/** The registry (DI-T-10.6): its index, and each extension's specification, each a chunk of its own. */
const REGISTRY = import.meta.glob<Registry>('./generated/registry/index.json', { import: 'default' });
const EXTENSION_DOCS = import.meta.glob<Chapter>(['./generated/registry/*.json', '!./generated/registry/index.json'], { import: 'default' });
const LIBRARIES = import.meta.glob<Libraries>('./generated/libraries.json', { import: 'default' });

const cache = new Map<string, Promise<unknown>>();

function load<T>(modules: Record<string, () => Promise<T>>, path: string, what: string): Promise<T> {
  let promise = cache.get(path) as Promise<T> | undefined;
  if (!promise) {
    const loader = modules[path];
    promise = loader ? loader() : Promise.reject(new Error(`No ${what}`));
    cache.set(path, promise);
  }
  return promise;
}

/** One chapter of one draft: generated/<spec>/<version>/chapters/<slug>.json. */
export const loadChapter = (spec: SpecIndex, slug: string): Promise<Chapter> =>
  load(CHAPTERS, `./generated/${spec.spec}/${spec.version}/chapters/${slug}.json`, `chapter "${spec.spec} ${spec.version}/${slug}"`);

export const loadCoverage = (spec: SpecIndex): Promise<Coverage> =>
  load(COVERAGE, `./generated/${spec.spec}/${spec.version}/coverage.json`, `coverage for "${spec.spec} ${spec.version}"`);

export const loadRegistry = (): Promise<Registry> => load(REGISTRY, './generated/registry/index.json', 'registry');

/** An extension's specification (or a Proposal's rationale): generated/registry/<NAME>.json. */
export const loadExtensionDoc = (name: string): Promise<Chapter> =>
  load(EXTENSION_DOCS, `./generated/registry/${name}.json`, `specification for "${name}"`);

export const loadLibraries = (): Promise<Libraries> => load(LIBRARIES, './generated/libraries.json', 'libraries');
