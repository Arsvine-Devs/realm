# Static site configuration scope

- Keep this package limited to source-controlled topology and protocol-owned
  constants. Do not put credentials or deployment secrets here.
- Every origin must be updated together with its OIDC redirect, resource, JWKS,
  Passkey, and publication relationships when those relationships change.
- Do not add environment fallbacks for a constant owned here. Environment
  provider inputs are for deployment state, credentials, and deliberate local
  operational overrides.
