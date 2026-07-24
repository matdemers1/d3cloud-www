# CLAUDE.md — d3cloud-www

Apex landing site for **Demers Design and Development** at `d3cloud.io`. Single-page React SPA. **No backend, no database, no auth.** Mirrors [`d3-qr`](../d3-qr/) exactly — same stack, same Worker pattern, same Tailwind v4 setup.

Read this before doing any work. The full planning docs live in the D3 Cloud Vault — start there for architecture context.

## Vault Documentation

| Doc | Path |
|-----|------|
| Discovery & Requirements | `../D3 Cloud Vault/d3cloud.io/Discovery & Requirements.md` |
| Architecture | `../D3 Cloud Vault/d3cloud.io/Architecture.md` |
| Scope of Work | `../D3 Cloud Vault/d3cloud.io/Scope of Work.md` |
| ADRs | `../D3 Cloud Vault/d3cloud.io/ADR-*.md` |
| Project Overview | `../D3 Cloud Vault/Master Notes/Overviews/d3cloud.io Overview.md` |

When picking up a new development session, run `/start-development d3cloud-www` to load this context.

## Key Conventions

- **No backend, ever.** Pure static SPA. See `ADR-001 — Static SPA on Cloudflare Workers`.
- **Lightweight hand-rolled router** (`src/router.tsx`, History API, no dependency) for per-app pages: `/daypart`, `/daypart/privacy|terms|support`, same under `/qr`. See `ADR-004` (supersedes `ADR-002`). **Still no routing library.**
- **No analytics, no telemetry on this site.** CSP `connect-src 'self'` enforces it. (This is *not* a public stance about future projects.)
- **Mirror d3-qr exactly.** Same Vite/Tailwind/Worker config so the family of `*.d3cloud.io` sites stays coherent.
- **Apex Custom Domain only — never a wildcard route.** A wildcard `*.d3cloud.io/*` would break `qr.d3cloud.io`.
- **Theme storage key is `d3cloud-theme`** (not `d3qr-theme`).
- **System font stack only.** Zero font requests, instant render.
- **Bundle budget: 150kb gzipped.** No QR/PDF libs to weigh us down.
- **No co-author footer in commits.**
- **Deploy via git push to `main`.** GitHub Actions builds and deploys to Cloudflare Workers. Do not deploy by hand — a manual `wrangler deploy` puts a laptop build on the live site that doesn't match `main`.

## Build & Dev Commands

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # outputs dist/
npm run preview      # preview the production build
npm run lint         # eslint
npm run format       # prettier --write .
# Deploys happen in CI: push to main -> .github/workflows/deploy.yml
# npx wrangler deploy   # manual fallback only
```

## Architecture (one-paragraph version)

User loads the page once from Cloudflare Workers (Static Assets binding). The `src/worker.ts` Worker runs first (`run_worker_first: true`), calls `env.ASSETS.fetch()` to serve the React bundle, and attaches CSP/HSTS/X-Frame-Options/etc. to every response. A tiny History API router maps the pathname to a page (home, project, legal, support); `not_found_handling: "single-page-application"` in `wrangler.jsonc` makes deep links resolve. Theme is the only state, persisted to localStorage and applied by an inline `<head>` script before paint to prevent FOUC.

## Stack

- React 19 + Vite 7 + TypeScript
- Tailwind CSS v4 (CSS-first config — `@import 'tailwindcss'` + `@custom-variant dark` + `@theme inline`)
- Cloudflare Workers (Static Assets binding, `run_worker_first: true`)

## What NOT to Do

- Don't add a backend, an API endpoint, or a database
- Don't add `react-router` or any other routing library — `src/router.tsx` is deliberate and sufficient
- Don't change `/daypart/privacy`, `/daypart/terms` or `/daypart/support` — those URLs ship inside the released Daypart binary and in its App Store listing; add a redirect instead of renaming
- Don't add a state management library (Zustand, Redux, etc.)
- Don't add analytics, telemetry, or tracking scripts
- Don't add a wildcard Worker route on `*.d3cloud.io` (would break `qr.d3cloud.io`)
- Don't add `connect-src` exceptions to the CSP
- Don't add `dangerouslySetInnerHTML` anywhere
- Don't change the theme storage key from `d3cloud-theme`
- Don't touch `qr.d3cloud.io` deployment when working on this project
