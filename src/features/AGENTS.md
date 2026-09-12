# Feature scope

- Keep domain ownership inside the owning feature.
- Use `src/shared/` only for stable behavior consumed by multiple features.
- Keep locale data and source manifests with their feature owners.
- Do not create public barrels, registries, or generic abstractions without current consumers or a clear boundary benefit.
- Add behavior tests in the matching feature test group and preserve external/security contracts.
