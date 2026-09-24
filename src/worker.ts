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

    if (isAsset(url.pathname)) {
      return secure(await env.ASSETS.fetch(request));
    }

    const route = resolveRoute(url.pathname);
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
    // The shell names hashed bundles, so it must be revalidated on every load.
    headers.set('Cache-Control', 'no-cache');
    return secure(
      new Response(request.method === 'HEAD' ? null : html, {
        status: route ? 200 : 404,
        headers,
      }),
    );
  },
};
