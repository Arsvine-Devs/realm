---
name: realm-protected-content
description: Change or review ARSVINE REALM protected blog access, TOTP verification, grant handling, or protected-post loading. Use when a task touches protected content or its security-sensitive tests.
---

# Realm Protected Content

Repository AI routing: [`docs/ai/INDEX.md`](../../../docs/ai/INDEX.md). Human security context: [`docs/human/SECURITY.md`](../../../docs/human/SECURITY.md).

Treat protected content as a security boundary, not a UI-only flow. Read the current protected-content documentation and the blog/navigation scoped instructions before editing.

## Invariants

- Unauthorized protected metadata is sanitized and protected MDX/body is absent from static props and RSC payloads.
- `/api/protected-verify` validates the requested group and safe internal `next` path, applies the configured limiter, and sets the signed grant only after valid TOTP verification.
- `/api/post-variant` checks the grant before fetching or serializing protected content and returns private, non-cacheable failures.
- `blogPostMachine` keeps grant check and variant loading in invoked actors so stale requests are aborted when the article or locale changes. Preserve complete `ARTICLE_CHANGED` replacement and forbidden fallback behavior.
- Internal navigation continues through `useTransition().navigateTo()` or `switchLocale()`; do not introduce direct `router.push()` for these flows.

## Change workflow

1. Trace the route, server handler, state machine, and UI gate before changing one layer.
2. Make the smallest semantic change and add or update tests at the boundary that could regress.
3. Test unauthorized, authorized, invalid-token, rate-limited, stale-request, locale-change, unsafe-redirect, and static-payload cases as applicable.
4. Run focused blog/security tests, then `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` for non-trivial changes.

Do not use production secrets, real TOTP groups, or live protected content for local verification.
