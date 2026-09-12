# Protected blog boundary

- Protected bodies must not enter static props or unauthorized RSC payloads.
- Grant checks and variant loads remain in XState invoked actors so stale requests are aborted on article or locale changes.
- Preserve complete `ARTICLE_CHANGED` replacement, forbidden fallback, safe internal redirect validation, rate limiting, and private no-store failures.
- Internal navigation uses `navigateTo()` or `switchLocale()`.
- Test unauthorized, authorized, stale-request, unsafe-redirect, rate-limit, and static-payload behavior at the narrowest relevant boundary.
- Use `$realm-protected-content` for changes in this area.
