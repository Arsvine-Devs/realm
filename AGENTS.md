# AGENTS.md

This file is the concise coding-agent entry point for **ARSVINE REALM**. Keep it short. Long explanations belong in the split documentation under `docs/`.

## Read first

- [`README.md`](./README.md) — project overview.
- [`docs/README.md`](./docs/README.md) — complete task-oriented documentation map.
- [`docs/GETTING_STARTED.md`](./docs/GETTING_STARTED.md), [`docs/DEVELOPMENT.md`](./docs/DEVELOPMENT.md), and [`docs/TESTING_AND_QUALITY.md`](./docs/TESTING_AND_QUALITY.md) — setup, daily workflow, and verification.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md), [`docs/ROUTING_AND_I18N.md`](./docs/ROUTING_AND_I18N.md), and [`docs/CONTENT_AND_MDX.md`](./docs/CONTENT_AND_MDX.md) — system, navigation, locales, and content.
- [`docs/SECURITY.md`](./docs/SECURITY.md) — protected posts, cookies, rate limiting, and input boundaries.
- [`docs/OPERATIONS.md`](./docs/OPERATIONS.md), [`docs/ASSETS.md`](./docs/ASSETS.md), and [`docs/PERFORMANCE.md`](./docs/PERFORMANCE.md) — deployment, COS/Catalog, and adaptive performance.
- [`docs/TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md) and [`docs/GOTCHAS.md`](./docs/GOTCHAS.md) — diagnostics and historical regressions.

## Project snapshot

ARSVINE REALM is a personal post-apocalyptic HUD-themed portfolio and blog site. It uses **Next.js 16 App Router**, React 19, TypeScript, SCSS Modules, Three.js, GSAP, MDX, `next-intl` 4, and Vitest. The production runtime target is Node.js `24.x`.

The custom `server.js` is the local-development and optional self-hosted entry. Production runs on Vercel, which uses the standard Next.js App Router build output (Proxy + Route Handlers + Serverless Functions); `server.js` does **not** run in Vercel deployments. The `pnpm start` script is intended for self-hosted deployments (`pm2 start server.js` or similar).

User-facing pages live under `/<locale>/...` with UI locales `zh-CN`, `zh-TW`, and `en`.

## Commands

```bash
pnpm dev        # node server.js
pnpm build      # next build
pnpm start      # cross-env NODE_ENV=production node server.js
pnpm lint       # eslint .
pnpm typecheck  # tsc --noEmit
pnpm test       # vitest run
```

Run a single test:

```bash
pnpm vitest run path/to/file.test.ts
pnpm vitest run -t "name pattern"
```

## Hard rules

1. **Use App Router.** Routes are under `src/app/`.
2. **Do not replace `server.js`.** It is the local-development and optional self-hosted entry; `pnpm dev` and `pnpm start` both go through it. Vercel deployments do not run `server.js`; they use the standard Next.js build output.
3. **Use `useTransition().navigateTo()` for internal navigation.** Direct `router.push()` breaks page transition behavior.
4. **Do not use IP-based language selection.** Locale resolution is `NEXT_LOCALE cookie > Accept-Language > zh-CN`.
5. **Do not dynamically require locale data.** `src/app/i18n/data.ts` intentionally uses a static registry.
6. **Do not reintroduce `reading-time`.** The in-house estimator handles CJK; whitespace-based packages do not.
7. **Do not use `--font-display` for translated/user content.** `ZELDA Free` is Latin-only and breaks CJK/accented text.
8. **Use `coscli` only with temporary environment-provided credentials.** Never persist COS keys in a CLI config or commit `cos-workspace/`.
9. **Do not ship protected MDX in static props.** Protected posts must remain runtime-gated through the API and signed access cookie.
10. **Preserve the protected-post XState actor cancellation fixes.** See `docs/GOTCHAS.md` before touching `src/features/blog/model/useBlogPostState.ts` or `src/features/blog/model/blogPostState.ts`.

## Where to edit common things

| Need | Edit first |
|---|---|
| Site metadata, SEO, fonts, social links | `src/shared/config/site.ts` |
| Music playlist / cloud audio catalog | `src/app/api/assets/audio`, `src/features/assets/server/catalog/`, `src/features/music/` |
| Projects / experience / life / skills / friend links | `src/features/<feature>/contracts/data/*.ts` |
| UI copy | `src/app/locales/*.json` |
| Remote image domains | `config/image-hosts.js` |
| Blog fallback post | `content/blog/init/` |
| Runtime blog/tweet source | `.env.local` external GitHub content repo variables |
| Protected-post access | `ACCESS_GRANT_SECRET`, `TOTP_GROUPS_JSON`, access helpers under `src/shared/lib/content/` |
| Route transitions | `src/features/navigation/model/TransitionProvider.tsx`, route mode hooks |
| Global HUD / left panel | `src/features/hud/`, `src/app/shell/MainLayout.tsx` |
| MDX rendering | `src/features/blog/ui/mdx/`, `src/features/blog/styles/MDXContent.module.scss` |

## Validation expectation

Before handing off non-trivial changes, run at least:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

For visual or interaction changes, also manually verify desktop and mobile layouts, route transitions, blog detail pages, protected-post gates, music-player behavior, hash navigation, and custom cursor states.

## Common danger zones

Read [`docs/GOTCHAS.md`](./docs/GOTCHAS.md) before editing:

- protected blog post auth state machine (`src/features/blog/model/useBlogPostState.ts`);
- route loading overlay placement;
- avatar reveal/parallax layer separation and performance-tier cleanup;
- About image particle visibility, sequence, and static fallback;
- blog reveal animation and `<Explain>` tooltip stacking;
- music player track-switch behavior;
- mobile music-player auto-open guard;
- `AnimatedTitleChars` uppercase behavior;
- COS font headers;
- Google Fonts variable-font deduplication.
