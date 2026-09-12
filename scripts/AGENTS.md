# scripts/

Scripts are local maintenance or release tools, not application runtime modules.

- Use the asset workflow under `scripts/assets/` for legacy preparation, Catalog build, publish, and rollback.
- Keep one-shot image/font/favicon tools independent when they have one clear responsibility.
- Read `docs/ai/API-REF.md` for current command names and `docs/human/OPERATIONS.md` for human procedures.
- Never persist COS credentials or run a real publish without explicit authorization. Prefer local build and `--dry-run`.
- A script that changes generated or external state must document its input, output, failure boundary, and safe verification path.
