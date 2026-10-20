# `@arsvine/site-kit` scope

- Re-export `@arsvine/site-config` and `@arsvine/service-health`. Do not copy origin strings here.
- Own catalog pointer resolution, browser-login PKCE, OAuth `client_credentials` token fetch, and revalidation HMAC sign/verify.
- A new login site registers itself in `@arsvine/site-config` and calls `oidcClient`, `createPkceLogin`, and `exchangeAuthorizationCode`. Do not copy the token exchange.
- Published content pointer is `siteConfig.content.pointerKey` (`realm-content/current.json`).
- Do not add Core DB, object storage, or Console session code here.
- This package is workspace-private. Do not publish it. `pnpm packages:sync` copies it only into sibling clones that already exist.
