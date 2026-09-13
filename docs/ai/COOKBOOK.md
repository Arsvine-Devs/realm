# AI cookbook

[AI workflow index](./INDEX.md) · [Human documentation catalog](../INDEX.md)

## Add or change a feature

- Put route adaptation in `src/app/` and domain behavior in `src/features/<feature>/`.
- Keep cross-feature code in `src/shared/` only when it has a stable shared owner.
- Add focused behavior tests beside the existing feature test group.
- Use the static locale registry and update the relevant locale data/messages together.

## Change navigation or locale behavior

- Read `src/features/navigation/AGENTS.md` and the routing document.
- Use `navigateTo()` or `switchLocale()`.
- Test same-page hash, cross-page hash, detail back, locale switch, stale cleanup, and reduced-motion behavior as applicable.

## Change protected blog behavior

- Load `$realm-protected-content`.
- Trace route page, server handler, state machine, gate, and variant response before editing.
- Test unauthorized payload absence, grant success, invalid token, rate limit, unsafe redirect, stale actor cancellation, and locale changes as applicable.

## Change assets or publish Catalog

- Load `$realm-assets-catalog`.
- Prefer local legacy preparation and `assets:build` output inspection.
- Use `assets:publish --dry-run` before any explicitly authorized remote write.

## Change tests or tooling

- Prefer Node environment for pure/server/repository tests and jsdom only for DOM tests.
- Test meaningful contracts rather than source formatting or completed migration history.
- Keep one-shot CLI tools self-contained; extract shared mechanics only when the same semantic owner has multiple consumers.
