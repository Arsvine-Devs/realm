---
name: realm-maintenance-audit
description: Audit ARSVINE REALM for COST-driven maintenance debt, overengineering, stale repository contracts, test cost, script boundaries, and documentation drift. Use for an explicit whole-repository maintenance or architecture audit; do not use for ordinary feature work.
---

# Realm Maintenance Audit

Use this skill for a read-only audit unless the user separately authorizes implementation. Read [the COST rubric](references/COST.en.md) before making structural judgments. Treat the repository's current behavior, tests, `AGENTS.md`, and `docs/ai/API-REF.md` as evidence; treat historical plans and generated output as non-authoritative.

## Audit method

1. Check worktree state and read the applicable root and scoped instructions.
2. Run `node .agents/skills/realm-maintenance-audit/scripts/inventory.mjs .` for a bounded, read-only inventory before deeper inspection.
3. Inventory source, tests, scripts, dependencies, docs, generated/ignored roots, and CI.
4. Run the narrowest useful baseline checks before recommending removals. Preserve truthful `PASS`, `NOT_RUN`, and `BLOCKED` labels.
5. Classify every candidate as retain, simplify, consolidate, archive, or delete. Require a concrete continuing cost or risk reduction; do not use line count alone as proof of overengineering.
6. For tests, distinguish behavior/security/build contracts from migration-era source-shape assertions. Keep tests that protect current risk or uncertainty; remove tests that only preserve a completed migration.
7. For scripts, separate reusable semantic mechanics from one-shot tools. Prefer an existing owner and a small domain helper over a generic framework.
8. Review documentation authority and links. Remove stale paths and duplicate instructions; do not create a new document merely to preserve history.

For Chinese-language reasoning or reports, consult `references/COST.zh-CN.md`; keep the skill instructions themselves in technical English.

## Required output

Report evidence with file paths, impact, confidence, and a proposed action. Include explicit non-findings so large but justified areas are not misclassified. State which checks ran, their results, and which external or visual checks were not run.

Do not mutate the repository, invoke COS/database writes, publish assets, deploy, or turn a local check into an independent or production claim unless the user explicitly requests that action.
