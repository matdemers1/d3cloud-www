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
import { BRAND, PROJECTS } from '../src/content/projects';
import { edges } from '../src/content/ecosystem';
import { OG_IMAGE } from '../src/head';
import { ORIGIN, allRoutes } from '../src/routes';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, process.argv[2] ?? 'dist');
const require = createRequire(import.meta.url);

// The site's own mark, the planisphere (src/components/Logo.tsx, DI-ADR-006).
const LOGO = (ink: string, star: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="26" stroke="${ink}" stroke-width="3.5"/><path d="M21 20 L40 25 L28 43" stroke="${ink}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="21" cy="20" r="3.4" fill="${ink}"/><circle cx="28" cy="43" r="3.4" fill="${ink}"/><circle cx="40" cy="25" r="5.5" fill="${star}"/></svg>`;

/** The map, small: every star at its declared place, every declared line. */
const SKY = (size: number) => {
  const lines = edges()
    .map(
      (e) =>
        `<line x1="${e.from.star.x}" y1="${e.from.star.y}" x2="${e.to.star.x}" y2="${e.to.star.y}" stroke="${e.to.accent}" stroke-width="0.5" stroke-linecap="round" opacity="0.8"${e.type === 'planned-in' ? ' stroke-dasharray="1 1.6"' : ''}/>`,
    )
    .join('');
  const stars = PROJECTS.map(
    (p) =>
      `<circle cx="${p.star.x}" cy="${p.star.y}" r="3.2" fill="${p.accent}" opacity="0.2"/><circle cx="${p.star.x}" cy="${p.star.y}" r="1.5" fill="${p.accent}"/>`,
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-6 -6 112 112" fill="none"><circle cx="50" cy="50" r="55" stroke="#ffffff" stroke-opacity="0.08" stroke-width="0.4"/>${lines}${stars}</svg>`;
};

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
  const inter = (weight: number) =>
    readFileSync(require.resolve(`@fontsource/inter/files/inter-latin-${weight}-normal.woff`));
  const serif = (style: 'normal' | 'italic') =>
    readFileSync(
      require.resolve(`@fontsource/instrument-serif/files/instrument-serif-latin-400-${style}.woff`),
    );
  const data = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

  const card = el(
    'div',
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      position: 'relative',
      padding: '72px 80px',
      backgroundColor: INK.bg,
      color: INK.fg,
      fontFamily: 'Inter',
    },
    [
      { type: 'img', props: { src: data(SKY(560)), width: 560, height: 560, style: { position: 'absolute', right: 40, top: 35 } } },
      el('div', { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%' }, [
        el('div', { display: 'flex', alignItems: 'center', gap: '20px' }, [
          { type: 'img', props: { src: data(LOGO(INK.fg, INK.accent)), width: 64, height: 64 } },
          el('div', { fontSize: 34, fontWeight: 600 }, BRAND),
        ]),
        el('div', { display: 'flex', flexDirection: 'column', fontFamily: 'Instrument Serif', fontSize: 112, lineHeight: 1, letterSpacing: '-0.02em' }, [
          el('div', {}, 'Software you'),
          el('div', { display: 'flex' }, [
            el('span', {}, 'get to\u00a0'),
            el('span', { fontStyle: 'italic', color: INK.accent }, 'keep.'),
          ]),
        ]),
        el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 26, color: INK.muted }, [
          el('div', {}, 'Tools that work together · small fixes · no tracking'),
          el('div', { color: INK.accent, fontWeight: 600 }, 'd3cloud.io'),
        ]),
      ]),
    ],
  );

  const svg = await satori(card as never, {
    width: OG_IMAGE.width,
    height: OG_IMAGE.height,
    fonts: [
      { name: 'Inter', data: inter(400), weight: 400, style: 'normal' },
      { name: 'Inter', data: inter(600), weight: 600, style: 'normal' },
      { name: 'Instrument Serif', data: serif('normal'), weight: 400, style: 'normal' },
      { name: 'Instrument Serif', data: serif('italic'), weight: 400, style: 'italic' },
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
