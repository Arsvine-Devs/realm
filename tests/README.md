# Test layout

[`Repository map`](../INDEX.md) · [`Maintainer guide`](../docs/human/MAINTAINER.md) · [`AI rules`](./AGENTS.md)

Tests are grouped by responsibility:

- `app/` — application shell, layouts, providers, and bootstrap behavior.
- `features/` — domain state, UI, server handlers, and security contracts.
- `shared/` — cross-feature helpers and primitives.
- `repo/` — active repository/build/dependency contracts only.
- `operations/` — deployment and operational boundaries.
- `scripts/` — local maintenance tool behavior.
- `fixtures/` — checked-in test inputs.

Pure/server/repository tests run in Node. DOM and React tests use the jsdom project; DOM-only TypeScript tests use the `*.browser.test.ts` suffix.
