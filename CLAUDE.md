# CLAUDE.md — d3cloud-www

Apex landing site for **Demers Design and Development** at `d3cloud.io`. Single-page React SPA. **No backend, no database, no auth.** Same stack and Worker pattern as [`d3-qr`](../d3-qr/); styled with the D3 Cloud design system, `@d3cloud/ui` (ADR-005).

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
- **Spacing goes on a wrapper, never on a library component.** The components' CSS arrives unlayered with their JS import and sets `margin: 0`, which beats Tailwind utilities — `<Card className="mb-8">` silently does nothing.
- **Type follows the system scale: 11–24px, no display sizes.** Emphasis is weight (`font-title`), not size.
- **In-app navigation uses `Link` from `src/router.tsx`** (wraps the library `Link`) or `useNavigateOnClick` on a library `Card href`.
- **Screenshots live in `public/screenshots/<slug>/`** as WebP with their real width/height recorded in `projects.ts`.
- **Apex Custom Domain only — never a wildcard route.** A wildcard `*.d3cloud.io/*` would break `qr.d3cloud.io`.
- **Theme storage key is `d3cloud-theme`** (not `d3qr-theme`). `ThemeProvider` (in `main.tsx`) and the header's `ThemeSwitch` own it; `public/theme-init.js` is `themeBootScript('d3cloud-theme')` from the library, kept as a file because CSP blocks inline script, and `src/site.test.ts` fails if the two differ.
- **`src/routes.ts` is the one list of pages.** The app, the Worker and the sitemap all read it. A new page is a new entry there, not a new branch in three places.
- **Per-page `<head>` comes from the Worker.** `src/head.ts` renders title, description, canonical, Open Graph and Twitter tags; the Worker swaps them into index.html between the `route-meta` markers. index.html carries the home page's block, and a test holds it equal to `renderHead('/')` — change `head.ts`, then paste its output back.
- **Fonts are Inter and JetBrains Mono, self-hosted by `@d3cloud/ui`** — same-origin, so `font-src 'self'` holds.
- **Bundle budget: 150kb gzipped.** ~124kb on `@d3cloud/ui` 1.2.2: the library ships one flat `dist/index.js`, so unused Radix code can't be tree-shaken yet.
- **No co-author footer in commits.**
- **Deploy via git push to `main`.** GitHub Actions builds and deploys to Cloudflare Workers. Do not deploy by hand — a manual `wrangler deploy` puts a laptop build on the live site that doesn't match `main`.

## Build & Dev Commands

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # outputs dist/, then scripts/generate-static.ts adds og-image.png, robots.txt, sitemap.xml
npm run preview      # preview the production build
npm run lint         # eslint + d3-check-usage
npm test             # vitest: routes, Worker, head, theme
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
