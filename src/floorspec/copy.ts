import { createContext } from 'react';

/** Called when a statement's badge is used, so the chapter page can say its link was copied. */
export const CopyContext = createContext<(id: string) => void>(() => {});

/**
 * How many levels a page's headings sit below its title. A chapter's `##` sections are the page's
 * h2s (0); an extension's spec.md holds several `# n.` chapters, which become its h2s (1).
 */
export const HeadingShift = createContext(0);
