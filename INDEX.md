# Repository map

ARSVINE REALM is a single Next.js App Router application with a feature-oriented source tree and a separate local maintenance toolchain.

## Major areas

| Area              | Purpose                                                           | Canonical guidance                                   |
| ----------------- | ----------------------------------------------------------------- | ---------------------------------------------------- |
| `src/app/`        | App Router pages, layouts, metadata, route handlers, i18n         | [`src/app/README.md`](./src/app/README.md)           |
| `src/features/`   | Domain UI, state, server loaders, contracts, and styles           | [`src/features/README.md`](./src/features/README.md) |
| `src/shared/`     | Stable cross-feature hooks, helpers, UI primitives, and contracts | [`src/shared/README.md`](./src/shared/README.md)     |
| `content/`        | Bundled blog fallback content                                     | `docs/human/CONTENT_AND_MDX.md`                      |
| `scripts/`        | Local maintenance, asset, font, image, and database tools         | [`scripts/README.md`](./scripts/README.md)           |
| `tests/`          | App, feature, shared, repository, operations, and script tests    | [`tests/README.md`](./tests/README.md)               |
| `.agents/skills/` | Reusable AI workflows for audit, Catalog, and protected content   | `docs/ai/INDEX.md`                                   |

## Entry points

- Human landing page: [`README.md`](./README.md)
- Human documentation: [`docs/README.md`](./docs/README.md)
- Human documentation catalog: [`docs/INDEX.md`](./docs/INDEX.md)
- AI repository rules: [`AGENTS.md`](./AGENTS.md)
- AI workflow catalog: [`docs/ai/INDEX.md`](./docs/ai/INDEX.md)

## Important scope guides

- Feature-specific boundaries: [`assets`](./src/features/assets/README.md), [`blog`](./src/features/blog/README.md), and [`navigation`](./src/features/navigation/README.md)
- AI workflow implementations: [`realm-maintenance-audit`](./.agents/skills/realm-maintenance-audit/SKILL.md), [`realm-assets-catalog`](./.agents/skills/realm-assets-catalog/SKILL.md), and [`realm-protected-content`](./.agents/skills/realm-protected-content/SKILL.md)

## Runtime boundaries

- Vercel uses the standard Next.js App Router output; `server.js` is for local development and optional self-hosting.
- Public media is resolved through the versioned COS Catalog; generated `dist/` and `cos-workspace/` are local artifacts.
- Protected blog content is fetched at runtime only after grant verification.
