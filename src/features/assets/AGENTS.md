# Asset Catalog boundary

- `catalogKey` and source manifests are stable application inputs. Hashed media keys belong to generated catalog output.
- Publish immutable public files and private versioned catalog sections before switching the shared `current.json` pointer.
- Public manifests contain only the allowlisted object key and display metadata; never expose private Catalog data.
- Catalog failure must remain distinguishable from an empty valid Catalog at API boundaries.
- Local tests use fixtures or temporary directories.
- Read `docs/human/ASSETS.md` for the publication workflow.
