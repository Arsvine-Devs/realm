---
name: realm-assets-catalog
description: Prepare, build, verify, publish, or roll back ARSVINE REALM's COS Catalog asset pipeline. Use for explicit asset maintenance; never infer permission to perform a remote publish.
---

# Realm Assets Catalog

Repository AI routing: [`docs/ai/INDEX.md`](../../../docs/ai/INDEX.md). Human procedure: [`docs/human/ASSETS.md`](../../../docs/human/ASSETS.md).

Use the repository's `scripts/assets/` commands and current asset documentation as the implementation source of truth. Keep legacy preparation, local Catalog build, remote publish, and rollback as separate modes.

## Safety boundary

- Default to local inspection, `--dry-run`, and generated local output.
- Never read, print, persist, or commit COS credentials. Use only credentials supplied by the current process.
- A real upload, pointer switch, revalidation request, or rollback requires explicit user authorization for that operation.
- Do not run this skill's verification against production COS or a live database.
- An interrupted upload is not a publication result. Read both remote pointers before retrying; an old, matching pair means the new version has not been cut over, while a mismatched pair requires human review rather than an automatic repair.

## Workflow

1. Inspect `git status`, the workspace root, the selected source date, and the generated manifest inputs.
2. For legacy material, require an explicit `--date`; do not use a historical default. Run the migration only when the legacy mirror is actually in scope.
3. Build locally. Verify hashed public objects, private versioned Catalog sections, sanitized public manifest, and `current.next.json` before considering publish.
4. Run `node .agents/skills/realm-assets-catalog/scripts/verify-local-build.mjs .` to validate the generated local manifest, matching pointers, and required Catalog sections without remote access.
5. Preview the exact COS commands with `--dry-run`. When credentials are stored in `.env.local`, use the bundled dotenv runner instead of splitting the file in a shell:

   ```bash
   node .agents/skills/realm-assets-catalog/scripts/run-publish-with-env.mjs --env-file .env.local -- --dry-run
   ```

   The runner parses dotenv quoting in-process, does not print values, and forwards only the publish flags after `--`.

6. For publish mode, upload immutable objects first, verify that both public and private version keys actually appear in their listings (a successful `ls` command alone is insufficient), switch both pointers last, then call asset revalidation. A partial revalidation is reported as partial, not as a clean success.
7. The publisher emits stage starts/completions, sampled upload progress, and a heartbeat while COSCLI is running. If progress is silent beyond one heartbeat interval or the command is interrupted, stop and inspect the COSCLI log plus both remote pointers. Do not blindly retry, switch a pointer, or roll back.
8. If both pointers already reference the new verified version but revalidation returns `429`, do not repeat the upload or roll back. Wait for the reported `Retry-After` window, then issue one revalidation request and record its response.
9. For rollback mode, validate the exact version format and repoint only to an already verified version.

## Verification

Run focused asset/script tests first, then the repository quality gates appropriate to the change. Never claim remote availability from local Catalog output alone. Leave generated `dist/` and COS workspace files ignored and uncommitted.
