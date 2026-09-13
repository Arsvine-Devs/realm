# Cross-system architecture documentation scope

This directory owns additive, cross-repository architecture documentation for ARSVINE REALM.

- Keep human-facing documents in Simplified Chinese. Keep this file in concise technical English.
- Read `README.md` before editing this scope.
- This scope owns relationships between Realm, Admin, Content, deployment units, external suppliers, and migration seams. Existing `docs/human/*` documents remain the owners of single-repository implementation procedures.
- Do not edit existing repository documents, application code, content, assets, or deployment configuration as part of this scope unless the user explicitly expands the request.
- Treat current source, schemas, manifests, scripts, repository state, and verified live probes as evidence. Mark prose-only or dashboard-only claims as `CLAIMED` or `UNKNOWN`.
- Never include secrets, tokens, cookies, TOTP material, database URLs, private bucket names, or private object paths.
- Keep provider names separate from ordinary package dependencies. Record an external service only when it owns runtime, storage, identity, scheduling, data, CDN/DNS, or an external API contract.
- Preserve `PASS`, `NOT_RUN`, `BLOCKED`, `CURRENT`, and `UNKNOWN` distinctions. Local checks do not prove production, independent review, or external configuration.
- After documentation changes, run `pnpm docs:check` and `pnpm format:check` from the Realm repository root. Do not run remote writes, deployments, COS publishes, database migrations, or content-repository mutations for documentation work.
