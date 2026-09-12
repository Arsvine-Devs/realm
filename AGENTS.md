# ARSVINE REALM — AI entrypoint

ARSVINE REALM is a Next.js 16 App Router portfolio/blog site using React 19, TypeScript, SCSS Modules, Three.js, MDX, next-intl, Vitest, Tencent COS Catalog assets, and optional protected posts.

## Authority and scope

- Read `docs/ai/INDEX.md` for AI task routing and `docs/INDEX.md` for human documentation.
- Read the nearest scoped `AGENTS.md` before editing scripts, assets, protected blog code, or navigation.
- Preserve required semantics and optimize expected total cost. Do not expand scope because a future use is imaginable.
- Existing code, tests, migration notes, and generated output have no automatic preservation privilege. Keep them only when they protect a current contract or materially reduce recurring cost.
- Local checks are local evidence. Do not claim external publication, production availability, cross-platform verification, or independent review from them.

## Hard boundaries

1. Use App Router routes under `src/app/`; Vercel does not run `server.js`, while local development and optional self-hosting do.
2. Internal navigation uses `useTransition().navigateTo()` or `switchLocale()`; do not bypass transition choreography with direct `router.push()`.
3. Locale resolution is `NEXT_LOCALE` cookie, then `Accept-Language`, then `zh-CN`. Do not use IP geolocation for language or authorization.
4. Keep locale data in the static registry. Do not reintroduce dynamic locale loading or the `reading-time` dependency.
5. Protected post bodies must remain runtime-gated and absent from unauthorized static props/RSC payloads. Preserve the XState invoked-actor cancellation behavior.
6. COS credentials are temporary process inputs only. Do not commit `cos-workspace/`, generated `dist/`, secrets, or generated API output. Remote publish, pointer switching, revalidation, database writes, and deployment require explicit user authorization.

## Commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

Use the narrowest check that can falsify the current change, then run the full relevant gate before handoff. For visual or interaction changes, manually verify desktop/mobile layout, transitions, protected blog gates, music behavior, hash navigation, and cursor cleanup.

## High-risk routing

- General AI workflow: `docs/ai/PLAYBOOK.md` and `docs/ai/COOKBOOK.md`.
- Current invariants: `docs/ai/GOTCHAS.md`.
- Routes, environment variables, scripts, and ownership: `docs/ai/API-REF.md`.
- Asset/COS work: `scripts/AGENTS.md`, `src/features/assets/AGENTS.md`, and `$realm-assets-catalog`.
- Protected blog work: `src/features/blog/AGENTS.md` and `$realm-protected-content`.
- Navigation work: `src/features/navigation/AGENTS.md`.
- Whole-repository maintenance review: `$realm-maintenance-audit`.
