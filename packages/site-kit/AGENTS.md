# `@arsvine/site-kit` scope

- Platform `packages/site-kit` is the source. `pnpm packages:sync` copies it to sibling repos that exist.
- Re-export site topology and health helpers. Do not copy origin strings into this package.
- Catalog, client-credentials, and revalidation HMAC are the only extra behaviors.
- Do not add Core DB, object storage, or Console session code here.
