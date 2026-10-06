import summaries from './generated/earlier-summaries.json';
import { EARLIER } from './spec';

/**
 * The earlier drafts' chapter summaries (DI-T-10.8). index.json is in the entry chunk, and every
 * draft a sync supersedes would grow it, so `npm run sync:floorspec` writes an earlier draft's
 * summaries to earlier-summaries.json instead, keyed `<spec>@<version>` and then by chapter slug.
 * Nothing in the browser's entry chunk reads them — the router only needs a page's title — so only
 * what does imports this module: the Worker, whose head descriptions quote them, and the Floorspec
 * pages, a lazy chunk. Importing it fills each earlier chapter's `summary` in EARLIER, once, before
 * the importer runs; generated data is never edited.
 */
const BY_DRAFT: Record<string, Record<string, string> | undefined> = summaries;

for (const spec of EARLIER) {
  const draft = BY_DRAFT[`${spec.spec}@${spec.version}`];
  for (const chapter of spec.chapters) chapter.summary ??= draft?.[chapter.slug];
}
