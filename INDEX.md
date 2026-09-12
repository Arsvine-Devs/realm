# Repository map

ARSVINE REALM is a single Next.js App Router application with a feature-oriented source tree and a separate local maintenance toolchain.

## Major areas

| Area              | Purpose                                                           | Canonical guidance                               |
| ----------------- | ----------------------------------------------------------------- | ------------------------------------------------ |
| `src/app/`        | App Router pages, layouts, metadata, route handlers, i18n         | `docs/human/ARCHITECTURE.md`                     |
| `src/features/`   | Domain UI, state, server loaders, contracts, and styles           | Each important feature `README.md` / `AGENTS.md` |
| `src/shared/`     | Stable cross-feature hooks, helpers, UI primitives, and contracts | `docs/human/ARCHITECTURE.md`                     |
| `content/`        | Bundled blog fallback content                                     | `docs/human/CONTENT_AND_MDX.md`                  |
| `scripts/`        | Local maintenance, asset, font, image, and database tools         | `docs/human/OPERATIONS.md`                       |
| `tests/`          | App, feature, shared, repository, operations, and script tests    | `docs/human/MAINTAINER.md`                       |
| `.agents/skills/` | Reusable AI workflows for audit, Catalog, and protected content   | `docs/ai/INDEX.md`                               |

## Entry points

- Human landing page: [`README.md`](./README.md)
- Human documentation: [`docs/README.md`](./docs/README.md)
- Human documentation catalog: [`docs/INDEX.md`](./docs/INDEX.md)
- AI repository rules: [`AGENTS.md`](./AGENTS.md)
- AI workflow catalog: [`docs/ai/INDEX.md`](./docs/ai/INDEX.md)

## Runtime boundaries

- Vercel uses the standard Next.js App Router output; `server.js` is for local development and optional self-hosting.
- Public media is resolved through the versioned COS Catalog; generated `dist/` and `cos-workspace/` are local artifacts.
- Protected blog content is fetched at runtime only after grant verification.
