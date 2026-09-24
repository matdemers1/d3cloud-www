/**
 * Writes the files that describe the site to machines, into dist/ after `vite build`:
 *
 * - og-image.png — the link-preview card, 1200×630 (DI-ADR-003: generated at build time from
 *   code, with satori + resvg, so it cannot drift from the logo or the tagline)
 * - robots.txt
 * - sitemap.xml — every page, read from src/routes.ts, the same list the Worker answers from
 *
 * Into dist/ rather than public/ so nothing generated is ever committed. `npm run build` runs it.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { STUDIO } from '../src/content/projects';
import { OG_IMAGE } from '../src/head';
import { ORIGIN, TAGLINE, allRoutes } from '../src/routes';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, process.argv[2] ?? 'dist');
const require = createRequire(import.meta.url);

// The site's own mark (src/components/Logo.tsx), drawn in the accent.
const LOGO = (colour: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="${colour}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 18 L10 32 L22 46"/><path d="M42 18 L54 32 L42 46"/><path d="M36 14 L28 50"/></svg>`;

/**
 * Satori draws into an image, outside the page, so it cannot read CSS custom properties. It reads
 * the design system's built token file instead — the first definition of each is the dark theme,
 * which is primary — so the card changes when the palette does.
 */
function darkTokens() {
  const css = readFileSync(
    join(dirname(require.resolve('@d3cloud/ui/tokens.css')), 'color.css'),
    'utf8',
  );
  const token = (name: string) => {
    const match = css.match(new RegExp(`--color-${name}:\\s*([^;]+);`));
    if (!match) throw new Error(`@d3cloud/ui has no --color-${name}`);
    return match[1].trim();
  };
  return {
    bg: token('bg'),
    fg: token('fg'),
    muted: token('fg-muted'),
    accent: token('accent'),
    rule: token('border'),
  };
}
const INK = darkTokens();

type Node = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style, children },
});

async function ogImage(): Promise<Buffer> {
  const font = (weight: number) =>
    readFileSync(require.resolve(`@fontsource/inter/files/inter-latin-${weight}-normal.woff`));

  const logo = `data:image/svg+xml;base64,${Buffer.from(LOGO(INK.accent)).toString('base64')}`;

  const card = el(
    'div',
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '80px 88px',
      backgroundColor: INK.bg,
      color: INK.fg,
      fontFamily: 'Inter',
    },
    [
      el('div', { display: 'flex', alignItems: 'center', gap: '24px' }, [
        { type: 'img', props: { src: logo, width: 72, height: 72 } },
        el('div', { fontSize: 34, fontWeight: 600 }, STUDIO),
      ]),
      el('div', { display: 'flex', fontSize: 64, fontWeight: 700, lineHeight: 1.15, maxWidth: '980px' }, TAGLINE),
      el(
        'div',
        {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: `2px solid ${INK.rule}`,
          paddingTop: '28px',
          fontSize: 28,
          color: INK.muted,
        },
        [
          el('div', {}, 'No accounts · no ads · no tracking'),
          el('div', { color: INK.accent, fontWeight: 600 }, 'd3cloud.io'),
        ],
      ),
    ],
  );

  const svg = await satori(card as never, {
    width: OG_IMAGE.width,
    height: OG_IMAGE.height,
    fonts: [
      { name: 'Inter', data: font(400), weight: 400, style: 'normal' },
      { name: 'Inter', data: font(600), weight: 600, style: 'normal' },
      { name: 'Inter', data: font(700), weight: 700, style: 'normal' },
    ],
  });
  return new Resvg(svg, { fitTo: { mode: 'width', value: OG_IMAGE.width } }).render().asPng();
}

export function robots(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`;
}

export function sitemap(): string {
  const urls = allRoutes()
    .map((route) => `  <url><loc>${ORIGIN}${route.path}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function main() {
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'og-image.png'), await ogImage());
  writeFileSync(join(out, 'robots.txt'), robots());
  writeFileSync(join(out, 'sitemap.xml'), sitemap());
  console.log(`og-image.png, robots.txt, sitemap.xml (${allRoutes().length} pages) → ${out}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
