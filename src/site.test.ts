import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { themeBootScript } from '@d3cloud/ui';
import { LEGAL_DOCS } from './content/legal';
import { PROJECTS } from './content/projects';
import { HEAD_END, HEAD_START, renderHead, withHead } from './head';
import { allRoutes, resolveRoute } from './routes';
import worker, { SECURITY_HEADERS, type Env } from './worker';
import { sitemap } from '../scripts/generate-static';

const INDEX_HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

describe('routes', () => {
  it('knows every project, its legal pages and its support page', () => {
    for (const project of PROJECTS) {
      expect(resolveRoute(`/${project.slug}`)?.meta.kind).toBe('project');
      const docs = LEGAL_DOCS[project.slug];
      if (!docs) {
        expect(resolveRoute(`/${project.slug}/support`)).toBeNull();
        continue;
      }
      for (const page of Object.keys(docs)) {
        expect(resolveRoute(`/${project.slug}/${page}`)?.meta.kind).toBe('legal');
      }
      expect(resolveRoute(`/${project.slug}/support`)?.meta.kind).toBe('support');
    }
  });

  it('keeps the shipped Clearwhen URLs, and the Daypart ones as redirects', () => {
    for (const page of ['', '/privacy', '/terms', '/support']) {
      expect(resolveRoute(`/clearwhen${page}`)).toMatchObject({ redirect: false });
      expect(resolveRoute(`/daypart${page}`)).toMatchObject({
        meta: { path: `/clearwhen${page}` },
        redirect: true,
      });
    }
  });

  it('refuses what is not a page', () => {
    for (const path of ['/nope', '/clearwhen/nope', '/ui/privacy', '/qr/privacy/extra']) {
      expect(resolveRoute(path)).toBeNull();
    }
  });

  it('treats a trailing slash as a redirect to the canonical path', () => {
    expect(resolveRoute('/qr/')).toMatchObject({ meta: { path: '/qr' }, redirect: true });
    expect(resolveRoute('/')).toMatchObject({ redirect: false });
  });

  it('lists each page once in the sitemap', () => {
    const paths = allRoutes().map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) expect(sitemap()).toContain(`<loc>https://d3cloud.io${path}</loc>`);
  });
});

describe('head', () => {
  it('ships the home page head in index.html, exactly as the Worker would render it', () => {
    const block = INDEX_HTML.slice(
      INDEX_HTML.indexOf(HEAD_START) + HEAD_START.length,
      INDEX_HTML.indexOf(HEAD_END),
    ).trim();
    expect(block).toBe(renderHead(resolveRoute('/')!.meta));
  });

  it('escapes what it interpolates', () => {
    const head = renderHead({
      path: '/x',
      kind: 'project',
      title: 'A "quoted" <title>',
      description: 'Tom & Jerry',
    });
    expect(head).toContain('<title>A &quot;quoted&quot; &lt;title&gt;</title>');
    expect(head).toContain('content="Tom &amp; Jerry"');
    expect(head).not.toContain('<title>A "');
  });

  it('keeps the not-found page out of the index and gives it no canonical', () => {
    const head = renderHead(null);
    expect(head).toContain('noindex');
    expect(head).not.toContain('canonical');
  });
});

describe('worker', () => {
  const env: Env = {
    ASSETS: {
      fetch: async (input: RequestInfo | URL) => {
        const url = new URL(input instanceof Request ? input.url : input.toString());
        if (url.pathname === '/') {
          return new Response(INDEX_HTML, { headers: { 'Content-Type': 'text/html' } });
        }
        if (url.pathname === '/favicon.svg') return new Response('<svg/>');
        return new Response('Not Found', { status: 404 });
      },
    } as unknown as Fetcher,
  };
  const get = (path: string, host = 'd3cloud.io') =>
    worker.fetch(new Request(`https://${host}${path}`), env);

  const expectSecure = (res: Response) => {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      expect(res.headers.get(key)).toBe(value);
    }
  };

  it('serves a page with its own head', async () => {
    const res = await get('/bindery');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<link rel="canonical" href="https://d3cloud.io/bindery" />');
    expect(html).toContain('<title>Bindery — Demers Design and Development</title>');
    expect(html.match(/<title>/g)).toHaveLength(1);
    expectSecure(res);
  });

  it('answers a path that is not a page with a 404, not the home page', async () => {
    const res = await get('/nonexistent');
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('noindex');
    expectSecure(res);
  });

  it('answers a missing file with a 404', async () => {
    const res = await get('/nope.txt');
    expect(res.status).toBe(404);
    expectSecure(res);
  });

  it('serves files through the assets binding', async () => {
    const res = await get('/favicon.svg');
    expect(res.status).toBe(200);
    expectSecure(res);
  });

  it('redirects old and non-canonical addresses with a 301', async () => {
    expect((await get('/daypart/privacy')).headers.get('Location')).toBe(
      'https://d3cloud.io/clearwhen/privacy',
    );
    const slash = await get('/qr/?x=1');
    expect(slash.status).toBe(301);
    expect(slash.headers.get('Location')).toBe('https://d3cloud.io/qr?x=1');
    const www = await get('/ui', 'www.d3cloud.io');
    expect(www.status).toBe(301);
    expect(www.headers.get('Location')).toBe('https://d3cloud.io/ui');
  });
});

describe('theme', () => {
  it('pre-paints exactly as the ThemeProvider expects', () => {
    const file = readFileSync(new URL('../public/theme-init.js', import.meta.url), 'utf8');
    const code = file
      .split('\n')
      .filter((line) => line.trim() !== '' && !line.startsWith('//'))
      .join('\n');
    expect(code).toBe(themeBootScript('d3cloud-theme'));
  });
});

describe('withHead', () => {
  it('leaves HTML without markers untouched', () => {
    expect(withHead('<head></head>', '<title>x</title>')).toBe('<head></head>');
  });
});
