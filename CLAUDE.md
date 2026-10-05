# CLAUDE.md — d3cloud-www

Home of the **D3 Cloud** ecosystem at `d3cloud.io` — *Demers Design and Development* is the maker's line under it (DI-ADR-006). Single-page React SPA. **No backend, no database, no auth.** Same stack and Worker pattern as [`d3-qr`](../d3-qr/); styled with the D3 Cloud design system, `@d3cloud/ui` (ADR-005).

Read this before doing any work. The plan lives in Foreman as project `DI` — start with `foreman_brief DI`.

## Vault Documentation

| Doc | Path |
|-----|------|
| Where it stands | `foreman_brief DI` |
| Architecture | `foreman://DI/architecture` |
| Phases and tasks | `foreman_get` on a phase, or `foreman_coverage DI` |
| ADRs | Foreman `DI` — `DI-ADR-001` onward |
| Overview | `foreman://DI/overview` |

When picking up a new development session, run `/start-development d3cloud-www` to load this context.

## Key Conventions

- **No backend, ever.** Pure static SPA. See `ADR-001 — Static SPA on Cloudflare Workers`.
- **Lightweight hand-rolled router** (`src/router.tsx`, History API, no dependency) for per-app pages: `/clearwhen`, `/clearwhen/privacy|terms|support`, same under `/qr`; `/ui` has a project page only — pages without legal docs get no privacy/terms/support links or route. See `ADR-004` (supersedes `ADR-002`). **Still no routing library.**
- **No analytics, no telemetry on this site.** CSP `connect-src 'self'` enforces it. (This is *not* a public stance about future projects.)
- **Styled with `@d3cloud/ui`** (ADR-005, supersedes "mirror d3-qr"). Installed from the GitHub release tarball — the package lives in a subdirectory, so a git-tag install fails. Use its semantic utilities (`bg-surface`, `text-fg-muted`, `text-14`, `rounded-lg`) and components (`Card`, `Badge`, `Link`). `npm run lint` runs `d3-check-usage src`: no raw hex, palette classes, off-scale values or shadows. A genuine exception needs `d3-allow: <reason>` on or above the line.
- **Spacing goes on a wrapper, never on a library component.** Before 1.2 the components' CSS arrived unlayered and beat Tailwind utilities, so `<Card className="mb-8">` silently did nothing; 1.2.2 puts it in `@layer d3-ui`, below utilities, but the rule stays — a wrapper survives either way.
- **Interface type follows the system scale (11–24px); display headings use the site's display layer** (DI-ADR-006): `font-display` (Instrument Serif) with `text-display-sm|md|lg|xl` and `text-stat`, all defined in `src/styles/index.css`. Never an arbitrary size at a call site.
- **The ecosystem is declared, not drawn.** Each project in `projects.ts` has a `kind` (`ecosystem` | `fix`), a `star` position and its `relations` (`signs-in-with`, `built-on`, `planned-in`). The hero, the map, the link-preview card and each product page's "In the constellation" block read them through `src/content/ecosystem.ts`, which also holds the build log and the workshop list. A new product is a new entry there — tests fail on a relation to an unknown project.
- **Projects on the bench get workshop pages, not product pages** (DI-REQ-037/038). `WORKSHOP` in `src/content/ecosystem.ts` holds each one's stage, an honest stage note, and features each marked `built` or planned — only what the project's own plan and live site support. They are not stars on the map and not in either of the two kinds; when one launches it moves into `PROJECTS`. A screenshot of what is live goes in `public/screenshots/<slug>/`; with nothing public to show, a drawing in `src/components/WorkshopArt.tsx`. Link only to what a stranger can use today — a repo, never an instance still being set up.
- **Motion is CSS only, and none of it runs under `prefers-reduced-motion`** (DI-REQ-032) — the kill switch is in `index.css`. Every animation must end at a complete resting state.
- **The mark is the planisphere** (`src/components/Logo.tsx`, `public/favicon.svg`, the OG card in `scripts/generate-static.ts`). On a product page its lit star takes the product's colour.
- **Each product has its own mark** (DI-REQ-040) — the ring family chosen on the *Brand & Site Concepts* canvas on 2026-09-25, in `src/components/ProductMark.tsx`: the planisphere's ring, ink lines, one lit star in the product's accent. Auth is Keyhole, UI Compass, Shipyard Lift-off, Foreman True North, Bindery Dog-ear, Postroom Envelope (orchid, DI-T-9.1), Floorspec Junction and D3 Floorspec Door swing (both chartreuse, DI-T-10.1; `npm run icons:floorspec` exports the app's favicon and PWA icons to the gitignored `scripts/out/`). Clearwhen uses its App Store icon (`public/marks/`); a product with neither falls back to the planisphere. It shows in the product hero and the header crumb.
- **A product page can carry a deep dive** (DI-REQ-039): `src/pages/deep/<Product>.tsx`, registered in `src/pages/deep/index.ts`. It owns its sections and their order; the page supplies the hero and the closing sections. Build it from `src/components/Deep.tsx` (`DeepIndex`, `DeepSection`, `Figure`, `Stat`, `BarRow`, `FlowDown`), draw every chart and diagram in code from tokens, keep a product's accent to marks and bars (it fails contrast as text in the light theme), and make every number traceable to the product's repo or its Foreman records. Foreman's is the pattern.
- **The Floorspec standard is published here** (FLR-ADR-018, DI-REQ-042): `/floorspec`, `/floorspec/<spec>/<chapter>` for every specification that has chapters (Core and Ops today — `/floorspec/core/walls`, `/floorspec/ops/references`; Rules when it has some), `/floorspec/coverage` (all of them), and D3 Floorspec's workshop page at `/floorspec/app` (a `WorkshopItem` may declare its own `path`). `npm run sync:floorspec [-- <checkout>]` (default `../floorspec`) refuses a dirty `spec/`, `schema/` or `conformance/`, pins the commit and each specification's draft version (from its README) in `src/floorspec/floorspec.lock.json`, parses each chapter with marked's lexer into the JSON AST of `src/floorspec/ast.ts` (rendered by `Prose.tsx` — no HTML strings), and writes `src/floorspec/generated/` (`index.json`, then `<spec>/chapters/*.json` and `<spec>/coverage.json`), which is committed so CI never needs the checkout. Never hand-edit generated files. Chapter text and coverage load as their own chunks. Statement IDs are element ids (`/floorspec/core/walls#FS-CORE-5.3.1`, `/floorspec/ops/composites#FS-OPS-4.4.1`); section numbers are heading ids (`#5.3`). A bare number links within its own specification; one named for another (`Core §5.3`, `Core 5.2.1, 5.2.2`) links there.
- **A published schema URL never changes.** The sync copies `schema/<spec>/<v>/*.json` byte for byte into `public/floorspec/schema/<spec>/<v>/` and records each SHA-256 in `src/floorspec/published-schemas.json`; it refuses to change or drop a recorded file, and a test holds `public/` to the record. A changed schema is a new version directory. The Worker serves `/floorspec/schema/**` with `Access-Control-Allow-Origin: *` and a one-year `immutable` cache. Only export handlers or objects from `src/worker.ts` — workerd refuses to start on a string export.
- **In-app navigation uses `Link` from `src/router.tsx`** (wraps the library `Link`) or `useNavigateOnClick` on a library `Card href`.
- **Screenshots live in `public/screenshots/<slug>/`** as WebP with their real width/height recorded in `projects.ts`.
- **Apex Custom Domain only — never a wildcard route.** A wildcard `*.d3cloud.io/*` would break `qr.d3cloud.io`.
- **Theme storage key is `d3cloud-theme`** (not `d3qr-theme`). `ThemeProvider` (in `main.tsx`) and the header's `ThemeSwitch` own it; `public/theme-init.js` is `themeBootScript('d3cloud-theme')` from the library, kept as a file because CSP blocks inline script, and `src/site.test.ts` fails if the two differ.
- **`src/routes.ts` is the one list of pages.** The app, the Worker and the sitemap all read it. A new page is a new entry there, not a new branch in three places.
- **Per-page `<head>` comes from the Worker.** `src/head.ts` renders title, description, canonical, Open Graph and Twitter tags; the Worker swaps them into index.html between the `route-meta` markers. index.html carries the home page's block, and a test holds it equal to `renderHead('/')` — change `head.ts`, then paste its output back.
- **Fonts are Inter and JetBrains Mono, self-hosted by `@d3cloud/ui`, plus Instrument Serif from `@fontsource/instrument-serif`** (Latin, 400 normal + italic, imported in `main.tsx`) — all same-origin, so `font-src 'self'` holds.
- **Bundle budget: 150kb gzipped.** ~132kb after the Constellation redesign: the library ships one flat `dist/index.js`, so unused Radix code can't be tree-shaken yet.
- **No co-author footer in commits.**
- **Deploy via git push to `main`.** GitHub Actions builds and deploys to Cloudflare Workers. Do not deploy by hand — a manual `wrangler deploy` puts a laptop build on the live site that doesn't match `main`.

## Build & Dev Commands

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # outputs dist/, then scripts/generate-static.ts adds og-image.png, robots.txt, sitemap.xml
npm run preview      # preview the production build
npm run lint         # eslint + d3-check-usage
npm test             # vitest: routes, Worker, head, theme, Floorspec pages and schemas
npm run sync:floorspec   # regenerate the /floorspec pages from ../floorspec (commit the result)
npm run format       # prettier --write .
# Deploys happen in CI: push to main -> .github/workflows/deploy.yml
# npx wrangler deploy   # manual fallback only
```

## Architecture (one-paragraph version)

Every request reaches `src/worker.ts` first (`run_worker_first: true`). A file (anything with an extension) is passed to the Static Assets binding, which answers 404 when it is missing — there is **no SPA fallback** any more, because that returned the home page with a 200 for every typo. A page is looked up in `src/routes.ts`: a real page gets `index.html` with its own head swapped in and a 200; a renamed slug (`/daypart/*`) or a trailing slash gets a 301 to the canonical address; anything else gets the app's not-found page with a **404** and `noindex`. Every response carries CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy and COOP. In the browser, the History API router renders the page for the path; theme is the only state.

## Stack

- React 19 + Vite 7 + TypeScript
- Tailwind CSS v4 via `@import '@d3cloud/ui/theme.css'` (brings Tailwind, tokens, fonts, the `dark` variant) + `@source '../'`
- `@d3cloud/ui` v1.2.2
- Cloudflare Workers (Static Assets binding, `run_worker_first: true`)

## What NOT to Do

- Don't add a backend, an API endpoint, or a database
- Don't add `react-router` or any other routing library — `src/router.tsx` is deliberate and sufficient
- Don't change `/clearwhen/privacy`, `/clearwhen/terms` or `/clearwhen/support` — those URLs ship inside the Clearwhen binary and in its App Store listing; add a redirect instead of renaming. `/daypart/*` is kept as a redirect for an early build that shipped the old path.
- Don't add a state management library (Zustand, Redux, etc.)
- Don't add analytics, telemetry, or tracking scripts
- Don't add a wildcard Worker route on `*.d3cloud.io` (would break `qr.d3cloud.io`)
- Don't add `connect-src` exceptions to the CSP
- Don't add `dangerouslySetInnerHTML` anywhere
- Don't change the theme storage key from `d3cloud-theme`
- Don't touch `qr.d3cloud.io` deployment when working on this project
