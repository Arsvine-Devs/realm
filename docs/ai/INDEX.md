# AI workflow index

This directory is the AI-facing operational layer. Human maintenance documentation starts at [`../INDEX.md`](../INDEX.md).

## Read by task

- General repository work: [`PLAYBOOK.md`](./PLAYBOOK.md)
- Common changes: [`COOKBOOK.md`](./COOKBOOK.md)
- Current hard-to-see invariants: [`GOTCHAS.md`](./GOTCHAS.md)
- Routes, environment, scripts, ownership: [`API-REF.md`](./API-REF.md)
- Whole-repository COST review: `$realm-maintenance-audit`
- Asset Catalog/COS work: `$realm-assets-catalog`
- Protected blog work: `$realm-protected-content`

## Authority

1. User request and explicit scope.
2. Root and nearest scoped `AGENTS.md`.
3. Current source, tests, package scripts, and `.env.example`.
4. This AI documentation layer.
5. Historical design records and generated output.

When sources conflict, stop at the smallest material ambiguity and report it. Do not hide an unresolved decision inside a new abstraction, fallback, or compatibility layer.
