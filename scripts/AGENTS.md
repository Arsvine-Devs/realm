# scripts/

Scripts are local maintenance or release tools, not application runtime modules.

- Use `scripts/assets/` for media build and publication.
- Keep one-shot image/font/favicon tools independent when they have one clear responsibility.
- Read `docs/ai/API-REF.md` for current command names and `docs/human/OPERATIONS.md` for human procedures.
- Test publication with an isolated local media directory. Production publication requires explicit authorization.
- A script that changes generated or external state must document its input, output, failure boundary, and safe verification path.
