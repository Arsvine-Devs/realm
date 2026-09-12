# Documentation scope

Documentation is a maintained information system, not a second implementation.

- Keep human-facing prose in Simplified Chinese; keep AI operational guidance in concise technical English.
- `README.md` is the human documentation landing page; `INDEX.md` is the maintained catalog.
- Keep one canonical owner for each command, environment variable, route, workflow, and invariant. Summaries link to the owner.
- Verify paths, commands, links, and examples against current source/configuration before claiming completion.
- Distinguish current, planned, deprecated, and historical material. Do not leave historical instructions in active navigation.
- Use the relevant existing document or skill before adding a new category. Keep `SKILL.md` workflows focused and progressively disclosed.
- Run the repository's documentation link audit and `pnpm format:check` after documentation changes.
