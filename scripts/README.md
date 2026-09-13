# Maintenance scripts

[`Repository map`](../INDEX.md) · [`Human documentation catalog`](../docs/INDEX.md)

This directory contains local tools for assets, fonts, images, environment files, database maintenance, and Windows development setup.

- Asset Catalog workflow: `scripts/assets/` and [`docs/human/ASSETS.md`](../docs/human/ASSETS.md)
- Documentation path audit: `pnpm docs:check` via `scripts/check-doc-links.mjs`
- Image conversion workflow: [`scripts/images/README.md`](./images/README.md)
- Deployment and database procedures: [`docs/human/OPERATIONS.md`](../docs/human/OPERATIONS.md)
- AI safety rules: [`AGENTS.md`](./AGENTS.md)

One-shot media and font tools are intentionally independent. Do not run commands that publish COS assets or change a database without explicit authorization.
