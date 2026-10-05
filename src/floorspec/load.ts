import type { Chapter, Coverage, SpecIndex } from './ast';

/**
 * Chapter content and the coverage tables are their own chunks, fetched when a page needs them —
 * twenty chapters in the main bundle would spend the 150 kB budget on text most visitors never
 * open. Each promise is cached, so React's `use` sees the same one on every render.
 */
const CHAPTERS = import.meta.glob<Chapter>('./generated/*/*/chapters/*.json', { import: 'default' });
const COVERAGE = import.meta.glob<Coverage>('./generated/*/*/coverage.json', { import: 'default' });

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
