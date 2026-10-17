# `@arsvine/service-health` scope

- Own only live/ready payload helpers and no-store headers.
- Do not embed service-specific readiness policy (env checks stay in each app).
- Keep `status` values as `live` / `ready` / `not_ready` for failure paths owned by callers.
- After edits, run `pnpm packages:sync` from the Platform root so Realm/Ripple mirrors stay current.
