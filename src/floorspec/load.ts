import type { Chapter, Coverage } from './ast';

/**
 * Chapter content and the coverage table are their own chunks, fetched when a page needs them —
 * twelve chapters in the main bundle would spend the 150 kB budget on text most visitors never
 * open. Each promise is cached, so React's `use` sees the same one on every render.
 */
const CHAPTERS = import.meta.glob<Chapter>('./generated/chapters/*.json', { import: 'default' });

const chapters = new Map<string, Promise<Chapter>>();

export function loadChapter(slug: string): Promise<Chapter> {
  let promise = chapters.get(slug);
  if (!promise) {
    const load = CHAPTERS[`./generated/chapters/${slug}.json`];
    promise = load ? load() : Promise.reject(new Error(`No chapter "${slug}"`));
    chapters.set(slug, promise);
  }
  return promise;
}

let coverage: Promise<Coverage> | undefined;

export function loadCoverage(): Promise<Coverage> {
  coverage ??= import('./generated/coverage.json').then((module) => module.default as Coverage);
  return coverage;
}
