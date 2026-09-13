# Current AI gotchas

[AI workflow index](./INDEX.md) · [Human documentation catalog](../INDEX.md)

Only active constraints belong here. Historical reasons are omitted unless they change a current implementation decision.

## Security and content

- Protected post bodies stay out of static props/RSC and load only after a valid grant.
- Grant checks and variant loads remain XState invoked actors with cancellation on article/locale changes.
- Protected and revalidation redirects accept only validated internal paths.
- GitHub content paths are repo-relative; reject absolute, protocol-relative, traversal, query, fragment, and backslash forms.
- External link variants use parsed URLs and hostnames, never substring matching.
- TOTP, grant, rate-limit, and protected payload tests are security evidence and should not be replaced by styling tests.

## Navigation and layout

- Internal navigation goes through `navigateTo()` or `switchLocale()`.
- Route transition cleanup resets inline surface styles, cancels stale animation/hash work, and clears queued state.
- Locale-independent scroll state is limited to safe, non-sensitive page state.
- Mobile hash anchors use `scroll-margin-top`; do not add a competing JavaScript offset helper.
- The global shell remains above `[locale]` so locale switching does not reset HUD, music, WebGL, or navigation state.

## Performance and UI

- Performance consumers use capability flags, not ad hoc device heuristics or tier-name checks.
- WebGL must support lazy-load failure, context loss, pause, cleanup, and fallback without repeated context churn.
- `--font-display` is Latin-only decorative text; translated/user content uses the safe font stacks.
- Custom cursor reset behavior covers route, scroll, blur, visibility, target removal, and unmount.
- Music track selection is an explicit play intent; mobile auto-open remains disabled.

## Assets and dependencies

- COS publishing uploads immutable objects and Catalog versions before switching pointers.
- `@react-three/fiber` and `cos-request` exact versions remain synchronized with their patches.
- Generated `dist/`, `.next/`, COS workspace files, local env files, and generated API output are not source artifacts.
