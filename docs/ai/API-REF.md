# AI API and ownership reference

[AI workflow index](./INDEX.md) · [Human documentation catalog](../INDEX.md)

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

This table is the canonical maintained list of current route methods. Human architecture and operations documents may explain responsibility or procedure, but should link here instead of maintaining a second method registry.

| Route                                  | Method | Responsibility                                 |
| -------------------------------------- | ------ | ---------------------------------------------- |
| `/api/hitokoto`                        | GET    | Return cached/timeout-safe third-party text    |
| `/api/grant-check`                     | GET    | Read signed protected-post grant               |
| `/api/protected-verify`                | POST   | Verify TOTP, rate-limit, issue grant           |
| `/api/post-variant`                    | GET    | Return authorized MDX variant                  |
| `/api/tweet-months`                    | GET    | Return paginated tweet month groups            |
| `/api/visitor-stats`                   | POST   | Record canonical visitor and return counts     |
| `/api/assets/{audio,home,links,works}` | GET    | Read public Catalog sections                   |
| `/api/assets/collections/[slug]`       | GET    | Read paginated collection assets               |
| `/api/internal/revalidate`             | POST   | Accept signed Content/asset publication events |

Route files adapt `Request`/`Response`; feature server modules own validation and domain work.

## Quality commands

```bash
pnpm format:check
pnpm docs:check
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

## Platform service configuration

- `CONTENT_BASE_URL` is the only Realm runtime origin for published Blog/Tweet reads.
- `AUTH_ISSUER` is the stable issuer used for protected Content service access.
- `CONTENT_SERVICE_CLIENT_ID` and `CONTENT_SERVICE_CLIENT_SECRET` are server-only OAuth client credentials; the client derives the token endpoint from `AUTH_ISSUER`.
- `NEXT_PUBLIC_CDN_BASE` is the browser-visible immutable media origin and must remain separate from Content/API/Auth origins.
