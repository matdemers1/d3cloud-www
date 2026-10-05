import type { Chapter, Coverage } from './ast';

/**
 * Chapter content and the coverage tables are their own chunks, fetched when a page needs them —
 * twenty chapters in the main bundle would spend the 150 kB budget on text most visitors never
 * open. Each promise is cached, so React's `use` sees the same one on every render.
 */
const CHAPTERS = import.meta.glob<Chapter>('./generated/*/chapters/*.json', { import: 'default' });
const COVERAGE = import.meta.glob<Coverage>('./generated/*/coverage.json', { import: 'default' });

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

export const loadChapter = (spec: string, slug: string): Promise<Chapter> =>
  load(CHAPTERS, `./generated/${spec}/chapters/${slug}.json`, `chapter "${spec}/${slug}"`);

export const loadCoverage = (spec: string): Promise<Coverage> =>
  load(COVERAGE, `./generated/${spec}/coverage.json`, `coverage for "${spec}"`);
