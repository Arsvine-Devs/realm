# AI API and ownership reference

## Application boundaries

| Area                                          | Owner                     |
| --------------------------------------------- | ------------------------- |
| Pages, layouts, metadata, Route Handlers      | `src/app/`                |
| Proxy and locale redirect                     | `src/proxy.ts`            |
| Domain UI/state/server/data                   | `src/features/<feature>/` |
| Stable cross-feature utilities and primitives | `src/shared/`             |
| Local maintenance and release CLIs            | `scripts/`                |
| Automated tests and fixtures                  | `tests/`                  |

## Important routes

| Route                                  | Method          | Responsibility                             |
| -------------------------------------- | --------------- | ------------------------------------------ |
| `/api/grant-check`                     | GET             | Read signed protected-post grant           |
| `/api/protected-verify`                | POST            | Verify TOTP, rate-limit, issue grant       |
| `/api/post-variant`                    | GET             | Return authorized MDX variant              |
| `/api/visitor-stats`                   | POST            | Record canonical visitor and return counts |
| `/api/assets/{audio,home,links,works}` | GET             | Read public Catalog sections               |
| `/api/assets/collections/[slug]`       | GET             | Read paginated collection assets           |
| `/api/revalidate`                      | POST/legacy GET | Revalidate tweets                          |
| `/api/revalidate-content`              | POST            | Revalidate content and optional blog slug  |
| `/api/revalidate-assets`               | POST            | Revalidate asset-bearing pages             |

Route files adapt `Request`/`Response`; feature server modules own validation and domain work.

## Quality commands

```bash
pnpm format:check
pnpm maintenance:check
pnpm lint
pnpm typecheck
pnpm quality
pnpm test
pnpm build
```

## Asset commands

```bash
pnpm assets:prepare-legacy -- --workspace path/to/workspace --date YYYY-MM-DD
pnpm assets:build
pnpm assets:publish -- --dry-run
pnpm assets:publish -- --rollback YYYYMMDDTHHMMSSZ
```

Only `assets:publish` can perform remote COS writes. Credentials are process environment inputs and must not be persisted.

## Configuration sources

- Public/basic environment examples: `.env.example`
- Runtime site identity and font URLs: `src/shared/config/site.ts`
- Runtime locale registry: `src/app/i18n/data.ts`
- Catalog source manifests: `src/features/*/contracts/source-manifest.json`
- Dependency overrides and patches: `pnpm-workspace.yaml`, `patches/`
