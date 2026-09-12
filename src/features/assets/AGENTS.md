# Asset Catalog boundary

- `catalogKey` and source manifests are stable application inputs; hashed COS object keys belong to generated Catalog output.
- Build immutable public objects and private versioned Catalog sections before switching either `current.json` pointer.
- Public manifests contain only the allowlisted object key and display metadata; never expose private Catalog data.
- Catalog failure must remain distinguishable from an empty valid Catalog at API boundaries.
- Local tests use fixtures or temporary workspaces. Do not use real COS credentials or remote writes for tests.
- Read `docs/ai/API-REF.md` and use `$realm-assets-catalog` for the complete workflow.
