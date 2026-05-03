# d3cloud-www

Apex landing site for **Demers Design and Development** — [d3cloud.io](https://d3cloud.io).

Single-page React SPA. No backend, no database, no auth. Mirrors [`d3-qr`](https://github.com/matdemers1/d3-qr)'s stack and Cloudflare Workers deployment pattern.

## Stack

- React 19 + Vite 7 + TypeScript
- Tailwind CSS v4 (CSS-first config)
- Cloudflare Workers (Static Assets binding, `run_worker_first: true`)

## Local development

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # outputs dist/
npm run preview      # preview the production build
npm run lint         # eslint
npm run format       # prettier --write .
```

## Deploy

```bash
npx wrangler deploy
```

The apex Custom Domain `d3cloud.io` is configured via the Cloudflare dashboard (or API) after the first deploy — **not** via `wrangler.jsonc`. A wildcard route (`*.d3cloud.io/*`) would intercept `qr.d3cloud.io`; use a Custom Domain on the bare apex instead.

## Vault Documentation

| Doc | Path |
|-----|------|
| Discovery & Requirements | `../D3 Cloud Vault/d3cloud.io/Discovery & Requirements.md` |
| Architecture | `../D3 Cloud Vault/d3cloud.io/Architecture.md` |
| Scope of Work | `../D3 Cloud Vault/d3cloud.io/Scope of Work.md` |
| ADRs | `../D3 Cloud Vault/d3cloud.io/ADR-*.md` |
| Project Overview | `../D3 Cloud Vault/Master Notes/Overviews/d3cloud.io Overview.md` |

## License

MIT
