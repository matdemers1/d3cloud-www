import { renderHead, withHead } from './head';
import { resolveRoute } from './routes';

export interface Env {
  ASSETS: Fetcher;
}

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CSP,
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy':
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

function secure(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Floorspec's published files (FLR-ADR-018, DI-REQ-042): its JSON Schemas under /floorspec/schema/
 * — each specification's, the registry's, and each extension's at the path its `$id` names — and
 * every file of every library version under /floorspec/library/<name>/<version>/ (DI-T-10.6). A
 * published URL never changes — the sync refuses to alter one, and a test holds public/ to the
 * record — so any origin may fetch them (validators, editors and engines load them cross-origin)
 * and any cache may keep them for a year.
 */
// Not exported: a Worker module's exports must be handlers, and the runtime refuses a string.
const SCHEMA_PREFIX = '/floorspec/schema/';
const LIBRARY_PREFIX = '/floorspec/library/';
export const SCHEMA_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=31536000, immutable',
};

/**
 * A published, immutable file: anything under /floorspec/schema/, or a file inside a library
 * version — /floorspec/library/<name>/<version>/<file…>, which may have no extension (SHA256SUMS).
 * /floorspec/library/<name> and /floorspec/library/<name>/<version> are pages.
 */
const isPublished = (pathname: string) =>
  pathname.startsWith(SCHEMA_PREFIX) || (pathname.startsWith(LIBRARY_PREFIX) && pathname.split('/').filter(Boolean).length >= 5);

function published(pathname: string, response: Response): Response {
  if (!response.ok && response.status !== 304) return response;
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SCHEMA_HEADERS)) headers.set(key, value);
  // A file without an extension (a library's SHA256SUMS) is plain text, not a download.
  if (!/\.[a-z0-9]+$/i.test(pathname)) headers.set('Content-Type', 'text/plain; charset=utf-8');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/** A request for a file (has an extension) rather than a page. */
const isAsset = (pathname: string) => /\.[a-z0-9]+$/i.test(pathname);

/**
 * Pages are answered here rather than by the assets binding's SPA fallback,
 * which returned index.html with a 200 for any path at all — so a typo, a
 * missing robots.txt and a real page all looked alike to a crawler. Now a page
 * that exists gets the app with its own title, description and preview tags; a
 * renamed or trailing-slash address gets a 301 to the canonical one; anything
 * else gets the app's not-found page with a 404.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.hostname === 'www.d3cloud.io') {
      url.hostname = 'd3cloud.io';
      return secure(Response.redirect(url.toString(), 301));
    }

    if (isPublished(url.pathname) && !url.pathname.endsWith('/')) {
      return secure(published(url.pathname, await env.ASSETS.fetch(request)));
    }
    // A page first: a library version's page, /floorspec/library/us-starter/0.1.0, looks like a file.
    const route = resolveRoute(url.pathname);
    if (!route && isAsset(url.pathname)) return secure(await env.ASSETS.fetch(request));

    if (route?.redirect) {
      url.pathname = route.meta.path;
      return secure(Response.redirect(url.toString(), 301));
    }

    const shell = await env.ASSETS.fetch(new Request(new URL('/', url), request));
    if (!shell.ok) return secure(shell);

    const html = withHead(await shell.text(), renderHead(route?.meta ?? null));
    const headers = new Headers(shell.headers);
    headers.delete('Content-Length');
    headers.delete('ETag');
    headers.set('Content-Type', 'text/html; charset=utf-8');
    // no-cache: the shell names hashed bundles, so it must be revalidated on
    // every load. no-transform: Cloudflare injects its Web Analytics beacon
    // into HTML when the zone has it on, and skips responses marked this way.
    // This site collects nothing (DI-REQ-004), and CSP would block the beacon
    // anyway — as a console error on every page.
    headers.set('Cache-Control', 'no-cache, no-transform');
    return secure(
      new Response(request.method === 'HEAD' ? null : html, {
        status: route ? 200 : 404,
        headers,
      }),
    );
  },
};
