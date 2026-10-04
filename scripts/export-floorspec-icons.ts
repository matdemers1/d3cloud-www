/**
 * Exports D3 Floorspec's icon set from its product mark (DI-T-10.1), for the d3-floorspec web app
 * to copy in. Not part of the build, and nothing it writes is committed:
 *
 *   npm run icons:floorspec [-- outDir]   → scripts/out/floorspec-icons/ by default (gitignored)
 *
 * - favicon.svg — the mark on a rounded tile, like the site's own public/favicon.svg: a solid tile
 *   reads on a light tab strip and a dark one alike, so the colours can be fixed.
 * - apple-touch-icon.png (180) — a full square; iOS rounds the corners itself, and refuses alpha.
 * - icon-192.png, icon-512.png — the rounded tile, for a manifest's `"purpose": "any"`.
 * - icon-512-maskable.png — full bleed, the mark inside the maskable safe zone (the central
 *   circle of 80% diameter), for `"purpose": "maskable"`.
 *
 * The mark is drawn by ProductMark itself, so the icons cannot drift from the site; the tile and
 * ink come from the design system's dark theme, read from its built token file the same way
 * generate-static.ts reads them for the link-preview card. The star keeps the product's accent.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Resvg } from '@resvg/resvg-js';
import { ProductMark } from '../src/components/ProductMark';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, process.argv[2] ?? 'scripts/out/floorspec-icons');
const require = createRequire(import.meta.url);

const SLUG = 'floorspec-app';
// The product's accent, as declared for D3 Floorspec in src/content/ecosystem.ts.
const ACCENT = '#B5D84A';

function darkToken(name: string): string {
  const css = readFileSync(join(dirname(require.resolve('@d3cloud/ui/tokens.css')), 'color.css'), 'utf8');
  const match = css.match(new RegExp(`--color-${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`@d3cloud/ui has no --color-${name}`);
  return match[1].trim();
}
const TILE = darkToken('surface');
const INK = darkToken('fg');

/** The mark's drawing at icon weight, without its own <svg> element, with the ink fixed. */
function markBody(): string {
  // Size 32 selects the icon weights (heavier lines), which is what an app icon wants at any size.
  const svg = renderToStaticMarkup(createElement(ProductMark, { slug: SLUG, accent: ACCENT, size: 32 }));
  const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  if (!inner.includes('fill:#B5D84A')) throw new Error(`ProductMark drew no lit star for ${SLUG}`);
  return inner.replaceAll('currentColor', INK);
}

/**
 * The mark on a tile. `scale` shrinks the 64-unit mark about its centre; `radius` rounds the tile
 * (0 for a full square).
 */
function icon({ scale, radius }: { scale: number; radius: number }): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">',
    `<rect width="64" height="64" rx="${radius}" fill="${TILE}"/>`,
    `<g transform="translate(32 32) scale(${scale}) translate(-32 -32)">${markBody()}</g>`,
    '</svg>',
  ].join('');
}

const png = (svg: string, size: number) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: size }, background: 'rgba(0,0,0,0)' }).render().asPng();

function main() {
  mkdirSync(out, { recursive: true });
  // The ring's outer edge is 27.75 units from the centre (r 26 + half a 3.5 stroke): at 0.88 it
  // keeps a margin on the rounded tile; at 0.8 it sits inside the maskable safe circle (r 25.6).
  const tile = icon({ scale: 0.88, radius: 14 });
  const square = icon({ scale: 0.88, radius: 0 });
  const maskable = icon({ scale: 0.8, radius: 0 });

  writeFileSync(join(out, 'favicon.svg'), `${tile}\n`);
  writeFileSync(join(out, 'apple-touch-icon.png'), png(square, 180));
  writeFileSync(join(out, 'icon-192.png'), png(tile, 192));
  writeFileSync(join(out, 'icon-512.png'), png(tile, 512));
  writeFileSync(join(out, 'icon-512-maskable.png'), png(maskable, 512));
  console.log(`favicon.svg, apple-touch-icon.png, icon-192.png, icon-512.png, icon-512-maskable.png → ${out}`);
}

main();
