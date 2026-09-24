import { NOT_FOUND_TITLE, ORIGIN, type RouteMeta } from './routes';
import { BRAND } from './content/projects';

/**
 * The per-page part of `<head>`: title, description, canonical, Open Graph and
 * Twitter tags.
 *
 * It has to be in the HTML the server sends, not set by React later — link
 * unfurlers and most crawlers never run the bundle. The Worker swaps this block
 * into index.html between the `route-meta` markers for every page it serves.
 * index.html itself carries the home page's version, which a test holds equal
 * to `renderHead` for `/`, so the two cannot disagree.
 */

export const HEAD_START = '<!-- route-meta:start -->';
export const HEAD_END = '<!-- route-meta:end -->';

/** Built by scripts/generate-static.ts (DI-ADR-003). */
export const OG_IMAGE = { path: '/og-image.png', width: 1200, height: 630 };

const escape = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/** `null` is the not-found page: titled as such, and kept out of the index. */
export function renderHead(meta: RouteMeta | null): string {
  const title = meta ? meta.title : NOT_FOUND_TITLE;
  const description = meta
    ? meta.description
    : 'That address doesn’t exist — it may have moved.';
  const image = `${ORIGIN}${OG_IMAGE.path}`;

  const tags = [
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${escape(description)}" />`,
  ];

  if (!meta) {
    tags.push('<meta name="robots" content="noindex" />');
    return tags.join('\n    ');
  }

  const url = `${ORIGIN}${meta.path}`;
  tags.push(
    `<link rel="canonical" href="${escape(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escape(BRAND)}" />`,
    `<meta property="og:url" content="${escape(url)}" />`,
    `<meta property="og:title" content="${escape(title)}" />`,
    `<meta property="og:description" content="${escape(description)}" />`,
    `<meta property="og:image" content="${escape(image)}" />`,
    `<meta property="og:image:width" content="${OG_IMAGE.width}" />`,
    `<meta property="og:image:height" content="${OG_IMAGE.height}" />`,
    `<meta property="og:image:alt" content="${escape(`${BRAND} — ${description}`)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escape(title)}" />`,
    `<meta name="twitter:description" content="${escape(description)}" />`,
    `<meta name="twitter:image" content="${escape(image)}" />`,
  );
  return tags.join('\n    ');
}

/** Replace the marked block in index.html with `head`. */
export function withHead(html: string, head: string): string {
  const start = html.indexOf(HEAD_START);
  const end = html.indexOf(HEAD_END);
  if (start === -1 || end === -1 || end < start) return html;
  return (
    html.slice(0, start + HEAD_START.length) +
    '\n    ' +
    head +
    '\n    ' +
    html.slice(end)
  );
}
