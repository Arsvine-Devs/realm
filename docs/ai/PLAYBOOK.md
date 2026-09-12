# AI playbook

## Before editing

1. Check `git status --short --branch`.
2. Read the nearest scoped `AGENTS.md` and the relevant human domain document.
3. Search for existing owners, callers, types, tests, scripts, and generated-output rules.
4. Identify whether the task is read-only review, local implementation, or an externally mutating workflow.

## During work

- Make the narrowest change that preserves the existing semantic owner.
- Run the narrowest check that can falsify the current change.
- Keep `PASS`, `NOT_RUN`, and `BLOCKED` evidence labels truthful.
- Do not add a dependency, registry, compatibility shim, or generic framework for an unresolved decision.
- Treat generated output, local credentials, COS, databases, deployment, and revalidation as separate boundaries.

## Before handoff

Run the relevant focused tests, then for non-trivial changes:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

For docs changes, verify links and current paths. For scripts, verify safe local input/output behavior. For UI or interaction changes, record manual desktop/mobile checks separately from automated results.

## Stop conditions

Stop when the requested behavior and required proof are complete. Do not turn a completed migration, old design record, or hypothetical future use into new permanent machinery.
